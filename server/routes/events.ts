import { Router } from "express";
import { pool } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* Auto-create tables if not exists */
pool.query(`
  CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    home_team TEXT DEFAULT '',
    away_team TEXT DEFAULT '',
    event_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    venue TEXT NOT NULL DEFAULT '',
    district TEXT DEFAULT '',
    price_per_seat INTEGER NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL DEFAULT 100,
    taken INTEGER DEFAULT 0,
    accent TEXT DEFAULT 'from-primary/30 to-primary/10',
    emoji TEXT DEFAULT '🏆',
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS event_bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats INTEGER NOT NULL DEFAULT 1,
    total INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
  );
`).catch(() => {});

/* Migration: add image_url if it doesn't exist yet */
pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url TEXT`).catch(() => {});
/* Migration: make NOT NULL columns nullable for older schemas */
pool.query(`
  ALTER TABLE events ALTER COLUMN home_team DROP NOT NULL;
  ALTER TABLE events ALTER COLUMN away_team DROP NOT NULL;
  ALTER TABLE events ALTER COLUMN district DROP NOT NULL;
`).catch(() => {});

/* Seed default events if empty */
pool.query(`SELECT count(*) FROM events`).then(async ({ rows }) => {
  if (Number(rows[0].count) === 0) {
    await pool.query(`
      INSERT INTO events (league, title, home_team, away_team, event_date, venue, district, price_per_seat, capacity, taken, accent, emoji) VALUES
      ('La Liga',         'El Clásico',          'Real Madrid', 'Barcelona',   '2026-09-01 23:00:00+05', 'Soccer City Fan-Zone',      'Yunusobod',      90000, 200, 0,   'from-amber-500/30 via-rose-500/20 to-blue-600/30',     '👑'),
      ('Champions League','UCL Final 2026',       'TBD',         'TBD',         '2026-10-15 22:00:00+05', 'Toshkent Arena Lounge',     'Mirzo Ulug''bek',150000,350, 0,   'from-indigo-600/40 via-violet-500/20 to-blue-500/30',  '🏆'),
      ('Premier League',  'Manchester Derby',     'Man United',  'Man City',    '2026-09-17 19:30:00+05', 'Premier Sports Bar',        'Chilonzor',      75000, 120, 0,   'from-red-500/30 via-sky-400/20 to-zinc-700/30',        '🔥'),
      ('World Cup Qual.', 'O''zbekiston — Eron', 'Uzbekistan',  'Iran',        '2026-10-05 20:00:00+05', 'Bunyodkor Public Screen',   'Yashnobod',      50000, 500, 0,   'from-emerald-500/40 via-green-500/20 to-teal-500/30',  '🇺🇿')
    `).catch(() => {});
  }
}).catch(() => {});

/* GET /api/events — list all active events with user booking info */
router.get("/", authenticate as any, async (req: any, res) => {
  try {
    const userId = req.user?.id ?? null;
    const { rows } = await pool.query(
      `SELECT e.*,
        COALESCE(
          (SELECT seats FROM event_bookings WHERE event_id = e.id AND user_id = $1 LIMIT 1),
          0
        ) AS my_seats
       FROM events e
       WHERE e.is_active = TRUE
       ORDER BY e.event_date ASC`,
      [userId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/events/public — list without auth */
router.get("/public", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM events WHERE is_active = TRUE ORDER BY event_date ASC`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/events/:id/book — book seats (auth required) */
router.post("/:id/book", authenticate, async (req: any, res) => {
  const { seats } = req.body;
  const userId = req.user.id;
  const eventId = req.params.id;
  if (!seats || seats < 1) return res.status(400).json({ error: "Noto'g'ri o'rindiq soni" });
  try {
    const { rows: ev } = await pool.query("SELECT * FROM events WHERE id=$1 AND is_active=TRUE", [eventId]);
    if (!ev.length) return res.status(404).json({ error: "Tadbir topilmadi" });
    const event = ev[0];
    const available = event.capacity - event.taken;
    if (seats > available) return res.status(400).json({ error: "Yetarli o'rin yo'q" });

    const total = seats * event.price_per_seat;

    /* Upsert booking */
    const { rows: existing } = await pool.query(
      "SELECT id, seats FROM event_bookings WHERE event_id=$1 AND user_id=$2",
      [eventId, userId]
    );
    let finalSeats = seats;
    if (existing.length) {
      const diff = seats - existing[0].seats;
      if (event.taken + diff > event.capacity) return res.status(400).json({ error: "Yetarli o'rin yo'q" });
      await pool.query(
        "UPDATE event_bookings SET seats=$1, total=$2 WHERE event_id=$3 AND user_id=$4",
        [seats, total, eventId, userId]
      );
      await pool.query("UPDATE events SET taken = taken + $1 WHERE id=$2", [diff, eventId]);
    } else {
      await pool.query(
        "INSERT INTO event_bookings (event_id, user_id, seats, total) VALUES ($1,$2,$3,$4)",
        [eventId, userId, seats, total]
      );
      await pool.query("UPDATE events SET taken = taken + $1 WHERE id=$2", [seats, eventId]);
    }

    const { rows: updated } = await pool.query("SELECT * FROM events WHERE id=$1", [eventId]);
    res.json({ ok: true, seats: finalSeats, total, event: updated[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Admin CRUD ─────────────────────────────────────── */

/* GET /api/events/admin/all — admin: all events */
router.get("/admin/all", authenticate, async (req: any, res) => {
  if (!req.user.roles?.includes("admin")) return res.status(403).json({ error: "Ruxsat yo'q" });
  try {
    const { rows } = await pool.query("SELECT * FROM events ORDER BY created_at DESC");
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/events/admin — admin: create event */
router.post("/admin", authenticate, async (req: any, res) => {
  if (!req.user.roles?.includes("admin")) return res.status(403).json({ error: "Ruxsat yo'q" });
  const { league, title, home_team, away_team, event_date, venue, district,
          price_per_seat, capacity, accent, emoji, image_url, is_active } = req.body;
  if (!league || !title || !event_date || !venue) {
    return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events (league, title, home_team, away_team, event_date, venue, district,
        price_per_seat, capacity, taken, accent, emoji, image_url, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,$13) RETURNING *`,
      [league, title, home_team || "", away_team || "", event_date, venue, district || "",
       price_per_seat || 0, capacity || 100,
       accent || "from-primary/30 to-primary/10", emoji || "🏆",
       image_url || null, is_active !== false]
    );
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/events/admin/:id — admin: update event */
router.patch("/admin/:id", authenticate, async (req: any, res) => {
  if (!req.user.roles?.includes("admin")) return res.status(403).json({ error: "Ruxsat yo'q" });
  const { id } = req.params;
  const { league, title, home_team, away_team, event_date, venue, district,
          price_per_seat, capacity, accent, emoji, image_url, is_active } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE events SET
        league=$1, title=$2, home_team=$3, away_team=$4, event_date=$5,
        venue=$6, district=$7, price_per_seat=$8, capacity=$9,
        accent=$10, emoji=$11, image_url=$12, is_active=$13
       WHERE id=$14 RETURNING *`,
      [league || "", title || "", home_team || "", away_team || "",
       event_date, venue || "", district || "",
       price_per_seat ?? 0, capacity ?? 100,
       accent || "from-primary/30 to-primary/10", emoji || "🏆",
       image_url || null, is_active !== false, id]
    );
    if (!rows.length) return res.status(404).json({ error: "Topilmadi" });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE /api/events/admin/:id — admin: delete event */
router.delete("/admin/:id", authenticate, async (req: any, res) => {
  if (!req.user.roles?.includes("admin")) return res.status(403).json({ error: "Ruxsat yo'q" });
  try {
    await pool.query("DELETE FROM events WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/events/my-bookings — user's event bookings */
router.get("/my-bookings", authenticate, async (req: any, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT eb.*, e.title, e.league, e.home_team, e.away_team, e.event_date, e.venue, e.district, e.price_per_seat
       FROM event_bookings eb
       JOIN events e ON eb.event_id = e.id
       WHERE eb.user_id = $1
       ORDER BY eb.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

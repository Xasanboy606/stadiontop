import { Router } from "express";
import { pool } from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
const guard = [authenticate, requireRole("admin")];

/* GET /api/admin/stats */
router.get("/stats", ...guard, async (_req, res) => {
  try {
    const [users, stadiums, bookings, rev] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users"),
      pool.query("SELECT COUNT(*) FROM stadiums"),
      pool.query("SELECT COUNT(*) FROM bookings"),
      pool.query("SELECT COALESCE(SUM(paid_amount),0) as total FROM bookings WHERE status='confirmed'"),
    ]);
    res.json({
      users: parseInt(users.rows[0].count),
      stadiums: parseInt(stadiums.rows[0].count),
      bookings: parseInt(bookings.rows[0].count),
      revenue: parseInt(rev.rows[0].total),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/admin/stadiums */
router.get("/stadiums", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM stadiums ORDER BY created_at DESC");
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/stadiums/:id — full update (admin only) */
router.patch("/stadiums/:id", ...guard, async (req, res) => {
  const {
    name, district, address, description, size,
    price_day, price_night, facilities,
    has_referee, has_video, has_balls, has_bibs,
    lat, lng, images, status,
  } = req.body;

  try {
    const { rows: [stadium] } = await pool.query(
      `UPDATE stadiums SET
        name        = COALESCE($1, name),
        district    = COALESCE($2, district),
        address     = COALESCE($3, address),
        description = COALESCE($4, description),
        size        = COALESCE($5, size),
        price_day   = COALESCE($6, price_day),
        price_night = COALESCE($7, price_night),
        facilities  = COALESCE($8, facilities),
        has_referee = COALESCE($9, has_referee),
        has_video   = COALESCE($10, has_video),
        has_balls   = COALESCE($11, has_balls),
        has_bibs    = COALESCE($12, has_bibs),
        lat         = COALESCE($13, lat),
        lng         = COALESCE($14, lng),
        images      = COALESCE($15, images),
        status      = COALESCE($16, status),
        updated_at  = NOW()
       WHERE id = $17
       RETURNING *`,
      [
        name ?? null,
        district ?? null,
        address ?? null,
        description ?? null,
        size ?? null,
        price_day != null ? parseInt(price_day) : null,
        price_night != null ? parseInt(price_night) : null,
        facilities != null ? facilities : null,
        has_referee != null ? !!has_referee : null,
        has_video   != null ? !!has_video   : null,
        has_balls   != null ? !!has_balls   : null,
        has_bibs    != null ? !!has_bibs    : null,
        lat != null ? parseFloat(lat) : null,
        lng != null ? parseFloat(lng) : null,
        images != null ? images : null,
        status ?? null,
        req.params.id,
      ]
    );
    if (!stadium) return res.status(404).json({ error: "Stadion topilmadi" });
    res.json(stadium);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/stadiums/:id/status */
router.patch("/stadiums/:id/status", ...guard, async (req, res) => {
  const { status } = req.body;
  if (!["approved", "rejected", "pending"].includes(status)) {
    return res.status(400).json({ error: "Noto'g'ri status" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE stadiums SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Topilmadi" });
    const stadium = rows[0];

    /* Notify owner */
    const notifTitle = status === "approved"
      ? `✅ Stadion tasdiqlandi: ${stadium.name}`
      : status === "rejected"
      ? `❌ Stadion rad etildi: ${stadium.name}`
      : `⏳ Stadion ko'rib chiqilmoqda: ${stadium.name}`;
    const notifBody = status === "approved"
      ? "Sizning stadioningiz tasdiqlandi va mijozlarga ko'rinmoqda."
      : status === "rejected"
      ? "Sizning stadioningiz rad etildi. Batafsil ma'lumot uchun admin bilan bog'laning."
      : "Stadioningiz admin tomonidan ko'rib chiqilmoqda.";
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, type, meta) VALUES ($1,$2,$3,'admin',$4)`,
      [stadium.owner_id, notifTitle, notifBody, JSON.stringify({ stadium_id: stadium.id, status })]
    ).catch(() => {});

    res.json(stadium);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/admin/edit-requests */
router.get("/edit-requests", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT er.*, s.name as stadium_name, p.full_name
       FROM edit_requests er
       LEFT JOIN stadiums s ON s.id=er.stadium_id
       LEFT JOIN profiles p ON p.id=er.supervisor_id
       ORDER BY er.created_at DESC`
    );
    const mapped = rows.map((r) => ({
      ...r,
      stadiums: { name: r.stadium_name },
      profiles: { full_name: r.full_name },
    }));
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/edit-requests/:id */
router.patch("/edit-requests/:id", ...guard, async (req, res) => {
  const { action, admin_response } = req.body;
  if (!["approved", "rejected"].includes(action)) {
    return res.status(400).json({ error: "Noto'g'ri action" });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [er] } = await client.query("SELECT * FROM edit_requests WHERE id=$1", [req.params.id]);
    if (!er) { await client.query("ROLLBACK"); return res.status(404).json({ error: "Topilmadi" }); }

    await client.query(
      "UPDATE edit_requests SET status=$1, admin_response=$2, reviewed_at=NOW() WHERE id=$3",
      [action, admin_response || null, req.params.id]
    );

    if (action === "approved") {
      const numFields   = ["price_day","price_night"];
      const boolFields  = ["has_referee","has_video","has_balls","has_bibs"];
      const jsonFields  = ["facilities"];
      const textFields  = ["name","address","description","size","images"];
      const allowed = [...numFields, ...boolFields, ...jsonFields, ...textFields];

      if (allowed.includes(er.field_name)) {
        let val: unknown = er.new_value;
        if (numFields.includes(er.field_name))  val = parseInt(er.new_value);
        if (boolFields.includes(er.field_name)) val = er.new_value === "true";
        if (jsonFields.includes(er.field_name) || er.field_name === "images") {
          try { val = JSON.parse(er.new_value); } catch { val = er.new_value; }
        }
        await client.query(
          `UPDATE stadiums SET ${er.field_name}=$1, updated_at=NOW() WHERE id=$2`,
          [val, er.stadium_id]
        );
      }

      /* Notify owner that edit request was approved */
      await client.query(
        `INSERT INTO notifications (user_id, title, body, type, meta)
         SELECT owner_id, $1, $2, 'admin', $3 FROM stadiums WHERE id=$4`,
        [
          `✅ O'zgartirish tasdiqlandi`,
          `${er.field_name} maydoni yangilandi.`,
          JSON.stringify({ stadium_id: er.stadium_id, field: er.field_name }),
          er.stadium_id,
        ]
      ).catch(() => {});
    } else {
      /* Notify owner that edit request was rejected */
      await client.query(
        `INSERT INTO notifications (user_id, title, body, type, meta)
         SELECT owner_id, $1, $2, 'admin', $3 FROM stadiums WHERE id=$4`,
        [
          `❌ O'zgartirish rad etildi`,
          `${er.field_name} maydoni uchun so'rov rad etildi.${er.admin_response ? " Sabab: " + er.admin_response : ""}`,
          JSON.stringify({ stadium_id: er.stadium_id, field: er.field_name }),
          er.stadium_id,
        ]
      ).catch(() => {});
    }
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

/* GET /api/admin/profiles */
router.get("/profiles", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.created_at, p.full_name, p.phone, p.is_blocked,
              COALESCE(json_agg(ur.role) FILTER (WHERE ur.role IS NOT NULL), '[]') as roles
       FROM users u
       LEFT JOIN profiles p ON p.id=u.id
       LEFT JOIN user_roles ur ON ur.user_id=u.id
       GROUP BY u.id, u.email, u.created_at, p.full_name, p.phone, p.is_blocked
       ORDER BY u.created_at DESC LIMIT 200`
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/profiles/:id/block */
router.patch("/profiles/:id/block", ...guard, async (req, res) => {
  const { is_blocked } = req.body;
  try {
    await pool.query("UPDATE profiles SET is_blocked=$1 WHERE id=$2", [!!is_blocked, req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/profiles/:id/role — add or remove 'owner' role */
router.patch("/profiles/:id/role", ...guard, async (req, res) => {
  const { role, action } = req.body; // action: "add" | "remove"
  if (!["owner", "admin"].includes(role) || !["add", "remove"].includes(action)) {
    return res.status(400).json({ error: "Noto'g'ri so'rov" });
  }
  try {
    if (action === "add") {
      await pool.query(
        "INSERT INTO user_roles (user_id, role) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [req.params.id, role]
      );
    } else {
      await pool.query(
        "DELETE FROM user_roles WHERE user_id=$1 AND role=$2",
        [req.params.id, role]
      );
    }
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/admin/transactions */
router.get("/transactions", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT t.*, b.short_code, b.booking_date
       FROM transactions t LEFT JOIN bookings b ON b.id=t.booking_id
       ORDER BY t.created_at DESC LIMIT 100`
    );
    const mapped = rows.map((r) => ({
      ...r,
      bookings: { short_code: r.short_code, booking_date: r.booking_date },
    }));
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/admin/transactions/:id/release */
router.patch("/transactions/:id/release", ...guard, async (req, res) => {
  try {
    await pool.query(
      "UPDATE transactions SET escrow_status='released', released_at=NOW() WHERE id=$1",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/admin/stadiums — admin creates a stadium directly (auto-approved) */
router.post("/stadiums", ...guard, async (req, res) => {
  const {
    name, district, address, description, size,
    price_day, price_night, facilities,
    has_referee, has_video, has_balls, has_bibs,
    lat, lng, images,
  } = req.body;

  if (!name || !district || !address || !price_day || !price_night) {
    return res.status(400).json({ error: "Majburiy maydonlar: name, district, address, price_day, price_night" });
  }

  try {
    const { rows: [stadium] } = await pool.query(
      `INSERT INTO stadiums
        (owner_id, name, district, address, description, size,
         price_day, price_night, facilities,
         has_referee, has_video, has_balls, has_bibs,
         lat, lng, images, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'approved')
       RETURNING *`,
      [
        req.user!.id,
        name, district, address,
        description || null,
        size || "5x5",
        parseInt(price_day), parseInt(price_night),
        facilities || [],
        !!has_referee, !!has_video, !!has_balls, !!has_bibs,
        parseFloat(lat) || null,
        parseFloat(lng) || null,
        images || [],
      ]
    );
    res.json(stadium);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE /api/admin/stadiums/:id — admin deletes a stadium */
router.delete("/stadiums/:id", ...guard, async (req, res) => {
  try {
    await pool.query("DELETE FROM stadiums WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* ── Auto-create transfers table ── */
pool.query(`
  CREATE TABLE IF NOT EXISTS transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stadium_id UUID NOT NULL REFERENCES stadiums(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES users(id),
    admin_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

/* GET /api/admin/stadium-summaries — barcha stadionlar (bugungi bronlar + komissiya) */
router.get("/stadium-summaries", ...guard, async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { rows } = await pool.query(`
      SELECT
        s.id, s.name, s.district, s.status,
        COALESCE(b_today.cnt, 0)::INTEGER      AS today_bookings,
        COALESCE(b_today.paid_sum, 0)::INTEGER  AS today_paid,
        FLOOR(COALESCE(b_today.paid_sum, 0) * 0.1)::INTEGER AS today_commission
      FROM stadiums s
      LEFT JOIN (
        SELECT stadium_id, COUNT(*) AS cnt, SUM(paid_amount) AS paid_sum
        FROM bookings
        WHERE booking_date = $1 AND status = 'confirmed'
        GROUP BY stadium_id
      ) b_today ON b_today.stadium_id = s.id
      ORDER BY s.name
    `, [today]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/stadiums/:id/stats — bugun/hafta/oy bronlar soni */
router.get("/stadiums/:id/stats", ...guard, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { rows: [r] } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE booking_date = $2)::INTEGER                                    AS today,
        COUNT(*) FILTER (WHERE booking_date >= date_trunc('week',  CURRENT_DATE)::date)::INTEGER AS week,
        COUNT(*) FILTER (WHERE booking_date >= date_trunc('month', CURRENT_DATE)::date)::INTEGER AS month
      FROM bookings
      WHERE stadium_id = $1 AND status = 'confirmed'
    `, [req.params.id, today]);
    res.json(r ?? { today: 0, week: 0, month: 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/stadiums/:id/bookings?from=&to=&payment_status=&booking_status= */
router.get("/stadiums/:id/bookings", ...guard, async (req, res) => {
  const { from, to, payment_status, booking_status } = req.query as Record<string, string>;
  const conditions = ["b.stadium_id = $1"];
  const params: unknown[] = [req.params.id];
  let p = 2;
  if (from)                                  { conditions.push(`b.booking_date >= $${p++}`); params.push(from); }
  if (to)                                    { conditions.push(`b.booking_date <= $${p++}`); params.push(to); }
  if (payment_status && payment_status !== "all") { conditions.push(`b.payment_kind = $${p++}`); params.push(payment_status); }
  if (booking_status && booking_status !== "all") { conditions.push(`b.status = $${p++}`);       params.push(booking_status); }
  try {
    const { rows } = await pool.query(`
      SELECT b.*, s.name AS stadium_name, pr.full_name AS customer_name, pr.phone AS customer_phone
      FROM bookings b
      LEFT JOIN stadiums  s  ON s.id  = b.stadium_id
      LEFT JOIN profiles  pr ON pr.id = b.user_id
      WHERE ${conditions.join(" AND ")}
      ORDER BY b.booking_date DESC, b.hour DESC
    `, params);
    res.json(rows.map(r => ({
      ...r,
      stadiums:       { name: r.stadium_name },
      customer_name:  r.customer_name,
      customer_phone: r.customer_phone,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/stadiums/:id/financial?from=&to= */
router.get("/stadiums/:id/financial", ...guard, async (req, res) => {
  const { from, to } = req.query as Record<string, string>;
  const conds = ["b.stadium_id = $1", "b.status = 'confirmed'"];
  const params: unknown[] = [req.params.id];
  let p = 2;
  if (from) { conds.push(`b.booking_date >= $${p++}`); params.push(from); }
  if (to)   { conds.push(`b.booking_date <= $${p++}`); params.push(to); }
  try {
    const { rows: [fin] } = await pool.query(`
      SELECT
        COALESCE(SUM(b.total),                   0)::INTEGER AS total_expected,
        COALESCE(SUM(b.paid_amount),              0)::INTEGER AS total_paid,
        COALESCE(SUM(b.total - b.paid_amount),    0)::INTEGER AS total_pending
      FROM bookings b
      WHERE ${conds.join(" AND ")}
    `, params);
    const totalPaid   = Number(fin?.total_paid) || 0;
    const commission  = Math.floor(totalPaid * 0.1);
    const netToOwner  = totalPaid - commission;
    const { rows: [tx] } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::INTEGER AS transferred FROM transfers WHERE stadium_id = $1`,
      [req.params.id]
    );
    const transferred = Number(tx?.transferred) || 0;
    res.json({
      total_expected:   Number(fin?.total_expected) || 0,
      total_paid:       totalPaid,
      commission,
      net_to_owner:     netToOwner,
      transferred,
      pending_transfer: Math.max(0, netToOwner - transferred),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/stadiums/:id/transfers */
router.get("/stadiums/:id/transfers", ...guard, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.*, p.full_name AS admin_name
      FROM transfers t
      LEFT JOIN profiles p ON p.id = t.admin_id
      WHERE t.stadium_id = $1
      ORDER BY t.created_at DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* POST /api/admin/stadiums/:id/transfers */
router.post("/stadiums/:id/transfers", ...guard, async (req, res) => {
  const { amount, note } = req.body;
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: "Miqdor kiritilishi shart" });
  try {
    const { rows: [st] } = await pool.query("SELECT owner_id FROM stadiums WHERE id=$1", [req.params.id]);
    if (!st) return res.status(404).json({ error: "Stadion topilmadi" });
    const { rows: [tr] } = await pool.query(
      `INSERT INTO transfers (stadium_id, owner_id, admin_id, amount, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.params.id, st.owner_id, req.user!.id, parseInt(amount), note || null]
    );
    res.json(tr);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/owners — barcha owner rolidagi foydalanuvchilar */
router.get("/owners", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, p.full_name, p.phone
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'owner'
      LEFT JOIN profiles p ON p.id = u.id
      ORDER BY COALESCE(p.full_name, u.email)
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* GET /api/admin/unassigned-owners — stadioni yo'q egalar */
router.get("/unassigned-owners", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.email, p.full_name, p.phone
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.id AND ur.role = 'owner'
      LEFT JOIN profiles p ON p.id = u.id
      LEFT JOIN stadiums  s ON s.owner_id = u.id
      WHERE s.id IS NULL
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* PATCH /api/admin/stadiums/:id/assign-owner */
router.patch("/stadiums/:id/assign-owner", ...guard, async (req, res) => {
  const { owner_id } = req.body;
  if (!owner_id) return res.status(400).json({ error: "owner_id kerak" });
  try {
    const { rows: [role] } = await pool.query(
      "SELECT id FROM user_roles WHERE user_id=$1 AND role='owner'", [owner_id]
    );
    if (!role) return res.status(400).json({ error: "Bu foydalanuvchi owner roliga ega emas" });
    await pool.query("UPDATE stadiums SET owner_id=$1, updated_at=NOW() WHERE id=$2", [owner_id, req.params.id]);
    const { rows: [st] } = await pool.query("SELECT name FROM stadiums WHERE id=$1", [req.params.id]);
    await pool.query(
      `INSERT INTO notifications (user_id,title,body,type,meta) VALUES ($1,$2,$3,'admin',$4)`,
      [owner_id, "🏟️ Stadion biriktirildi!", `Sizga "${st?.name}" stadioni biriktirildi.`,
       JSON.stringify({ stadium_id: req.params.id })]
    ).catch(() => {});
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/* ── Events CRUD ─────────────────────────────────── */

/* GET /api/admin/events — list all events */
router.get("/events", ...guard, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM events ORDER BY created_at DESC");
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/admin/events — create event */
router.post("/events", ...guard, async (req, res) => {
  const { league, title, home_team, away_team, event_date, venue, district,
          price_per_seat, capacity, accent, emoji, image_url, is_active } = req.body;
  if (!league || !title || !event_date || !venue) {
    return res.status(400).json({ error: "Majburiy maydonlar: league, title, event_date, venue" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO events
        (league, title, home_team, away_team, event_date, venue, district,
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

/* PATCH /api/admin/events/:id — update event */
router.patch("/events/:id", ...guard, async (req, res) => {
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
    if (!rows.length) return res.status(404).json({ error: "Tadbir topilmadi" });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* DELETE /api/admin/events/:id — delete event */
router.delete("/events/:id", ...guard, async (req, res) => {
  try {
    await pool.query("DELETE FROM events WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

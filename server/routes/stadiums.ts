import { Router } from "express";
import { pool } from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

/* GET /api/stadiums — approved list */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM stadiums WHERE status='approved' ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/stadiums/booked-hours?date=YYYY-MM-DD
   Returns { [stadiumId]: number[] } of all booked hours for that date */
router.get("/booked-hours", async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.json({});
  try {
    const { rows } = await pool.query(
      "SELECT stadium_id, hour, duration FROM bookings WHERE booking_date=$1 AND status='confirmed'",
      [date]
    );
    const map: Record<string, number[]> = {};
    for (const r of rows) {
      if (!map[r.stadium_id]) map[r.stadium_id] = [];
      for (let h = r.hour; h < r.hour + r.duration; h++) {
        map[r.stadium_id].push(h);
      }
    }
    res.json(map);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/stadiums/:id */
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM stadiums WHERE id=$1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Topilmadi" });
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/stadiums/:id/slots?date=YYYY-MM-DD */
router.get("/:id/slots", async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.json([]);
  try {
    const { rows } = await pool.query(
      "SELECT hour, duration FROM bookings WHERE stadium_id=$1 AND booking_date=$2 AND status='confirmed'",
      [req.params.id, date]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/stadiums — owner creates stadium */
router.post("/", authenticate, requireRole("owner"), async (req, res) => {
  const {
    name, district, address, description, size,
    price_day, price_night, facilities, has_referee,
    has_video, has_balls, has_bibs, lat, lng, images,
  } = req.body;
  if (!name || !district || !address || !price_day || !price_night) {
    return res.status(400).json({ error: "Majburiy maydonlar to'ldirilmagan" });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO stadiums
        (owner_id,name,district,address,description,size,price_day,price_night,
         facilities,has_referee,has_video,has_balls,has_bibs,lat,lng,images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
       RETURNING *`,
      [
        req.user!.id, name, district, address, description || null, size || null,
        price_day, price_night,
        facilities || [], has_referee || false, has_video || false,
        has_balls || false, has_bibs || false,
        lat || null, lng || null, images || [],
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/stadiums/:id — owner/admin updates */
router.patch("/:id", authenticate, async (req, res) => {
  const allowed = [
    "name","district","address","description","size","price_day","price_night",
    "facilities","has_referee","has_video","has_balls","has_bibs","lat","lng","images","status",
  ];
  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([k]) => allowed.includes(k))
  );
  if (!Object.keys(updates).length) return res.status(400).json({ error: "Hech narsa o'zgartirilmadi" });

  try {
    const { rows: [st] } = await pool.query("SELECT owner_id FROM stadiums WHERE id=$1", [req.params.id]);
    if (!st) return res.status(404).json({ error: "Topilmadi" });
    const isOwner = st.owner_id === req.user!.id;
    const isAdmin = req.user!.roles.includes("admin");
    if (!isOwner && !isAdmin) return res.status(403).json({ error: "Ruxsat yo'q" });

    const sets = Object.keys(updates).map((k, i) => `${k}=$${i + 2}`).join(", ");
    const vals = [req.params.id, ...Object.values(updates)];
    const { rows } = await pool.query(
      `UPDATE stadiums SET ${sets}, updated_at=NOW() WHERE id=$1 RETURNING *`, vals
    );
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

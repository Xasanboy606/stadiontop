import { Router } from "express";
import { pool } from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();
const guard = [authenticate, requireRole("owner")];

/* Auto-create closed_slots table */
pool.query(`
  CREATE TABLE IF NOT EXISTS closed_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stadium_id UUID NOT NULL REFERENCES stadiums(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    hour SMALLINT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stadium_id, slot_date, hour)
  )
`).catch(() => {});

/* GET /api/owner/stadiums */
router.get("/stadiums", ...guard, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM stadiums WHERE owner_id=$1 ORDER BY created_at DESC",
      [req.user!.id]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/owner/bookings */
router.get("/bookings", ...guard, async (req, res) => {
  try {
    const { rows: stadiums } = await pool.query(
      "SELECT id FROM stadiums WHERE owner_id=$1", [req.user!.id]
    );
    if (!stadiums.length) return res.json([]);
    const ids = stadiums.map((s: any) => s.id);
    const { rows } = await pool.query(
      `SELECT b.*, s.name as stadium_name, p.full_name as customer_name, p.phone as customer_phone
       FROM bookings b
       LEFT JOIN stadiums s ON s.id=b.stadium_id
       LEFT JOIN profiles p ON p.id=b.user_id
       WHERE b.stadium_id = ANY($1::uuid[])
       ORDER BY b.booking_date DESC, b.hour DESC`,
      [ids]
    );
    const mapped = rows.map((r) => ({
      ...r,
      stadiums: { name: r.stadium_name },
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
    }));
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/owner/closed-slots?stadium_id=X&date=Y */
router.get("/closed-slots", ...guard, async (req: any, res) => {
  const { stadium_id, date } = req.query as { stadium_id?: string; date?: string };
  if (!stadium_id || !date) return res.json([]);
  try {
    /* Verify ownership */
    const { rows: own } = await pool.query(
      "SELECT id FROM stadiums WHERE id=$1 AND owner_id=$2", [stadium_id, req.user.id]
    );
    if (!own.length) return res.status(403).json({ error: "Ruxsat yo'q" });

    const { rows } = await pool.query(
      "SELECT hour FROM closed_slots WHERE stadium_id=$1 AND slot_date=$2 ORDER BY hour",
      [stadium_id, date]
    );
    res.json(rows.map((r: any) => r.hour));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/owner/closed-slots/toggle — toggle single slot open/closed */
router.post("/closed-slots/toggle", ...guard, async (req: any, res) => {
  const { stadium_id, date, hour } = req.body;
  if (!stadium_id || !date || hour == null) {
    return res.status(400).json({ error: "stadium_id, date, hour kerak" });
  }
  try {
    const { rows: own } = await pool.query(
      "SELECT id FROM stadiums WHERE id=$1 AND owner_id=$2", [stadium_id, req.user.id]
    );
    if (!own.length) return res.status(403).json({ error: "Ruxsat yo'q" });

    /* If already closed → open; else → close */
    const { rows: existing } = await pool.query(
      "SELECT id FROM closed_slots WHERE stadium_id=$1 AND slot_date=$2 AND hour=$3",
      [stadium_id, date, hour]
    );
    if (existing.length) {
      await pool.query(
        "DELETE FROM closed_slots WHERE stadium_id=$1 AND slot_date=$2 AND hour=$3",
        [stadium_id, date, hour]
      );
      res.json({ closed: false });
    } else {
      await pool.query(
        "INSERT INTO closed_slots (stadium_id, slot_date, hour) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
        [stadium_id, date, hour]
      );
      res.json({ closed: true });
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/owner/range-stats?from=YYYY-MM-DD&to=YYYY-MM-DD */
router.get("/range-stats", ...guard, async (req: any, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  try {
    const { rows: stadiums } = await pool.query(
      "SELECT id FROM stadiums WHERE owner_id=$1", [req.user.id]
    );
    if (!stadiums.length) {
      return res.json({
        total_bookings: 0, games_count: 0,
        expected_revenue: 0, paid_amount: 0,
        deposit_paid: 0, full_paid: 0, pending_amount: 0,
      });
    }
    const ids = stadiums.map((s: any) => s.id);
    const conds = ["b.stadium_id = ANY($1::uuid[])", "b.status = 'confirmed'"];
    const params: unknown[] = [ids];
    let p = 2;
    if (from) { conds.push(`b.booking_date >= $${p++}`); params.push(from); }
    if (to)   { conds.push(`b.booking_date <= $${p++}`); params.push(to); }

    const { rows: [s] } = await pool.query(`
      SELECT
        COUNT(*)::INTEGER                                                  AS total_bookings,
        COALESCE(SUM(b.duration),0)::INTEGER                               AS games_count,
        COALESCE(SUM(b.total),0)::INTEGER                                  AS expected_revenue,
        COALESCE(SUM(b.paid_amount),0)::INTEGER                            AS paid_amount,
        COALESCE(SUM(b.paid_amount) FILTER (WHERE b.payment_kind='deposit'),0)::INTEGER AS deposit_paid,
        COALESCE(SUM(b.paid_amount) FILTER (WHERE b.payment_kind='full'),  0)::INTEGER AS full_paid,
        COALESCE(SUM(b.total - b.paid_amount),0)::INTEGER                  AS pending_amount
      FROM bookings b
      WHERE ${conds.join(" AND ")}
    `, params);

    res.json({
      total_bookings:   s?.total_bookings   || 0,
      games_count:      s?.games_count      || 0,
      expected_revenue: s?.expected_revenue || 0,
      paid_amount:      s?.paid_amount      || 0,
      deposit_paid:     s?.deposit_paid     || 0,
      full_paid:        s?.full_paid        || 0,
      pending_amount:   s?.pending_amount   || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;

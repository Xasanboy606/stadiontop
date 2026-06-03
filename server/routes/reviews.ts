import { Router } from "express";
import { pool } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* GET /api/reviews/:stadiumId */
router.get("/:stadiumId", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, p.full_name FROM reviews r
       LEFT JOIN profiles p ON p.id=r.user_id
       WHERE r.stadium_id=$1 ORDER BY r.created_at DESC`,
      [req.params.stadiumId]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/reviews — upsert */
router.post("/", authenticate, async (req, res) => {
  const { stadium_id, booking_id, rating, comment } = req.body;
  if (!stadium_id || !rating) return res.status(400).json({ error: "Maydonlar kerak" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO reviews (user_id, stadium_id, booking_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, stadium_id) DO UPDATE SET rating=$4, comment=$5, created_at=NOW()
       RETURNING *`,
      [req.user!.id, stadium_id, booking_id || null, rating, comment || null]
    );
    // Update stadium avg rating
    await pool.query(
      `UPDATE stadiums SET
         rating = (SELECT ROUND(AVG(rating)::numeric, 1) FROM reviews WHERE stadium_id=$1),
         reviews = (SELECT COUNT(*) FROM reviews WHERE stadium_id=$1)
       WHERE id=$1`,
      [stadium_id]
    );
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

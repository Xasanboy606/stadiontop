import { Router } from "express";
import { pool } from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

/* GET /api/edit-requests — owner's requests */
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT er.*, s.name as stadium_name
       FROM edit_requests er LEFT JOIN stadiums s ON s.id=er.stadium_id
       WHERE er.supervisor_id=$1 ORDER BY er.created_at DESC`,
      [req.user!.id]
    );
    const mapped = rows.map((r) => ({ ...r, stadiums: { name: r.stadium_name } }));
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/edit-requests */
router.post("/", authenticate, requireRole("owner"), async (req, res) => {
  const { stadium_id, field_name, old_value, new_value } = req.body;
  if (!stadium_id || !field_name || !new_value) return res.status(400).json({ error: "Maydonlar kerak" });
  try {
    const { rows } = await pool.query(
      `INSERT INTO edit_requests (supervisor_id,stadium_id,field_name,old_value,new_value)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user!.id, stadium_id, field_name, old_value || null, new_value]
    );
    res.status(201).json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

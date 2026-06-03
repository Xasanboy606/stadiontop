import { Router } from "express";
import { pool } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* Auto-create notifications table */
pool.query(`
  CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

/* GET /api/notifications — current user's notifications */
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/notifications/:id/read */
router.patch("/:id/read", authenticate, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user!.id]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/notifications/read-all */
router.patch("/read-all", authenticate, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read=TRUE WHERE user_id=$1",
      [req.user!.id]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

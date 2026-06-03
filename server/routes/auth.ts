import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool } from "../db";
import { authenticate, signToken } from "../middleware/auth";

const router = Router();

/* auto-create reset tokens table */
pool.query(`
  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`).catch(() => {});

/* POST /api/auth/register */
router.post("/register", async (req, res) => {
  const { email, password, full_name, phone, as_owner } = req.body;
  if (!email || !password || !full_name) return res.status(400).json({ error: "Maydonlar to'ldirilmagan" });
  if (password.length < 6) return res.status(400).json({ error: "Parol kamida 6 ta belgi" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const exists = await client.query("SELECT id FROM users WHERE email=$1", [email.trim().toLowerCase()]);
    if (exists.rows.length) return res.status(400).json({ error: "Bu email allaqachon ro'yxatdan o'tgan" });

    const hash = await bcrypt.hash(password, 10);
    const { rows: [user] } = await client.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email.trim().toLowerCase(), hash]
    );
    await client.query(
      "INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3)",
      [user.id, full_name.trim(), phone?.trim() || null]
    );
    const role = as_owner ? "owner" : "user";
    await client.query(
      "INSERT INTO user_roles (user_id, role) VALUES ($1, $2)",
      [user.id, role]
    );
    await client.query("COMMIT");

    const roles = [role];
    const token = signToken({ id: user.id, email: user.email, roles });
    res.json({ token, user: { id: user.id, email: user.email, full_name, roles } });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

/* POST /api/auth/login */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email va parol kerak" });

  try {
    const { rows } = await pool.query(
      "SELECT u.id, u.email, u.password_hash, p.full_name, p.phone, p.avatar_url, p.is_blocked FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.email=$1",
      [email.trim().toLowerCase()]
    );
    if (!rows.length) return res.status(401).json({ error: "Email yoki parol noto'g'ri" });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
    if (user.is_blocked) return res.status(403).json({ error: "Hisob bloklangan" });

    const { rows: roleRows } = await pool.query(
      "SELECT role FROM user_roles WHERE user_id=$1", [user.id]
    );
    const roles = roleRows.map((r: any) => r.role);
    const token = signToken({ id: user.id, email: user.email, roles });
    res.json({
      token,
      user: {
        id: user.id, email: user.email, full_name: user.full_name,
        phone: user.phone, avatar_url: user.avatar_url, roles,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/auth/me */
router.get("/me", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT u.id, u.email, p.full_name, p.phone, p.avatar_url, p.is_blocked FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1",
      [req.user!.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Topilmadi" });
    const { rows: roleRows } = await pool.query(
      "SELECT role FROM user_roles WHERE user_id=$1", [req.user!.id]
    );
    const roles = roleRows.map((r: any) => r.role);
    res.json({ ...rows[0], roles });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/auth/me — update own profile */
router.patch("/me", authenticate, async (req, res) => {
  const { full_name, phone } = req.body;
  try {
    await pool.query(
      "UPDATE profiles SET full_name=$1, phone=$2, updated_at=NOW() WHERE id=$3",
      [full_name?.trim() || null, phone?.trim() || null, req.user!.id]
    );
    const { rows } = await pool.query(
      "SELECT u.id, u.email, p.full_name, p.phone, p.avatar_url FROM users u LEFT JOIN profiles p ON p.id=u.id WHERE u.id=$1",
      [req.user!.id]
    );
    res.json(rows[0]);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/auth/change-password — authenticated user changes own password */
router.patch("/change-password", authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: "Maydonlar to'ldirilmagan" });
  if (new_password.length < 6) return res.status(400).json({ error: "Yangi parol kamida 6 ta belgi" });

  try {
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE id=$1", [req.user!.id]);
    if (!rows.length) return res.status(404).json({ error: "Topilmadi" });
    const ok = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Joriy parol noto'g'ri" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, req.user!.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/auth/claim-first-admin */
router.post("/claim-first-admin", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT id FROM user_roles WHERE role='admin' LIMIT 1");
    if (rows.length) return res.status(400).json({ error: "Admin allaqachon mavjud" });
    await pool.query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'admin') ON CONFLICT DO NOTHING", [req.user!.id]);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/auth/forgot-password — generate reset token */
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email kerak" });

  try {
    const { rows } = await pool.query(
      "SELECT id, email FROM users WHERE email=$1",
      [email.trim().toLowerCase()]
    );
    /* Always return ok to avoid email enumeration */
    if (!rows.length) return res.json({ ok: true });

    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); /* 1 hour */

    /* Invalidate old tokens for this user */
    await pool.query(
      "UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",
      [user.id]
    );
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
      [user.id, token, expiresAt]
    );

    /* In production: send email with reset link */
    /* For development: return token directly */
    const resetLink = `/reset-password?token=${token}`;
    res.json({ ok: true, resetLink, token });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/auth/reset-password — apply new password */
router.post("/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: "Token va yangi parol kerak" });
  if (password.length < 6) return res.status(400).json({ error: "Parol kamida 6 ta belgi" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT t.id, t.user_id FROM password_reset_tokens t
       WHERE t.token=$1 AND t.used_at IS NULL AND t.expires_at > NOW()`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: "Token noto'g'ri yoki muddati o'tgan" });

    const { id: tokenId, user_id } = rows[0];
    const hash = await bcrypt.hash(password, 10);

    await client.query("UPDATE users SET password_hash=$1 WHERE id=$2", [hash, user_id]);
    await client.query(
      "UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1",
      [tokenId]
    );
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

export default router;

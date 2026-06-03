import bcrypt from "bcryptjs";
import { pool } from "./db";

async function seed() {
  const h = (pw: string) => bcrypt.hash(pw, 10);

  /* ── 1. Oddiy foydalanuvchi ── */
  const userHash = await h("test123");
  const { rows: [user] } = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2
     RETURNING id, email`,
    ["user@test.com", userHash]
  );
  await pool.query(
    `INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [user.id, "Test Foydalanuvchi", "+998901234567"]
  );
  await pool.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'user')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [user.id]
  );

  /* ── 2. Stadion egasi ── */
  const ownerHash = await h("test123");
  const { rows: [owner] } = await pool.query(
    `INSERT INTO users (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = $2
     RETURNING id, email`,
    ["owner@test.com", ownerHash]
  );
  await pool.query(
    `INSERT INTO profiles (id, full_name, phone) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    [owner.id, "Abdullayev Jasur", "+998907654321"]
  );
  await pool.query(
    `INSERT INTO user_roles (user_id, role) VALUES ($1, 'owner')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [owner.id]
  );

  console.log("\n✅ Seed muvaffaqiyatli yakunlandi!\n");
  console.log("┌─────────────────────────────────────────┐");
  console.log("│  ODDIY FOYDALANUVCHI                    │");
  console.log("│  Email : user@test.com                  │");
  console.log("│  Parol : test123                        │");
  console.log("├─────────────────────────────────────────┤");
  console.log("│  STADION EGASI                          │");
  console.log("│  Email : owner@test.com                 │");
  console.log("│  Parol : test123                        │");
  console.log("└─────────────────────────────────────────┘\n");

  await pool.end();
}

seed().catch((e) => { console.error("Seed xatosi:", e.message); process.exit(1); });

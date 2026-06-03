import { Pool, types } from "pg";
import dotenv from "dotenv";
dotenv.config();

// Return DATE columns as plain "YYYY-MM-DD" strings (no timezone conversion)
types.setTypeParser(types.builtins.DATE, (val: string) => val);

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "stadiontop",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

pool.on("error", (err) => {
  console.error("DB connection error:", err);
});

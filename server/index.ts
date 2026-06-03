import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { pool } from "./db";
import authRouter from "./routes/auth";
import stadiumsRouter from "./routes/stadiums";
import bookingsRouter from "./routes/bookings";
import reviewsRouter from "./routes/reviews";
import editRequestsRouter from "./routes/editRequests";
import adminRouter from "./routes/admin";
import ownerRouter from "./routes/owner";
import notificationsRouter from "./routes/notifications";
import settingsRouter from "./routes/settings";
import eventsRouter from "./routes/events";
import matchmakingRouter from "./routes/matchmaking";
import uploadRouter from "./routes/upload";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: ["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"] }));
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/stadiums", stadiumsRouter);
app.use("/api/bookings", bookingsRouter);
app.use("/api/reviews", reviewsRouter);
app.use("/api/edit-requests", editRequestsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/owner", ownerRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/events", eventsRouter);
app.use("/api/matchmaking", matchmakingRouter);
app.use("/api/upload", uploadRouter);
app.use("/uploads", express.static(require("path").join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.listen(PORT, async () => {
  try {
    await pool.query("SELECT 1");
    console.log(`✅ Server: http://localhost:${PORT}`);
    console.log(`✅ DB connected: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
  } catch (e) {
    console.error("❌ DB connection failed:", e);
  }
});

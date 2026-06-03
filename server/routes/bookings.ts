import { Router } from "express";
import { pool } from "../db";
import { authenticate } from "../middleware/auth";

const router = Router();

/* GET /api/bookings — user's bookings */
router.get("/", authenticate, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, s.name as stadium_name, s.district as stadium_district, s.address as stadium_address, s.lat as stadium_lat, s.lng as stadium_lng
       FROM bookings b LEFT JOIN stadiums s ON s.id=b.stadium_id
       WHERE b.user_id=$1 ORDER BY b.booking_date DESC, b.hour DESC`,
      [req.user!.id]
    );
    const mapped = rows.map((r) => ({
      ...r,
      stadiums: { name: r.stadium_name, district: r.stadium_district, address: r.stadium_address, lat: r.stadium_lat, lng: r.stadium_lng },
    }));
    res.json(mapped);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* POST /api/bookings — create booking */
router.post("/", authenticate, async (req, res) => {
  const {
    stadium_id, booking_date, hour, duration, base_price, addons_price,
    service_fee, total, paid_amount, payment_kind, payment_provider, addons,
  } = req.body;

  const short_code = String(Math.floor(100000 + Math.random() * 900000));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Check overlap
    const overlap = await client.query(
      `SELECT id FROM bookings WHERE stadium_id=$1 AND booking_date=$2 AND status='confirmed'
       AND (hour < ($3::int + $4::int) AND hour + duration > $3::int)`,
      [stadium_id, booking_date, hour, duration]
    );
    if (overlap.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Bu vaqt allaqachon band" });
    }

    const { rows: [bk] } = await client.query(
      `INSERT INTO bookings
        (user_id,stadium_id,booking_date,hour,duration,base_price,addons_price,
         service_fee,total,paid_amount,payment_kind,payment_provider,addons,short_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user!.id, stadium_id, booking_date, hour, duration || 1,
        base_price, addons_price || 0, service_fee || 0, total, paid_amount,
        payment_kind, payment_provider, addons || [], short_code,
      ]
    );

    await client.query(
      `INSERT INTO transactions (booking_id,user_id,amount,provider,status,external_ref)
       VALUES ($1,$2,$3,$4,'success',$5)`,
      [bk.id, req.user!.id, paid_amount, payment_provider, `SIM-${Date.now()}`]
    );

    // ── Notifications ──────────────────────────────
    const { rows: [stadium] } = await client.query(
      "SELECT name, owner_id FROM stadiums WHERE id=$1", [stadium_id]
    );
    const stadiumName = stadium?.name ?? "Stadion";
    const ownerId = stadium?.owner_id;

    const timeLabel = `${String(hour).padStart(2,"0")}:00–${String(hour + (duration||1)).padStart(2,"0")}:00`;
    const amountFmt = Number(paid_amount).toLocaleString("ru-RU") + " so'm";

    // 1. Foydalanuvchiga
    await client.query(
      `INSERT INTO notifications (user_id,title,body,type,meta) VALUES ($1,$2,$3,'booking',$4)`,
      [
        req.user!.id,
        "✅ Bron muvaffaqiyatli!",
        `${stadiumName} stadioniga ${booking_date} kuni ${timeLabel} uchun bron qildingiz. To'lov: ${amountFmt}. Kod: ${bk.short_code}`,
        JSON.stringify({ booking_id: bk.id, short_code: bk.short_code }),
      ]
    );

    // 2. Stadion egasiga (faqat o'sha stadion egasi)
    if (ownerId && ownerId !== req.user!.id) {
      await client.query(
        `INSERT INTO notifications (user_id,title,body,type,meta) VALUES ($1,$2,$3,'booking',$4)`,
        [
          ownerId,
          "🏟️ Yangi bron keldi!",
          `${stadiumName}: ${booking_date} ${timeLabel} uchun ${amountFmt} to'lov bilan bron qilindi. Bron kodi: ${bk.short_code}`,
          JSON.stringify({ booking_id: bk.id, short_code: bk.short_code, stadium_id }),
        ]
      );
    }

    // 3. Barcha adminlarga
    const { rows: admins } = await client.query(
      "SELECT user_id FROM user_roles WHERE role='admin'"
    );
    for (const admin of admins) {
      if (admin.user_id === req.user!.id || admin.user_id === ownerId) continue;
      await client.query(
        `INSERT INTO notifications (user_id,title,body,type,meta) VALUES ($1,$2,$3,'admin',$4)`,
        [
          admin.user_id,
          "📋 Yangi bron (Admin)",
          `${stadiumName}: ${booking_date} ${timeLabel}, ${amountFmt}. Kod: ${bk.short_code}`,
          JSON.stringify({ booking_id: bk.id, short_code: bk.short_code, stadium_id }),
        ]
      );
    }
    // ──────────────────────────────────────────────

    await client.query("COMMIT");
    res.status(201).json(bk);
  } catch (e: any) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

/* PATCH /api/bookings/:id/cancel */
router.patch("/:id/cancel", authenticate, async (req, res) => {
  try {
    const { rows: [bk] } = await pool.query(
      "SELECT * FROM bookings WHERE id=$1 AND user_id=$2", [req.params.id, req.user!.id]
    );
    if (!bk) return res.status(404).json({ error: "Topilmadi" });
    if (bk.status !== "confirmed") return res.status(400).json({ error: "Bekor qilish mumkin emas" });

    const gameMs = new Date(`${bk.booking_date}T${String(bk.hour).padStart(2, "0")}:00:00`).getTime();
    const hoursLeft = (gameMs - Date.now()) / 3_600_000;
    const refundPct = hoursLeft >= 24 ? 100 : hoursLeft >= 2 ? 50 : 0;
    const refundAmt = Math.round(bk.paid_amount * refundPct / 100);

    await pool.query(
      `UPDATE bookings SET status='cancelled', cancelled_at=NOW(),
       refund_amount=$1, cancellation_reason=$2 WHERE id=$3`,
      [refundAmt, "Foydalanuvchi tomonidan bekor qilindi", req.params.id]
    );
    if (refundAmt > 0) {
      await pool.query(
        "UPDATE transactions SET escrow_status='refunded' WHERE booking_id=$1", [req.params.id]
      );
    }
    res.json({ refund_amount: refundAmt, refund_pct: refundPct });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* GET /api/bookings/verify/:token — QR verify */
router.get("/verify/:token", authenticate, async (req, res) => {
  const { token } = req.params;
  const isUuid = /^[0-9a-f-]{36}$/i.test(token);
  try {
    const { rows } = await pool.query(
      `SELECT b.*, s.name as stadium_name FROM bookings b LEFT JOIN stadiums s ON s.id=b.stadium_id
       WHERE ${isUuid ? "b.qr_token=$1" : "b.short_code=$1"}`,
      [isUuid ? token : token.toUpperCase()]
    );
    if (!rows.length) return res.status(404).json({ error: "Bron topilmadi" });
    const bk = rows[0];
    if (bk.status !== "confirmed") return res.status(400).json({ error: `Status: ${bk.status}`, booking: bk });
    await pool.query("UPDATE bookings SET verified_at=NOW() WHERE id=$1", [bk.id]);
    res.json({ ok: true, booking: bk });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

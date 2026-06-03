import { Router } from "express";
import { pool } from "../db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

/* Auto-create site_settings table */
pool.query(`
  CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`).catch(() => {});

export const DEFAULT_SETTINGS = {
  hero: {
    slides: [
      { url: "https://loremflickr.com/1920/1080/camp,nou?lock=1",        label: "Camp Nou · Barcelona" },
      { url: "https://loremflickr.com/1920/1080/bernabeu,stadium?lock=1", label: "Santiago Bernabéu · Madrid" },
      { url: "https://loremflickr.com/1920/1080/wembley,stadium?lock=1",  label: "Wembley Stadium · London" },
      { url: "https://loremflickr.com/1920/1080/allianz,arena?lock=1",    label: "Allianz Arena · München" },
    ],
    texts: {
      uz: {
        badge:    "Toshkent · 100+ stadion",
        line1:    "Maydon top.",
        line2:    "O'yna.",
        line3:    "G'olib bo'l.",
        subtitle: "Toshkentdagi 100+ stadiondan birini real vaqtda band qiling.",
      },
      ru: {
        badge:    "Ташкент · 100+ стадионов",
        line1:    "Найди поле.",
        line2:    "Играй.",
        line3:    "Побеждай.",
        subtitle: "Забронируйте одно из 100+ полей Ташкента в реальном времени.",
      },
    },
  },
  stats: [
    { value: "100+",    label_uz: "Stadion",       label_ru: "Стадионов" },
    { value: "10 000+", label_uz: "Bron",          label_ru: "Броней" },
    { value: "4.9",     label_uz: "Reyting",       label_ru: "Рейтинг" },
    { value: "5 000+",  label_uz: "Foydalanuvchi", label_ru: "Пользователей" },
  ],
  sections: {
    howItWorks: true,
    trustStats: true,
    ctaBanner:  true,
    footer:     true,
  },
  howItWorks: [
    { step: "01", title: "Stadion toping",     sub: "Tuman, vaqt va narx bo'yicha filtrlab eng mos maydonni tanlang.",                   accent: "#22c55e", tag: "Smart qidiruv" },
    { step: "02", title: "Onlayn bron qiling", sub: "Qulay vaqtni tanlang — to'liq yoki 30% depozit bilan bir necha soniyada bandlang.", accent: "#f59e0b", tag: "Tezkor to'lov" },
    { step: "03", title: "O'ynang!",           sub: "QR-kod orqali kirish. Hech qanday qog'oz, navbat yoki qo'ng'iroq yo'q.",           accent: "#8b5cf6", tag: "QR kirish"    },
  ],
  ownerBenefits: [
    { text: "Real vaqtda daromad statistikasi" },
    { text: "Avtomatik bron va to'lov tizimi" },
    { text: "Escrow orqali himoyalangan to'lovlar" },
    { text: "5 000+ faol foydalanuvchi bazasi" },
    { text: "QR kirish va mijoz boshqaruvi" },
    { text: "SEO va marketing yordami" },
  ],
  cta: {
    title_uz:    "Stadioningizni\nbiz bilan boshqaring",
    title_ru:    "Управляйте\nстадионом с нами",
    subtitle_uz: "Stadion egasimisiz? Platformamizga qo'shiling va onlayn bronlarni avtomatlashtiring.",
    subtitle_ru: "Вы владелец стадиона? Присоединяйтесь к нашей платформе.",
    telegramLink: "https://t.me/xmanydv",
  },
  contact: {
    phone:      "+998 90 398 02 32",
    address_uz: "Toshkent, O'zbekiston",
    address_ru: "Ташкент, Узбекистан",
    telegram:   "https://t.me/xmanydv",
  },
};

function deepMerge(base: any, override: any): any {
  const result = { ...base };
  for (const key of Object.keys(override ?? {})) {
    if (
      typeof override[key] === "object" &&
      !Array.isArray(override[key]) &&
      override[key] !== null &&
      typeof base[key] === "object" &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

/* GET /api/settings — public */
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT data FROM site_settings WHERE id=1");
    const stored = rows[0]?.data ?? {};
    res.json(deepMerge(DEFAULT_SETTINGS, stored));
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

/* PATCH /api/settings — admin only */
router.patch("/", authenticate, requireRole("admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(
      `INSERT INTO site_settings (id, data, updated_at) VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data=$1, updated_at=NOW()
       RETURNING data`,
      [JSON.stringify(req.body)]
    );
    res.json(rows[0].data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

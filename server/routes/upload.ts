import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate } from "../middleware/auth";

const router = Router();

const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error("Faqat rasm fayllari (jpeg, png, webp)") as any, ok);
  },
});

/* POST /api/upload — upload single image, returns { url } */
router.post("/", authenticate, upload.single("file"), (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: "Fayl yuklanmadi" });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;

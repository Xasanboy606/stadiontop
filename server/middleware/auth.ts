import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: string;
  email: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const SECRET = process.env.JWT_SECRET || "stadiontop_secret";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token yo'q" });
  try {
    req.user = jwt.verify(token, SECRET) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: "Token noto'g'ri" });
  }
};

export const requireRole = (role: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.roles.includes(role)) {
      return res.status(403).json({ error: "Ruxsat yo'q" });
    }
    next();
  };

export const signToken = (user: AuthUser) =>
  jwt.sign(user, SECRET, { expiresIn: "7d" });

import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../conf/config";
import { prisma } from "../conf/database";
import type { AuthenticatedRequest } from "../types/auth";

export type { AuthenticatedRequest } from "../types/auth";

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.roster_session;
  if (typeof token !== "string") {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
    return;
  }

  let userId: string;
  try {
    const claims = jwt.verify(token, config.JWT_SECRET);
    if (typeof claims === "string" || typeof claims.sub !== "string") {
      res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
      return;
    }
    userId = claims.sub;
  } catch {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (!user?.isActive) {
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
    return;
  }
  req.userId = userId;
  req.userRole = user.role;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== "ADMIN") {
    res.status(403).json({ error: { code: "FORBIDDEN", message: "Administrator access is required." } });
    return;
  }
  next();
}

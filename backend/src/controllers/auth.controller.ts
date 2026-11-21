import type { RequestHandler, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../conf/config";
import { findUserForLogin, findUserForSession } from "../models/auth.model";
import { loginSchema } from "../lib/validation";
import type { AuthenticatedRequest } from "../types/auth";

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-user-password", 12);

const cookieOptions = {
  httpOnly: true,
  secure: config.COOKIE_SECURE === "true",
  sameSite: "strict" as const,
  path: "/",
};

function issueSession(user: { id: string; email: string; name: string; role: string }, res: Response) {
  const token = jwt.sign({}, config.JWT_SECRET, {
    subject: user.id,
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
  res.cookie("roster_session", token, cookieOptions);
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await findUserForLogin(input.email.toLowerCase());
  const passwordMatches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!user || !user.isActive || !passwordMatches) {
    res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "Email or password is incorrect." } });
    return;
  }
  res.json({ user: issueSession(user, res) });
};

export const logout: RequestHandler = (_req, res) => {
  res.clearCookie("roster_session", cookieOptions);
  res.status(204).end();
};

export const getCurrentUser: RequestHandler = async (req, res) => {
  const authenticatedRequest = req as AuthenticatedRequest;
  const user = await findUserForSession(authenticatedRequest.userId!);
  if (!user || !user.isActive) {
    res.clearCookie("roster_session", cookieOptions);
    res.status(401).json({ error: { code: "UNAUTHENTICATED", message: "Please sign in." } });
    return;
  }
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
};

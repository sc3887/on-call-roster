import { Router } from "express";
import { getCurrentUser, login, logout } from "../controllers/auth.controller";
import { loginRateLimit } from "../middleware/login-rate-limit";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.post("/login", loginRateLimit, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);

export default router;

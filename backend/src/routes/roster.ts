import { Router } from "express";
import {
  addShift,
  editShift,
  getMembers,
  getRoster,
  getTodayRoster,
  removeShift,
} from "../controllers/roster.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/members", getMembers);
router.get("/shifts/today", getTodayRoster);
router.get("/shifts", getRoster);
router.post("/shifts", addShift);
router.put("/shifts/:id", editShift);
router.delete("/shifts/:id", removeShift);

export default router;

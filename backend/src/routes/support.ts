import { Router } from "express";
import {
  addUserToRosterController,
  createUser,
  getTickets,
  getUsers,
  openTicket,
  replyToTicket,
  updateTicketStatus,
  updateUserActive,
} from "../controllers/support.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const router = Router();

router.use(requireAuth);
router.get("/tickets", getTickets);
router.post("/tickets", openTicket);
router.post("/tickets/:id/messages", replyToTicket);
router.patch("/tickets/:id/status", requireAdmin, updateTicketStatus);
router.get("/users", requireAdmin, getUsers);
router.post("/users", requireAdmin, createUser);
router.post("/users/:id/roster", requireAdmin, addUserToRosterController);
router.patch("/users/:id/active", requireAdmin, updateUserActive);

export default router;

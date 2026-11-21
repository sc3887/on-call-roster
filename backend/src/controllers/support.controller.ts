import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createUserSchema } from "../lib/validation";
import { AppError } from "../lib/errors";
import {
  addUserToRoster,
  changeSupportTicketStatus,
  createManagedUser,
  createSupportTicket,
  createTicketReply,
  findSupportAuthor,
  findSupportTicket,
  listManagedUsers,
  listSupportTickets,
  setManagedUserActive,
} from "../models/support.model";
import type { AuthenticatedRequest } from "../types/auth";

const ticketInputSchema = z.object({
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(4000),
});
const messageSchema = z.object({ body: z.string().trim().min(1).max(4000) });
const statusSchema = z.object({ status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]) });
const activeSchema = z.object({ isActive: z.boolean() });

export const getTickets: RequestHandler = async (req, res) => {
  const { viewer, tickets } = await listSupportTickets((req as AuthenticatedRequest).userId!);
  if (!viewer?.isActive) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");
  }
  res.json({ tickets });
};

export const openTicket: RequestHandler = async (req, res) => {
  const input = ticketInputSchema.parse(req.body);
  const userId = (req as AuthenticatedRequest).userId!;
  const ticket = await createSupportTicket(input, userId);
  res.status(201).json({ ticket });
};

export const replyToTicket: RequestHandler = async (req, res) => {
  const input = messageSchema.parse(req.body);
  const ticketId = z.string().parse(req.params.id);
  const userId = (req as AuthenticatedRequest).userId!;
  const ticket = await findSupportTicket(ticketId);
  if (!ticket) {
    throw new AppError(404, "NOT_FOUND", "Support request was not found.");
  }

  const author = await findSupportAuthor(userId);
  if (!author?.isActive || (ticket.requesterId !== userId && author.role !== "ADMIN")) {
    throw new AppError(404, "NOT_FOUND", "Support request was not found.");
  }
  if (ticket.status === "RESOLVED") {
    throw new AppError(409, "TICKET_RESOLVED", "Reopen the request before replying.");
  }

  const message = await createTicketReply(ticket.id, userId, author.role, ticket.status, input.body);
  res.status(201).json({ message });
};

export const updateTicketStatus: RequestHandler = async (req, res) => {
  const { status } = statusSchema.parse(req.body);
  const ticket = await changeSupportTicketStatus(z.string().parse(req.params.id), status);
  res.json({ ticket });
};

export const getUsers: RequestHandler = async (_req, res) => {
  res.json({ users: await listManagedUsers() });
};

export const createUser: RequestHandler = async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const { user, member } = await createManagedUser({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, 12),
    role: input.role,
  });
  res.status(201).json({ user, member });
};

export const addUserToRosterController: RequestHandler = async (req, res) => {
  const member = await addUserToRoster(z.string().parse(req.params.id));
  if (!member) {
    throw new AppError(404, "NOT_FOUND", "An active user account was not found.");
  }
  res.json({ member });
};

export const updateUserActive: RequestHandler = async (req, res) => {
  const { isActive } = activeSchema.parse(req.body);
  const userId = z.string().parse(req.params.id);
  const actorId = (req as AuthenticatedRequest).userId!;
  if (userId === actorId && !isActive) {
    throw new AppError(400, "CANNOT_DISABLE_SELF", "You cannot deactivate your own account.");
  }

  const user = await setManagedUserActive(userId, isActive);
  if (!user) {
    throw new AppError(404, "NOT_FOUND", "User was not found.");
  }
  res.json({ user });
};

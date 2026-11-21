import type { RequestHandler } from "express";
import { z } from "zod";
import { AppError } from "../lib/errors";
import { createShiftSchema, memberPaginationSchema, paginationSchema, shiftSchema } from "../lib/validation";
import { createShift, deleteShift, findTeamMemberForUser, getTodayShifts, listMembers, listShifts, updateShift } from "../models/roster.model";
import type { AuthenticatedRequest } from "../types/auth";

export const getMembers: RequestHandler = async (req, res) => {
  const viewer = req as AuthenticatedRequest;
  const input = memberPaginationSchema.parse(req.query);
  const [result, currentMember] = await Promise.all([
    listMembers(input),
    findTeamMemberForUser(viewer.userId!),
  ]);
  res.json({ ...result, currentMember, currentMemberId: currentMember?.id ?? null });
};

export const getTodayRoster: RequestHandler = async (_req, res) => {
  res.json(await getTodayShifts());
};

export const getRoster: RequestHandler = async (req, res) => {
  const input = paginationSchema.parse(req.query);
  const viewer = req as AuthenticatedRequest;
  res.json(await listShifts(input, { userId: viewer.userId!, role: viewer.userRole! }));
};

export const addShift: RequestHandler = async (req, res) => {
  const viewer = req as AuthenticatedRequest;
  if (viewer.userRole === "ADMIN") {
    const input = createShiftSchema().parse(req.body);
    res.status(201).json({ shift: await createShift(input) });
    return;
  }

  const member = await findTeamMemberForUser(viewer.userId!);
  if (!member) {
    throw new AppError(403, "ROSTER_MEMBERSHIP_REQUIRED", "Your account is not linked to a team member.");
  }
  const memberId = member.id;
  const input = createShiftSchema().parse({ ...req.body, memberId });
  res.status(201).json({ shift: await createShift(input) });
};

export const editShift: RequestHandler = async (req, res) => {
  const input = shiftSchema.parse(req.body);
  const viewer = req as AuthenticatedRequest;
  res.json({ shift: await updateShift(z.string().parse(req.params.id), input, { userId: viewer.userId!, role: viewer.userRole! }) });
};

export const removeShift: RequestHandler = async (req, res) => {
  const viewer = req as AuthenticatedRequest;
  await deleteShift(z.string().parse(req.params.id), { userId: viewer.userId!, role: viewer.userRole! });
  res.status(204).end();
};
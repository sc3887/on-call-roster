import { Prisma } from "@prisma/client";
import { prisma } from "../conf/database";
import { dateOnlyInTimeZone } from "../lib/dates";
import { AppError } from "../lib/errors";
import type { ShiftInput, ShiftSearch } from "../types/roster";

const shiftInclude = {
  member: { select: { id: true, name: true, email: true, phone: true, role: true } },
} satisfies Prisma.ShiftInclude;

const shiftIncludeWithOwner = {
  member: { select: { id: true, name: true, email: true, phone: true, role: true, userId: true } },
} satisfies Prisma.ShiftInclude;

export interface ShiftViewer {
  userId: string;
  role: string;
}

export async function listMembers(input: { page: number; limit: number }) {
  const [members, total] = await prisma.$transaction([
    prisma.teamMember.findMany({
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      select: { id: true, name: true, email: true, phone: true, role: true },
    }),
    prisma.teamMember.count(),
  ]);
  return {
    members,
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
}

export function findTeamMemberForUser(userId: string) {
  return prisma.teamMember.findUnique({
    where: { userId },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
}

export async function getTodayShifts() {
  const date = dateOnlyInTimeZone();
  const today = toShiftDate(date);
  const [shifts, nextShift] = await prisma.$transaction([
    prisma.shift.findMany({
      where: { date: today },
      include: shiftInclude,
      orderBy: { member: { name: "asc" } },
    }),
    prisma.shift.findFirst({
      where: { date: { gt: today } },
      include: shiftInclude,
      orderBy: [{ date: "asc" }, { member: { name: "asc" } }],
    }),
  ]);
  return { shifts, date, nextShift };
}

export function buildShiftWhere(input: ShiftSearch, today = dateOnlyInTimeZone()): Prisma.ShiftWhereInput {
  return {
    date: input.includePast ? { lt: toShiftDate(today) } : { gte: toShiftDate(today) },
    ...(input.search ? {
      OR: [
        { member: { is: { name: { contains: input.search, mode: "insensitive" } } } },
        { member: { is: { email: { contains: input.search, mode: "insensitive" } } } },
        { member: { is: { role: { contains: input.search, mode: "insensitive" } } } },
        { notes: { contains: input.search, mode: "insensitive" } },
      ],
    } : {}),
  };
}

export async function listShifts(input: ShiftSearch, viewer: ShiftViewer) {
  const where = buildShiftWhere(input);
  const dateOrder = input.includePast ? "desc" : "asc";
  const [rows, total] = await prisma.$transaction([
    prisma.shift.findMany({
      where,
      include: shiftIncludeWithOwner,
      orderBy: [{ date: dateOrder }, { id: dateOrder }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.shift.count({ where }),
  ]);
  const shifts = rows.map(({ member, ...shift }) => ({
    ...shift,
    member: {
      id: member.id,
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
    },
    canManage: viewer.role === "ADMIN" || member.userId === viewer.userId,
  }));
  return {
    shifts,
    pagination: { page: input.page, limit: input.limit, total, totalPages: Math.ceil(total / input.limit) },
  };
}

function toShiftDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function createShift(input: ShiftInput) {
  return prisma.shift.create({
    data: { memberId: input.memberId, date: toShiftDate(input.date), notes: input.notes || null },
    include: shiftInclude,
  });
}

export async function updateShift(id: string, input: ShiftInput, viewer: ShiftViewer) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.shift.findUnique({
      where: { id },
      select: { id: true, memberId: true, date: true, member: { select: { userId: true } } },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "The requested shift was not found.");
    if (viewer.role !== "ADMIN" && existing.member.userId !== viewer.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage your own shifts.");
    }
    const existingDate = existing.date.toISOString().slice(0, 10);
    if (existingDate < dateOnlyInTimeZone()) {
      throw new AppError(400, "VALIDATION_ERROR", "A shift in the past cannot be edited.");
    }
    if (input.date < dateOnlyInTimeZone()) {
      throw new AppError(400, "VALIDATION_ERROR", "A shift cannot be moved to a date in the past.");
    }

    return transaction.shift.update({
      where: { id },
      data: {
        memberId: viewer.role === "ADMIN" ? input.memberId : existing.memberId,
        date: toShiftDate(input.date),
        notes: input.notes || null,
      },
      include: shiftInclude,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function deleteShift(id: string, viewer: ShiftViewer) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.shift.findUnique({
      where: { id },
      select: { id: true, member: { select: { userId: true } } },
    });
    if (!existing) throw new AppError(404, "NOT_FOUND", "The requested shift was not found.");
    if (viewer.role !== "ADMIN" && existing.member.userId !== viewer.userId) {
      throw new AppError(403, "FORBIDDEN", "You can only manage your own shifts.");
    }
    return transaction.shift.delete({ where: { id } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
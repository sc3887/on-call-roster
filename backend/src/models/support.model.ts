import { prisma } from "../conf/database";
import { AppError } from "../lib/errors";

const ticketInclude = {
  requester: { select: { id: true, name: true, email: true } },
  messages: {
    include: { author: { select: { id: true, name: true, email: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
};

export async function listSupportTickets(userId: string) {
  const viewer = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  });
  if (!viewer?.isActive) return { viewer, tickets: [] };
  const tickets = await prisma.supportTicket.findMany({
    where: viewer.role === "ADMIN" ? {} : { requesterId: userId },
    include: ticketInclude,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
  });
  return { viewer, tickets };
}

export function createSupportTicket(input: { subject: string; body: string }, requesterId: string) {
  return prisma.supportTicket.create({
    data: {
      subject: input.subject,
      requesterId,
      messages: { create: { body: input.body, authorId: requesterId } },
    },
    include: ticketInclude,
  });
}

export function findSupportTicket(id: string) {
  return prisma.supportTicket.findUnique({
    where: { id },
    select: { id: true, requesterId: true, status: true },
  });
}

export function findSupportAuthor(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { role: true, isActive: true },
  });
}

export function createTicketReply(ticketId: string, authorId: string, authorRole: string, currentStatus: string, body: string) {
  return prisma.$transaction(async (transaction) => {
    const message = await transaction.ticketMessage.create({
      data: { body, ticketId, authorId },
      include: { author: { select: { id: true, name: true, email: true, role: true } } },
    });
    await transaction.supportTicket.update({
      where: { id: ticketId },
      data: authorRole === "ADMIN" && currentStatus === "OPEN" ? { status: "IN_PROGRESS" } : {},
    });
    return message;
  });
}

export function changeSupportTicketStatus(id: string, status: "OPEN" | "IN_PROGRESS" | "RESOLVED") {
  return prisma.supportTicket.update({ where: { id }, data: { status } });
}

export async function listManagedUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      teamMember: { select: { id: true } },
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  return users.map(({ teamMember, ...user }) => ({
    ...user,
    teamMemberId: teamMember?.id ?? null,
  }));
}

export async function addUserToRoster(userId: string) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isActive: true },
    });
    if (!user?.isActive) return null;

    const existingMember = await transaction.teamMember.findUnique({
      where: { email: user.email },
    });
    if (existingMember) {
      return transaction.teamMember.update({
        where: { id: existingMember.id },
        data: { userId: user.id },
      });
    }

    return transaction.teamMember.create({
      data: {
        name: user.name || user.email,
        email: user.email,
        role: "Team member",
        userId: user.id,
      },
    });
  });
}

export function createManagedUser(input: { name: string; email: string; passwordHash: string; role: "USER" | "ADMIN" }) {
  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        role: input.role,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
    const member = await transaction.teamMember.upsert({
      where: { email: user.email },
      update: { userId: user.id },
      create: {
        name: user.name,
        email: user.email,
        role: "Team member",
        userId: user.id,
      },
    });
    return { user: { ...user, teamMemberId: member.id }, member };
  });
}

export async function setManagedUserActive(userId: string, isActive: boolean) {
  return prisma.$transaction(async (transaction) => {
    const target = await transaction.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) return null;
    if (!isActive && target.role === "ADMIN" && target.isActive) {
      const activeAdmins = await transaction.user.count({ where: { role: "ADMIN", isActive: true } });
      if (activeAdmins <= 1) throw new AppError(409, "LAST_ACTIVE_ADMIN", "At least one active administrator must remain.");
    }
    return transaction.user.update({
      where: { id: target.id },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    });
  });
}

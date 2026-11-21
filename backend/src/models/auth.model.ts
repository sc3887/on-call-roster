import { prisma } from "../conf/database";

export function findUserForLogin(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserForSession(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
}

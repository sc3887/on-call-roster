import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { dateOnlyInTimeZone } from "../src/lib/dates";
import { buildSeedAssignments } from "../src/lib/seed-assignments";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = "admin@example.com";
  const password = "ChangeMe123!";
  const userEmail = "user@example.com";
  const userPassword = "DemoUser123!";

  const adminHash = await bcrypt.hash(password, 12);
  const userHash = await bcrypt.hash(userPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", isActive: true, name: "Relay Admin" },
    create: { email, passwordHash: adminHash, role: "ADMIN", name: "Relay Admin" },
  });
  const regularUser = await prisma.user.upsert({
    where: { email: userEmail },
    update: { role: "USER", isActive: true, name: "Alex Morgan" },
    create: { email: userEmail, passwordHash: userHash, role: "USER", name: "Alex Morgan" },
  });
  await prisma.teamMember.upsert({
    where: { email },
    update: { userId: admin.id },
    create: { name: "Relay Admin", email, role: "Administrator", userId: admin.id },
  });

  const team = [
    { name: "Alex Morgan", email: userEmail, phone: "+1 555 0101", role: "Platform Engineer", userId: regularUser.id },
    { name: "Sam Rivera", email: "sam.rivera@example.com", phone: "+1 555 0102", role: "SRE" },
    { name: "Jordan Lee", email: "jordan.lee@example.com", phone: "+1 555 0103", role: "Backend Engineer" },
    { name: "Taylor Kim", email: "taylor.kim@example.com", phone: "+1 555 0104", role: "Support Engineer" },
  ];

  for (const member of team) {
    await prisma.teamMember.upsert({
      where: { email: member.email },
      update: member,
      create: member,
    });
  }

  const memberEmails = [userEmail, "sam.rivera@example.com", "jordan.lee@example.com", "taylor.kim@example.com", email];
  const members = await prisma.teamMember.findMany({ where: { email: { in: memberEmails } } });
  const membersByEmail = new Map(members.map((member) => [member.email.toLowerCase(), member]));
  const assignments = buildSeedAssignments(membersByEmail, dateOnlyInTimeZone(), userEmail, email);

  for (const assignment of assignments) {
    await prisma.shift.upsert({
      where: {
        memberId_date: { memberId: assignment.memberId, date: assignment.date },
      },
      update: { notes: assignment.notes },
      create: {
        memberId: assignment.memberId,
        date: assignment.date,
        notes: assignment.notes,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });

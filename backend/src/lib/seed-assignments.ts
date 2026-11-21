export interface SeedMember {
  id: string;
}

export interface SeedAssignment {
  memberId: string;
  date: Date;
  notes: string | null;
}

function dateAtOffset(today: string, offset: number): Date {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

export function buildSeedAssignments(
  membersByEmail: ReadonlyMap<string, SeedMember>,
  today: string,
  demoEmail: string,
  adminEmail: string,
): SeedAssignment[] {
  const findMember = (email: string): SeedMember => {
    const member = membersByEmail.get(email.toLowerCase());
    if (!member) throw new Error(`Seed team member ${email} was not found.`);
    return member;
  };
  const rotationEmails = [
    demoEmail,
    "sam.rivera@example.com",
    "jordan.lee@example.com",
    "taylor.kim@example.com",
    adminEmail,
  ];
  const assignments: SeedAssignment[] = [
    { memberId: findMember(demoEmail).id, date: dateAtOffset(today, 0), notes: "Primary on-call" },
    { memberId: findMember("jordan.lee@example.com").id, date: dateAtOffset(today, 1), notes: "Backup rotation" },
    { memberId: findMember(adminEmail).id, date: dateAtOffset(today, 2), notes: null },
    { memberId: findMember("sam.rivera@example.com").id, date: dateAtOffset(today, 3), notes: null },
  ];

  for (let offset = -6; offset < 0; offset += 1) {
    const email = rotationEmails[(Math.abs(offset) - 1) % rotationEmails.length]!;
    assignments.push({ memberId: findMember(email).id, date: dateAtOffset(today, offset), notes: "Seeded past rotation" });
  }
  for (let offset = 4; offset <= 27; offset += 1) {
    const email = rotationEmails[(offset - 4) % rotationEmails.length]!;
    assignments.push({ memberId: findMember(email).id, date: dateAtOffset(today, offset), notes: "Seeded future rotation" });
  }
  return assignments;
}

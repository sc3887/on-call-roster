ALTER TABLE "TeamMember"
  ADD COLUMN "userId" TEXT;

UPDATE "TeamMember" AS member
SET "userId" = (
  SELECT account."id"
  FROM "User" AS account
  WHERE LOWER(account."email") = LOWER(member."email")
  ORDER BY account."createdAt", account."id"
  LIMIT 1
);

CREATE UNIQUE INDEX "TeamMember_userId_key" ON "TeamMember"("userId");

ALTER TABLE "TeamMember"
  ADD CONSTRAINT "TeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

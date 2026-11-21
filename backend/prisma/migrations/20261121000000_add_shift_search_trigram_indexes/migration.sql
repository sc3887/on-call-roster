CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "TeamMember_name_trgm_idx"
  ON "TeamMember" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "TeamMember_email_trgm_idx"
  ON "TeamMember" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "TeamMember_role_trgm_idx"
  ON "TeamMember" USING GIN ("role" gin_trgm_ops);
CREATE INDEX "Shift_notes_trgm_idx"
  ON "Shift" USING GIN ("notes" gin_trgm_ops);

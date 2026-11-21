export interface ShiftInput {
  memberId: string;
  date: string;
  notes?: string | null;
}

export interface ShiftSearch {
  page: number;
  limit: number;
  search: string;
  includePast: boolean;
}

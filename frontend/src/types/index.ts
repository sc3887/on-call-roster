export interface User {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "USER";
}

export interface SupportMessage {
  id: string;
  body: string;
  createdAt: string;
  author: Pick<User, "id" | "email" | "name" | "role">;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  updatedAt: string;
  requester: Pick<User, "id" | "email" | "name">;
  messages: SupportMessage[];
}

export interface ManagedUser extends User {
  role: "ADMIN" | "USER";
  isActive: boolean;
  createdAt: string;
  teamMemberId: string | null;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export interface Shift {
  id: string;
  date: string;
  notes: string | null;
  member: TeamMember;
  canManage?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MembersPage {
  members: TeamMember[];
  currentMember: TeamMember | null;
  currentMemberId: string | null;
  pagination: Pagination;
}

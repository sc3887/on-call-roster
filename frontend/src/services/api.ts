import type { ManagedUser, MembersPage, Pagination, Shift, SupportMessage, SupportTicket, TeamMember, User } from "../types";

interface ApiErrorBody {
  error?: { message?: string };
}

let unauthorizedCallback: (() => void) | null = null;

export function registerUnauthorizedCallback(callback: () => void) {
  unauthorizedCallback = callback;
  return () => {
    if (unauthorizedCallback === callback) unauthorizedCallback = null;
  };
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    if (response.status === 401 && path !== "/auth/login" && path !== "/auth/me") {
      unauthorizedCallback?.();
    }
    const body = await response.json().catch(() => ({} as ApiErrorBody)) as ApiErrorBody;
    throw new ApiError(body.error?.message ?? `Request failed (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User }>("/auth/me"),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  members: (page = 1, signal?: AbortSignal) => request<MembersPage>(`/members?page=${page}&limit=8`, { signal }),
  today: (signal?: AbortSignal) => request<{ shifts: Shift[]; date: string; nextShift: Shift | null }>("/shifts/today", { signal }),
  shifts: (page: number, search: string, includePast: boolean, signal?: AbortSignal) =>
    request<{ shifts: Shift[]; pagination: Pagination }>(
      `/shifts?page=${page}&limit=8&search=${encodeURIComponent(search)}&includePast=${includePast}`,
      { signal },
    ),
  saveShift: (input: { memberId: string; date: string; notes: string }, id?: string) =>
    request<{ shift: Shift }>(id ? `/shifts/${id}` : "/shifts", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(input),
    }),
  deleteShift: (id: string) => request<void>(`/shifts/${id}`, { method: "DELETE" }),
  supportTickets: () => request<{ tickets: SupportTicket[] }>("/support/tickets"),
  createSupportTicket: (input: { subject: string; body: string }) =>
    request<{ ticket: SupportTicket }>("/support/tickets", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  replyToTicket: (id: string, body: string) =>
    request<{ message: SupportMessage }>(`/support/tickets/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  updateTicketStatus: (id: string, status: SupportTicket["status"]) =>
    request<{ ticket: SupportTicket }>(`/support/tickets/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  users: () => request<{ users: ManagedUser[] }>("/support/users"),
  createUser: (input: { name: string; email: string; password: string; role: "ADMIN" | "USER" }) =>
    request<{ user: ManagedUser; member: TeamMember }>("/support/users", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  addUserToRoster: (id: string) =>
    request<{ member: TeamMember }>(`/support/users/${id}/roster`, { method: "POST" }),
  setUserActive: (id: string, isActive: boolean) =>
    request<{ user: ManagedUser }>(`/support/users/${id}/active`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    }),
};

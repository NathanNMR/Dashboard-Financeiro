// Cliente HTTP para a API PHP (backend/). A URL base vem de uma env var
// definida em build-time — necessário porque o frontend é exportado como
// site estático (output: "export") e não tem servidor Node por trás.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8099/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Erro inesperado ao falar com o servidor.", res.status);
  }

  return data as T;
}

export interface AccountRef {
  id: string;
  name: string;
  type: "personal" | "company";
  role: "owner" | "admin" | "member";
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export const api = {
  register: (payload: { name: string; email: string; password: string; accountType: "personal" | "company"; accountName?: string }) =>
    request<{ token: string; user: AuthUser; account: AccountRef }>("/register.php", { method: "POST", body: payload }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser; accounts: AccountRef[] }>("/login.php", { method: "POST", body: payload }),

  me: (token: string) => request<{ user: AuthUser; accounts: AccountRef[] }>("/me.php", { token }),

  createInvite: (token: string, payload: { account_id: string; email: string; role?: "admin" | "member" }) =>
    request<{ invite_link: string; token: string; expires_at: string }>("/invites.php", { method: "POST", token, body: payload }),

  listInvites: (token: string, accountId: string) =>
    request<{ invites: { id: string; email: string; role: string; expires_at: string }[] }>(
      `/invites.php?account_id=${encodeURIComponent(accountId)}`,
      { token }
    ),

  acceptInvite: (payload: { token: string; password: string; name?: string }) =>
    request<{ token: string; user: AuthUser; accounts: AccountRef[] }>("/invite-accept.php", { method: "POST", body: payload }),

  listMembers: (token: string, accountId: string) =>
    request<{ members: { id: string; name: string; email: string; role: string; joined_at: string }[] }>(
      `/members.php?account_id=${encodeURIComponent(accountId)}`,
      { token }
    ),

  removeMember: (token: string, payload: { account_id: string; user_id: string }) =>
    request<{ success: true }>("/members.php", { method: "DELETE", token, body: payload }),
};

export { API_BASE_URL };

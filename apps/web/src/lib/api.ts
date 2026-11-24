import type { ApiError, AuthResponse, Contact, ContactInput } from "@enishi/shared";

const TOKEN_KEY = "enishi.token";
const TIMEOUT_MS = 10_000;

export class RequestError extends Error {
  constructor(public status: number, public body: Partial<ApiError>) {
    super(body.message ?? `Request failed with ${status}`);
  }
}

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (t: string) => { try { localStorage.setItem(TOKEN_KEY, t); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

/** Called when any request comes back 401, so the app can drop the session. */
let onUnauthorized: () => void = () => {};
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // Network failure or timeout.
    throw new RequestError(0, { message: "Network error" });
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) onUnauthorized();
    throw new RequestError(res.status, data);
  }
  return data as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>("POST", "/users/login", { email, password }),
  register: (username: string, email: string, password: string) =>
    request<AuthResponse>("POST", "/users/register", { username, email, password }),

  listContacts: () => request<Contact[]>("GET", "/contacts"),
  createContact: (input: ContactInput) => request<Contact>("POST", "/contacts", input),
  updateContact: (id: string, input: Partial<ContactInput>) => request<Contact>("PATCH", `/contacts/${id}`, input),
  deleteContact: (id: string) => request<Contact>("DELETE", `/contacts/${id}`),
};

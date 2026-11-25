/** Types and validation schemas shared by the API and the web app. */

import type { ContactInput } from "./schemas.js";

export * from "./schemas.js";

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Contact extends ContactInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  title: string;
  message: string;
  /** Field-level validation errors, keyed by ContactInput field. */
  fields?: Partial<Record<keyof ContactInput, string>>;
  /** Set on 409 when the email already belongs to another contact. */
  duplicateId?: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

/**
 * Types shared between the API and the web app.
 * Type-only on purpose: both apps import them with `import type`,
 * so this package never needs a build step.
 */

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  tags: string[];
  favorite: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

/** Fields the client may send when creating or updating a contact. */
export type ContactInput = Omit<Contact, "id" | "createdAt" | "updatedAt">;

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

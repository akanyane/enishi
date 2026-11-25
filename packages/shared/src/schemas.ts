import { type } from "arktype";

/**
 * Validation shared by the API and the web app.
 *
 * Schemas both validate and normalize: calling one returns the cleaned value
 * (trimmed strings, lowercase email, deduped tags) or `type.errors`.
 * They only decide *which* fields are invalid; each app owns its messages
 * (the API in English, the web app in the user's language).
 */

export const MIN_PASSWORD_LENGTH = 8;

/** Lowercase, trim, spaces to dashes, no commas: "Hot Lead" → "hot-lead". */
export const cleanTag = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");

// Rules are checked on the raw input (allowing surrounding spaces and any case)
// *before* normalizing. ArkType skips validators that come after a morph while
// other keys are invalid, which would hide errors until the others were fixed.
const EMAIL = "[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}";
const trim = (s: string) => s.trim();
const trimLower = (s: string) => s.trim().toLowerCase();

const text = type("string").pipe(trim);
/** At least one non-space character. */
const requiredText = type(/\S/).pipe(trim);
/** Empty, or a valid email address. Stored lowercase. */
const optionalEmail = type(new RegExp(`^\\s*(?:${EMAIL})?\\s*$`)).pipe(trimLower);
const requiredEmail = type(new RegExp(`^\\s*${EMAIL}\\s*$`)).pipe(trimLower);
/** Digits and + ( ) . - and spaces, possibly empty. */
const optionalPhone = type(/^[0-9+().\-\s]*$/).pipe(trim);
const tags = type("string[]").pipe((list) => [...new Set(list.map(cleanTag).filter(Boolean))]);

/** Body for creating a contact. Only the first name is required. Unknown keys are dropped. */
export const contactCreateSchema = type({
  "+": "delete",
  firstName: requiredText,
  lastName: text.default(""),
  email: optionalEmail.default(""),
  phone: optionalPhone.default(""),
  company: text.default(""),
  jobTitle: text.default(""),
  tags: tags.default(() => []),
  favorite: type.boolean.default(false),
  notes: text.default(""),
});

/** Body for updating a contact: every key optional, and absent keys stay absent (no defaults). */
export const contactUpdateSchema = type({
  "+": "delete",
  "firstName?": requiredText,
  "lastName?": text,
  "email?": optionalEmail,
  "phone?": optionalPhone,
  "company?": text,
  "jobTitle?": text,
  "tags?": tags,
  "favorite?": "boolean",
  "notes?": text,
});

export const registerSchema = type({
  "+": "delete",
  username: requiredText,
  email: requiredEmail,
  password: type("string").atLeastLength(MIN_PASSWORD_LENGTH),
});

export const loginSchema = type({
  "+": "delete",
  email: type(/\S/).pipe(trimLower),
  password: "string > 0",
});

/** Normalized contact fields, as stored and returned by the API. */
export type ContactInput = typeof contactCreateSchema.infer;
export type ContactUpdate = typeof contactUpdateSchema.infer;

export type ValidationErrors = InstanceType<typeof type.errors>;

/** True when a schema call failed. Use this instead of importing arktype in each app. */
export const isValidationError = (result: unknown): result is ValidationErrors => result instanceof type.errors;

/** Top-level field names that failed validation. */
export const invalidFields = (errors: ValidationErrors) =>
  Object.keys(errors.flatByPath).map((path) => path.split(".")[0]).filter(Boolean);

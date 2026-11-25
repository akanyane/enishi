import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import { contactCreateSchema, contactUpdateSchema, invalidFields, isValidationError, type ApiError, type ContactInput, type ValidationErrors } from "@enishi/shared";
import Contact from "../models/contact.model";
import { HttpError } from "../errors";

type FieldErrors = NonNullable<ApiError["fields"]>;

const FIELD_MESSAGES: Record<string, string> = {
  firstName: "First name is required",
  email: "Email is not valid",
  phone: "Phone may only contain digits and + ( ) . -",
};

/**
 * Validates and normalizes the body with the shared schema.
 * Unknown keys (like `user_id`) are dropped by the schema, so a client can never set them.
 */
function parse<T>(schema: (input: unknown) => T | ValidationErrors, body: unknown): T {
  const result = schema(body ?? {});
  if (isValidationError(result)) {
    const fields: FieldErrors = {};
    for (const field of invalidFields(result)) {
      fields[field as keyof ContactInput] = FIELD_MESSAGES[field] ?? `${field} is not valid`;
    }
    throw new HttpError(400, "Contact data is not valid", { fields });
  }
  return result;
}

async function assertUniqueEmail(email: string | undefined, userId: string, contactId?: string) {
  if (!email) return;
  const duplicate = await Contact.findOne({ user_id: userId, email, _id: { $ne: contactId } });
  if (duplicate) {
    throw new HttpError(409, "Email already belongs to another contact", {
      fields: { email: "Email already belongs to another contact" },
      duplicateId: duplicate.id,
    });
  }
}

/** Loads a contact owned by the current user, or responds 404 (also for other users' contacts). */
const findOwned = async (id: string, userId: string) => {
  const contact = isValidObjectId(id) ? await Contact.findOne({ _id: id, user_id: userId }) : null;
  if (!contact) throw new HttpError(404, "Contact not found");
  return contact;
};

const getContacts = asyncHandler(async (request, response) => {
  const contacts = await Contact.find({ user_id: request.user!.id }).sort({ firstName: 1, lastName: 1 });
  response.status(200).json(contacts);
});

const getContact = asyncHandler(async (request, response) => {
  const contact = await findOwned(String(request.params.id), request.user!.id);
  response.status(200).json(contact);
});

const createContact = asyncHandler(async (request, response) => {
  const input = parse(contactCreateSchema, request.body);
  await assertUniqueEmail(input.email, request.user!.id);
  const contact = await Contact.create({ ...input, user_id: request.user!.id });
  response.status(201).json(contact);
});

const updateContact = asyncHandler(async (request, response) => {
  const contact = await findOwned(String(request.params.id), request.user!.id);
  const input = parse(contactUpdateSchema, request.body);
  await assertUniqueEmail(input.email, request.user!.id, contact.id);
  contact.set(input);
  await contact.save();
  response.status(200).json(contact);
});

const deleteContact = asyncHandler(async (request, response) => {
  const contact = await findOwned(String(request.params.id), request.user!.id);
  await contact.deleteOne();
  response.status(200).json(contact);
});

export {
  getContact,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};

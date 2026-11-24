import asyncHandler from "express-async-handler";
import { isValidObjectId } from "mongoose";
import type { ContactInput } from "@enishi/shared";
import Contact from "../models/contact.model";
import { HttpError } from "../errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[0-9+().\-\s]+$/;

const str = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const cleanTag = (tag: string) => tag.trim().toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");

/**
 * Picks only the known contact fields from the request body, so a client
 * can never overwrite `user_id`, timestamps or anything else.
 * With `partial`, absent fields are left out instead of defaulted.
 */
const pickInput = (body: Record<string, unknown>, partial: boolean): Partial<ContactInput> => {
  const input: Partial<ContactInput> = {};
  for (const key of ["firstName", "lastName", "email", "phone", "company", "jobTitle", "notes"] as const) {
    if (!partial || key in body) input[key] = str(body[key]);
  }
  if (input.email) input.email = input.email.toLowerCase();
  if (!partial || "tags" in body) {
    const tags = Array.isArray(body.tags) ? body.tags.filter((t): t is string => typeof t === "string") : [];
    input.tags = [...new Set(tags.map(cleanTag).filter(Boolean))];
  }
  if (!partial || "favorite" in body) input.favorite = body.favorite === true;
  return input;
};

const validate = async (input: Partial<ContactInput>, userId: string, contactId?: string) => {
  const fields: NonNullable<HttpError["details"]["fields"]> = {};
  if ("firstName" in input && !input.firstName) fields.firstName = "First name is required";
  if (input.email && !EMAIL_RE.test(input.email)) fields.email = "Email is not valid";
  if (input.phone && !PHONE_RE.test(input.phone)) fields.phone = "Phone may only contain digits and + ( ) . -";
  if (Object.keys(fields).length) throw new HttpError(400, "Contact data is not valid", { fields });

  if (input.email) {
    const duplicate = await Contact.findOne({ user_id: userId, email: input.email, _id: { $ne: contactId } });
    if (duplicate) {
      throw new HttpError(409, "Email already belongs to another contact", {
        fields: { email: "Email already belongs to another contact" },
        duplicateId: duplicate.id,
      });
    }
  }
};

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
  const input = pickInput(request.body ?? {}, false);
  await validate(input, request.user!.id);
  const contact = await Contact.create({ ...input, user_id: request.user!.id });
  response.status(201).json(contact);
});

const updateContact = asyncHandler(async (request, response) => {
  const contact = await findOwned(String(request.params.id), request.user!.id);
  const input = pickInput(request.body ?? {}, true);
  await validate(input, request.user!.id, contact.id);
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

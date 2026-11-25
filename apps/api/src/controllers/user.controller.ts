import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { invalidFields, isValidationError, loginSchema, MIN_PASSWORD_LENGTH, registerSchema, type AuthResponse } from "@enishi/shared";
import User from "../models/user.model";
import { HttpError } from "../errors";

/** True when any of the keys is missing or blank, which gets the generic "mandatory" message. */
const missingAny = (body: unknown, keys: string[]) =>
  keys.some((k) => !String((body as Record<string, unknown> | undefined)?.[k] ?? "").trim());

const authResponse = (user: { id: string; username: string; email: string }): AuthResponse => {
  const payload = { id: user.id, username: user.username, email: user.email };
  const accessToken = jwt.sign(
    { user: payload },
    process.env.ACCESS_TOKEN_SECRET as string,
    { expiresIn: "120m" },
  );
  return { accessToken, user: payload };
};

const registerUser = asyncHandler(async (request, response) => {
  const input = registerSchema(request.body ?? {});
  if (isValidationError(input)) {
    if (missingAny(request.body, ["username", "email", "password"])) throw new HttpError(400, "All fields are mandatory");
    const fields = invalidFields(input);
    if (fields.includes("email")) throw new HttpError(400, "Email is not valid");
    throw new HttpError(400, `Password must have at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (await User.findOne({ email: input.email })) {
    throw new HttpError(409, "User already registered");
  }

  const user = await User.create({
    username: input.username,
    email: input.email,
    password: await bcrypt.hash(input.password, 10),
  });

  // Log the user in right away so the client doesn't need a second request.
  response.status(201).json(authResponse(user));
});

const loginUser = asyncHandler(async (request, response) => {
  const input = loginSchema(request.body ?? {});
  if (isValidationError(input)) {
    throw new HttpError(400, "All fields are mandatory");
  }

  const user = await User.findOne({ email: input.email });
  if (!user || !(await bcrypt.compare(input.password, user.password))) {
    throw new HttpError(401, "Email or password is not valid");
  }

  response.status(200).json(authResponse(user));
});

const currentUser = asyncHandler(async (request, response) => {
  response.status(200).json(request.user);
});

export {
  registerUser,
  loginUser,
  currentUser,
};

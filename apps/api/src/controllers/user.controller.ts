import asyncHandler from "express-async-handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { AuthResponse } from "@enishi/shared";
import User from "../models/user.model";
import { HttpError } from "../errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PASSWORD = 8;

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
  const username = String(request.body?.username ?? "").trim();
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "");

  if (!username || !email || !password) {
    throw new HttpError(400, "All fields are mandatory");
  }
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, "Email is not valid");
  }
  if (password.length < MIN_PASSWORD) {
    throw new HttpError(400, `Password must have at least ${MIN_PASSWORD} characters`);
  }
  if (await User.findOne({ email })) {
    throw new HttpError(409, "User already registered");
  }

  const user = await User.create({
    username,
    email,
    password: await bcrypt.hash(password, 10),
  });

  // Log the user in right away so the client doesn't need a second request.
  response.status(201).json(authResponse(user));
});

const loginUser = asyncHandler(async (request, response) => {
  const email = String(request.body?.email ?? "").trim().toLowerCase();
  const password = String(request.body?.password ?? "");

  if (!email || !password) {
    throw new HttpError(400, "All fields are mandatory");
  }

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
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

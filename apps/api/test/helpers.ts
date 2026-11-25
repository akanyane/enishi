import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, inject } from "vitest";
import type { AuthResponse } from "@enishi/shared";
import { createApp } from "../src/app";

export const app = createApp();

/** Connects to a fresh database for this test file and wipes it between tests. */
export function useDatabase() {
  beforeAll(async () => {
    await mongoose.connect(inject("mongoUri"), { dbName: `test-${randomUUID()}` });
  });
  beforeEach(async () => {
    await mongoose.connection.db!.dropDatabase();
    // Recreate indexes (e.g. the unique user email) dropped with the database.
    await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()));
  });
  afterAll(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });
}

let counter = 0;

/** Registers a new user and returns its token. */
export async function signUp(overrides: Partial<{ username: string; email: string; password: string }> = {}) {
  counter += 1;
  const body = {
    username: `User ${counter}`,
    email: `user${counter}@test.com`,
    password: "12345678",
    ...overrides,
  };
  const res = await request(app).post("/api/users/register").send(body);
  if (res.status !== 201) throw new Error(`signUp failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body as AuthResponse;
}

export const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

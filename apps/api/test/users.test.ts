import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, auth, signUp, useDatabase } from "./helpers";

useDatabase();

describe("POST /api/users/register", () => {
  it("creates the user and signs them in", async () => {
    const res = await request(app)
      .post("/api/users/register")
      .send({ username: "Ana", email: " Ana@Test.com ", password: "12345678" });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user).toEqual({ id: expect.any(String), username: "Ana", email: "ana@test.com" });
  });

  it.each([
    [{ email: "a@test.com", password: "12345678" }, "All fields are mandatory"],
    [{ username: "Ana", email: "not-an-email", password: "12345678" }, "Email is not valid"],
    [{ username: "Ana", email: "a@test.com", password: "1234567" }, "Password must have at least 8 characters"],
  ])("rejects invalid input %o", async (body, message) => {
    const res = await request(app).post("/api/users/register").send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe(message);
  });

  it("rejects an email that is already registered, ignoring case", async () => {
    await signUp({ email: "ana@test.com" });
    const res = await request(app)
      .post("/api/users/register")
      .send({ username: "Ana 2", email: "ANA@test.com", password: "12345678" });
    expect(res.status).toBe(409);
  });
});

describe("POST /api/users/login", () => {
  it("returns a token for valid credentials, ignoring email case", async () => {
    await signUp({ email: "ana@test.com", password: "secret-pass" });
    const res = await request(app).post("/api/users/login").send({ email: "ANA@test.com", password: "secret-pass" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe("ana@test.com");
  });

  it.each([
    ["wrong password", { email: "ana@test.com", password: "wrong-pass" }],
    ["unknown email", { email: "nobody@test.com", password: "secret-pass" }],
  ])("rejects a %s with 401", async (_case, body) => {
    await signUp({ email: "ana@test.com", password: "secret-pass" });
    const res = await request(app).post("/api/users/login").send(body);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/current", () => {
  it("returns the signed-in user", async () => {
    const { accessToken, user } = await signUp();
    const res = await request(app).get("/api/users/current").set(auth(accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(user);
  });

  it.each([
    ["no header", {}],
    ["a malformed header", { Authorization: "Token abc" }],
    ["an invalid token", { Authorization: "Bearer not-a-jwt" }],
  ])("returns 401 with %s", async (_case, headers) => {
    const res = await request(app).get("/api/users/current").set(headers);
    expect(res.status).toBe(401);
  });
});

import request from "supertest";
import { describe, expect, it } from "vitest";
import { app, auth, signUp, useDatabase } from "./helpers";

useDatabase();

const marina = {
  firstName: "Marina",
  lastName: "Duarte",
  email: "marina@atlantica.com",
  phone: "+55 (47) 99631-2208",
  company: "Atlântica Têxtil",
  jobTitle: "Product Lead",
  tags: ["client"],
  favorite: true,
  notes: "Prefers WhatsApp before 10am.",
};

async function create(token: string, body: object) {
  return request(app).post("/api/contacts").set(auth(token)).send(body);
}

describe("POST /api/contacts", () => {
  it("creates a contact and normalizes the input", async () => {
    const { accessToken } = await signUp();
    const res = await create(accessToken, {
      ...marina,
      firstName: "  Marina ",
      email: "Marina@Atlantica.com",
      tags: ["Client", "client", "Hot Lead", ""],
      user_id: "000000000000000000000000",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      firstName: "Marina",
      email: "marina@atlantica.com",
      tags: ["client", "hot-lead"],
      favorite: true,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    // Internal fields are never exposed.
    expect(res.body).not.toHaveProperty("_id");
    expect(res.body).not.toHaveProperty("__v");
    expect(res.body).not.toHaveProperty("user_id");
  });

  it("only requires the first name", async () => {
    const { accessToken } = await signUp();
    const res = await create(accessToken, { firstName: "Bruno" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ lastName: "", email: "", phone: "", tags: [], favorite: false, notes: "" });
  });

  it("returns field errors for invalid input", async () => {
    const { accessToken } = await signUp();
    const res = await create(accessToken, { email: "nope", phone: "9963I-22O8" });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.fields).sort()).toEqual(["email", "firstName", "phone"]);
  });

  it("returns 409 with the id of the contact that already has the email", async () => {
    const { accessToken } = await signUp();
    const first = await create(accessToken, marina);
    const res = await create(accessToken, { firstName: "Other", email: "MARINA@atlantica.com" });
    expect(res.status).toBe(409);
    expect(res.body.duplicateId).toBe(first.body.id);
    expect(res.body.fields.email).toEqual(expect.any(String));
  });

  it("checks duplicate emails per user", async () => {
    const a = await signUp();
    const b = await signUp();
    await create(a.accessToken, marina);
    const res = await create(b.accessToken, marina);
    expect(res.status).toBe(201);
  });
});

describe("GET /api/contacts", () => {
  it("lists only the current user's contacts", async () => {
    const a = await signUp();
    const b = await signUp();
    await create(a.accessToken, marina);
    await create(a.accessToken, { firstName: "Bruno" });
    await create(b.accessToken, { firstName: "Not mine" });

    const res = await request(app).get("/api/contacts").set(auth(a.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.map((c: { firstName: string }) => c.firstName)).toEqual(["Bruno", "Marina"]);
  });

  it("requires a token", async () => {
    const res = await request(app).get("/api/contacts");
    expect(res.status).toBe(401);
  });
});

describe("GET/PATCH/DELETE /api/contacts/:id", () => {
  it("updates only the fields sent", async () => {
    const { accessToken } = await signUp();
    const { body: contact } = await create(accessToken, marina);

    const res = await request(app).patch(`/api/contacts/${contact.id}`).set(auth(accessToken)).send({ favorite: false });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ ...marina, favorite: false });
  });

  it("lets a contact keep its own email", async () => {
    const { accessToken } = await signUp();
    const { body: contact } = await create(accessToken, marina);
    const res = await request(app).put(`/api/contacts/${contact.id}`).set(auth(accessToken)).send({ email: marina.email, notes: "" });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe("");
  });

  it("rejects clearing the first name", async () => {
    const { accessToken } = await signUp();
    const { body: contact } = await create(accessToken, marina);
    const res = await request(app).patch(`/api/contacts/${contact.id}`).set(auth(accessToken)).send({ firstName: " " });
    expect(res.status).toBe(400);
    expect(res.body.fields.firstName).toEqual(expect.any(String));
  });

  it("deletes a contact", async () => {
    const { accessToken } = await signUp();
    const { body: contact } = await create(accessToken, marina);

    const del = await request(app).delete(`/api/contacts/${contact.id}`).set(auth(accessToken));
    expect(del.status).toBe(200);
    const get = await request(app).get(`/api/contacts/${contact.id}`).set(auth(accessToken));
    expect(get.status).toBe(404);
  });

  it("hides other users' contacts behind a 404", async () => {
    const owner = await signUp();
    const other = await signUp();
    const { body: contact } = await create(owner.accessToken, marina);
    const url = `/api/contacts/${contact.id}`;

    expect((await request(app).get(url).set(auth(other.accessToken))).status).toBe(404);
    expect((await request(app).patch(url).set(auth(other.accessToken)).send({ firstName: "Hacked" })).status).toBe(404);
    expect((await request(app).delete(url).set(auth(other.accessToken))).status).toBe(404);

    const stillThere = await request(app).get(url).set(auth(owner.accessToken));
    expect(stillThere.body.firstName).toBe("Marina");
  });

  it("returns 404 for a malformed id", async () => {
    const { accessToken } = await signUp();
    const res = await request(app).get("/api/contacts/not-an-id").set(auth(accessToken));
    expect(res.status).toBe(404);
  });
});

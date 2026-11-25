import { describe, expect, it } from "vitest";
import { contactCreateSchema, contactUpdateSchema, invalidFields, isValidationError, loginSchema, registerSchema } from "./schemas.js";

/** Returns the invalid field names, or [] when the value passes. */
const fails = (result: unknown) => (isValidationError(result) ? invalidFields(result).sort() : []);

describe("contactCreateSchema", () => {
  it("fills defaults when only the first name is sent", () => {
    expect(contactCreateSchema({ firstName: "Bruno" })).toEqual({
      firstName: "Bruno", lastName: "", email: "", phone: "", company: "", jobTitle: "",
      tags: [], favorite: false, notes: "",
    });
  });

  it("normalizes text, email and tags, and drops unknown keys", () => {
    const out = contactCreateSchema({
      firstName: "  Marina ",
      email: " Marina@Atlantica.COM ",
      tags: ["Client", "client", "Hot  Lead", " ", "a,b"],
      user_id: "someone-else",
    });
    expect(out).toMatchObject({ firstName: "Marina", email: "marina@atlantica.com", tags: ["client", "hot-lead", "ab"] });
    expect(out).not.toHaveProperty("user_id");
  });

  it.each([
    [{}, ["firstName"]],
    [{ firstName: "   " }, ["firstName"]],
    [{ firstName: "A", email: "nope" }, ["email"]],
    [{ firstName: "A", email: "a@b" }, ["email"]],
    [{ firstName: "A", email: "a b@c.com" }, ["email"]],
    [{ firstName: "A", phone: "9963I-22O8" }, ["phone"]],
    [{ firstName: "A", favorite: "yes" }, ["favorite"]],
    [{ firstName: "A", tags: "client" }, ["tags"]],
    [{ email: "x", phone: "y" }, ["email", "firstName", "phone"]],
  ])("rejects %o → %o", (input, fields) => {
    expect(fails(contactCreateSchema(input))).toEqual(fields);
  });

  it.each(["", "  ", "ana@atlantica.com"])("accepts the email %o", (email) => {
    expect(fails(contactCreateSchema({ firstName: "A", email }))).toEqual([]);
  });

  it.each(["", "+55 (47) 99631-2208", "3344.2010"])("accepts the phone %o", (phone) => {
    expect(fails(contactCreateSchema({ firstName: "A", phone }))).toEqual([]);
  });
});

describe("contactUpdateSchema", () => {
  it("keeps absent keys absent, so a partial update doesn't wipe other fields", () => {
    expect(contactUpdateSchema({ favorite: false })).toEqual({ favorite: false });
    expect(contactUpdateSchema({})).toEqual({});
  });

  it("still validates and normalizes the keys that are sent", () => {
    expect(contactUpdateSchema({ email: " A@B.co " })).toEqual({ email: "a@b.co" });
    expect(fails(contactUpdateSchema({ firstName: " " }))).toEqual(["firstName"]);
  });
});

describe("registerSchema", () => {
  it("normalizes the email", () => {
    expect(registerSchema({ username: " Ana ", email: " Ana@Test.com ", password: "12345678" }))
      .toEqual({ username: "Ana", email: "ana@test.com", password: "12345678" });
  });

  it.each([
    [{ email: "a@test.com", password: "12345678" }, ["username"]],
    [{ username: "Ana", email: "nope", password: "12345678" }, ["email"]],
    [{ username: "Ana", email: "", password: "12345678" }, ["email"]],
    [{ username: "Ana", email: "a@test.com", password: "1234567" }, ["password"]],
  ])("rejects %o → %o", (input, fields) => {
    expect(fails(registerSchema(input))).toEqual(fields);
  });

  it("does not trim the password", () => {
    expect(registerSchema({ username: "A", email: "a@test.com", password: " 1234567" })).toMatchObject({ password: " 1234567" });
  });
});

describe("loginSchema", () => {
  it("only requires both fields to be filled", () => {
    expect(loginSchema({ email: " ANA@test.com", password: "x" })).toEqual({ email: "ana@test.com", password: "x" });
    expect(fails(loginSchema({ email: " ", password: "" }))).toEqual(["email", "password"]);
  });
});

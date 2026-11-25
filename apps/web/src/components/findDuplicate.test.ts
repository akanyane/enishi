import { describe, expect, it } from "vitest";
import type { Contact } from "@enishi/shared";
import { findDuplicate } from "./ContactForm";

const ana = { id: "ana", email: "ana@atlantica.com" } as Contact;
const bruno = { id: "bruno", email: "" } as Contact;

describe("findDuplicate", () => {
  it("finds another contact with the same email, ignoring case and spaces", () => {
    expect(findDuplicate("  ANA@atlantica.com ", [bruno, ana], null)).toBe("ana");
  });

  it("ignores the contact being edited", () => {
    expect(findDuplicate("ana@atlantica.com", [ana], "ana")).toBeUndefined();
  });

  it("never matches an empty email", () => {
    expect(findDuplicate("", [bruno], null)).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import type { Contact } from "@enishi/shared";
import { blankForm, type FormState } from "../lib/contact";
import { DICTS } from "../lib/i18n";
import { validateForm } from "./ContactForm";

const t = DICTS.en;

const ana: Contact = {
  id: "ana", firstName: "Ana", lastName: "Lacerda", email: "ana@atlantica.com", phone: "", company: "",
  jobTitle: "", tags: [], favorite: false, notes: "", createdAt: "", updatedAt: "",
};

const form = (over: Partial<FormState>): FormState => ({ ...blankForm(), firstName: "Marina", ...over });

describe("validateForm", () => {
  it("accepts a form with only the first name", () => {
    expect(validateForm(form({}), null, [], t)).toEqual({});
  });

  it("requires the first name", () => {
    expect(validateForm(form({ firstName: "   " }), null, [], t)).toEqual({ firstName: t.e_first });
  });

  it.each(["nope", "a@b", "a b@c.com", "ana@atlantica.c"])("rejects the email %s", (email) => {
    expect(validateForm(form({ email }), null, [], t).email).toBe(t.e_email);
  });

  it("rejects letters in the phone", () => {
    expect(validateForm(form({ phone: "9963I-22O8" }), null, [], t).phone).toBe(t.e_tel);
  });

  it("accepts a formatted phone", () => {
    expect(validateForm(form({ phone: "+55 (47) 99631-2208" }), null, [], t)).toEqual({});
  });

  it("flags an email that another contact already has, ignoring case", () => {
    const errors = validateForm(form({ email: "ANA@atlantica.com" }), null, [ana], t);
    expect(errors).toEqual({ email: t.e_dup("Ana Lacerda"), dupId: "ana" });
  });

  it("lets the contact being edited keep its own email", () => {
    expect(validateForm(form({ email: ana.email }), "ana", [ana], t)).toEqual({});
  });
});

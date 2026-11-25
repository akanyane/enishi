import { describe, expect, it } from "vitest";
import type { Contact } from "@enishi/shared";
import { avatarTone, cleanTag, fullName, indexLetter, initials, isFamily, norm, titleCase } from "./contact";

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: "1", firstName: "Marina", lastName: "Duarte", email: "", phone: "", company: "", jobTitle: "",
  tags: [], favorite: false, notes: "", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("norm", () => {
  it("lowercases and strips accents so search ignores them", () => {
    expect(norm("João Ângela Ç")).toBe("joao angela c");
  });

  it("treats null and undefined as empty", () => {
    expect(norm(undefined)).toBe("");
    expect(norm(null)).toBe("");
  });
});

describe("fullName", () => {
  it("joins first and last name", () => {
    expect(fullName(contact())).toBe("Marina Duarte");
  });

  it("skips an empty last name", () => {
    expect(fullName(contact({ lastName: "" }))).toBe("Marina");
  });
});

describe("initials", () => {
  it.each([
    [{ firstName: "Marina", lastName: "Duarte" }, "MD"],
    // Compound first name without last name uses the second word.
    [{ firstName: "Carlos Eduardo", lastName: "" }, "CE"],
    [{ firstName: "ana", lastName: "" }, "A"],
  ])("%o → %s", (names, expected) => {
    expect(initials(contact(names))).toBe(expected);
  });
});

describe("indexLetter", () => {
  it.each([
    ["Ângela", "A"],
    ["zé", "Z"],
    ["  Bruno", "B"],
    ["123", "#"],
    ["", "#"],
  ])("%s → %s", (input, expected) => {
    expect(indexLetter(input)).toBe(expected);
  });
});

describe("avatarTone", () => {
  it("is stable and within the 8-color palette", () => {
    const tone = avatarTone("Marina Duarte");
    expect(tone).toBe(avatarTone("Marina Duarte"));
    expect(tone).toBeGreaterThanOrEqual(0);
    expect(tone).toBeLessThan(8);
  });
});

describe("cleanTag", () => {
  it("lowercases, trims and turns spaces into dashes", () => {
    expect(cleanTag("  Hot  Lead, ")).toBe("hot-lead");
  });
});

describe("isFamily", () => {
  it.each([["família"], ["familia"], ["Family"]])("recognizes the %s tag", (tag) => {
    expect(isFamily(contact({ tags: [tag] }))).toBe(true);
  });

  it("is false without a family tag", () => {
    expect(isFamily(contact({ tags: ["client"] }))).toBe(false);
  });
});

describe("titleCase", () => {
  it("capitalizes each word", () => {
    expect(titleCase("  joana  silva ")).toBe("Joana Silva");
  });
});

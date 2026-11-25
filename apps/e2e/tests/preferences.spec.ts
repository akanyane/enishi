import { test, expect } from "./fixtures";

test("remembers theme and language across reloads", async ({ page, seed }) => {
  await seed();
  await page.goto("/");

  await page.getByRole("button", { name: "Usar tema escuro" }).click();
  await page.getByRole("button", { name: /^Idioma/ }).click();
  await page.getByRole("menuitemradio", { name: /English/ }).click();

  await expect(page.locator(".fx.dark")).toBeVisible();
  await expect(page.getByRole("button", { name: "New contact" })).toBeVisible();

  await page.reload();
  await expect(page.locator(".fx.dark")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("7 contacts")).toBeVisible();
});

test("translates an open toast when the language changes", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Bruno Okada/ }).click();
  await page.getByRole("button", { name: "Excluir contato" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Excluir contato" }).click();
  await expect(page.getByText("Contato excluído")).toBeVisible();

  await page.getByRole("button", { name: /^Idioma/ }).click();
  await page.getByRole("menuitemradio", { name: /Español/ }).click();
  await expect(page.getByText("Contacto eliminado")).toBeVisible();
});

test("keeps what was typed in the form when switching language", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: "Novo contato" }).first().click();
  await page.locator("#f-firstName").fill("Helena");
  await page.getByLabel("E-mail").fill("errado@");
  await page.getByLabel("E-mail").blur();
  await expect(page.getByText("Esse e-mail não parece válido")).toBeVisible();

  await page.getByRole("button", { name: /^Idioma/ }).click();
  await page.getByRole("menuitemradio", { name: /English/ }).click();

  await expect(page.getByRole("heading", { name: "New contact" })).toBeVisible();
  await expect(page.locator("#f-firstName")).toHaveValue("Helena");
  // The error stays, now translated.
  await expect(page.getByText("This email doesn't look valid")).toBeVisible();
});

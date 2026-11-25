import { test, expect, rows } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 } });

test("switches between list and card panes", async ({ page, seed }) => {
  await seed();
  await page.goto("/");

  // Header actions fit on one row next to the brand.
  const brand = await page.locator(".brand").boundingBox();
  const add = await page.getByRole("button", { name: "Novo contato" }).boundingBox();
  expect(Math.abs(add!.y - brand!.y)).toBeLessThan(20);

  await page.getByRole("button", { name: /Felipe Andrade/ }).click();
  await expect(page.getByRole("heading", { name: "Felipe Andrade" })).toBeVisible();
  await expect(rows(page).first()).toBeHidden();

  await page.getByRole("button", { name: "Contatos" }).click();
  await expect(rows(page).first()).toBeVisible();
});

test("confirms deletion in a bottom sheet", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Felipe Andrade/ }).click();
  await page.getByRole("button", { name: "Excluir contato" }).click();

  const dialog = page.getByRole("alertdialog");
  const box = await dialog.boundingBox();
  // Anchored to the bottom edge of the screen.
  expect(Math.round(box!.y + box!.height)).toBe(844);
});

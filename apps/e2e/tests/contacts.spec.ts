import { test, expect, rows } from "./fixtures";

test("creates a contact, showing inline errors first", async ({ page, session: _ }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Criar primeiro contato" }).click();
  await expect(page.getByRole("heading", { name: "Novo contato" })).toBeVisible();

  await page.getByLabel("E-mail").fill("errado@");
  await page.getByLabel("Telefone").fill("9963I-22O8");
  await page.getByRole("button", { name: "Salvar contato" }).click();
  await expect(page.getByText("Corrija os 3 campos marcados para salvar o contato.")).toBeVisible();
  // Focus moves to the first invalid field.
  await expect(page.locator("#f-firstName")).toBeFocused();

  await page.locator("#f-firstName").fill("Helena");
  await page.getByLabel("Sobrenome").fill("Vasconcelos");
  await page.getByLabel("E-mail").fill("helena@vasconcelosadv.com.br");
  await page.getByLabel("Telefone").fill("+55 (61) 3344-2010");
  await page.getByLabel("Tags").fill("Fornecedor,");
  await expect(page.getByRole("button", { name: "Remover tag fornecedor" })).toBeVisible();
  await page.getByRole("button", { name: "Salvar contato" }).click();

  await expect(page.getByRole("heading", { name: "Helena Vasconcelos" })).toBeVisible();
  await expect(page.getByText("Contato salvo")).toBeVisible();
  await expect(rows(page)).toHaveCount(1);

  // Persisted on the server.
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page).first()).toContainText("Helena Vasconcelos");
});

test("edits a contact", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Sofia Albuquerque/ }).click();
  await page.getByRole("button", { name: "Editar contato" }).click();
  await page.getByLabel("Cargo").fill("Diretora editorial");
  await page.getByRole("button", { name: "Salvar contato" }).click();

  await expect(page.getByText("Contato salvo")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Sofia Albuquerque/ }).click();
  await expect(page.getByRole("article")).toContainText("Diretora editorial");
});

test("points to the existing contact when the email is taken", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Marina Duarte/ }).click();
  await page.getByRole("button", { name: "Editar contato" }).click();
  await page.getByLabel("E-mail").fill("ANA.lacerda@atlanticatextil.com.br");
  await page.getByLabel("E-mail").blur();

  await expect(page.getByText("Esse e-mail já está cadastrado em Ana Beatriz Lacerda.")).toBeVisible();
  await page.getByRole("button", { name: "Abrir contato" }).click();
  await expect(page.getByRole("heading", { name: "Ana Beatriz Lacerda" })).toBeVisible();
});

test("searches ignoring accents, across company, and offers to create from the query", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await expect(rows(page)).toHaveCount(7);

  const search = page.getByLabel("Buscar contatos");
  await search.fill("atlantica");
  await expect(rows(page)).toHaveCount(2);

  // "andr" matches "André" (accent ignored) and "Andrade".
  await search.fill("andr");
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator("mark")).toHaveText(["Andr", "Andr"]);

  await search.fill("joana s");
  await expect(page.getByText("Nenhum contato com “joana s”")).toBeVisible();
  await page.getByRole("button", { name: "Criar “Joana S”" }).click();
  await expect(page.locator("#f-firstName")).toHaveValue("Joana S");
});

test("filters by favorites and tag", async ({ page, seed }) => {
  await seed();
  await page.goto("/");

  await page.getByRole("switch", { name: "Só favoritos" }).click();
  await expect(rows(page)).toHaveCount(4);
  await page.getByRole("switch", { name: "Só favoritos" }).click();

  await page.getByRole("button", { name: /^fornecedor/ }).click();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.getByText("3 de 7 contatos")).toBeVisible();
  await page.getByRole("button", { name: /^Todas/ }).click();
  await expect(rows(page)).toHaveCount(7);
});

test("toggles a favorite and keeps it after reload", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Marina Duarte/ }).click();
  await page.getByRole("button", { name: "Remover dos favoritos" }).click();
  await expect(page.getByRole("button", { name: "Adicionar aos favoritos" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: /Marina Duarte/ }).click();
  await expect(page.getByRole("button", { name: "Adicionar aos favoritos" })).toBeVisible();
});

test("deletes a contact after confirming", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByRole("button", { name: /Bruno Okada/ }).click();
  await page.getByRole("button", { name: "Excluir contato" }).click();

  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toContainText("Excluir Bruno Okada?");
  await expect(dialog.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: "Excluir contato" }).click();
  await dialog.getByRole("button", { name: "Excluir contato" }).click();
  await expect(page.getByText("Contato excluído")).toBeVisible();
  await expect(rows(page)).toHaveCount(6);

  await page.reload();
  await expect(rows(page)).toHaveCount(6);
});

test("groups by date when sorting by newest and disables the A–Z index", async ({ page, seed }) => {
  await seed();
  await page.goto("/");
  await page.getByLabel("Ordenar por").selectOption("newest");
  await expect(page.locator(".sec-tab").first()).toHaveText("Esta semana");
  await expect(page.getByRole("navigation", { name: "Índice alfabético" })).toHaveClass(/off/);
});

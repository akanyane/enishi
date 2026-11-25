import { test, expect, uniqueEmail } from "./fixtures";

test("validates the login form before calling the API", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();

  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Esse e-mail não parece válido")).toBeVisible();
  await expect(page.getByText("Informe sua senha.")).toBeVisible();
});

test("shows an error for a wrong password", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("E-mail").fill("nobody@test.com");
  await page.getByLabel("Senha").fill("wrong-pass");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("E-mail ou senha incorretos.");
});

test("registers, lands on the empty state, signs out and signs back in", async ({ page }) => {
  const email = uniqueEmail();
  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("heading", { name: "Abra seu fichário" })).toBeVisible();

  await page.getByLabel("Nome").fill("Matheus");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("1234");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("A senha precisa ter pelo menos 8 caracteres.")).toBeVisible();

  await page.getByLabel("Senha").fill("12345678");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Sua agenda está em branco")).toBeVisible();

  await page.getByRole("button", { name: "Sair" }).click();
  await expect(page.getByRole("heading", { name: "Bem-vindo de volta" })).toBeVisible();

  await page.getByLabel("E-mail").fill(email.toUpperCase());
  await page.getByLabel("Senha").fill("12345678");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByText("Sua agenda está em branco")).toBeVisible();
});

test("refuses to register an email twice", async ({ page, request }) => {
  const email = uniqueEmail();
  await request.post("/api/users/register", { data: { username: "First", email, password: "12345678" } });

  await page.goto("/");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await page.getByLabel("Nome").fill("Second");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("12345678");
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByRole("alert")).toHaveText("Já existe uma conta com esse e-mail.");
});

test("an expired session sends the user back to login", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("enishi.token", "expired-or-forged");
    localStorage.setItem("enishi.user", JSON.stringify({ id: "x", username: "Ghost", email: "ghost@test.com" }));
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveText("Sua sessão expirou. Entre de novo.");
});

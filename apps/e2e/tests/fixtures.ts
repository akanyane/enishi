import { randomUUID } from "node:crypto";
import { test as base, expect, type APIRequestContext, type Page } from "@playwright/test";
import type { AuthResponse, Contact, ContactInput } from "@enishi/shared";

export { expect };

export const SEED: Partial<ContactInput>[] = [
  { firstName: "Ana Beatriz", lastName: "Lacerda", email: "ana.lacerda@atlanticatextil.com.br", phone: "+55 (47) 99812-4410", company: "Atlântica Têxtil", jobTitle: "Diretora de Compras", tags: ["cliente"], favorite: true },
  { firstName: "André", lastName: "Moura", email: "andre@mouraefilhos.com.br", company: "Moura & Filhos Gráfica", jobTitle: "Sócio", tags: ["fornecedor"] },
  { firstName: "Bruno", lastName: "Okada", email: "bruno.okada.foto@gmail.com", jobTitle: "Fotógrafo", tags: ["fornecedor", "freela"] },
  { firstName: "Carlos Eduardo", lastName: "Pinheiro", tags: ["família"], favorite: true, notes: "Tio Cadu." },
  { firstName: "Felipe", lastName: "Andrade", email: "felipe@andradecontabil.com.br", phone: "+55 (11) 99310-8826", company: "Andrade Contabilidade", jobTitle: "Contador", tags: ["fornecedor"], favorite: true },
  { firstName: "Marina", lastName: "Duarte", email: "marina.duarte@atlanticatextil.com.br", phone: "+55 (47) 99631-2208", company: "Atlântica Têxtil", jobTitle: "Coordenadora de Produto", tags: ["cliente"], favorite: true, notes: "Prefere WhatsApp antes das 10h." },
  { firstName: "Sofia", lastName: "Albuquerque", email: "sofia@editoraaurora.com.br", company: "Editora Aurora", jobTitle: "Editora-chefe", tags: ["cliente"] },
];

export const uniqueEmail = () => `e2e-${randomUUID()}@test.com`;

async function registerViaApi(request: APIRequestContext) {
  const res = await request.post("/api/users/register", {
    data: { username: "E2E", email: uniqueEmail(), password: "12345678" },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as AuthResponse;
}

/** Stores the session the way the app does, before any page script runs. */
async function signInPage(page: Page, auth: AuthResponse) {
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem("enishi.token", token);
    localStorage.setItem("enishi.user", JSON.stringify(user));
  }, { token: auth.accessToken, user: auth.user });
}

interface Fixtures {
  /** A new user, signed in on `page`, with no contacts. */
  session: AuthResponse;
  /** Creates contacts for the signed-in user through the API. */
  seed: (contacts?: Partial<ContactInput>[]) => Promise<Contact[]>;
}

export const test = base.extend<Fixtures>({
  session: async ({ page, request }, use) => {
    const auth = await registerViaApi(request);
    await signInPage(page, auth);
    await use(auth);
  },
  seed: async ({ request, session }, use) => {
    await use(async (contacts = SEED) => {
      const created: Contact[] = [];
      for (const data of contacts) {
        const res = await request.post("/api/contacts", {
          data, headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        expect(res.status()).toBe(201);
        created.push(await res.json());
      }
      return created;
    });
  },
});

/** Rows in the contact list. */
export const rows = (page: Page) => page.locator(".fx-list .row");

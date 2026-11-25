# Enishi (縁)

> **袖振り合うも他生の縁**
> *Sode furiau mo tashō no en*
> "Even a brush of sleeves with a stranger is a bond from another life."

In Japanese, *en* / *enishi* (縁) is the bond that ties people together. According to Buddhist tradition, no encounter is by chance: close friends, colleagues, and even the driver who gave you a ride once are all connected by *en*. Enishi keeps track of every one of those connections.

A contact manager organized like a card file: an A–Z index, stacked contact cards, tags, favorites, light and dark themes, and pt-BR / English / Spanish.

## Monorepo

A [Turborepo](https://turborepo.dev) with pnpm workspaces:

| Package | What it is |
|---|---|
| `apps/api` | REST API — Express 5, MongoDB (Mongoose), JWT auth |
| `apps/web` | Web app — React 19 + Vite + TanStack Form, implementing the *Fichário* design |
| `packages/shared` | Types and [ArkType](https://arktype.io) validation schemas shared by both apps: the API validates request bodies and the web forms validate input with the same rules |
| `apps/e2e` | Browser tests (Playwright) that run the real API and web app |

## Getting started

Requirements: Node 20.11+, pnpm, and a MongoDB instance.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # fill in the values below
pnpm dev                                 # API on :5000, web on :5173
```

`apps/api/.env`:

| Variable | Description |
|---|---|
| `PORT` | API port (default `5000`) |
| `CONNECTION_STRING` | MongoDB connection string |
| `ACCESS_TOKEN_SECRET` | Secret used to sign JWTs |

The Vite dev server proxies `/api` to the API, so the browser talks to a single origin. If the API runs on another port, start the web app with `API_PORT=<port>`.

### Scripts (run from the root)

| Command | Runs |
|---|---|
| `pnpm dev` | API (tsx watch) and web (Vite) in parallel |
| `pnpm build` | Builds every app (`apps/*/dist`) |
| `pnpm typecheck` | Type-checks every package |
| `pnpm test` | Schema tests, API tests (against an in-memory MongoDB) and web unit tests |
| `pnpm test:e2e` | Browser tests: starts an in-memory MongoDB, the API and the web app, then runs the flows in Chromium |
| `pnpm start` | Starts the built API |

### Tests

Tests need no running database: `mongodb-memory-server` downloads a MongoDB binary on the first run and starts a throwaway instance. Before the first `pnpm test:e2e`, install the browser once:

```bash
pnpm --filter @enishi/e2e exec playwright install chromium
```

CI runs typecheck, build, `pnpm test` and `pnpm test:e2e` on every pull request, and `main` requires them to pass.

## API

All `/api/contacts` routes require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/users/register` | Create an account → `{ accessToken, user }` |
| `POST` | `/api/users/login` | Sign in → `{ accessToken, user }` |
| `GET` | `/api/users/current` | Current user |
| `GET` | `/api/contacts` | List your contacts |
| `POST` | `/api/contacts` | Create a contact |
| `GET` | `/api/contacts/:id` | Get one contact |
| `PUT` / `PATCH` | `/api/contacts/:id` | Update a contact (partial updates allowed) |
| `DELETE` | `/api/contacts/:id` | Delete a contact |

A contact has `firstName` (required), `lastName`, `email`, `phone`, `company`, `jobTitle`, `tags`, `favorite` and `notes`. Validation errors return `400` with a `fields` map; an email already used by another of your contacts returns `409` with `duplicateId`.

# ONEXSO Platform Administration

The internal admin console for the ONEXSO platform. Platform staff use it to manage tenants,
subscription plans, invoices, platform users and roles, role and configuration templates, the
module and app catalogs, notification templates, tray app releases, legal documents, support
tickets and announcements, system configuration (service keys, payment gateways, OAuth apps,
integrations) and audit logs.

It talks only to the backend's **Admin API** (`/admin/v1/...`) in the `HRMS-Backend-v1` repo.

## Tech stack

- Angular 21: standalone components, zoneless change detection, signals
- `@ngrx/signals` for state stores
- Tailwind CSS v4
- Jest for unit tests, Playwright (with axe-core) for end-to-end tests
- ESLint (`angular-eslint`) and Prettier

## Prerequisites

- Node.js 22 and npm 11
- [mkcert](https://github.com/FiloSottile/mkcert), for the local HTTPS certificate
- The backend (`HRMS-Backend-v1`) running locally on port `7229`

## Local setup

1. **Install dependencies**

   ```bash
   npm ci
   ```

2. **Map the dev hostnames** to your machine in your hosts file
   (`C:\Windows\System32\drivers\etc\hosts` on Windows, `/etc/hosts` elsewhere):

   ```
   127.0.0.1 onexso.com admin.onexso.com
   ```

3. **Create the dev certificate** in `.certs/` (git-ignored):

   ```bash
   mkcert -install
   mkcert -cert-file .certs/onexso-cert.pem -key-file .certs/onexso-key.pem onexso.com "*.onexso.com" admin.onexso.com localhost 127.0.0.1 ::1
   ```

4. **Start the dev server**

   ```bash
   npm start
   ```

   Open <https://admin.onexso.com:4300>.

Always use `npm start`, not a bare `ng serve`: the script supplies the certificate and port 4300.
Port 4200 belongs to the tenant frontend, and running both apps on one port makes the wrong app
answer. See [PORTS.md](PORTS.md) for the full port map.

In development the API URL is built from the hostname the app is served on
(`https://<hostname>:7229/admin/v1`), so the backend is always called on the same host as the
app. This keeps the session cookies same-site.

## Scripts

| Command          | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `npm start`      | Dev server on `https://admin.onexso.com:4300`                   |
| `npm run build`  | Production build into `dist/` (default configuration)           |
| `npm run watch`  | Development build in watch mode                                 |
| `npm test`       | Jest unit tests with coverage (thresholds in `jest.config.js`)  |
| `npm run e2e`    | Playwright tests; starts its own server on `http://localhost:4300` with the API mocked |
| `npm run lint`   | ESLint over `src/**/*.ts` and `src/**/*.html`                   |

## Environments and builds

| Configuration | Command                                         | Environment file                           |
| ------------- | ----------------------------------------------- | ------------------------------------------ |
| development   | `npm start`                                     | `src/environments/environment.ts`          |
| staging       | `npm run build -- --configuration staging`      | `src/environments/environment.staging.ts`  |
| production    | `npm run build`                                 | `src/environments/environment.prod.ts`     |

Each environment file sets `apiUrl`, `wsUrl`, `enableDebugLogs` and `appName`. Set the API URLs
for the target environment there before building for it.

## Project structure

```
src/app/
├── core/        auth, permissions, guards, interceptors, API endpoints, app-wide services
├── layouts/     auth layout (login and recovery pages) and main layout (navbar, sidebar, breadcrumb)
├── modules/     one folder per business area, each split into data/ and feature/<screen>/
└── shared/      reusable UI components and directives
e2e/             Playwright specs and fixtures (see e2e/fixtures/README.md)
```

## Contributing

- Read [CLAUDE.md](CLAUDE.md) before adding a module or touching auth or permissions. It holds
  the project's conventions.
- Every backend path goes in `src/app/core/config/api-endpoints.ts`.
- Run `npm run lint` and `npm test` before opening a pull request. CI builds the app and runs the
  unit and e2e tests on every pull request to `development`, `testing` and `main`.

# Platform Admin console: deployment and post-deploy setup runbook

Use this runbook to bring up the Platform Admin console on a fresh UAT or production
environment and make it usable: first Super Admin, platform team access, platform keys,
catalog data, and the first tenant.

- **Written:** 2026-11-12, against `origin/development` of this repo (`eeb6641`) and of
  `HRMS-Backend-v1` (`ba05b95d`). Re-check anything marked **Verify** before each release.
- **Scope:** the admin console and the backend settings it depends on. Building and hosting the
  backend itself (database, migrations, IIS or container setup) is covered in the backend repo,
  in `docs/superpowers/plans/next/2026-11-09-crownus-vm-deployment.md`.
- **Placeholders:** `<root-domain>` is the tenancy root domain (for example
  `9-223-115-62.sslip.io` on the team VM). The admin console always lives at
  `https://admin.<root-domain>`. Never put real secrets in this file or in any repo.

---

## 0. Open questions for the team (answer before the first UAT deploy)

1. **Which branch deploys?** `main` and `deployment` are months behind `development`:

   | Repo | Branch | Last commit | Commits behind `development` |
   |---|---|---|---|
   | platform-administration | `main` | 2026-08-05 | 224 |
   | platform-administration | `deployment` | 2026-08-17 | 84 |
   | platform-administration | `testing` | 2026-07-16 | 261 |
   | HRMS-Backend-v1 | `main` | 2026-09-24 | 959 |
   | HRMS-Backend-v1 | `deployment` | (no such branch) | |

   Every feature this runbook relies on (same-origin API, schema-driven service keys, OAuth apps,
   payment gateways, tray releases, support center) exists only on `development`. Decide whether
   UAT deploys from `development` directly, or whether `development` is merged into
   `main` (or `deployment`) first. CI (`.github/workflows/ci.yml`) runs on `main`, `testing` and
   `development` only; it does not run on `deployment`.
2. **Who are the platform team members, and which role does each one get?** See section 3.
3. **Which email provider (SendGrid or Resend) and which payment gateway** is used on this
   environment? Only one email provider may be active (section 4.1).

---

## 1. Pre-deploy

### 1.1 Build the admin console

Node.js 22 and npm 11, from the agreed branch (section 0):

```bash
npm ci
npm run build -- --configuration production
```

- `production` is also the default configuration, so a plain `npm run build` produces the same
  output. The build goes to `dist/platform-administration/browser/`; deploy the contents of that
  `browser` folder as a static site.
- The SPA uses client-side routing. The web server must serve `index.html` for any path that is
  not a real file (for example `/tenants/123` or `/auth/accept-invite?token=...`).

**Do not use the `staging` configuration.** `src/environments/environment.staging.ts` still
points at a placeholder host (`https://staging-api.platform-administration.com/admin/v1` and
`wss://staging-api.platform-administration.com/ws`) and has debug logging switched on. A staging
build cannot reach any real backend. Use the `production` configuration for UAT as well, since it
derives its URLs from the page's own origin. (Follow-up: point `environment.staging.ts` at the
same helpers, or delete the configuration.)

### 1.2 Same-origin API: reverse proxy rules

The production build has no API host baked in. `src/environments/environment.prod.ts` calls
`environment-url.helper.ts`, which builds the URLs from `window.location`:

| Setting | Value at runtime |
|---|---|
| `apiUrl` | `<page protocol>//<page hostname>/admin/v1` (for example `https://admin.<root-domain>/admin/v1`) |
| `wsUrl` | `wss://<page hostname>/ws` on an HTTPS page (`ws://` on HTTP) |

So the web server that hosts `admin.<root-domain>` must proxy two path prefixes to the backend
API, and serve everything else from the static build:

| Path | Goes to |
|---|---|
| `/admin/*` | backend API (same path, for example `http://127.0.0.1:5080/admin/...`) |
| `/ws`, `/ws/*` | backend API, with WebSocket upgrade enabled |
| `/health`, `/health/*` (optional) | backend API, for monitoring |
| anything else | static files, falling back to `index.html` |

No admin console route starts with `/admin`, so the prefix is safe to proxy.

The proxy must also:

1. **Preserve the `Host` header** (or send `X-Forwarded-Host`). The backend's
   `HostTenantResolutionMiddleware` decides the mode from the host name. Only `admin.<root-domain>`
   or `console.<root-domain>` puts a request in admin mode. Any host outside `<root-domain>` gets
   HTTP 400 on every call.
2. **Send `X-Forwarded-Proto: https`** for HTTPS requests. Without it, HTTPS redirection loops and
   cookies lose `Secure`. `X-Forwarded-*` headers are trusted only from loopback, or from IPs and
   networks listed in `ForwardedHeaders:KnownProxies` and `ForwardedHeaders:KnownNetworks`. If the
   proxy is not on the same machine as the API, add its address there.
3. **Redirect HTTP to HTTPS** (except `/.well-known/acme-challenge/` if Let's Encrypt HTTP-01 is
   used). The admin session cookie is `Secure` outside Development, so a login over plain HTTP
   silently fails.

A TLS certificate is needed for `admin.<root-domain>`. Tenants need one per tenant host (or a
wildcard certificate for `*.<root-domain>`), see section 4.10.

### 1.3 Backend configuration the admin console depends on

Set these as environment variables on the API (double underscore `__` replaces `:`). Generate
secrets fresh for each environment and keep them in the team's secret store, never in a repo.

| Key (env var form) | Value | Why the admin console needs it |
|---|---|---|
| `ASPNETCORE_ENVIRONMENT` | `Production` (UAT too) | Never `Development` outside a developer PC: Development runs the demo seeders, auto-migrates, relaxes cookie `Secure`, and enables Swagger. |
| `Tenancy__RootDomain` | `<root-domain>` | Required, the API does not start without it. Drives admin-mode host detection, CORS and forwarded-host checks. |
| `Urls__AdminConsoleBaseUrl` | `https://admin.<root-domain>` | Flagged as required in production by `ConfigurationStartupValidator`. |
| `Email__AdminConsoleBaseUrl` | `https://admin.<root-domain>` | **Separate key.** The admin invite and admin password-reset emails build their links from this one (`EmailTemplateRenderer`). If it is blank the emails carry a `[invite_url placeholder ...]` text instead of a link. |
| `Urls__AppBaseUrl` | `https://<root-domain>` | Tenant invite and reset links. |
| `Email__AppBaseUrl` | `https://<root-domain>` | Same split as above, for tenant emails. **Verify** which tenant emails read it. |
| `Email__FromAddress`, `Email__FromName`, `Email__ReplyToEmail` | Sending identity | Must be an address the chosen email provider has verified. |
| `Urls__CalendarOAuthCallbackBaseUrl` | The public API origin, for example `https://<root-domain>` | Builds the calendar OAuth redirect URI (section 4.2). |
| `Urls__WebhookBaseUrl` | The public API origin | Optional; public webhook callbacks. |
| `ConnectionStrings__DefaultConnection` | Runtime login (`crownus_app`), not `sa` | |
| `Encryption__MasterKey` | 32+ random characters | Encrypts every platform key, OAuth secret and payment credential entered in sections 4.1 to 4.3. **Back it up off the server.** Losing or changing it makes those stored secrets unreadable. |
| `Jwt__Secret` | Random value | MFA challenge and device tokens. |
| `TrayApp__Jwt__Secret` | 32+ random bytes, not starting with `dev-only` | The API refuses to start outside Development/Test without it. |
| `TrayReleases__IngestToken` | Random value | Only if the tray build pipeline registers releases automatically (section 4.9). |
| `TrayPresence__Mode` | `Observe` until tray apps point at this server | With `Enforce`, users in a tenant with monitoring on get HTTP 428 when no tray app is connected. |
| `Swagger__Enabled` | `false` (or unset) | Swagger is on only in Development or when this is `true`. |

**CORS / allowed origins.** With the same-origin proxy, the admin console's API calls are
same-origin, so CORS is not involved. For anything else, the `AllowFrontend` policy
(`CorsExtensions.cs`) allows, with credentials:

- any `https://` origin whose host is `<root-domain>` or a subdomain of it, so
  `https://admin.<root-domain>` is allowed automatically; and
- exact matches from `AllowedOrigins`.

The committed `appsettings.json` still lists `http://localhost:5173` and
`https://app.example.com` in `AllowedOrigins`. Override the list for UAT and production
(`AllowedOrigins__0=...`), or empty it, so those placeholders do not stay allowed.

**Cookies.** The admin session uses the `admin_session` cookie (HttpOnly, `SameSite=Strict`,
`Secure` outside Development) plus the `admin_csrf` cookie the SPA reads for CSRF-guarded
requests. Leave `AdminCookieDomain` **empty** with the same-origin setup: the cookies are then
host-only on `admin.<root-domain>`, which the SPA can read. Set it only if the admin SPA and the
API are served from different subdomains, which this build no longer does.

### 1.4 Database

Apply the backend migrations before the first start (the deployment plan in the backend repo
describes the migration bundle and SQL logins). In `Production` the API does not auto-migrate.

On every start the API runs these seeders, which the admin console relies on:

| Seeder | What it creates | Runs in Production |
|---|---|---|
| `PlatformAccessSeeder` | Platform permissions, the seven system roles, all permissions for Platform Super Admin, and the bootstrap Super Admin (section 2) | Yes |
| `ModuleCatalogSeeder` | Module catalog | Yes |
| `NotificationTemplateSeeder` | Notification templates, each with a **published** first version | Yes |
| `RoleTemplateSeeder` | Built-in (system) role templates | Yes |
| `PermissionSeeder`, `LookupDataSeeder`, `PositionTemplatePackSeeder` | Tenant permissions, lookups, position templates | Yes |
| `PlatformOAuthProviderMetadataSeeder` | OAuth provider rows | **No** (Development/Test only); the OAuth Apps screen still lists every supported provider as "not configured" |
| `DevSmokeTestTenantSeeder` and the `Dapi*` / `WorkManagement*` demo seeders | Demo tenant, Terms and Privacy documents, demo data | **No** (Development/Test only) |

Provider cards (`platform_providers`: google, github, microsoft, zoom, sendgrid, resend,
cloudflare, cloudflare_r2, aws_rekognition, stripe, payhere, paddle) come from the initial
migration, so they exist in every environment.

---

## 2. First Super Admin bootstrap

A fresh database has no platform users. `PlatformAccessSeeder`
(`src/ONEVO.Infrastructure/Persistence/Seeders/PlatformAccessSeeder.cs`) creates the first one
from configuration.

1. **Set four values on the API, temporarily:**

   | Env var | Value |
   |---|---|
   | `PlatformBootstrap__SuperAdminEmail` | The first admin's email (stored lowercase) |
   | `PlatformBootstrap__SuperAdminFullName` | Their full name (falls back to the email) |
   | `DevAdmin__Password` | A temporary password, typed on the server, never shared in chat |
   | `PlatformBootstrap__AllowPasswordBootstrap` | `true` (exactly; anything else is ignored outside Development/Test) |

2. **Start (or restart) the API.** The seeder creates the user as Active with the
   Platform Super Admin role, and stores a bcrypt hash of the password. The log shows a
   `[BOOTSTRAP] Production password bootstrap is enabled...` warning while the flag is on.
   If the flag is on but `DevAdmin__Password` is empty and no credential exists yet, the API
   **refuses to start** with an error that names both keys.
3. **Log in** at `https://admin.<root-domain>/auth/login` with that email and password.
4. **Set up MFA straight away:** profile menu (top right) → **Settings** (`/settings/mfa`), or the
   dashboard prompt. Admin MFA is TOTP: scan the QR code with an authenticator app and confirm with
   a 6-digit code. Today MFA is **not enforced**
   for admins (see section 6), so this step is manual and must not be skipped.
5. **Switch the bootstrap off:** delete `PlatformBootstrap__AllowPasswordBootstrap` and
   `DevAdmin__Password`, then restart the API. Confirm that the `[BOOTSTRAP]` warning is gone and
   that you can still log in (the hash is stored in `platform_user_credentials`).
   - `PlatformBootstrap__SuperAdminEmail` and `...FullName` may stay; on each start they only
     re-ensure that user exists with the Super Admin role. Remove them too if the team prefers no
     bootstrap input on the server.
   - Why the flag must go: if it stays on and the stored credential is ever revoked, a restart
     would quietly re-create a password credential from configuration.
6. **Replace the temporary password.** The admin console has no change-password screen. Once the
   email provider is set up (section 4.1), use **Forgot password** on the login page to set a new
   password through the emailed link.

---

## 3. Platform team access

Only **Platform Super Admin** is seeded with permissions. The other six system roles exist but
have **no permissions**:

| Role | Intended scope (role description) |
|---|---|
| Tenant Operations Manager | Tenant lifecycle, provisioning, activation, tenant read/manage |
| Billing Manager | Subscription plans, invoices, payment gateways, billing reports |
| Security Auditor | Security, audit, compliance, retention, read-only |
| Module Catalog Manager | Module catalog, integration catalog, template management |
| Operations Engineer | Platform health, services monitor, runtime overrides, system configuration review |
| Read-Only Viewer | Dashboard and broad read-only visibility |

**Before inviting anyone:**

1. Go to **Access Control → Roles** (`/roles`), open each role the team will use, and grant its
   permissions. Codes follow `platform.<area>.<read|manage>`, for example `platform.tenants.read`,
   `platform.tenants.manage`, `platform.subscriptions.manage`, `platform.system_config.read`,
   `platform.templates.manage`, `platform.compliance.manage`, `platform.support.manage`,
   `platform.audit.read`, `platform.accounts.manage`, `platform.roles.manage`.
   The backend rejects unknown codes and changes that would lock everyone out.
2. Agree the role mapping with the team lead (question 2 in section 0). Keep Platform Super Admin
   to as few people as possible.
3. Go to **Access Control → Users** (`/users`) → **Invite Manager**, and invite each person with their role. The invite
   email needs a working email provider (section 4.1) and `Email__AdminConsoleBaseUrl`
   (section 1.3). The invitee accepts at `/auth/accept-invite`, sets a password, and should set up
   MFA on first login.

**What a user without permissions sees.** On `origin/development`, `PermissionStore.canAccess()`
still **fails open** when the user holds no permissions at all: a user whose role has zero
permissions sees every menu item and every route, then hits 403 errors. (A user with at least one
permission is already gated correctly.) Branch `fix/permission-fail-closed` (PR #63, commit `31dbec9`,
"enforce route and sidebar permissions strictly") removes that branch, so the frontend hides
anything the user lacks permission for and sends direct URLs to `/access-denied`. It is **not
merged into `development`** at the time of writing; **verify** it is merged before UAT. In every
case the backend enforces permissions on each endpoint, so the gap shows menus, not data. This is
one more reason to grant permissions before inviting anyone.

---

## 4. Post-deploy setup in the admin console (in this order)

Log in as the Super Admin. Every screen below is in the left sidebar. Secrets entered here are
encrypted with `Encryption__MasterKey` and are never shown again after saving.

### 4.1 Service keys: email, storage, face verification

**System Config → Providers** (`/system-config/providers`) gives an overview of every provider
card. Configure the keys on **System Config → Service Keys** (`/system-config/service-keys`).
The form fields come from the backend (`ServiceKeyDefinitionRegistry`):

| Service key | Purpose | Fields | Verification |
|---|---|---|---|
| `sendgrid` | Transactional email | API key (`SG.…`) | Live |
| `resend` | Transactional email | API key (`re_…`) | Live |
| `cloudflare_r2` | File storage | Account ID, Bucket name, Access Key ID, Secret Access Key, Endpoint (`https://<account-id>.r2.cloudflarestorage.com`), Region (optional, default `auto`) | Live |
| `cloudflare` | Cloudflare API token | API key | Format only |
| `aws_rekognition` | Face liveness / face match | Access Key ID, Secret Access Key, Region (default `eu-west-2`), Liveness role ARN (optional; falls back to `AwsRekognition:LivenessRoleArn`) | Live |

Steps:

1. **Email first.** **Add Service Key** for **either** SendGrid **or** Resend, run **Verify**, then **Activate**.
   Exactly one transactional email key may be active: with none, or with both active, every email
   (admin invites, password resets, tenant owner invites, notifications) is blocked
   (`PlatformKeyTransactionalEmailSender`). The sender address in `Email__FromAddress` must be
   verified with that provider.
2. Add **Cloudflare R2** (storage), verify, activate.
3. Add **AWS Rekognition** if face verification is used on this environment, verify, activate.
4. Add **Cloudflare** only if a feature on this environment needs the API token.
5. Now do step 6 of section 2 (replace the temporary password through Forgot password). This also
   proves email works end to end.

### 4.2 OAuth apps: Google, Microsoft, Zoom

**System Config → OAuth Apps** (`/system-config/oauth-apps`). Every supported provider is listed
even when it has no row yet; configuring one creates it.

| Provider | Used for | Default scopes (from `PlatformOAuthProviderCatalog`) |
|---|---|---|
| `google` | Admin console Google sign-in, user OAuth, calendar | `openid profile email https://www.googleapis.com/auth/calendar` |
| `microsoft` | User OAuth, calendar, Teams meetings | `openid profile email offline_access User.Read Calendars.ReadWrite OnlineMeetings.ReadWrite` |
| `zoom` | User OAuth, Zoom meetings | Zoom scopes listed on the card (includes `user:read:user`) |
| `github` | User OAuth (work management) | `read:user` |

For each provider the environment uses:

1. Create the app in the provider's console (Google Cloud, Microsoft Entra, Zoom Marketplace
   "General App", GitHub).
2. Register the redirect URI. Calendar connections use
   `<Urls:CalendarOAuthCallbackBaseUrl>/api/v1/calendar/connections/<provider>/callback`, for
   example `https://<root-domain>/api/v1/calendar/connections/google/callback`.
   For Google admin sign-in, also add `https://admin.<root-domain>` as an authorised JavaScript
   origin. **Verify** the exact URIs for user OAuth and Zoom meetings against the backend before
   registering them.
3. In the admin console, open the provider card, enter the client ID and client secret (plus app
   name and logo if wanted), **Save Configuration**, run **Run Local Check** (it checks the stored
   configuration locally; it does not call the provider), then **Activate**. The first real proof
   is a user connecting a calendar or signing in with that provider.

### 4.3 Payment gateway

**System Config → Payment Gateways** (`/system-config/payment-gateways`). Supported providers:
`stripe`, `paddle`, `payhere`.

1. **Add Gateway:** gateway key, provider, environment (`sandbox` for UAT, `production` for
   production), display name, secret key, webhook secret, public key and merchant ID where the
   provider needs them, and the country codes this gateway serves.
2. Use **Verify Credentials** first: it checks the credentials and shows the account name, country, currency
   and whether charges and payouts are enabled.
3. For Stripe, point the provider's webhook at
   `https://<root-domain>/api/payment-gateways/stripe/<gatewayKey>/webhook` and paste the webhook
   signing secret. **Verify** the webhook path for Paddle and PayHere before using them.
4. Use **Rotate Credentials** to change secrets later; never delete and re-create a live gateway.

### 4.4 Module catalog check

**Subscription & Billing → Module Catalog** (`/module-catalog`). The modules are seeded on
startup. Check that the list is complete and the details are correct; plans in the next step pick
modules from here. **System Config → Application Catalog** and **Integration Catalog** list the
apps and integrations tenants can connect; review them too.

### 4.5 Subscription plans

**Subscription & Billing → Subscription Plans** → **New Plan** (`/subscription-plans/new`).
Create every plan the environment offers, with its modules and prices. The tenant wizard's
Subscription step chooses from these plans, so at least one active plan must exist before
section 4.10.

### 4.6 Notification templates

**Template Management → Notification Templates** (`/notification-templates`). The seeder creates
every template with a published first version, so emails work without any action. Review the
copy, then for each template you change: **Edit Draft**, **Save Draft**, use **Preview** and
**Send Test**, then **Publish**. A draft is never sent; only the published version is.

### 4.7 Legal documents

**Security & Compliance → Legal Documents** (`/legal-documents`). A fresh Production database has
**no** legal documents (only the Development demo seeder adds them), and tenant sign-in asks users
to accept the current Terms and Privacy Notice.

1. **New document** → type **Terms of Service**, version, title, content → save → **Publish**.
2. Repeat for **Privacy Notice**.
3. Do this **before** any tenant user signs in.

### 4.8 Role templates and configuration templates

- **Template Management → Role Templates** (`/role-templates`): the built-in system templates are
  seeded. Review them and add any custom templates tenants should start from.
- **Template Management → Configuration Templates** (`/configuration-templates`): nothing is
  seeded. Create the templates the team wants to apply to new tenants. A configuration template
  is applied to a tenant from this screen (apply-to-tenant dialog); a role template is applied
  from the tenant detail page (**Apply Role Template**).

### 4.9 Tray release

**System Config → Tray Releases** (`/system-config/tray-releases`) → **New release**: version,
channel, download URL (the signed MSIX), file size, publisher, minimum supported version, minimum
Windows version, release notes. Create it inactive, check the download URL works, then activate it
and **Promote to stable**.

If the tray build pipeline registers releases itself, it calls
`POST https://admin.<root-domain>/admin/v1/tray-releases/ingest` with header
`X-Release-Token: <TrayReleases__IngestToken>`. Ingested releases are always inactive; an admin
still activates and promotes them here.

### 4.10 First tenant

1. **Platform → Tenants → New Tenant** (`/tenants/new`). The wizard has three steps:
   **Company Details**, **Subscription** (choose a plan from 4.5), **Owner Invite** (the tenant
   admin's name and email). Click **Create Tenant**.
2. The tenant opens in **Provisioning**. Its detail page shows the **Provisioning Checklist**:
   Tenant Details, Subscription, Modules, Roles, Settings, Owner Invite. Fix any blocking error it
   lists (for example, **Apply Role Template** on the detail page, or apply a configuration
   template from the Configuration Templates screen).
3. When every section is ticked, click **Confirm & Activate**.
4. If the owner did not get the email, use **Invite Admin** on the tenant detail page to send it
   again.
5. **Infrastructure for the tenant host:** `https://<slug>.<root-domain>` needs DNS and a
   certificate (or a wildcard), and the tenant web app's site must answer on that host. On the team
   VM, each new tenant needs its own certificate and host binding.
6. The owner accepts the invite and signs in at `https://<slug>.<root-domain>`.

---

## 5. Smoke test checklist

Run after section 4. Each line should pass before the environment is handed to testers.

**Platform**
- [ ] `https://admin.<root-domain>/health` returns 200 (not 400, which means the `Host` header was
      lost; not a redirect loop, which means `X-Forwarded-Proto` is missing).
- [ ] `http://admin.<root-domain>/` redirects with 301 to `https://`.
- [ ] Deep link `https://admin.<root-domain>/tenants` loads the app (SPA fallback works).
- [ ] Login → MFA code → dashboard. In devtools, the login response sets `admin_session` with
      `Secure`, `HttpOnly`, `SameSite=Strict`, and `admin_csrf`.
- [ ] A save on any screen (a mutation) succeeds, so CSRF works.
- [ ] Logout, then the back button does not show data.
- [ ] API startup log has no `[BOOTSTRAP]` warning, and the `[CONFIG]` lines list nothing
      required as missing.
- [ ] The browser console shows no calls to `staging-api.platform-administration.com`,
      `localhost` or port `7229`.

**Access**
- [ ] Invite a second platform user with a non-Super-Admin role: the email arrives, the link opens
      `/auth/accept-invite` on the right host, they can set a password and MFA.
- [ ] That user sees only the screens their role allows; a direct URL to another screen goes to
      `/access-denied`.
- [ ] **Forgot password** sends an email with a working reset link.

**Configuration**
- [ ] Exactly one email service key is active; Cloudflare R2 (and AWS Rekognition, if used) show
      verified and active.
- [ ] Each configured OAuth app passes **Run Local Check**, and one real calendar connection works
      for Google or Microsoft if calendars are in scope.
- [ ] Payment gateway **Verify Credentials** succeeds with the expected account.
- [ ] At least one active subscription plan; Terms and Privacy Notice are published.
- [ ] A notification template **Send test** reaches an inbox.

**Tenant**
- [ ] The first tenant is Active; the owner receives the invite, signs in on the tenant host and is
      asked to accept the published Terms and Privacy Notice.
- [ ] The tenant's audit log and sessions panels load on the admin tenant detail page.
- [ ] Optional isolation check: a second throwaway tenant never shows the first tenant's data;
      disable it afterwards.

---

## 6. Known gaps at the time of writing (2026-11-12)

Check the state of each before a UAT or production release.

| Item | State on 2026-11-12 | What to check before release |
|---|---|---|
| **Support module backend** | The admin **Support → Announcements / Support Tickets** screens are merged (`feature/support-center-frontend`), but the backend support module is still being built on a separate branch. | Whether the backend support endpoints are merged and deployed. If not, hide or avoid the Support screens in UAT. |
| **Mandatory admin MFA (F-02)** | Admin MFA works but is optional; an admin can skip it. Enforcement is in progress on a separate branch. | Whether enforcement is merged. Until it is, section 2 step 4 and section 3 step 3 rely on people setting MFA up by hand; check every platform user's MFA status on the Users screen. |
| **Admin audit log (F-07)** | Admin actions are not yet recorded in an admin audit log; work is in progress on a separate branch. The **Audit Logs** screen exists but today lists platform sign-in events (`/admin/v1/platform-access/auth-events`), not setup actions. | Whether the audit log branch is merged, and whether setup actions in section 4 show up on the Audit Logs screen. |
| **Permission fail-closed (frontend)** | `fix/permission-fail-closed` (PR #63) is open, not merged into `development`. | Merge it before UAT (section 3). |
| **Security PRs** | PR #61 (Angular upgrade, `fix/sec-f09-admin-angular`) and PR #62 (legal document preview XSS, `fix/sec-f10-legal-preview`) are open, not merged. | Merge both before production. PR #62 matters for section 4.7. |
| **Staging build configuration** | Points at a placeholder host (section 1.1). | Do not use it; fix or remove it. |
| **Deploy branch** | `main`/`deployment` far behind `development` (section 0). | Team decision. |
| **No change-password screen** | Admins change passwords only through Forgot password. | Accept, or add a screen later. |
| **Not verified in this runbook** | Exact OAuth redirect URIs for user OAuth and Zoom meetings; webhook paths for Paddle and PayHere; which tenant emails read `Email__AppBaseUrl`. | Confirm against the backend before configuring those providers. |

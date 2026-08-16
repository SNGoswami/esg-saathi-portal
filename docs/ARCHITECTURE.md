# ESGSaathi — Enterprise vertical module architecture

Vertical domain modules own UI, API clients, caches, and (on the backend) controllers through repositories. Shared infrastructure lives in **platform** only.

> **API reference:** Full endpoint catalog, auth flow, BFF routes, and client stack → [API_ARCHITECTURE.md](./API_ARCHITECTURE.md)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         esg-saathi-ui (Next.js)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  app/                    Thin routes only — no business logic           │
│  modules/                Vertical domains (product code lives here)       │
│  components/             Marketing chrome + legacy re-export shims      │
│  lib/                    Deprecated shims → modules/* (migrate imports) │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    credentials: include (HTTP-only JWT cookie)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    saathi-api (Spring Boot — separate repo)            │
├─────────────────────────────────────────────────────────────────────────┤
│  com.esgsaathi.saathi.modules.*   One package tree per bounded context  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## UI module map (`modules/`)

| Module | Responsibility | Key paths |
|--------|----------------|-----------|
| **platform** | HTTP client, auth session, RBAC, display helpers | `platform/api`, `platform/auth`, `platform/rbac` |
| **dashboard** | Shell, sidebar nav, view registry, MSME overview widgets | `dashboard/shell`, `dashboard/nav`, `dashboard/registry` |
| **lighthouse** | MSME assessment, scoring, reports, PDF export | `lighthouse/api`, `lighthouse/domain`, `lighthouse/ui` |
| **admin** | Inbox, analytics, user lists, session caches | `admin/api`, `admin/ui` |
| **account** | Profile + settings | `account/api`, `account/ui`, `account/profile` |
| **ai-advisor** | Gemini chat + quota | `ai-advisor/api`, `ai-advisor/ui` |
| **clients** | CA / consultant client lists | `clients/api`, `clients/ui` |
| **brsr** | BRSR assessments for professional roles | `brsr/api`, `brsr/ui` |
| **auth-ui** | Login & OTP signup screens | `auth-ui/components` |
| **blog** | Sanity CMS | `blog/sanity.ts` |
| **contact** | Public contact form | `contact/Form.tsx` |

Marketing landing (`Hero`, `Navbar`, etc.) remains under `components/` until a dedicated `modules/marketing/` pass.

### Dependency rules

1. **platform** must not import from feature modules.
2. Feature modules may import **platform** and their own subtree only.
3. **dashboard** shell resolves views via `dashboard/registry/viewRegistry.tsx` — no direct cross-feature UI imports in the shell.
4. All Spring HTTP calls go through `platform/api/client.ts` (`apiFetch`).

### Routing

| URL | Module |
|-----|--------|
| `/user/dashboard` | `dashboard` shell + `?view=` registry |
| `/login` | `auth-ui` |
| `/admin` | Redirect → `/user/dashboard` (admin role) |
| `/blog/*` | `blog` |
| `/contact` | `contact` |
| `app/api/database/*` | Supabase edge routes (contact/waitlist) |

### Imports

All product code imports from `@/modules/{domain}/...`. The old `lib/` and `components/Dashboard/` shim layers have been removed.

---

## API module map (Spring Boot — target layout)

Apply the same vertical boundaries on the Java API (`saathi` service):

```
src/main/java/com/esgsaathi/saathi/
├── platform/
│   ├── config/          Security, CORS, Jackson, OpenAPI
│   ├── auth/            JWT filter, refresh, /api/auth/*
│   ├── web/             Global exception handler, ApiResponse
│   └── persistence/     Base entity audit fields (optional)
│
├── modules/
│   ├── account/
│   │   ├── api/         AccountController, SettingsController
│   │   ├── application/ AccountService, SettingsService
│   │   ├── domain/      Account, Profile value objects
│   │   └── infrastructure/ AccountRepository, profile adapters
│   │
│   ├── lighthouse/
│   │   ├── api/         LighthouseController  (/api/lighthouse/*)
│   │   ├── application/ ScoringService, ReportService, Gemini integration
│   │   ├── domain/      Assessment, PillarScore, KPI
│   │   └── infrastructure/ LighthouseRepository
│   │
│   ├── admin/
│   │   ├── api/         AdminUserController, AdminContactController
│   │   ├── application/ AdminUserService, WaitlistBroadcastService
│   │   └── infrastructure/ UserRepository (@EntityGraph for profiles)
│   │
│   ├── clients/
│   │   └── api/         ClientsController (/api/clients)
│   │
│   ├── aiadvisor/
│   │   └── api/         AiAdvisorController (/api/ai-advisor/*)
│   │
│   └── profile/         Role-specific profile endpoints (/api/profile/*)
│       ├── msme/
│       ├── ca/
│       ├── cs/
│       ├── esg/
│       └── auditor/
│
└── SaathiApplication.java
```

### API ↔ UI contract

| UI module | Spring base path |
|-----------|------------------|
| platform/auth | `GET/POST /api/auth/*` |
| account | `/api/account/*`, `/api/profile/{role}/*` |
| lighthouse | `/api/lighthouse/me`, `POST /api/lighthouse/submit` |
| admin | `/api/admin/users/*`, `/api/admin/contact-info`, waitlist |
| clients | `/api/clients` |
| brsr | `/api/brsr`, `/api/brsr/{id}` |
| ai-advisor | `/api/ai-advisor/chat`, `/api/ai-advisor/quota` |

### Cross-cutting backend rules

- Controllers are thin — delegate to `application` services.
- Modules do not call other modules' repositories; use application services or domain events.
- DTOs live in `modules/{name}/api/dto/`.
- Shared security roles mirror `platform/rbac/roles.ts` on the UI.

---

## View registry (dashboard)

`modules/dashboard/registry/viewRegistry.tsx` maps `?view=` keys to lazy-loaded feature views.  
`modules/dashboard/nav/dashboardNav.ts` is the RBAC source of truth for which roles see which links.

When adding a feature:

1. Create `modules/{domain}/ui/{Feature}View.tsx`
2. Register in `viewRegistry.tsx`
3. Add nav item in `dashboardNav.ts` with role allow-list

---

## Migration checklist

- [x] Move product code under `modules/`
- [x] Platform HTTP client unified
- [x] Dashboard view registry
- [x] Legacy `/admin` redirect
- [x] Remove `lib/` and `components/Dashboard/` shims
- [x] Delete legacy admin monolith
- [x] Auth route guard via `proxy.ts` (Next.js 16)
- [x] BRSR UI module + API client
- [x] API architecture doc (`docs/API_ARCHITECTURE.md`)
- [ ] Scope `dashboard.css` to dashboard layout route group
- [ ] Refactor Spring API into `modules/` packages (backend repo)

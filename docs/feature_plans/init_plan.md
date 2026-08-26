# Project Structure Plan: Internal Dashboard

## Summary

Monorepo project with Next.js 14+ (App Router) frontend and FastAPI backend, using Supabase for database and authentication. Deployed to Vercel (frontend), Render (backend), and Supabase (DB/auth).

---

## Requirements Captured

| Requirement | Decision |
|-------------|----------|
| App Type | Internal Dashboard (Analytics + CRUD) |
| Repo Structure | Monorepo (`/frontend`, `/backend`, `/supabase`) |
| Frontend | Next.js 14+ (App Router) + shadcn/ui + TypeScript |
| Backend | FastAPI + Python 3.11+ |
| Database/Auth | Supabase |
| Hosting | Vercel (FE), Render (BE), Supabase (DB) |
| Auth | Email/password + Email OTP verification |
| RBAC | Yes (Admin, Manager, Viewer) |
| Theme | Dark mode with system preference + toggle |
| Package Manager | npm |
| Docker | Yes for local development |
| Real-time | Structured for future addition |
| Complexity | Medium (6-10 entities) |

---

## Root Project Structure

```
petro_astra_v1/
├── .github/workflows/          # CI/CD pipelines
├── frontend/                   # Next.js application
├── backend/                    # FastAPI application
├── supabase/                   # DB migrations & config
├── docker/                     # Docker configurations
│   ├── docker-compose.yml
│   ├── frontend.Dockerfile
│   └── backend.Dockerfile
├── .env.example
├── .gitignore
└── README.md
```

---

## Frontend Structure (`/frontend`)

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # Auth pages (login, signup, verify-otp)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── verify-otp/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/               # Protected dashboard
│   │   │   ├── page.tsx               # Dashboard home
│   │   │   ├── layout.tsx             # Sidebar + header layout
│   │   │   ├── analytics/
│   │   │   ├── users/                 # CRUD: list, new, [id], [id]/edit
│   │   │   ├── projects/
│   │   │   ├── teams/
│   │   │   ├── reports/
│   │   │   ├── settings/
│   │   │   └── admin/                 # Admin-only section
│   │   ├── auth/callback/route.ts     # Supabase auth callback
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui components
│   │   ├── layout/                    # header, sidebar, theme-toggle
│   │   ├── forms/                     # reusable form components
│   │   ├── tables/                    # data-table, columns
│   │   ├── charts/                    # analytics charts
│   │   ├── cards/                     # stats-card, activity-card
│   │   └── shared/                    # loading-spinner, empty-state
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser client
│   │   │   ├── server.ts              # Server client
│   │   │   └── middleware.ts          # Auth middleware helper
│   │   ├── api/                       # FastAPI client
│   │   ├── utils.ts
│   │   └── validations/               # Zod schemas
│   │
│   ├── hooks/                         # Custom React hooks
│   ├── providers/                     # Theme, Query providers
│   ├── store/                         # Zustand stores
│   ├── types/                         # TypeScript types
│   ├── config/                        # Site, navigation config
│   └── actions/                       # Server Actions
│
├── middleware.ts                      # Root auth middleware
├── components.json                    # shadcn/ui config
├── tailwind.config.ts
└── package.json
```

---

## Backend Structure (`/backend`)

```
backend/
├── app/
│   ├── main.py                        # FastAPI entry point
│   ├── config.py                      # Pydantic Settings
│   │
│   ├── api/
│   │   ├── deps.py                    # Auth dependencies (JWT validation, RBAC)
│   │   └── v1/
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── auth.py
│   │           ├── users.py
│   │           ├── projects.py
│   │           ├── teams.py
│   │           ├── reports.py
│   │           ├── analytics.py
│   │           ├── admin.py
│   │           └── health.py
│   │
│   ├── core/
│   │   ├── security.py                # JWT decode, password hashing
│   │   ├── supabase.py                # Supabase client
│   │   └── exceptions.py
│   │
│   ├── middleware/                    # CORS, logging, rate limiting
│   ├── models/                        # Data models
│   ├── schemas/                       # Pydantic schemas
│   ├── services/                      # Business logic
│   ├── repositories/                  # Data access layer
│   └── utils/
│
├── tests/
├── requirements.txt
├── requirements-dev.txt
└── pyproject.toml
```

---

## Supabase Structure (`/supabase`)

```
supabase/
├── config.toml
├── seed.sql
├── migrations/
│   ├── 00001_initial_schema.sql
│   ├── 00002_create_roles.sql
│   ├── 00003_create_user_roles.sql
│   ├── 00004_create_projects.sql
│   ├── 00005_create_teams.sql
│   ├── 00006_create_team_members.sql
│   ├── 00007_create_reports.sql
│   ├── 00008_create_audit_logs.sql
│   ├── 00009_enable_rls_policies.sql
│   └── 00010_custom_claims_hook.sql   # Adds role to JWT
└── functions/                         # Edge Functions (optional)
```

---

## Docker Structure (`/docker`)

### docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ../frontend
      dockerfile: ../docker/frontend.Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=http://supabase-kong:8000
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
    volumes:
      - ../frontend:/app
      - /app/node_modules
      - /app/.next
    depends_on:
      - backend
    networks:
      - app-network

  backend:
    build:
      context: ../backend
      dockerfile: ../docker/backend.Dockerfile
      target: development
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=http://supabase-kong:8000
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - DEBUG=true
      - CORS_ORIGINS=["http://localhost:3000"]
    volumes:
      - ../backend:/app
    networks:
      - app-network

  supabase-db:
    image: supabase/postgres:15.1.0.147
    ports:
      - "54322:5432"
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
      POSTGRES_DB: postgres
    volumes:
      - supabase-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  supabase-db-data:
```

---

## Implementation Steps

### Phase 1: Project Initialization
1. Create monorepo folder structure
2. Initialize Next.js 14+ app in `/frontend` with TypeScript
3. Initialize FastAPI project in `/backend`
4. Set up Supabase project and local development
5. Create `.env.example` files for all environments

### Phase 2: Frontend Setup
1. Install and configure shadcn/ui with dark mode
2. Set up `@supabase/ssr` client (browser + server)
3. Create authentication middleware
4. Set up TanStack Query for data fetching
5. Create base layout with sidebar and header
6. Implement theme toggle (system + manual)

### Phase 3: Backend Setup
1. Configure FastAPI with Pydantic Settings
2. Implement JWT validation for Supabase tokens
3. Create RBAC dependency injection (admin, manager, viewer)
4. Set up API versioning (`/api/v1`)
5. Create health check endpoint
6. Configure CORS for frontend

### Phase 4: Authentication
1. Create Supabase auth tables and custom claims hook
2. Implement signup with email OTP verification
3. Implement login flow
4. Create auth callback handler
5. Add password reset flow
6. Test protected routes

### Phase 5: RBAC & Database
1. Create roles and user_roles tables
2. Implement RLS policies with role checks
3. Create helper function `get_my_role()`
4. Set up custom JWT claims hook for roles
5. Create initial migrations for all entities

### Phase 6: Core Features
1. Build user management CRUD
2. Build project management CRUD
3. Build team management
4. Create analytics dashboard components
5. Implement data tables with shadcn/ui

### Phase 7: Docker & DevOps
1. Create Dockerfiles for frontend and backend
2. Create docker-compose.yml for local development
3. Set up GitHub Actions CI pipeline
4. Configure Vercel deployment for frontend
5. Configure Render deployment for backend

---

## Key Code Patterns

### Supabase Server Client (Next.js)

```typescript
// /frontend/src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component
          }
        },
      },
    }
  )
}
```

### Auth Middleware (Next.js)

```typescript
// /frontend/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### JWT Validation (FastAPI)

```python
# /backend/app/api/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]
) -> CurrentUser:
    """Validate JWT and return current user info."""
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return CurrentUser(
            id=payload.get("sub"),
            email=payload.get("email"),
            role=payload.get("user_role", "viewer")
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(
    current_user: Annotated[CurrentUser, Depends(get_current_user)]
) -> CurrentUser:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin required")
    return current_user
```

### Custom JWT Claims Hook (Supabase)

```sql
-- /supabase/migrations/00010_custom_claims_hook.sql
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    claims jsonb;
    user_role public.app_role;
BEGIN
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = (event->>'user_id')::uuid;

    IF user_role IS NULL THEN
        user_role := 'viewer';
    END IF;

    claims := coalesce(event->'claims', '{}');
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));

    RETURN jsonb_set(event, '{claims}', claims);
END;
$$;
```

---

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_APP_URL=
```

### Backend (`.env`)
```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_JWT_SECRET=
DEBUG=
CORS_ORIGINS=
```

---

## Entities (8 Core)

1. **Users** - User profiles (extends Supabase auth.users)
2. **Roles** - Role definitions (admin, manager, viewer)
3. **UserRoles** - User-to-role mapping
4. **Projects** - Main business entity
5. **Teams** - Team groupings
6. **TeamMembers** - Team membership
7. **Reports** - Analytics reports
8. **AuditLogs** - System audit trail

---

## Verification Plan

### 1. Local Development
- Run `docker-compose up` and verify all services start
- Access frontend at `localhost:3000`
- Access backend docs at `localhost:8000/api/docs`
- Access Supabase Studio at `localhost:54323`

### 2. Authentication Flow
- Sign up with email → receive OTP → verify → redirected to dashboard
- Login with existing credentials
- Test protected routes redirect to login
- Test role-based access (admin vs viewer)

### 3. API Testing
- Test health endpoint: `GET /api/v1/health`
- Test authenticated endpoints with valid JWT
- Test RBAC: admin-only endpoints reject non-admin users
- Verify RLS policies in database

### 4. Deployment Verification
- Deploy frontend to Vercel → verify build succeeds
- Deploy backend to Render → verify health check passes
- Test cross-origin requests between Vercel and Render
- Verify Supabase production connection

---

## Critical Files to Create First

1. `/frontend/src/lib/supabase/server.ts` - Server client with cookie handling
2. `/frontend/middleware.ts` - Auth middleware for route protection
3. `/backend/app/api/deps.py` - JWT validation and RBAC dependencies
4. `/supabase/migrations/00010_custom_claims_hook.sql` - Role in JWT
5. `/docker/docker-compose.yml` - Local development environment

---

## GitHub Actions CI Pipeline

```yaml
# /.github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend-lint-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run build

  backend-lint-test:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt -r requirements-dev.txt
      - run: ruff check .
      - run: mypy app
      - run: pytest -v
```

# Shipyard - Release Management Dashboard

## Overview

Shipyard is a production-ready release management dashboard featuring the CargoCat mascot as your trusted dockmaster. The application provides user authentication, release tracking across environments (staging, UAT, production), and status filtering with a complete nautical theme throughout the UI. Future features will incorporate CargoCat in chatbot and email notifications.

**Branding**: Shipyard with CargoCat dockmaster mascot - complete nautical/maritime theme with ocean-inspired colors and terminology.

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preference: Nautical theme with CargoCat mascot, no emojis (use icons instead)
- Default environments: staging, UAT, production (auto-created with releases)

## Recent Changes (November 7, 2025)

### Authentication System
- Implemented complete user authentication with signup/login pages
- Added Passport.js with LocalStrategy for username/password auth
- Configured session management with PostgreSQL session store
- Protected all routes requiring authentication
- Added SESSION_SECRET validation for secure session management

### Release Filtering
- Added status filtering (ongoing, finished, failed) with backend support
- Backend enriches release data with stages and blockers for accurate filtering
- Filter buttons in sidebar allow users to view voyages by status

### Shipyard Branding
- Applied complete nautical theme with ocean-inspired colors:
  - Navy blue (#1e3a5f) for primary elements
  - Ocean blue (#2563eb) for accents
  - Ship and anchor icons throughout
- Updated all UI text to use nautical terminology:
  - Releases → Voyages
  - Environments → Cargo Holds
  - Agent/Assistant → Dockmaster (CargoCat)
- Added CargoCat mascot branding to authentication page
- Removed all emojis in favor of nautical icons

## System Architecture

### Frontend Architecture

**Framework & Routing**
- React 18 with TypeScript for type-safe component development
- Wouter for lightweight client-side routing with protected routes
- Vite as the build tool and development server with hot module replacement

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and synchronization
- Custom hooks pattern (`useReleases`, `useAuth`) to encapsulate data fetching logic
- React Context API for global authentication state

**UI Component System**
- shadcn/ui component library built on Radix UI primitives
- Shipyard nautical design system with ocean-inspired color palette
- Tailwind CSS for utility-first styling with custom design tokens
- Custom CSS variables for theme switching (light/dark mode)
- Typography system using Inter (UI) and JetBrains Mono (code/IDs) fonts

**Authentication Flow**
- Split-screen login/signup page with CargoCat mascot introduction
- Protected route wrapper requiring authentication
- Automatic redirect to auth page for unauthenticated users
- Session persistence across page refreshes

**Interactive Visualization** (Planned)
- React Flow library for node-based diagram editing with drag-and-drop
- Custom node types for environments and tasks
- Three-column layout: release list sidebar (280px), flow canvas (flex), and detail panel (340px slide-in)

**Form Management**
- React Hook Form with Zod schema validation
- @hookform/resolvers for schema integration
- Validated forms for release creation and authentication

### Backend Architecture

**Server Framework**
- Express.js on Node.js (v20+) for the REST API
- TypeScript for type safety across client and server
- Session-based authentication using Passport.js with local strategy

**API Design**
- RESTful endpoints organized by resource (`/api/releases`, `/api/stages`, `/api/tasks`, `/api/blockers`)
- Authentication endpoints (`/api/register`, `/api/login`, `/api/logout`, `/api/user`)
- CRUD operations for releases, stages, tasks, and blockers
- Release filtering with enriched data (stages + blockers) for status derivation
- Health check endpoint for monitoring database connectivity
- Structured error handling with appropriate HTTP status codes

**Authentication & Authorization**
- Passport.js with LocalStrategy for username/password authentication
- Session management with secure cookies
- Password hashing using bcrypt (scrypt algorithm with salt)
- Protected API routes requiring authentication
- SESSION_SECRET environment variable validation before auth initialization

**Database Layer**
- Drizzle ORM for type-safe database operations
- Schema-first approach with TypeScript types generated from Drizzle schemas
- PostgreSQL as the relational database (via Neon serverless)
- Connection pooling through @neondatabase/serverless

### Data Storage

**Database Schema**
- **users**: Authentication and user management (id, username, password)
- **releases**: Top-level release entities with name, version, team, and change window
- **stages**: Environment-specific deployment stages (staging, UAT, prod) linked to releases
- **tasks**: Actionable items within stages with status, owner, and evidence tracking
- **blockers**: Issues preventing stage progression with severity levels (P1, P2, P3)
- **diagrams**: Visual layout persistence for flow canvas (planned)
- **diagramNodes**: Node positions and metadata for diagram persistence (planned)
- **activityLog**: Audit trail of changes and approvals (planned)

**Enums for Type Safety**
- Environment types: staging, uat, prod
- Stage statuses: not_started, in_progress, blocked, done
- Task statuses: todo, doing, done, na
- Blocker severity: P1, P2, P3

**Session Storage**
- PostgreSQL-backed session store using connect-pg-simple
- Sessions persist across server restarts
- Secure session configuration with SESSION_SECRET

### External Dependencies

**Database Services**
- **Neon Database**: Serverless PostgreSQL hosting with websocket support
- Connection via DATABASE_URL environment variable
- Drizzle Kit for schema migrations and database management

**UI Component Libraries**
- **Radix UI**: Unstyled, accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **React Flow**: Interactive node-based diagram library for flow visualization (planned)
- **Lucide React**: Icon library for nautical and UI icons
- **React Icons**: Company logos and additional icon sets

**Development Tools**
- **Vite**: Frontend build tool with HMR and optimized production builds
- **tsx**: TypeScript execution for development server and scripts
- **esbuild**: Fast JavaScript bundler for production server build
- **Drizzle Kit**: Database schema management and migrations

**Authentication**
- **Passport.js**: Authentication middleware with strategy pattern
- **express-session**: Session management middleware
- **bcrypt**: Secure password hashing
- Session secret required via SESSION_SECRET environment variable (validated at startup)

**Utility Libraries**
- **date-fns**: Date formatting and manipulation
- **zod**: Runtime schema validation
- **clsx/tailwind-merge**: Conditional CSS class merging

**Font Hosting**
- Google Fonts: Inter and JetBrains Mono via CDN link in HTML

**Planned Integrations** (not yet implemented)
- Slack/Teams webhooks for CargoCat notifications
- GitHub/GitLab API for CI/CD status linking
- S3-compatible storage for evidence attachments
- Real-time collaboration via WebSockets

## Key Features

### Implemented
✅ User authentication (signup/login with session management)
✅ Protected routes requiring login
✅ Release creation and listing
✅ Release filtering by status (ongoing/finished/failed)
✅ Automatic environment creation (staging, UAT, production)
✅ Shipyard nautical branding with CargoCat mascot
✅ Ocean-inspired color palette
✅ Responsive UI with shadcn components

### Planned
- Interactive flow diagram for release visualization
- Task management within stages
- Blocker tracking and resolution
- Activity log and audit trail
- Real-time collaboration
- CargoCat chatbot for release assistance
- Email notifications with CargoCat branding
- Evidence attachment storage

## Environment Variables

Required secrets (configured in Replit):
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption (validated at startup)
- `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`: Database credentials

## Running the Application

The workflow "Start application" runs `npm run dev` which:
1. Starts Express server for backend API (port 5000)
2. Starts Vite development server for frontend
3. Serves both on the same port with hot module replacement

After authentication, users can:
- Create new releases (voyages)
- View all releases in the sidebar
- Filter releases by status
- See CargoCat mascot branding throughout

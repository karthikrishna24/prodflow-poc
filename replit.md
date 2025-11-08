# DockVoyage - Multi-Tenant Release Management Platform

## Overview

DockVoyage is a production-ready multi-tenant release management platform with nautical theming and anchor branding. The application provides workspace/team-based organization, user authentication, release tracking with custom environments, and complete RBAC (Role-Based Access Control). Built for both individual users and organizations with secure data isolation.

**Domain**: dockvoyage.com  
**Tagline**: "See your releases clearly"  
**Branding**: Anchor icon with nautical/maritime theme

## User Preferences

- Preferred communication style: Simple, everyday language
- Design preference: Nautical theme with anchor icon, no emojis in UI (use lucide-react icons)
- Architecture: Multi-tenant with workspaces → teams → releases → environments → stages

## Recent Changes (November 8, 2025)

### User-Controlled Environment Management ✅
- **Empty canvas by default**: Removed auto-provisioning of default environments - users now start with a blank canvas
- **Add Environment dialog**: Users can create custom environments with name and optional description
- **Environment descriptions**: Description field added to database schema and persisted correctly
- **Delete environments**: Trash icon button on environment nodes with confirmation dialog
- **Cascade deletion**: Deleting an environment removes it from all releases via database foreign keys
- **API endpoints for environment CRUD**:
  - POST `/api/teams/:teamId/environments` - Create environment with name and description
  - DELETE `/api/environments/:id` - Delete environment (admin/owner only, cascade removes from all releases)

### Interactive Canvas for Release Management ✅
- **Draggable environment nodes**: Users can drag and reposition environment boxes on the canvas
- **Visual flow connections**: Connect environments with edges to show deployment flow paths
- **Auto-save functionality**: Canvas layout automatically saves after 2 seconds of inactivity (debounced)
- **Add Environment button**: Toolbar allows users to create new environment nodes dynamically
- **Persistent diagram storage**: Node positions and edge connections stored in database (diagrams table)
- **React Flow integration**: Built using React Flow library for professional node-based editing
- **API endpoints**: New routes for creating environments and saving diagram layouts
  - POST `/api/teams/:teamId/environments` - Create new environment nodes (now accepts description)
  - POST `/api/releases/:releaseId/stages` - Create stages when environments are added
  - PUT `/api/releases/:releaseId/diagram` - Save/update canvas layout

### Email Invitation System ✅
- **Workspace type selection**: Signup flow now asks users to select individual vs organization workspace
- **Resend integration**: Email service configured for transactional emails with nautical branding
- **Invitation APIs**: Secure backend endpoints for creating, listing, and accepting invitations
  - Admin-only access: Only workspace admins can send/view invitations
  - Input validation: All invitation data validated with Zod schemas
  - Token sanitization: Sensitive tokens removed from API responses
- **Team Management UI**: New page for workspace admins to invite team members via email
- **Nautical-themed emails**: HTML email template with DockVoyage anchor branding
- **Public invitation flow**: Accept page allows invited users to join workspaces
- **URL generation**: Invitation links use request host for proper email delivery

### Session Handling Fix ✅
- **Fixed session deserialization errors** that prevented app from loading
- Updated Passport deserializeUser to gracefully handle missing users (returns null instead of throwing)
- Cleared invalid sessions from database after migration
- App now loads cleanly without session-related errors

### Multi-Tenant Architecture Migration ✅
- **Complete database redesign** with workspaces, teams, members, environments, and flows
- **Auto-provisioning**: New users automatically get workspace + team (environment provisioning removed)
- **RBAC implementation**: Workspace admins, team admins, and member roles
- **Custom environments**: Teams can create their own environments with names and descriptions
- **Security hardening**: ALL endpoints now enforce authentication + team ownership validation
- **Data isolation**: Users can only access releases within their workspace's teams

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
  - Agent/Assistant → Dockmaster
- Added anchor icon branding to authentication page
- Removed all emojis in favor of lucide-react icons

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
- Split-screen login/signup page with anchor branding
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

**Multi-Tenant Core:**
- **workspaces**: Top-level tenant containers (id, name, type: individual/organization, slug)
- **workspaceMembers**: User→workspace membership with roles (admin/member)
- **teams**: Groups within workspaces that own releases (id, name, description)
- **teamMembers**: User→team membership with roles (admin/member)
- **invitations**: Email invites for team collaboration (pending implementation)

**Release Management:**
- **releases**: Voyages within teams (id, teamId, name, version, changeWindow)
- **environments**: Custom deployment targets per team (id, teamId, name, sortOrder)
- **stages**: Release progress through environments (releaseId, environmentId, status, approver)
- **flows**: Task groupings within environments (environmentId, name, sortOrder)
- **tasks**: Actionable items within stages (stageId, flowId, title, owner, status, evidence)
- **blockers**: Issues preventing stage progression (stageId, severity: P1/P2/P3, active)
- **activityLog**: Audit trail of all changes (workspaceId, releaseId, stageId, actor, action)

**Enums for Type Safety**
- Workspace types: individual, organization
- Workspace member roles: admin, member
- Workspace member status: active, inactive
- Team member roles: admin, member
- Stage statuses: not_started, in_progress, blocked, done
- Task statuses: todo, doing, done, na
- Blocker severity: P1, P2, P3
- Invitation status: pending, accepted, expired

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
- Slack/Teams webhooks for release notifications
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
✅ Shipyard nautical branding with anchor icon
✅ Ocean-inspired color palette
✅ Responsive UI with shadcn components

### Planned
- Interactive flow diagram for release visualization
- Task management within stages
- Blocker tracking and resolution
- Activity log and audit trail
- Real-time collaboration
- Chatbot assistant for release help
- Email notifications with nautical branding
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
- Experience nautical-themed interface with anchor branding

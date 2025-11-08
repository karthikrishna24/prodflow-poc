# DockVoyage - Multi-Tenant Release Management Platform

## Overview
DockVoyage is a production-ready multi-tenant release management platform designed for secure release tracking and management. It features a nautical theme with anchor branding, providing workspace/team-based organization, user authentication, release tracking with custom environments, and complete Role-Based Access Control (RBAC). The platform aims to provide clear visibility into release processes for individuals and organizations.

## User Preferences
- Preferred communication style: Simple, everyday language
- Design preference: Nautical theme with anchor icon, no emojis in UI (use lucide-react icons)
- Architecture: Multi-tenant with workspaces → teams → releases → environments → stages

## System Architecture

### Frontend Architecture
- **Framework & Routing**: React 18, TypeScript, Wouter for routing, Vite for build.
- **State Management & Data Fetching**: TanStack Query for server state, React Context for global auth.
- **UI Component System**: shadcn/ui on Radix UI, Shipyard nautical design system, Tailwind CSS, custom CSS variables, Inter/JetBrains Mono fonts.
- **Authentication Flow**: Split-screen login/signup, protected routes, session persistence.
- **Interactive Visualization**: React Flow library for node-based diagrams (environments, tasks) with a three-column layout.
- **Form Management**: React Hook Form with Zod for schema validation.

### Backend Architecture
- **Server Framework**: Express.js on Node.js (v20+), TypeScript for API.
- **API Design**: RESTful endpoints for resources (releases, stages, tasks, blockers), authentication endpoints, CRUD operations, structured error handling.
- **Authentication & Authorization**: Passport.js with LocalStrategy, session management via secure cookies, bcrypt for password hashing, protected routes, `SESSION_SECRET` validation.
- **Database Layer**: Drizzle ORM for type-safe operations, PostgreSQL (Neon serverless) with connection pooling.

### Data Storage
- **Database Schema**:
    - **Multi-Tenant Core**: `workspaces` (id, name, type), `workspaceMembers` (user→workspace, roles), `teams` (id, name), `teamMembers` (user→team, roles), `invitations`.
    - **Release Management**: `releases` (id, teamId, name, version), `environments` (id, teamId, name), `stages` (releaseId, environmentId, status), `flows`, `tasks` (stageId, title, owner, status, evidence), `blockers` (stageId, severity, active), `activityLog`.
- **Enums**: For workspace types, member roles, stage statuses, task statuses, blocker severity, invitation status.
- **Session Storage**: PostgreSQL-backed session store using `connect-pg-simple`.

### UI/UX Decisions
- **Theming**: Nautical theme with anchor branding, ocean-inspired colors (Navy blue, Ocean blue), all UI text uses nautical terminology (Releases → Voyages, Environments → Cargo Holds, Agent → Dockmaster).
- **Icons**: Lucide React for UI icons, no emojis.
- **Interactive Canvas**: Draggable environment nodes, visual flow connections, auto-save, persistent diagram storage.
- **Stage Detail Panel**: Split-view UX, task management with evidence links, blocker tracking with severity badges, real-time updates.
- **Environment Management**: User-controlled environment creation and deletion, user-friendly error messages.

### Feature Specifications
- **Multi-Tenancy**: Workspaces, teams, RBAC (Workspace admins, team admins, members), data isolation.
- **Email Invitation System**: Workspace type selection, Resend integration, secure API endpoints for invites, nautical-themed emails.
- **Release Filtering**: Status filtering (ongoing, finished, failed) with backend support.
- **Environment Management**: Users can create, describe, and delete environments. Deleting an environment cascades to associated releases.

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle Kit**: Schema migrations and database management.

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives.
- **React Flow**: Interactive node-based diagram library.
- **Lucide React**: Icon library.
- **React Icons**: Additional icon sets.

### Development Tools
- **Vite**: Frontend build tool.
- **tsx**: TypeScript execution.
- **esbuild**: Fast JavaScript bundler.

### Authentication
- **Passport.js**: Authentication middleware.
- **express-session**: Session management.
- **bcrypt**: Secure password hashing.

### Utility Libraries
- **date-fns**: Date formatting and manipulation.
- **zod**: Runtime schema validation.
- **clsx/tailwind-merge**: Conditional CSS class merging.

### Font Hosting
- **Google Fonts**: Inter and JetBrains Mono.
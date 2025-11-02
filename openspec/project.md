# Project Context

## Purpose
Nucleus is an open source library powering productivity tools built at 21n.org to help 21st century digital humans manage their digital lives efficiently. The project includes three main products:
- **Nucleus** - Digital harmony super app combining all tools below
- **Memotron** - Memory atlas for personal knowledge management and note-taking
- **Pointron** - Focus haven for goal tracking and time management

All tools are designed for personal use without collaboration or team features.

## Tech Stack

### Core Technologies
- **Frontend**: SvelteKit 2.x, Svelte 4.x, TypeScript 5.x
- **Styling**: TailwindCSS 3.x, tailwindcss-themer
- **Build System**: Turbo 2.x (monorepo orchestration), Vite 5.x
- **Package Manager**: npm 10.x
- **Testing**: Vitest 2.x, Playwright, Storybook 7.x

### Key Libraries
- **State Management**: Svelte stores, RxDB, SignalDB
- **Database**: SurrealDB, Dexie (IndexedDB), LocalForage, OPFS
- **Data Visualization**: D3.js, AntV G6, Carbon Charts
- **Rich Text**: Monaco Editor, highlight.js
- **AI/ML**: Hugging Face Transformers, Xenova Transformers
- **Utilities**: dayjs, moment-timezone, clsx, FlexSearch

### Workspace Structure
- Monorepo with npm workspaces
- `apps/*` - Product applications (nucleus, memotron, pointron, timear)
- `client/*` - Shared client packages (components, elements, stores, utils, types, etc.)
- `shared/*` - Code shared between client and server (types, utils, dbo)
- `services/*` - Backend services
- `extensions/*` - Browser extensions and other extensions
- `tests/*` - Test files

## Project Conventions

### Code Style
- **No inline comments** when generating or editing code - let code speak for itself
- **Formatting**: Prettier with the following rules:
  - Double quotes (`singleQuote: false`)
  - Semicolons required (`semi: true`)
  - Tab width: 2 spaces
  - No trailing commas (`trailingComma: "none"`)
  - Svelte sort order: options-scripts-markup-styles
- **TypeScript**: 
  - `strict: false` (lenient type checking)
  - ESNext module resolution with bundler
  - Module aliases: `@21n/*` for client packages, `@21n/shared-*` for shared packages

### Naming Conventions
- **Files**: kebab-case for regular files, PascalCase for Svelte components
- **Components**: PascalCase (e.g., `AccountSettings.svelte`)
- **Module aliases**: `@21n/actions`, `@21n/components`, `@21n/elements`, `@21n/stores`, `@21n/utils`, `@21n/types`, etc.
- **Change IDs** (for OpenSpec): kebab-case with verb-led prefixes (`add-`, `update-`, `remove-`, `refactor-`)

### Architecture Patterns
- **Monorepo Architecture**: Turbo-powered workspace with shared packages
- **Product Configuration**: Each product has `product.config.ts` defining app menus, settings, resources, and features
- **Resource System**: Products work with typed resources (nodes, relations, goals, tasks, events, collections, combinations)
- **Component Hierarchy**:
  - `elements/` - Basic UI primitives
  - `components/` - Complex, composed UI components
  - `products/` - Product-specific implementations
- **State Management**: Svelte stores with reactive patterns
- **Database Layer**: 
  - SurrealDB and SurrealDB WASM for structured data
  - Dexie/LocalForage for local persistence
  - OPFS for file storage

### Testing Strategy
- **Unit Tests**: Vitest for utility functions and business logic
- **Component Tests**: Storybook for UI component development and testing
- **E2E Tests**: Playwright for end-to-end testing
- **Test Commands**:
  - `npm run test` - Run all tests via Turbo
  - `npm run test:watch` - Watch mode for individual apps
  - `npm run typecheck` - TypeScript type checking with svelte-check
  - `npm run lint` - ESLint checks
- **Test Files**: `*.test.ts`, `*.test.js` patterns

### Git Workflow
- **Branching**: Feature branches from main (`feature/your-feature-name`)
- **Commits**: Conventional commit messages encouraged
- **Pull Requests**: 
  - PRs reviewed by automated tools (Sourcery AI, CodeRabbit AI, Typo-app, Cubic AI)
  - Must address ALL review comments (including from automated reviewers)
  - Use `gh pr view <number>` to fetch PR details
- **Pre-commit Hooks**: Managed via lefthook.yml
- **CI/CD**: GitHub Actions workflows (see `.github/workflows/`)

## Domain Context

### Product Domains
- **Knowledge Management (Memotron)**: Notes, nodes, relations, collections, tags, markdown editing, PDF annotation, web clipping
- **Time Management (Pointron)**: Goals, tasks, events, time tracking, focus sessions, calendar integration
- **Personal Productivity**: Resource management, cross-linking, search, filtering, visualization

### Key Concepts
- **Resources**: Core data entities (nodes, relations, goals, tasks, events, collections)
- **DBO (Database Objects)**: Defined in `shared/dbo/` for each product (memotron.dbo.ts, pointron.dbo.ts, global.dbo.ts)
- **Combinations**: Aggregated views of multiple resource types
- **Extensions**: Pluggable functionality (browser extensions, web clippers)

### Data Flow
- Local-first architecture with optional cloud sync
- Client-side databases (IndexedDB, OPFS)
- Future: Cloudflare Workers + D1 + R2 for backend

## Important Constraints

### Technical Constraints
- Browser compatibility required (modern browsers)
- Offline-first capability essential
- Performance: Large datasets (>100MB), complex graphs
- Memory management: Node.js builds use `--max-old-space-size=8192`
- Self-hosting: Frontend deployable independently from backend

### Licensing
- **License**: AGPL-3.0
- All contributions must be AGPL-3.0 compatible

### Development Constraints
- No inline comments in generated/edited code
- Must fix ALL PR review issues (human and AI reviewers)
- Use temporary directories for tooling (e.g., `/tmp/`) not project root

## External Dependencies

### CDN Services
- Static assets served from `https://cdn.21n.org` (configurable via `VITE_STATIC_URL`)

### Third-party Services
- **Analytics**: Vercel Analytics, PostHog
- **Error Tracking**: Sentry (Memotron)
- **Authentication**: OIDC (oidc-client-ts)
- **Maps**: MapLibre GL

### Build & Deploy
- **Platforms**: Vercel (primary), self-hosting supported
- **Environment Variables**:
  - `VITE_PRODUCT`: Product name (memotron | pointron | nucleus)
  - `VITE_STATIC_URL`: Static asset CDN URL
  - `VITE_BUILD_DATE`: Build date stamp
  - `NODE_ENV`: Environment (development | production)

### Development Tools
- **Version Control**: Git, GitHub
- **CLI Tools**: gh (GitHub CLI) for PR operations
- **Browser Automation**: Playwright/Puppeteer for scraping/testing
- **Package Registry**: npm registry

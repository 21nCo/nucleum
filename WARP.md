# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## project overview

Tidigit is an open source library powering productivity tools built at 21n.org. It includes three main products:

- **Memotron** - Knowledge management and note-taking tool
- **Pointron** - Focus and time management tool  
- **Nucleus** - Super app combining the above tools

The codebase uses a monorepo architecture with Turbo for build orchestration, SvelteKit for frontend, and Node.js for backend.

## architecture

### monorepo structure

- `client/` - Frontend code and product-specific implementations
  - `client/products/` - Individual product apps (nucleus, memotron, pointron, gathery)
  - `client/components/` - Shared UI components
  - `client/elements/` - Basic UI elements
  - `client/stores/` - Svelte stores
  - `client/utils/` - Utility functions
- `packages/` - Shared libraries (components, elements, types, utils, stores, actions, static)
- `server/` - Backend API and database logic
- `shared/` - Code shared between client and server (types, utils, database objects)
- `deployment/` - Deployment configurations
- `tests/` - Test files

### key concepts

- **Product Configuration**: Each product (Nucleus, Memotron, Pointron) has its own configuration in `client/products/product.config.ts` defining app menus, settings, resources, and features
- **Resource System**: Products work with different resource types (nodes, relations, goals, tasks, events, collections, combinations)
- **Turbo Workspace**: Uses Turbo for build orchestration and task running across the monorepo
- **SvelteKit**: Frontend built with SvelteKit and TailwindCSS
- **Database**: Uses SurrealDB and local storage solutions (Dexie, LocalForage)

## common development commands

### development

```bash
# Start all apps in development mode
npm run dev

# Start specific product apps
npm run dev:nucleus
npm run dev:memotron
npm run dev:pointron
npm run dev:gathery
```

### building

```bash
# Build all packages and apps
npm run build

# Build only packages
npm run build:packages

# Build only product apps
npm run build:products

# Build specific product
npm run build:nucleus
```

### testing and linting

```bash
# Run all tests
npm run test

# Run linting
npm run lint

# Clean build artifacts
npm run clean

# Test workspace setup
node test-setup.js
```

### single product development

When working on a specific product, navigate to its directory and run commands directly:

```bash
cd client/products/nucleus

# Development with different ports/modes
npm run dev          # Port 5050
npm run debug        # Host 0.0.0.0:5050
npm run debug-pre    # Pre environment mode
npm run debug-live   # Live environment mode

# Building for different environments
npm run build        # Production build
npm run build-pre    # Pre environment
npm run build-live   # Live environment

# Testing
npm run test
npm run test:watch
npm run typecheck
```

## code generation and editing rules

### no inline comments
- No inline comments should be added whenever new code is generated or code is edited by the agent
- Keep code clean and comment-free when making changes
- Let the code speak for itself without additional commentary

### pull request review fixing protocol

When asked to fix pull request review comments by providing a PR number:

#### step 1: initial data fetch
- **MUST** fetch the PR using GitHub CLI first
- Use commands like `gh pr view <number> --json reviews,comments`
- Extract all available review data through the CLI

#### step 2: comprehensive data collection
- If the CLI data is not clear enough or incomplete
- **MUST** use a headless browser (Playwright/Puppeteer) to fetch the entire PR data
- Create scripts in a temporary directory (e.g., `/tmp/pr_review/`) 
- **DO NOT** pollute the project directory with scraping tools
- Extract all review comments, inline comments, and actionable items

#### step 3: critical issue analysis
- **DO NOT** miss any kind of critical issues when asked to fix the PR
- Identify all actionable comments from all review sources:
  - Sourcery AI
  - CodeRabbit AI
  - Typo-app
  - Cubic AI
  - Human reviewers
  - Any other automated review tools

#### step 4: systematic issue resolution
- Create a comprehensive todo list of all issues found
- Fix each issue systematically
- Verify that ALL actionable items have been addressed
- Do not skip or ignore any reported problems

#### best practices
- Always work in temporary directories for tooling
- Clean up after scraping operations
- Be thorough and methodical in issue identification
- Double-check that no critical issues are missed
- Provide clear summary of what was fixed

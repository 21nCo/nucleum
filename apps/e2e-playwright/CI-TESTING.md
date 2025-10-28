# CI Testing Guide

## Why CI fails when local passes

Common differences between local and CI:

1. **Fresh environment** - CI has no cached dependencies or build artifacts
2. **Clean state** - No `.vite` cache, no optimized dependencies
3. **Different OS** - CI runs on Ubuntu, you might be on macOS
4. **Node version** - CI uses Node 20, you might use a different version
5. **Environment variables** - CI has different env vars

## Simulating CI Locally

### Option 1: Quick Cache Clear (Fastest)

```bash
./test-ci-local.sh
```

This clears Vite and Playwright caches to simulate a fresh build without reinstalling dependencies.

### Option 2: Docker Simulation (Most Accurate)

```bash
./test-ci-docker.sh
```

This runs tests in the exact same Docker image that GitHub Actions uses. **This is the most reliable way to catch CI-specific issues.**

Requirements:
- Docker Desktop installed and running
- First run will download ~2GB Playwright image

### Option 3: Manual Cache Clearing

```bash
# Clear Vite cache
rm -rf ../../apps/pointron/.vite
rm -rf ../../apps/pointron/node_modules/.vite

# Clear Playwright cache
rm -rf test-results artifacts

# Run tests
npm run test:smoke
```

## Best Practice Workflow

Before pushing:

1. Run `./test-ci-local.sh` for quick validation
2. If you changed dependencies, run `./test-ci-docker.sh`
3. Commit and push with confidence

## Debugging CI Failures

1. Download artifacts from failed CI run
2. Check screenshots in `playwright-artifacts`
3. Run `./test-ci-docker.sh` to reproduce locally
4. Fix issue
5. Test with `./test-ci-local.sh`
6. Push fix

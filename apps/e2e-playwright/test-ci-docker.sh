#!/bin/bash
set -e

echo "🐳 Running smoke tests in Docker (exact CI simulation)..."

cd ../..

docker run --rm -v "$(pwd):/work" -w /work/apps/e2e-playwright \
  -e CI=true \
  mcr.microsoft.com/playwright:v1.56.1-jammy \
  bash -c "
    cd /work && \
    npm install && \
    cd apps/e2e-playwright && \
    npm run test:smoke
  "

echo "✅ Docker CI simulation complete!"

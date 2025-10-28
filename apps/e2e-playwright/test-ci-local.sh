#!/bin/bash
set -e

echo "🧹 Cleaning up to simulate fresh CI environment..."

# Clean Vite cache
echo "Removing Vite cache..."
rm -rf ../../apps/pointron/.vite
rm -rf ../../apps/pointron/node_modules/.vite

# Clean Playwright cache
echo "Removing Playwright cache..."
rm -rf .playwright
rm -rf test-results
rm -rf artifacts

# Clean node_modules to simulate fresh install (optional - uncomment if needed)
# echo "Removing node_modules..."
# rm -rf ../../node_modules
# rm -rf ../../apps/pointron/node_modules
# rm -rf node_modules

echo ""
echo "🔄 Installing dependencies (if cleaned)..."
# Uncomment if you cleaned node_modules above
# cd ../.. && npm install && cd apps/e2e-playwright

echo ""
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps chromium

echo ""
echo "🧪 Running smoke tests (CI-like)..."
npm run test:smoke

echo ""
echo "✅ CI simulation complete!"

#!/usr/bin/env node

// Simple script to test our Turbo workspace setup
console.log('🚀 Testing Turbo Workspace Setup\n');

const fs = require('fs');
const path = require('path');

// Test 1: Check if packages exist
console.log('📦 Checking packages...');
const packages = ['components', 'elements', 'types', 'utils', 'stores', 'actions', 'static'];
packages.forEach(pkg => {
  const pkgPath = path.join(__dirname, 'packages', pkg);
  const exists = fs.existsSync(pkgPath);
  console.log(`  ${exists ? '✅' : '❌'} @nucleus/${pkg}`);
});

// Test 2: Check if product apps exist
console.log('\n🏗️  Checking product apps...');
const products = ['nucleus', 'memotron', 'gathery', 'pointron'];
products.forEach(product => {
  const productPath = path.join(__dirname, 'client', 'products', product);
  const exists = fs.existsSync(productPath);
  const hasPackageJson = fs.existsSync(path.join(productPath, 'package.json'));
  console.log(`  ${exists ? '✅' : '❌'} ${product} ${hasPackageJson ? '(has package.json)' : '(missing package.json)'}`);
});

// Test 3: Check turbo configuration
console.log('\n⚙️  Checking Turbo config...');
const turboExists = fs.existsSync(path.join(__dirname, 'turbo.json'));
const rootPkgExists = fs.existsSync(path.join(__dirname, 'package.json'));
console.log(`  ${turboExists ? '✅' : '❌'} turbo.json`);
console.log(`  ${rootPkgExists ? '✅' : '❌'} root package.json`);

console.log('\n🎉 Setup verification complete!');
console.log('\n🔧 Next steps:');
console.log('1. Run "npm run dev" to start all apps in development mode');
console.log('2. Run "npm run build" to build all packages and apps');
console.log('3. Migrate import statements gradually from $lib/client/* to $components, $elements, etc.');

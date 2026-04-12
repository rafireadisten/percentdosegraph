#!/bin/bash

# Quick setup for mobile app development
set -e

echo "Setting up PercentDoseGraph Mobile..."

cd "$(dirname "$0")/mobile/app"

echo "✓ Installing dependencies..."
npm install

echo ""
echo "✓ Ready for development!"
echo ""
echo "Next steps:"
echo "  cd mobile/app"
echo "  npm run dev:ios      # Start on iOS simulator"
echo "  npm run dev:android  # Start on Android emulator"
echo ""
echo "ℹ️  Documentation: mobile/ARCHITECTURE.md"

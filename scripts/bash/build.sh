#!/bin/bash
# Build WarcraftJournal for production

cd "$(dirname "$0")/../.."

if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

npm run build
echo "Build complete. Output in dist/"

#!/bin/bash
# Fetch WoW journal data from Blizzard API
# Requires BLIZZARD_CLIENT_ID and BLIZZARD_CLIENT_SECRET in .env

cd "$(dirname "$0")/../.."

if [ ! -f ".env" ]; then
  echo "Error: .env file not found."
  echo "Copy .env.example to .env and fill in your Blizzard API credentials."
  exit 1
fi

npm run fetch-data

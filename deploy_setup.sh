#!/usr/bin/env bash
# NetControl Automated Production Bootstrapper

set -euo pipefail

echo "===================================================================="
echo "    NETCONTROL ENTERPRISE PLATFORM - AUTOMATED UNIX BOOTSTRAPPER    "
echo "===================================================================="

# Check for required tools
echo "[Setup] Checking standard system prerequisites..."
for cmd in docker npm node python3; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "[Warning] Command '$cmd' was not found. Please install before executing production workloads."
    else
        echo "  - found: $cmd ($(v_cmd=$($cmd --version 2>&1 || true); echo "$v_cmd" | head -n1))"
    fi
done

# Create folders
echo "[Setup] Preparing local persistent directory structures..."
mkdir -p data
chmod 777 data

# Install local package files and boot database
echo "[Setup] Initializing node packager files..."
npm install

# Build sqlite schemas and apply migrations
echo "[Setup] Bootstrapping SQLite SQLAlchemy models & seed data..."
python3 -m backend.database.db_session

# Launch production build bundle
echo "[Setup] Packaging static React distribution with ESBuild compilers..."
npm run build

echo "[Setup] Codebases built successfully!"
echo ""
echo "[Docker] Initializing Docker container bundling process..."
if command -v docker &> /dev/null; then
    docker compose build
    echo "===================================================================="
    echo "  Setup Completed! To start the system background services, run:    "
    echo "    docker compose up -d                                            "
    echo "===================================================================="
else
    echo "===================================================================="
    echo "  Setup Completed! Direct launch is ready. Execute:                 "
    echo "    npm start                                                       "
    echo "===================================================================="
fi

#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXTENSION_NAME="directus-extension-s3-metadata-hook"
EXTENSIONS_DIR="$SCRIPT_DIR/../docker/directus/extensions"
DOCKER_DIR="$SCRIPT_DIR/../docker"

echo "Building $EXTENSION_NAME..."
cd "$SCRIPT_DIR"
npm run build

echo "Deploying to extensions folder..."
rm -rf "$EXTENSIONS_DIR/$EXTENSION_NAME"
mkdir -p "$EXTENSIONS_DIR/$EXTENSION_NAME"
cp -r dist "$EXTENSIONS_DIR/$EXTENSION_NAME/"
cp package.json "$EXTENSIONS_DIR/$EXTENSION_NAME/"

echo "Restarting Directus..."
cd "$DOCKER_DIR"
docker compose restart directus

echo "Done! Check logs: docker compose logs -f directus"

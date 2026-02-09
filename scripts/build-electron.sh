#!/bin/bash
# Build script that runs electron-builder outside the pnpm monorepo
# to avoid the node_modules collection OOM issue

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMP_DIR="/tmp/lama-electron-build-$$"

echo "Creating isolated build directory: $TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Copy necessary files
echo "Copying build artifacts..."
cp -r "$PROJECT_DIR/out" "$TEMP_DIR/"
cp "$PROJECT_DIR/package.json" "$TEMP_DIR/"
cp "$PROJECT_DIR/package-lock.json" "$TEMP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/electron-builder.yml" "$TEMP_DIR/"
cp -r "$PROJECT_DIR/assets" "$TEMP_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/models" "$TEMP_DIR/" 2>/dev/null || true
cp -r "$PROJECT_DIR/public" "$TEMP_DIR/" 2>/dev/null || true

# Create minimal package-lock.json if it doesn't exist
if [ ! -f "$TEMP_DIR/package-lock.json" ]; then
    cat > "$TEMP_DIR/package-lock.json" << 'EOF'
{
  "name": "@refinio/lama.cube",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "@refinio/lama.cube",
      "version": "1.0.0"
    }
  }
}
EOF
fi

# Remove pnpm-specific fields from package.json and add electron
echo "Cleaning package.json..."
cd "$TEMP_DIR"
# Use node to clean the package.json
node -e '
const fs = require("fs");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
// Remove pnpm-specific entries
delete pkg.packageManager;
// Clear dependencies but keep electron for electron-builder
pkg.dependencies = {};
pkg.devDependencies = {
  "electron": "^32.0.0",
  "electron-builder": "^26.0.0"
};
// Add required metadata for fpm targets (deb, rpm)
pkg.name = "lama";  // Simple name without @ scope
pkg.homepage = "https://lama.one";
pkg.repository = pkg.repository || "https://github.com/refinio/lama";
fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2));
'

echo "Installing dependencies..."
npm install --ignore-scripts

echo "Running electron-builder..."
./node_modules/.bin/electron-builder --linux "$@"

echo "Copying output back..."
cp -r "$TEMP_DIR/release" "$PROJECT_DIR/"

echo "Cleaning up..."
rm -rf "$TEMP_DIR"

echo "Done! Output in $PROJECT_DIR/release/"

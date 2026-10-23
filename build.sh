#!/bin/bash
set -e

# Build script for Terramino lab
# This script:
# 1. Packages Lambda functions into zip files
# 2. Copies Lambda packages to all phase directories
# 3. Copies frontend files to all phase directories

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🔨 Building Terramino Lab Assets..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Package Lambda Functions
# ============================================================================
echo -e "${BLUE}📦 Step 1: Packaging Lambda functions...${NC}"

# Create lambda-packages directory if it doesn't exist
mkdir -p lambda-packages

# List of Lambda functions to package
LAMBDA_FUNCTIONS=(
    "discovery"
    "game-logic"
    "high-scores"
    "register-instance"
    "session-management"
)

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo "  Packaging $func..."
    
    # Create temporary directory for packaging
    TEMP_DIR=$(mktemp -d)
    
    # Copy function code
    cp -r lambda/$func/* "$TEMP_DIR/"
    
    # Install dependencies if package.json exists
    if [ -f "$TEMP_DIR/package.json" ]; then
        echo "    Installing dependencies..."
        (cd "$TEMP_DIR" && npm install --production --silent 2>/dev/null)
    fi
    
    # Create zip file
    (cd "$TEMP_DIR" && zip -r -q "$SCRIPT_DIR/lambda-packages/$func.zip" .)
    
    # Clean up
    rm -rf "$TEMP_DIR"
    
    echo -e "    ${GREEN}✓${NC} Created lambda-packages/$func.zip"
done

# Special handling for register-environment (uses register-instance code)
echo "  Packaging register-environment..."
TEMP_DIR=$(mktemp -d)
cp -r lambda/register-instance/* "$TEMP_DIR/"
if [ -f "$TEMP_DIR/package.json" ]; then
    echo "    Installing dependencies..."
    (cd "$TEMP_DIR" && npm install --production --silent 2>/dev/null)
fi
(cd "$TEMP_DIR" && zip -r -q "$SCRIPT_DIR/lambda-packages/register-environment.zip" .)
rm -rf "$TEMP_DIR"
echo -e "    ${GREEN}✓${NC} Created lambda-packages/register-environment.zip"

echo ""

# ============================================================================
# Step 2: Copy Lambda Packages to Phase Directories
# ============================================================================
echo -e "${BLUE}📋 Step 2: Copying Lambda packages to phase directories...${NC}"

PHASE_DIRS=(
    "phase-02-single-workspace"
    "phase-03-modules"
    "phase-04-workspace-per-region/registry"
    "phase-04-workspace-per-region/terramino-environment"
    "phase-05-terraform-stacks/registry"
    "phase-05-terraform-stacks/terramino-environment"
)

for phase in "${PHASE_DIRS[@]}"; do
    if [ -d "$phase" ]; then
        echo "  Copying to $phase..."
        mkdir -p "$phase/lambda-packages"
        cp lambda-packages/*.zip "$phase/lambda-packages/"
        echo -e "    ${GREEN}✓${NC} Copied $(ls lambda-packages/*.zip | wc -l | tr -d ' ') packages"
    fi
done

echo ""

# ============================================================================
# Step 3: Copy Frontend Files to Phase Directories
# ============================================================================
echo -e "${BLUE}🎨 Step 3: Copying frontend files to phase directories...${NC}"

FRONTEND_FILES=(
    "config.js"
    "game.js"
    "index.html"
    "styles.css"
)

# Only copy frontend to directories that deploy game environments
FRONTEND_PHASE_DIRS=(
    "phase-02-single-workspace"
    "phase-03-modules"
    "phase-04-workspace-per-region/terramino-environment"
    "phase-05-terraform-stacks/terramino-environment"
)

for phase in "${FRONTEND_PHASE_DIRS[@]}"; do
    if [ -d "$phase" ]; then
        echo "  Copying to $phase..."
        mkdir -p "$phase/terramino-app"
        
        for file in "${FRONTEND_FILES[@]}"; do
            cp "terramino-app/$file" "$phase/terramino-app/"
        done
        
        echo -e "    ${GREEN}✓${NC} Copied ${#FRONTEND_FILES[@]} frontend files"
    fi
done

echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
echo "Summary:"
echo "  • Packaged ${#LAMBDA_FUNCTIONS[@]} Lambda functions + register-environment"
echo "  • Copied packages to ${#PHASE_DIRS[@]} phase directories"
echo "  • Copied ${#FRONTEND_FILES[@]} frontend files to ${#FRONTEND_PHASE_DIRS[@]} environment directories"
echo ""
echo "Next steps:"
echo "  1. cd into your desired phase directory"
echo "  2. Run 'terraform init' (if needed)"
echo "  3. Run 'terraform apply'"

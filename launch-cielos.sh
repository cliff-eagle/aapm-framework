#!/bin/bash
# ─────────────────────────────────────────────────────────────
# launch-cielos.sh — One-command launcher for Cielos del Mediterráneo
#
# Usage:
#   chmod +x launch-cielos.sh
#   ./launch-cielos.sh
#
# What it does:
#   1. Installs dependencies (if needed)
#   2. Starts the AAPM Bridge Server on port 8765
#   3. Waits for the server to be ready
#   4. Prints connection instructions for Unity
# ─────────────────────────────────────────────────────────────

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRAMEWORK_DIR="$SCRIPT_DIR"
BRIDGE_DIR="$FRAMEWORK_DIR/packages/bridge"
PORT="${AAPM_BRIDGE_PORT:-8765}"

echo ""
echo "  ⛵ Cielos del Mediterráneo — Bridge Server Launcher"
echo "  ───────────────────────────────────────────────────"
echo ""

# ─── Check Node.js ─────────────────────────────────────────

if ! command -v node &> /dev/null; then
    echo "  ❌ Node.js is required. Install from https://nodejs.org"
    exit 1
fi

NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "  ⚠️  Node.js 18+ recommended (current: $(node -v))"
fi

# ─── Install Dependencies ─────────────────────────────────

if [ ! -d "$FRAMEWORK_DIR/node_modules" ]; then
    echo "  📦 Installing framework dependencies..."
    cd "$FRAMEWORK_DIR"
    npm install --silent
fi

if [ ! -d "$BRIDGE_DIR/node_modules" ]; then
    echo "  📦 Installing bridge dependencies..."
    cd "$BRIDGE_DIR"
    npm install --silent
fi

# ─── Start Bridge Server ──────────────────────────────────

echo "  🚀 Starting AAPM Bridge Server on port $PORT..."
echo ""

cd "$BRIDGE_DIR"

# Export port for the server
export AAPM_BRIDGE_PORT=$PORT

# Start the server
npx tsx src/server.ts &
SERVER_PID=$!

# Wait for server to start
echo -n "  ⏳ Waiting for server"
for i in $(seq 1 10); do
    if curl -s "http://localhost:$PORT" > /dev/null 2>&1 || lsof -ti:$PORT > /dev/null 2>&1; then
        echo ""
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo "  ✅ Bridge Server running on ws://localhost:$PORT"
echo ""
echo "  ─── Unity Connection Instructions ───────────────────"
echo ""
echo "  1. Open your Unity project"
echo "  2. Make sure AAPMBridge.cs is on a persistent GameObject"
echo "  3. Set Server URL to: ws://localhost:$PORT"
echo "  4. Press Play in Unity"
echo "  5. The OnboardingUI will prompt for your API key"
echo ""
echo "  ─── Required Unity GameObjects ──────────────────────"
echo ""
echo "  Create these empty GameObjects in your scene:"
echo ""
echo "    [AAPMBridge]        — AAPMBridge.cs"
echo "    [GameManager]       — GameManager.cs + ProgressionManager.cs"
echo "    [Player]            — PlayerController.cs (tag: 'Player')"
echo "    [DialoguePanel]     — DialogueUI.cs"
echo "    [ScenarioHUD]       — ScenarioChainUI.cs"
echo "    [VHFRadio]          — VHFRadioUI.cs"
echo "    [ChartTable]        — ChartTableUI.cs"
echo "    [OnboardingScreen]  — OnboardingUI.cs"
echo ""
echo "    For each NPC in the scene:"
echo "    [NPC_Name]          — NPCInteraction.cs + Collider(trigger)"
echo ""
echo "  Press Ctrl+C to stop the server."
echo ""

# Keep running until interrupted
wait $SERVER_PID

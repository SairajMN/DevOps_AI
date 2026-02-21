#!/bin/bash
# DevOps AI Desktop Launcher
# Opens a project and starts the AI assistant

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                    🤖 DevOps AI - Desktop Launcher                       ║"
echo "║                    Powered by Accomplish AI                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if a project path was provided
PROJECT_PATH="${1:-.}"

# Resolve to absolute path
PROJECT_PATH="$(cd "$PROJECT_PATH" 2>/dev/null && pwd)" || {
    echo -e "${RED}❌ Invalid project path: $1${NC}"
    exit 1
}

echo -e "${GREEN}📁 Project: ${PROJECT_PATH}${NC}"
echo ""

# Check if server is running
check_server() {
    curl -s http://localhost:3000/api/health > /dev/null 2>&1
    return $?
}

# Start the server if not running
start_server() {
    echo -e "${YELLOW}🚀 Starting DevOps AI server...${NC}"
    cd "$PROJECT_ROOT"
    
    # Start server in background
    npm run dev > /tmp/devops-ai-server.log 2>&1 &
    SERVER_PID=$!
    
    # Wait for server to be ready
    echo -e "${CYAN}⏳ Waiting for server to start...${NC}"
    for i in {1..30}; do
        if check_server; then
            echo -e "${GREEN}✅ Server is running!${NC}"
            return 0
        fi
        sleep 1
        echo -n "."
    done
    
    echo -e "${RED}❌ Server failed to start. Check /tmp/devops-ai-server.log${NC}"
    return 1
}

# Check if server is running
if check_server; then
    echo -e "${GREEN}✅ Server is already running${NC}"
else
    start_server
fi

echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Choose an option:${NC}"
echo ""
echo "  1) 💬 Open Interactive CLI Chat"
echo "  2) 🖥️  Open in VS Code"
echo "  3) 🌐 Open Web Dashboard"
echo "  4) ▶️  Run Tests"
echo "  5) 🔨 Build Project"
echo "  6) 📊 Analyze Logs"
echo "  7) 🔧 Full Analysis (Tests + Logs + AI)"
echo "  8) Exit"
echo ""
echo -e "${CYAN}══════════════════════════════════════════════════════════════════════════${NC}"
echo ""

read -p "$(echo -e ${GREEN}Enter choice [1-8]: ${NC})" choice

case $choice in
    1)
        echo -e "${CYAN}💬 Starting Interactive CLI...${NC}"
        cd "$PROJECT_ROOT"
        npx ts-node src/cli/cline-cli.ts "$PROJECT_PATH"
        ;;
    2)
        echo -e "${CYAN}🖥️  Opening VS Code...${NC}"
        code "$PROJECT_PATH"
        ;;
    3)
        echo -e "${CYAN}🌐 Opening Web Dashboard...${NC}"
        if command -v xdg-open &> /dev/null; then
            xdg-open http://localhost:3000
        elif command -v open &> /dev/null; then
            open http://localhost:3000
        else
            echo -e "${YELLOW}Open http://localhost:3000 in your browser${NC}"
        fi
        ;;
    4)
        echo -e "${CYAN}▶️  Running tests...${NC}"
        cd "$PROJECT_PATH"
        if [ -f "package.json" ]; then
            npm test
        elif [ -f "requirements.txt" ]; then
            python -m pytest
        else
            echo -e "${RED}❌ Could not determine test command${NC}"
        fi
        ;;
    5)
        echo -e "${CYAN}🔨 Building project...${NC}"
        cd "$PROJECT_PATH"
        if [ -f "package.json" ]; then
            npm run build
        elif [ -f "setup.py" ]; then
            python setup.py build
        else
            echo -e "${RED}❌ Could not determine build command${NC}"
        fi
        ;;
    6)
        echo -e "${CYAN}📊 Analyzing logs...${NC}"
        cd "$PROJECT_ROOT"
        npx ts-node src/cli/cline-cli.ts "$PROJECT_PATH" <<< "analyze logs"
        ;;
    7)
        echo -e "${CYAN}🔧 Running full analysis...${NC}"
        cd "$PROJECT_PATH"
        
        echo -e "${YELLOW}Step 1: Running tests...${NC}"
        if [ -f "package.json" ]; then
            npm test 2>&1 | tee /tmp/test-output.log
        fi
        
        echo -e "${YELLOW}Step 2: Analyzing with AI...${NC}"
        curl -X POST http://localhost:3000/api/analyze \
            -H "Content-Type: application/json" \
            -d "{\"log\": \"$(cat /tmp/test-output.log 2>/dev/null || echo 'No test output')\"}" | jq .
        ;;
    8)
        echo -e "${CYAN}👋 Goodbye!${NC}"
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid choice${NC}"
        exit 1
        ;;
esac
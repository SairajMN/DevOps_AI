# DevOps AI - Desktop Automation Agent

A **DevOps AI agent** with full desktop automation capabilities. This system combines intelligent log analysis with autonomous task execution, file operations, terminal commands, and desktop control.

## 🎯 Overview

### DevOps AI Agent Features

- **Autonomous Task Execution** - AI plans and executes multi-step tasks
- **Desktop Automation** - Control browsers, take screenshots, launch apps
- **File Operations** - Read, write, edit files with AI assistance
- **Terminal Commands** - Execute shell commands with approval workflow
- **Tool-based Architecture** - 17+ tools for various automation tasks
- **Interactive CLI** - Chat-based interface

### Original DevOps Features

- **Monitors** project logs in real-time
- **Detects** and **classifies** failures using pattern matching
- **Analyzes** project configuration for context
- **Proposes** deterministic fixes
- **Generates** structured patch suggestions
- **Stores** historical resolution memory
- **AI-Powered Analysis** via OpenRouter (DeepSeek, Llama, Mistral, Qwen, Gemini)
- **Requests** manual approval before any action

## 🏗️ Architecture

### DevOps AI Agent Architecture

```
User Request
      ↓
DevOps AI Agent (Orchestrator)
      ↓
Task Planning & Analysis
      ↓
Tool Selection & Execution
   ├── execute_command (Terminal)
   ├── read_file / write_to_file (File System)
   ├── replace_in_file (Code Edits)
   ├── search_files / list_files (Navigation)
   ├── browser_action (Web Automation)
   ├── screen_capture (Screenshots)
   ├── app_control (Desktop Apps)
   ├── clipboard (Copy/Paste)
   └── ask_followup_question (User Input)
      ↓
LLM Layer (OpenRouter)
   ├── DeepSeek R1 (reasoning)
   ├── DeepSeek V3 (code)
   ├── Qwen 2.5 (fallback)
   ├── Llama 3.1 (documentation)
   └── Mistral 7B (quick tasks)
      ↓
Result & Completion
```

### Core Pipeline (Original)

```
Project Folder
      ↓
Log Watcher Engine
      ↓
Structured Log Parser
      ↓
Error Classifier (Rule-first)
      ↓
Context Analyzer
      ↓
Deterministic Fix Engine
      ↓
Patch Proposal Generator
      ↓
Incident Memory Store
      ↓
Report Builder
```

## 📁 Project Structure

```
devops-ai/
├── src/                    # TypeScript AI Integration
│   ├── ai/                 # AI/LLM Layer
│   │   ├── models.ts       # Model registry
│   │   ├── modelRouter.ts  # Smart model selection
│   │   └── openrouterClient.ts  # OpenRouter API client
│   ├── agent/              # Agent orchestration
│   │   ├── accomplishAgent.ts   # Main agent
│   │   ├── devopsAIAgent.ts     # Desktop automation agent
│   │   ├── taskOrchestrator.ts  # Task management
│   │   └── prompts.ts      # Production-grade prompts
│   ├── tools/              # Tool System
│   │   ├── types.ts        # Tool type definitions
│   │   ├── definitions.ts  # Tool descriptions
│   │   ├── executor.ts     # Tool execution engine
│   │   └── index.ts        # Module exports
│   ├── routes/             # API routes
│   │   └── analyze.ts      # Analysis endpoints
│   ├── cli/                # CLI Entry Points
│   │   ├── agent.ts        # Main agent CLI
│   │   ├── cline-cli.ts    # Interactive CLI
│   │   └── index.ts        # Original CLI
│   └── index.ts            # Express server entry
├── analyzer/               # Codebase analysis
├── classifier/             # Error classification
├── fix_engine/             # Fix generation engine
├── memory/                 # Incident memory store
├── parser/                 # Log parsing modules
├── patch/                  # Patch generation
├── reports/                # Report generation
├── watcher/                # Log monitoring
├── logs/                   # Log files to analyze
├── storage/                # Persistent storage
├── main.py                 # Python main entry
├── cli.py                  # Python CLI interface
├── config.py               # Configuration module
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript config
└── requirements.txt        # Python dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+ (optional, for Python pipeline)
- OpenRouter API Key (get one at [openrouter.ai](https://openrouter.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/SairajMN/DevOps_AI.git
cd DevOps_AI

# Install Node.js dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### Running DevOps AI Agent

```bash
# Start interactive DevOps AI session
npm run agent

# Or run directly with ts-node
npx ts-node src/cli/agent.ts
```

### Running the DevOps AI Server

```bash
# Development mode
npm run dev

# Build and run production
npm run build
npm start
```

## 💻 DevOps AI Usage

### Interactive Mode

```bash
npm run agent
```

This starts an interactive chat session where you can:

- Describe tasks in natural language
- Let the AI plan and execute multi-step operations
- Approve or reject actions before execution

### Command Line

```bash
# Execute a task directly
npx ts-node src/cli/agent.ts run "Create a new React component called Button"

# Plan a task without executing
npx ts-node src/cli/agent.ts plan "Set up a new Express.js project"

# Analyze error logs
npx ts-node src/cli/agent.ts analyze logs/error.log

# List available tools
npx ts-node src/cli/agent.ts tools

# Show system status
npx ts-node src/cli/agent.ts status
```

### Example Tasks

```
You: Create a new TypeScript file called utils.ts with common utility functions

You: Fix the TypeScript error in src/index.ts

You: Run the tests and fix any failures

You: Take a screenshot of my desktop

You: Search for all TODO comments in the codebase

You: Analyze the error logs and suggest fixes
```

## 🔧 Available Tools

| Tool                    | Description                     |
| ----------------------- | ------------------------------- |
| `execute_command`       | Run terminal commands           |
| `read_file`             | Read file contents              |
| `write_to_file`         | Create or overwrite files       |
| `replace_in_file`       | Make targeted edits to files    |
| `search_files`          | Search for patterns in files    |
| `list_files`            | List directory contents         |
| `ask_followup_question` | Ask user for clarification      |
| `attempt_completion`    | Present final result            |
| `browser_action`        | Control a web browser           |
| `screen_capture`        | Take screenshots                |
| `app_control`           | Launch and control applications |
| `clipboard`             | Interact with system clipboard  |

## 🔌 API Endpoints

### Server runs on `http://localhost:3000` by default

| Endpoint             | Method | Description              |
| -------------------- | ------ | ------------------------ |
| `/`                  | GET    | API info                 |
| `/api/health`        | GET    | Health check             |
| `/api/models`        | GET    | List available AI models |
| `/api/analyze`       | POST   | Full log analysis        |
| `/api/analyze/quick` | POST   | Quick analysis           |
| `/api/analyze/multi` | POST   | Multi-step analysis      |
| `/api/analyze/batch` | POST   | Batch analysis           |
| `/api/fix`           | POST   | Code fix generation      |

### Example API Calls

```bash
# Analyze a log
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"log": "ERROR: Connection timeout at database.py:45"}'

# Quick analysis
curl -X POST http://localhost:3000/api/analyze/quick \
  -H "Content-Type: application/json" \
  -d '{"log": "TypeError: Cannot read property of undefined"}'

# Generate code fix
curl -X POST http://localhost:3000/api/fix \
  -H "Content-Type: application/json" \
  -d '{
    "code": "def add(a, b):\n    return a + b",
    "errorMessage": "TypeError: unsupported operand type",
    "language": "python"
  }'
```

## 🤖 AI Models

### Available Models via OpenRouter

| Model ID       | Name             | Best For                           |
| -------------- | ---------------- | ---------------------------------- |
| `deepseek-r1`  | DeepSeek R1      | Reasoning, debugging, log analysis |
| `deepseek-v3`  | DeepSeek V3      | Code generation, refactoring       |
| `llama-70b`    | Llama 3.1 8B     | Documentation, general tasks       |
| `mixtral`      | Mistral 7B       | Quick fallback, Python/JS          |
| `qwen`         | Qwen 2.5 7B      | Coding, reasoning                  |
| `gemini-flash` | Gemini Flash 1.5 | Fast general tasks                 |

### Smart Model Selection

The system automatically selects the best model based on task type:

```
Task Type          → Model
─────────────────────────────
log-analysis       → DeepSeek R1
debugging          → DeepSeek R1
code-generation    → DeepSeek V3
documentation      → Llama 3.1 8B
quick-fallback     → Mistral 7B
```

## 🔧 Configuration

### Environment Variables (.env)

```bash
# Required
OPENROUTER_API_KEY=your-key-here

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Optional
LOG_LEVEL=info
DEFAULT_MODEL=deepseek/deepseek-r1
```

## 🔒 Security Model

- ✅ Fully local execution
- ✅ No auto patch application
- ✅ No arbitrary command execution without approval
- ✅ Suggested commands require explicit approval
- ✅ API key stored in environment variables
- ✅ Risk assessment for each tool use

## 📝 Response Format

### Log Analysis Response

```json
{
  "success": true,
  "analysis": {
    "error_type": "ModuleNotFoundError",
    "error_category": "dependency",
    "root_cause": "Missing psycopg2 module in Python environment",
    "confidence": 92,
    "suggested_fix": "Install psycopg2-binary package",
    "step_by_step_fix": [
      "Run: pip install psycopg2-binary",
      "Or add to requirements.txt",
      "Restart the application"
    ],
    "is_environment_issue": false,
    "is_dependency_issue": true,
    "is_code_issue": false,
    "affected_files": ["database.py"],
    "severity": "high"
  },
  "metadata": {
    "model": "deepseek/deepseek-r1",
    "duration": 2340,
    "attempts": 1
  }
}
```

## 🧪 Testing

```bash
# Run TypeScript type check
npm run typecheck

# Start DevOps AI Agent
npm run agent

# Run DevOps AI server
npm run dev

# Check system status
npx ts-node src/cli/agent.ts status
```

## 📚 Tech Stack

### TypeScript/Node.js

- Express.js - API server
- Axios - HTTP client
- Zod - Schema validation
- TypeScript - Type safety
- uuid - Unique IDs

### Python (Optional)

- asyncio - Async operations
- watchdog - File monitoring
- Jinja2 - Templating
- markdown - Report generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - See LICENSE file for details.

## 🙏 Acknowledgments

Built with:

- **AI Models**: DeepSeek, Llama, Mistral, Qwen, Gemini (via OpenRouter)
- **Runtime**: Node.js + Python
- **Frameworks**: Express, asyncio

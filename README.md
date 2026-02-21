# DevOps Log Intelligence & Auto-Triage System

A local-first, deterministic-first, AI-assisted log intelligence system for automated error detection, classification, and fix suggestion. Now with **OpenRouter AI Integration** for advanced LLM-powered analysis.

## 🎯 Overview

This system provides intelligent log analysis capabilities:

- **Monitors** project logs in real-time
- **Detects** and **classifies** failures using pattern matching
- **Analyzes** project configuration for context
- **Proposes** deterministic fixes
- **Generates** structured patch suggestions
- **Stores** historical resolution memory
- **AI-Powered Analysis** via OpenRouter (DeepSeek, Llama, Mistral, Qwen, Gemini)
- **Requests** manual approval before any action

## 🏗️ Architecture

### Core Pipeline
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

### AI Integration Architecture
```
User Request
      ↓
API (Express Server)
      ↓
Accomplish Agent (Orchestrator)
      ↓
Tool Layer
   ├── Log Parser
   ├── Shell Executor
   ├── Git Tool
   ├── File System
      ↓
OpenRouter LLM Layer
   ├── DeepSeek R1 (reasoning)
   ├── DeepSeek Chat (code)
   ├── Qwen 2.5 (fallback)
   ├── Llama 3.1 8B (documentation)
   ├── Mistral 7B (quick tasks)
   ├── Gemini Flash 1.5 (general)
      ↓
Response + Suggested Fix
```

## 📁 Project Structure

```
devops-intelligence/
├── src/                    # TypeScript AI Integration
│   ├── ai/                 # AI/LLM Layer
│   │   ├── models.ts       # Model registry
│   │   ├── modelRouter.ts  # Smart model selection
│   │   └── openrouterClient.ts  # OpenRouter API client
│   ├── agent/              # Agent orchestration
│   │   ├── accomplishAgent.ts   # Main agent
│   │   ├── taskOrchestrator.ts  # Task management
│   │   └── prompts.ts      # Production-grade prompts
│   ├── routes/             # API routes
│   │   └── analyze.ts      # Analysis endpoints
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
├── test/                   # Test files
├── main.py                 # Python main entry
├── cli.py                  # CLI interface
├── config.py               # Configuration module
├── package.json            # Node.js dependencies
├── tsconfig.json           # TypeScript config
└── requirements.txt        # Python dependencies
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- OpenRouter API Key (get one at [openrouter.ai](https://openrouter.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/SairajMN/DevOps_AI.git
cd DevOps_AI

# Install Node.js dependencies
npm install

# Create virtual environment for Python
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### Running the AI Server

```bash
# Development mode
npm run dev

# Build and run production
npm run build
npm start
```

### Using the CLI

```bash
# Show system status
python cli.py status

# Analyze a log file
python cli.py analyze --file logs/sample_errors.log

# Start monitoring mode
python cli.py monitor --paths /var/log/app.log

# View incident history
python cli.py history --limit 20

# Generate a report
python cli.py report --type summary
```

## 🔌 API Endpoints

### Server runs on `http://localhost:3000` by default

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | API info |
| `/api/health` | GET | Health check |
| `/api/models` | GET | List available AI models |
| `/api/models/:modelId` | GET | Get model details |
| `/api/analyze` | POST | Full log analysis |
| `/api/analyze/quick` | POST | Quick analysis |
| `/api/analyze/multi` | POST | Multi-step analysis |
| `/api/analyze/batch` | POST | Batch analysis |
| `/api/fix` | POST | Code fix generation |
| `/api/tasks` | POST | Create task |
| `/api/tasks/:taskId` | GET | Get task status |
| `/api/tasks/:taskId/execute` | POST | Execute task |
| `/api/queue` | GET | Get queue status |

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

# Get available models
curl http://localhost:3000/api/models
```

## 🤖 AI Models

### Available Models via OpenRouter

| Model ID | Name | Best For |
|----------|------|----------|
| `deepseek-r1` | DeepSeek R1 | Reasoning, debugging, log analysis |
| `deepseek-v3` | DeepSeek V3 | Code generation, refactoring |
| `llama-70b` | Llama 3.1 8B | Documentation, general tasks |
| `mixtral` | Mistral 7B | Quick fallback, Python/JS |
| `qwen` | Qwen 2.5 7B | Coding, reasoning |
| `gemini-flash` | Gemini Flash 1.5 | Fast general tasks |

### Smart Model Selection

The system automatically selects the best model based on task type:

```typescript
// Automatic selection
Task Type          → Model
─────────────────────────────
log-analysis       → DeepSeek R1
debugging          → DeepSeek R1
code-generation    → DeepSeek V3
documentation      → Llama 3.1 8B
quick-fallback     → Mistral 7B
```

### Fallback Chain

If the primary model fails, the system automatically falls back:

```
Primary → Fallback 1 → Fallback 2
```

## 📋 CLI Commands

### `monitor` - Start Log Monitoring

```bash
python cli.py monitor --paths /path/to/log1.log /path/to/log2.log --project .
```

### `analyze` - Analyze Log File

```bash
python cli.py analyze --file error.log --format json
```

### `report` - Generate Reports

```bash
python cli.py report --type trend
python cli.py report --incident incident_20260221_abc123
```

### `history` - View Incident History

```bash
python cli.py history --limit 20 --type database_errors
```

### `patch` - Patch Management

```bash
python cli.py patch --list
python cli.py patch --view patch_20260221_1234
python cli.py patch --approve patch_20260221_1234
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

### Python Configuration (config.py)

- `log_paths`: Paths to monitor for log files
- `log_patterns`: Patterns to identify error logs
- `poll_interval`: Monitoring poll interval
- `confidence_threshold`: Minimum confidence threshold

## 🎯 Supported Environments

- Node.js
- React / Next.js
- Python (FastAPI, Django)
- Docker
- GitHub Actions logs (exported)
- Vercel build logs (exported)
- Basic Kubernetes logs

## 📊 Error Categories

| Category | Examples |
|----------|----------|
| `database_errors` | Connection timeout, deadlock, constraint violation |
| `network_errors` | Connection refused, timeout, SSL errors |
| `application_errors` | Null pointer, out of memory, permission denied |
| `authentication_errors` | Invalid credentials, token expired, unauthorized |
| `system_errors` | Disk full, CPU overload, service unavailable |

## 🔒 Security Model

- ✅ Fully local execution
- ✅ No auto patch application
- ✅ No arbitrary command execution
- ✅ Suggested commands are sandboxed text only
- ✅ Explicit approval required for all actions
- ✅ API key stored in environment variables

## 📈 Confidence Scoring

```
confidence = 
  (pattern_weight * 0.4) +
  (context_validation * 0.3) +
  (memory_success_rate * 0.3)
```

Thresholds:
- `≥ 0.85` → High confidence (auto-suggest)
- `0.6 - 0.85` → Review suggested
- `< 0.6` → AI fallback (if enabled)

## 🧪 Testing

```bash
# Run TypeScript integration tests
npx ts-node test/test-integration.ts

# Run with sample log file
python cli.py analyze --file logs/sample_errors.log --format text

# Check system status
python cli.py status

# Type check
npm run typecheck
```

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

## 🔄 Integration with Existing Python Pipeline

The TypeScript AI layer integrates seamlessly with the existing Python pipeline:

1. **Python Pipeline** handles local log watching, parsing, and deterministic fixes
2. **TypeScript AI Layer** provides advanced LLM-powered analysis via OpenRouter
3. Both can run independently or together

## 🛠️ Extending the System

### Adding Custom AI Models

Edit `src/ai/models.ts`:

```typescript
{
    id: "custom-model",
    name: "Custom Model",
    model: "provider/model-name",
    description: "Description",
    strengths: ["strength1", "strength2"],
    maxTokens: 4096,
    taskTypes: ["task-type-1", "task-type-2"]
}
```

### Adding Custom Patterns

Edit `parser/patterns.py`:

```python
ParsePattern(
    name="custom_format",
    pattern=re.compile(r'your-regex-here'),
    fields=["timestamp", "level", "message"],
    description="Custom log format",
    priority=10
)
```

## 📚 Tech Stack

### TypeScript/Node.js
- Express.js - API server
- Axios - HTTP client
- Zod - Schema validation
- TypeScript - Type safety

### Python
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
- **Monitoring**: watchdog
# DevOps Log Intelligence & Auto-Triage System

A local-first, deterministic-first, AI-assisted log intelligence system for automated error detection, classification, and fix suggestion.

## 🎯 Overview

This system provides intelligent log analysis capabilities:

- **Monitors** project logs in real-time
- **Detects** and **classifies** failures using pattern matching
- **Analyzes** project configuration for context
- **Proposes** deterministic fixes
- **Generates** structured patch suggestions
- **Stores** historical resolution memory
- **Requests** manual approval before any action

## 🏗️ Architecture

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
devops-intelligence/
├── app/                    # Application orchestration
├── engine/                 # Log monitoring engine
├── parsers/                # Log parsing modules
├── classifiers/            # Error classification
├── analyzers/              # Codebase analysis
├── fixes/                  # Fix generation engine
├── patches/                # Patch generation
├── memory/                 # Incident memory store
├── reports/                # Report generation
├── config/                 # Configuration files
├── logs/                   # Log files to analyze
├── storage/                # Persistent storage
├── test/                   # Test files
├── main.py                 # Main entry point
├── cli.py                  # CLI interface
├── config.py               # Configuration module
└── requirements.txt        # Python dependencies
```

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/SairajMN/DevOps_AI.git
cd DevOps_AI

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Basic Usage

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

# View patches
python cli.py patch --list
```

## 📋 CLI Commands

### `monitor` - Start Log Monitoring

```bash
python cli.py monitor --paths /path/to/log1.log /path/to/log2.log --project .
```

Options:
- `--paths`: Log file paths to monitor
- `--project`: Project directory for context analysis

### `analyze` - Analyze Log File

```bash
python cli.py analyze --file error.log --format json
```

Options:
- `--file`: Log file to analyze (required)
- `--format`: Output format (`json` or `text`)

### `report` - Generate Reports

```bash
python cli.py report --type trend
python cli.py report --incident incident_20260221_abc123
```

Options:
- `--incident`: Generate report for specific incident
- `--type`: Report type (`summary` or `trend`)

### `history` - View Incident History

```bash
python cli.py history --limit 20 --type database_errors
```

Options:
- `--limit`: Number of incidents to show
- `--type`: Filter by error type

### `patch` - Patch Management

```bash
python cli.py patch --list
python cli.py patch --view patch_20260221_1234
python cli.py patch --approve patch_20260221_1234
```

Options:
- `--list`: List all patches
- `--view`: View a specific patch
- `--approve`: Approve a patch for application

### `clear` - Clear Memory

```bash
python cli.py clear --confirm
```

### `status` - System Status

```bash
python cli.py status
```

## 🔧 Configuration

Configuration is managed through `config.py` and supports:

### Log Configuration
- `log_paths`: Paths to monitor for log files
- `log_patterns`: Patterns to identify error logs
- `poll_interval`: Monitoring poll interval

### Parser Configuration
- `enable_structured`: Enable structured parsing
- `enable_patterns`: Enable pattern matching

### Classifier Configuration
- `enable_ml`: Enable ML-based classification
- `enable_rules`: Enable rule-based classification
- `confidence_threshold`: Minimum confidence threshold

### Memory Configuration
- `storage_file`: Path to incident storage file
- `max_incidents`: Maximum incidents to store
- `retention_days`: Days to retain incidents

## 🎯 Supported Environments

- Node.js
- React / Next.js
- Python (FastAPI, Django)
- Docker
- GitHub Actions logs (exported)
- Vercel build logs (exported)
- Basic Kubernetes logs

## 📊 Error Categories

The system detects and classifies:

| Category | Examples |
|----------|----------|
| `database_errors` | Connection timeout, deadlock, constraint violation |
| `network_errors` | Connection refused, timeout, SSL errors |
| `application_errors` | Null pointer, out of memory, permission denied |
| `authentication_errors` | Invalid credentials, token expired, unauthorized |
| `system_errors` | Disk full, CPU overload, service unavailable |

## 🔒 Security Model

- ✅ Fully local execution
- ✅ No external API calls by default
- ✅ No auto patch application
- ✅ No arbitrary command execution
- ✅ Suggested commands are sandboxed text only
- ✅ Explicit approval required for all actions

## 📈 Confidence Scoring

Confidence is computed from:

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
# Run with sample log file
python cli.py analyze --file logs/sample_errors.log --format text

# Check system status
python cli.py status
```

## 📝 Output Formats

### JSON Report
```json
{
  "summary": {
    "log_file": "error.log",
    "total_lines": 100,
    "errors_found": 15,
    "report_id": "report_20260221_1234"
  },
  "results": [...]
}
```

### Patch Format
```diff
--- a/file.py
+++ b/file.py
@@ -1,5 +1,5 @@
-    connect_timeout = 30
+    connect_timeout = 60
```

## 🔄 Pipeline Flow

1. **Log Watcher** detects new log entries
2. **Parser** converts raw logs to structured format
3. **Classifier** categorizes errors with confidence scores
4. **Analyzer** examines codebase for context
5. **Fix Engine** generates deterministic fix suggestions
6. **Patch Generator** creates unified diff patches
7. **Memory** stores incident for future reference
8. **Report Builder** generates comprehensive reports

## 🛠️ Extending the System

### Adding Custom Patterns

Edit `parser/patterns.py` to add new log patterns:

```python
ParsePattern(
    name="custom_format",
    pattern=re.compile(r'your-regex-here'),
    fields=["timestamp", "level", "message"],
    description="Custom log format",
    priority=10
)
```

### Adding Fix Rules

Edit `fix_engine/deterministic_fix_engine.py`:

```python
'custom_errors': [
    {
        'name': 'custom_fix',
        'pattern': r'your-error-pattern',
        'fix_type': 'code',
        'description': 'Fix description',
        'changes': [...],
        'confidence': 0.8,
        'risk_level': 'LOW'
    }
]
```

## 📚 API Reference

### Core Classes

- `DevOpsAISystem`: Main orchestrator
- `LogWatcher`: File monitoring
- `StructuredParser`: Log parsing
- `ErrorClassifier`: Error classification
- `CodebaseAnalyzer`: Context analysis
- `DeterministicFixEngine`: Fix generation
- `PatchGenerator`: Patch creation
- `IncidentMemory`: Incident storage
- `ReportBuilder`: Report generation

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
- Python 3.8+
- asyncio for async operations
- watchdog for file monitoring
- Jinja2 for templating
- markdown for report generation
</task_progress>
<task_progress>
- [x] Explore existing codebase structure
- [x] Review all core modules
- [x] Create CLI interface
- [x] Create requirements.txt
- [x] Create sample log files for testing
- [x] Update README.md with documentation
- [ ] Test the complete pipeline
</task_progress>
</write_to_file>
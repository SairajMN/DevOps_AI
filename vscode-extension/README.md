# DevOps AI - VS Code Extension

AI-powered DevOps assistant with chat interface. Analyze logs, fix code, run tests with natural language.

## Features

- **Chat Interface**: Interactive chat with DevOps AI assistant
- **Log Analysis**: Analyze error logs and get intelligent suggestions
- **Code Fix**: Get AI-powered code fixes for errors
- **Run Tests**: Execute tests with natural language commands
- **Build Project**: Build your project with AI assistance
- **Install Dependencies**: Install project dependencies

## Installation

### From VSIX File

1. Download the `devops-ai-1.0.0.vsix` file
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click the three dots menu (...)
5. Select "Install from VSIX..."
6. Choose the downloaded file

### From Source

```bash
cd vscode-extension
npm install
npm run compile
npm run package
```

## Requirements

- VS Code 1.85.0 or higher
- DevOps AI Server running at http://localhost:3000 (or configure custom URL)

## Configuration

Open VS Code settings and search for "DevOps AI":

| Setting                           | Description                                 | Default                 |
| --------------------------------- | ------------------------------------------- | ----------------------- |
| `devops-ai.serverUrl`             | URL of the DevOps AI server                 | `http://localhost:3000` |
| `devops-ai.defaultModel`          | Default AI model to use                     | `deepseek-r1`           |
| `devops-ai.autoAnalyze`           | Automatically analyze logs when opened      | `false`                 |
| `devops-ai.showInlineDiagnostics` | Show inline diagnostics for detected errors | `true`                  |

## Keyboard Shortcuts

| Command      | Windows/Linux  | macOS         |
| ------------ | -------------- | ------------- |
| Quick Chat   | `Ctrl+Shift+D` | `Cmd+Shift+D` |
| Analyze File | `Ctrl+Shift+A` | `Cmd+Shift+A` |
| Fix Code     | `Ctrl+Shift+F` | `Cmd+Shift+F` |

## Commands

All commands are available via the Command Palette (Ctrl+Shift+P):

- `DevOps AI: Open Project` - Open a project folder
- `DevOps AI: Run Tests` - Run project tests
- `DevOps AI: Build Project` - Build the project
- `DevOps AI: Install Dependencies` - Install project dependencies
- `DevOps AI: Analyze Current File` - Analyze the current file
- `DevOps AI: Fix Code` - Get AI fix suggestions
- `DevOps AI: Quick Chat` - Open quick chat
- `DevOps AI: Check Status` - Check server status
- `DevOps AI: Start Server` - Start the DevOps AI server

## Usage

1. Start the DevOps AI server:

   ```bash
   cd /path/to/DevOps_AI
   npm run dev
   ```

2. Open VS Code with the extension installed

3. Use the chat interface in the sidebar or use commands

## License

MIT License

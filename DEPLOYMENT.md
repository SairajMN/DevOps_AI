# DevOps AI - Deployment Guide

## 🚀 Quick Deploy Options

### Option 1: Vercel (Recommended for Landing Page)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/SairajMN/DevOps_AI)

1. Click the button above
2. Connect your GitHub account
3. Configure environment variables:
   - `OPENROUTER_API_KEY` - Your OpenRouter API key
4. Deploy!

### Option 2: GitHub Pages (Free Static Hosting)

```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy:gh": "gh-pages -d public"

# Deploy
npm run deploy:gh
```

### Option 3: Netlify (Free Tier)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/SairajMN/DevOps_AI)

1. Click the button above
2. Connect your GitHub account
3. Set build command: `npm run build`
4. Set publish directory: `public`
5. Deploy!

## 📦 Download Options

### CLI Tool

```bash
# Clone and install
git clone https://github.com/SairajMN/DevOps_AI.git
cd DevOps_AI
pip install -r requirements.txt
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Run
python cli.py status
python cli.py analyze --file logs/error.log
```

### VS Code Extension

1. Download `devops-ai-1.0.0.vsix` from releases
2. Open VS Code
3. Go to Extensions (Ctrl+Shift+X)
4. Click "..." menu → "Install from VSIX..."
5. Select the downloaded file

### Desktop App

Download from GitHub Releases:

- Windows: `devops-ai-desktop-win.exe`
- macOS: `devops-ai-desktop-mac.dmg`
- Linux: `devops-ai-desktop-linux.AppImage`

## 🔧 Configuration

### Environment Variables

| Variable             | Description                          | Required |
| -------------------- | ------------------------------------ | -------- |
| `OPENROUTER_API_KEY` | OpenRouter API key for AI features   | Yes      |
| `PORT`               | Server port (default: 3000)          | No       |
| `HOST`               | Server host (default: 0.0.0.0)       | No       |
| `NODE_ENV`           | Environment (development/production) | No       |

### API Configuration

```typescript
// Default configuration
const config = {
  serverUrl: "http://localhost:3000",
  defaultModel: "deepseek-r1",
  autoAnalyze: false,
  showInlineDiagnostics: true,
};
```

## 🌐 API Endpoints

| Endpoint             | Method | Description              |
| -------------------- | ------ | ------------------------ |
| `/api/health`        | GET    | Health check             |
| `/api/models`        | GET    | List available AI models |
| `/api/analyze`       | POST   | Analyze log content      |
| `/api/analyze/quick` | POST   | Quick analysis           |
| `/api/analyze/multi` | POST   | Multi-step analysis      |
| `/api/fix`           | POST   | Generate code fix        |
| `/api/tasks`         | POST   | Create task              |

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DevOps AI System                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   CLI Tool  │  │ VS Code Ext │  │ Desktop App │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         └────────────────┼────────────────┘                 │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │  REST API   │                           │
│                   │  (Express)  │                           │
│                   └──────┬──────┘                           │
│                          │                                  │
│         ┌────────────────┼────────────────┐                 │
│         │                │                │                 │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │   Python    │  │    AI/LLM   │  │   Memory    │         │
│  │  Pipeline   │  │  (OpenRouter)│  │   Engine    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 🔒 Security

- ✅ No auto-execution of commands
- ✅ All patches require explicit approval
- ✅ API keys stored in environment variables
- ✅ No secrets in source code
- ✅ CORS enabled for API access
- ✅ Input validation on all endpoints

## 📝 License

MIT License - See LICENSE file for details.

## 🤝 Support

- GitHub Issues: https://github.com/SairajMN/DevOps_AI/issues
- Documentation: https://github.com/SairajMN/DevOps_AI/blob/main/README.md

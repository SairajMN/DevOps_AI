#!/usr/bin/env node
/**
 * DevOps AI CLI - Interactive Interface
 * Conversational AI assistant for DevOps tasks
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface Task {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  result?: string;
}

interface ProjectContext {
  path: string;
  name: string;
  type: "node" | "python" | "mixed" | "unknown";
  packageManager: "npm" | "yarn" | "pip" | "unknown";
}

// ============================================================================
// Colors & UI
// ============================================================================

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  bg: {
    blue: "\x1b[44m",
    green: "\x1b[42m",
    red: "\x1b[41m",
  },
};

function clearScreen() {
  console.clear();
}

function printHeader() {
  console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════════╗
║${colors.bold}${colors.white}                    🤖 DevOps AI - Powered by Accomplish AI                    ${colors.reset}${colors.cyan}║
║${colors.dim}                    Your Intelligent DevOps Assistant                         ${colors.reset}${colors.cyan}║
╚══════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function printDivider() {
  console.log(
    `${colors.dim}────────────────────────────────────────────────────────────────────────────${colors.reset}`,
  );
}

function printThinking() {
  process.stdout.write(`${colors.cyan}🤔 Thinking...${colors.reset}\r`);
}

function clearThinking() {
  process.stdout.write("                              \r");
}

// ============================================================================
// Project Detection
// ============================================================================

async function detectProject(projectPath: string): Promise<ProjectContext> {
  const name = path.basename(projectPath);
  let type: ProjectContext["type"] = "unknown";
  let packageManager: ProjectContext["packageManager"] = "unknown";

  // Check for Node.js
  if (fs.existsSync(path.join(projectPath, "package.json"))) {
    type = "node";
    packageManager = fs.existsSync(path.join(projectPath, "yarn.lock"))
      ? "yarn"
      : "npm";
  }
  // Check for Python
  else if (
    fs.existsSync(path.join(projectPath, "requirements.txt")) ||
    fs.existsSync(path.join(projectPath, "setup.py")) ||
    fs.existsSync(path.join(projectPath, "pyproject.toml"))
  ) {
    type = "python";
    packageManager = "pip";
  }
  // Check for mixed
  else if (
    fs.existsSync(path.join(projectPath, "package.json")) &&
    fs.existsSync(path.join(projectPath, "requirements.txt"))
  ) {
    type = "mixed";
  }

  return { path: projectPath, name, type, packageManager };
}

// ============================================================================
// AI Client
// ============================================================================

class AIClient {
  private serverUrl: string;
  private conversationHistory: Message[] = [];

  constructor(serverUrl: string = "http://localhost:3000") {
    this.serverUrl = serverUrl;
  }

  async chat(userMessage: string, context?: ProjectContext): Promise<string> {
    this.conversationHistory.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    try {
      // Build context-aware prompt
      const systemContext = context
        ? `
Project Context:
- Path: ${context.path}
- Name: ${context.name}
- Type: ${context.type}
- Package Manager: ${context.packageManager}
`
        : "";

      const response = await fetch(`${this.serverUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          context: systemContext,
          history: this.conversationHistory.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        // Fallback to analyze endpoint
        const analyzeResponse = await fetch(`${this.serverUrl}/api/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ log: userMessage }),
        });

        if (analyzeResponse.ok) {
          const data = (await analyzeResponse.json()) as Record<
            string,
            unknown
          >;
          const result = this.formatAnalysisResult(data);
          this.conversationHistory.push({
            role: "assistant",
            content: result,
            timestamp: new Date(),
          });
          return result;
        }

        throw new Error("Failed to get AI response");
      }

      const data = (await response.json()) as Record<string, unknown>;
      const analysis = data.analysis as Record<string, unknown> | undefined;
      const assistantMessage =
        (data.response as string) ||
        (analysis?.suggested_fix as string) ||
        "I couldn't process that request.";

      this.conversationHistory.push({
        role: "assistant",
        content: assistantMessage,
        timestamp: new Date(),
      });

      return assistantMessage;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : "Unknown error"}. Make sure the server is running at ${this.serverUrl}`;
    }
  }

  private formatAnalysisResult(data: any): string {
    if (data.analysis) {
      return `
**Error Type:** ${data.analysis.error_type || "Unknown"}
**Root Cause:** ${data.analysis.root_cause || "Could not determine"}
**Confidence:** ${data.analysis.confidence || 0}%
**Suggested Fix:** ${data.analysis.suggested_fix || "No suggestion available"}
${data.analysis.step_by_step_fix?.length ? `\n**Steps:**\n${data.analysis.step_by_step_fix.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` : ""}
`;
    }
    return JSON.stringify(data, null, 2);
  }

  clearHistory() {
    this.conversationHistory = [];
  }
}

// ============================================================================
// Task Executor
// ============================================================================

class TaskExecutor {
  private projectContext: ProjectContext;

  constructor(projectContext: ProjectContext) {
    this.projectContext = projectContext;
  }

  async executeCommand(
    command: string,
  ): Promise<{ stdout: string; stderr: string; code: number }> {
    console.log(
      `${colors.yellow}⚡ Executing: ${colors.cyan}${command}${colors.reset}\n`,
    );

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectContext.path,
        maxBuffer: 1024 * 1024 * 10,
      });

      return { stdout, stderr, code: 0 };
    } catch (error: any) {
      return {
        stdout: error.stdout || "",
        stderr: error.stderr || error.message,
        code: error.code || 1,
      };
    }
  }

  async runTests(): Promise<string> {
    let command = "";
    switch (this.projectContext.type) {
      case "node":
        command =
          this.projectContext.packageManager === "yarn"
            ? "yarn test"
            : "npm test";
        break;
      case "python":
        command = "python -m pytest";
        break;
      default:
        return "Could not determine test command for this project type.";
    }

    const result = await this.executeCommand(command);
    return result.code === 0
      ? `${colors.green}✅ Tests passed!${colors.reset}\n${result.stdout}`
      : `${colors.red}❌ Tests failed!${colors.reset}\n${result.stderr}`;
  }

  async runBuild(): Promise<string> {
    let command = "";
    switch (this.projectContext.type) {
      case "node":
        command =
          this.projectContext.packageManager === "yarn"
            ? "yarn build"
            : "npm run build";
        break;
      case "python":
        command = "python setup.py build";
        break;
      default:
        return "Could not determine build command for this project type.";
    }

    const result = await this.executeCommand(command);
    return result.code === 0
      ? `${colors.green}✅ Build successful!${colors.reset}\n${result.stdout}`
      : `${colors.red}❌ Build failed!${colors.reset}\n${result.stderr}`;
  }

  async installDependencies(): Promise<string> {
    let command = "";
    switch (this.projectContext.type) {
      case "node":
        command =
          this.projectContext.packageManager === "yarn"
            ? "yarn install"
            : "npm install";
        break;
      case "python":
        command = "pip install -r requirements.txt";
        break;
      default:
        return "Could not determine install command for this project type.";
    }

    const result = await this.executeCommand(command);
    return result.code === 0
      ? `${colors.green}✅ Dependencies installed!${colors.reset}\n${result.stdout}`
      : `${colors.red}❌ Installation failed!${colors.reset}\n${result.stderr}`;
  }

  async analyzeLogs(logPath?: string): Promise<string> {
    const logFile =
      logPath || path.join(this.projectContext.path, "logs", "error.log");

    if (!fs.existsSync(logFile)) {
      return `${colors.red}❌ Log file not found: ${logFile}${colors.reset}`;
    }

    const logContent = fs.readFileSync(logFile, "utf-8");

    // Call AI to analyze
    const response = await fetch("http://localhost:3000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ log: logContent }),
    });

    if (response.ok) {
      const data = await response.json();
      return this.formatAnalysis(data);
    }

    return `${colors.red}❌ Failed to analyze logs${colors.reset}`;
  }

  private formatAnalysis(data: any): string {
    const a = data.analysis || data;
    return `
${colors.cyan}📊 Analysis Results:${colors.reset}
${colors.bold}Error Type:${colors.reset} ${a.error_type || "Unknown"}
${colors.bold}Category:${colors.reset} ${a.error_category || "Unknown"}
${colors.bold}Confidence:${colors.reset} ${a.confidence || 0}%
${colors.bold}Severity:${colors.reset} ${a.severity || "Unknown"}

${colors.yellow}Root Cause:${colors.reset}
${a.root_cause || "Could not determine"}

${colors.green}Suggested Fix:${colors.reset}
${a.suggested_fix || "No suggestion available"}

${a.step_by_step_fix?.length ? `${colors.blue}Step-by-Step:${colors.reset}\n${a.step_by_step_fix.map((s: string, i: number) => `  ${i + 1}. ${s}`).join("\n")}` : ""}
`;
  }
}

// ============================================================================
// Interactive CLI
// ============================================================================

class DevOpsAICLI {
  private rl: readline.Interface;
  private aiClient: AIClient;
  private projectContext: ProjectContext | null = null;
  private taskExecutor: TaskExecutor | null = null;
  private running = true;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "",
    });
    this.aiClient = new AIClient();
  }

  async start(projectPath?: string) {
    clearScreen();
    printHeader();

    // Detect or ask for project
    if (projectPath) {
      this.projectContext = await detectProject(projectPath);
    } else {
      const cwd = process.cwd();
      this.projectContext = await detectProject(cwd);
    }

    if (this.projectContext) {
      this.taskExecutor = new TaskExecutor(this.projectContext);
      console.log(
        `${colors.green}📁 Project: ${colors.bold}${this.projectContext.name}${colors.reset}`,
      );
      console.log(
        `${colors.blue}   Type: ${this.projectContext.type} | Package Manager: ${this.projectContext.packageManager}${colors.reset}`,
      );
      console.log(
        `${colors.dim}   Path: ${this.projectContext.path}${colors.reset}\n`,
      );
    }

    printDivider();
    console.log(
      `${colors.cyan}💬 Chat with your DevOps AI assistant. Type ${colors.bold}help${colors.reset}${colors.cyan} for commands.${colors.reset}\n`,
    );

    this.chatLoop();
  }

  private chatLoop() {
    this.rl.question(`${colors.green}You:${colors.reset} `, async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        this.chatLoop();
        return;
      }

      // Handle commands
      if (trimmed.startsWith("/")) {
        await this.handleCommand(trimmed);
        this.chatLoop();
        return;
      }

      // Handle special keywords
      const lowerInput = trimmed.toLowerCase();

      if (lowerInput === "help" || lowerInput === "?") {
        this.showHelp();
        this.chatLoop();
        return;
      }

      if (lowerInput === "exit" || lowerInput === "quit") {
        this.exit();
        return;
      }

      if (lowerInput === "clear") {
        clearScreen();
        printHeader();
        this.chatLoop();
        return;
      }

      // Parse natural language commands
      if (this.isActionCommand(trimmed)) {
        await this.handleActionCommand(trimmed);
        this.chatLoop();
        return;
      }

      // Regular chat
      printThinking();
      const response = await this.aiClient.chat(
        trimmed,
        this.projectContext || undefined,
      );
      clearThinking();

      console.log(`\n${colors.magenta}Assistant:${colors.reset} ${response}\n`);
      printDivider();

      this.chatLoop();
    });
  }

  private isActionCommand(input: string): boolean {
    const actionKeywords = [
      "run tests",
      "test",
      "build",
      "install",
      "analyze logs",
      "fix",
      "deploy",
      "start server",
      "stop server",
      "check status",
      "show errors",
      "debug",
      "run",
    ];
    const lower = input.toLowerCase();
    return actionKeywords.some((kw) => lower.includes(kw));
  }

  private async handleActionCommand(input: string) {
    if (!this.taskExecutor) {
      console.log(
        `${colors.red}❌ No project context available. Open a project first.${colors.reset}\n`,
      );
      return;
    }

    const lower = input.toLowerCase();

    if (lower.includes("test")) {
      const result = await this.taskExecutor.runTests();
      console.log(`\n${result}\n`);
      printDivider();
    } else if (lower.includes("build")) {
      const result = await this.taskExecutor.runBuild();
      console.log(`\n${result}\n`);
      printDivider();
    } else if (lower.includes("install")) {
      const result = await this.taskExecutor.installDependencies();
      console.log(`\n${result}\n`);
      printDivider();
    } else if (
      lower.includes("log") ||
      lower.includes("error") ||
      lower.includes("analyze")
    ) {
      const result = await this.taskExecutor.analyzeLogs();
      console.log(`\n${result}\n`);
      printDivider();
    } else if (lower.includes("fix") || lower.includes("debug")) {
      printThinking();
      const response = await this.aiClient.chat(
        `Help me fix this issue: ${input}`,
        this.projectContext || undefined,
      );
      clearThinking();
      console.log(`\n${colors.magenta}Assistant:${colors.reset} ${response}\n`);
      printDivider();
    } else {
      printThinking();
      const response = await this.aiClient.chat(
        input,
        this.projectContext || undefined,
      );
      clearThinking();
      console.log(`\n${colors.magenta}Assistant:${colors.reset} ${response}\n`);
      printDivider();
    }
  }

  private async handleCommand(command: string) {
    const parts = command.slice(1).split(" ");
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case "open":
        if (args[0]) {
          const projectPath = path.resolve(args[0]);
          if (fs.existsSync(projectPath)) {
            this.projectContext = await detectProject(projectPath);
            this.taskExecutor = new TaskExecutor(this.projectContext);
            console.log(
              `${colors.green}✅ Opened project: ${this.projectContext.name}${colors.reset}\n`,
            );
          } else {
            console.log(
              `${colors.red}❌ Path not found: ${projectPath}${colors.reset}\n`,
            );
          }
        } else {
          console.log(
            `${colors.yellow}Usage: /open <project-path>${colors.reset}\n`,
          );
        }
        break;

      case "test":
        if (this.taskExecutor) {
          const result = await this.taskExecutor.runTests();
          console.log(`\n${result}\n`);
        } else {
          console.log(`${colors.red}❌ No project open${colors.reset}\n`);
        }
        break;

      case "build":
        if (this.taskExecutor) {
          const result = await this.taskExecutor.runBuild();
          console.log(`\n${result}\n`);
        } else {
          console.log(`${colors.red}❌ No project open${colors.reset}\n`);
        }
        break;

      case "install":
        if (this.taskExecutor) {
          const result = await this.taskExecutor.installDependencies();
          console.log(`\n${result}\n`);
        } else {
          console.log(`${colors.red}❌ No project open${colors.reset}\n`);
        }
        break;

      case "analyze":
        if (this.taskExecutor) {
          const result = await this.taskExecutor.analyzeLogs(args[0]);
          console.log(`\n${result}\n`);
        } else {
          console.log(`${colors.red}❌ No project open${colors.reset}\n`);
        }
        break;

      case "status":
        console.log(`\n${colors.cyan}📊 System Status:${colors.reset}`);
        console.log(`   Project: ${this.projectContext?.name || "None"}`);
        console.log(`   Type: ${this.projectContext?.type || "N/A"}`);
        console.log(`   Path: ${this.projectContext?.path || "N/A"}\n`);
        break;

      case "clear":
        this.aiClient.clearHistory();
        console.log(`${colors.green}✅ Conversation cleared${colors.reset}\n`);
        break;

      case "help":
        this.showHelp();
        break;

      default:
        console.log(
          `${colors.yellow}Unknown command. Type ${colors.bold}help${colors.reset}${colors.yellow} for available commands.${colors.reset}\n`,
        );
    }
  }

  private showHelp() {
    console.log(`
${colors.cyan}═══════════════════════════════════════════════════════════
                        📚 DevOps AI Help
═══════════════════════════════════════════════════════════${colors.reset}

${colors.bold}Natural Language Commands:${colors.reset}
  Just type what you want to do in plain English!
  Examples:
    ${colors.dim}"run my tests"${colors.reset}
    ${colors.dim}"build the project"${colors.reset}
    ${colors.dim}"analyze error logs"${colors.reset}
    ${colors.dim}"fix the failing test"${colors.reset}
    ${colors.dim}"install dependencies"${colors.reset}

${colors.bold}Slash Commands:${colors.reset}
  /open <path>     Open a project
  /test            Run tests
  /build           Build the project
  /install         Install dependencies
  /analyze [file]  Analyze logs
  /status          Show system status
  /clear           Clear conversation
  /help            Show this help
  exit             Exit the CLI

${colors.bold}Keyboard Shortcuts:${colors.reset}
  Ctrl+C           Exit
  Ctrl+L           Clear screen

${colors.dim}Tip: Just describe what you want to do, and I'll help!${colors.reset}
`);
    printDivider();
  }

  private exit() {
    console.log(`\n${colors.cyan}👋 Goodbye! Happy coding!${colors.reset}\n`);
    this.rl.close();
    process.exit(0);
  }
}

// ============================================================================
// Entry Point
// ============================================================================

const cli = new DevOpsAICLI();
const projectPath = process.argv[2];
cli.start(projectPath);

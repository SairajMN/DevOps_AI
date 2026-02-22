#!/usr/bin/env node
/**
 * DevOps AI Agent CLI - Unified entry point for desktop automation
 * Full autonomous agent with tool use capabilities
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

import {
  DevOpsAIAgent,
  runDevOpsAI,
  planDevOpsAITask,
} from "../agent/devopsAIAgent";
import { ToolExecutor } from "../tools/executor";
import { runLogWorkflow } from "../agent/accomplishAgent";
import { pythonBridge } from "../bridge/pythonBridge";

// ============================================================================
// CLI Colors
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
};

// ============================================================================
// Main CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Show banner
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════════════════════╗
║${colors.bold}${colors.white}                    🤖 DevOps AI - Desktop Automation Agent                  ${colors.reset}${colors.cyan}║
║${colors.dim}${colors.white}                    Autonomous Task Execution & Desktop Control                ${colors.reset}${colors.cyan}║
╚════════════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

  // No command - start interactive mode
  if (!command) {
    const agent = new DevOpsAIAgent();
    await agent.startInteractive();
    return;
  }

  // Handle commands
  switch (command) {
    case "run":
    case "exec":
      // Execute a task directly
      const task = args.slice(1).join(" ");
      if (!task) {
        console.log(`${colors.red}Error: No task provided${colors.reset}`);
        console.log(`Usage: devops-ai-agent run <task description>`);
        process.exit(1);
      }
      await executeTask(task);
      break;

    case "plan":
      // Plan a task without executing
      const planTask = args.slice(1).join(" ");
      if (!planTask) {
        console.log(`${colors.red}Error: No task provided${colors.reset}`);
        console.log(`Usage: devops-ai-agent plan <task description>`);
        process.exit(1);
      }
      await planTaskOnly(planTask);
      break;

    case "analyze":
      // Analyze logs
      const logFile = args[1];
      if (!logFile) {
        console.log(`${colors.red}Error: No log file provided${colors.reset}`);
        console.log(`Usage: devops-ai-agent analyze <log file>`);
        process.exit(1);
      }
      await analyzeLogs(logFile);
      break;

    case "tools":
      // List available tools
      listTools();
      break;

    case "status":
      // Show system status
      await showStatus();
      break;

    case "help":
    case "--help":
    case "-h":
      showHelp();
      break;

    case "version":
    case "--version":
    case "-v":
      showVersion();
      break;

    default:
      // Treat as a task
      console.log(
        `${colors.cyan}Executing task: ${command} ${args.slice(1).join(" ")}${colors.reset}\n`,
      );
      await executeTask(args.join(" "));
  }
}

// ============================================================================
// Command Handlers
// ============================================================================

async function executeTask(task: string) {
  console.log(`${colors.yellow}🎯 Task: ${task}${colors.reset}\n`);
  console.log(`${colors.dim}Starting autonomous execution...${colors.reset}\n`);

  const startTime = Date.now();

  try {
    const result = await runDevOpsAI(task);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      console.log(
        `\n${colors.green}✅ Task completed successfully!${colors.reset}`,
      );
      console.log(
        `${colors.dim}Duration: ${duration}s | Steps: ${result.steps_completed}/${result.total_steps}${colors.reset}`,
      );
    } else {
      console.log(`\n${colors.red}❌ Task failed${colors.reset}`);
      console.log(
        `${colors.dim}Duration: ${duration}s | Steps completed: ${result.steps_completed}/${result.total_steps}${colors.reset}`,
      );

      if (result.steps_failed > 0) {
        console.log(
          `${colors.red}Failed steps: ${result.steps_failed}${colors.reset}`,
        );
      }
    }
  } catch (error) {
    console.error(`\n${colors.red}Error: ${error}${colors.reset}`);
    process.exit(1);
  }
}

async function planTaskOnly(task: string) {
  console.log(`${colors.cyan}📋 Planning task: ${task}${colors.reset}\n`);

  try {
    const plan = await planDevOpsAITask(task);

    console.log(`\n${colors.bold}Task Analysis:${colors.reset}`);
    console.log(`  Goal: ${plan.goal}`);
    console.log(`  Complexity: ${plan.complexity}`);
    console.log(`  Estimated iterations: ${plan.estimated_iterations}`);

    console.log(`\n${colors.bold}Steps:${colors.reset}`);
    plan.steps.forEach((step, i) => {
      console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${step}`);
    });

    console.log(
      `\n${colors.bold}Tools needed:${colors.reset} ${plan.tools_needed.join(", ")}`,
    );
  } catch (error) {
    console.error(`${colors.red}Error planning task: ${error}${colors.reset}`);
    process.exit(1);
  }
}

async function analyzeLogs(logFile: string) {
  console.log(`${colors.cyan}📊 Analyzing logs: ${logFile}${colors.reset}\n`);

  try {
    // Check if file exists
    if (!fs.existsSync(logFile)) {
      console.log(
        `${colors.red}Error: File not found: ${logFile}${colors.reset}`,
      );
      process.exit(1);
    }

    const logContent = fs.readFileSync(logFile, "utf-8");

    console.log(`${colors.dim}Running AI analysis...${colors.reset}\n`);

    const result = await runLogWorkflow(logContent, {
      useEnhancedPrompt: true,
      preferAccomplishAI: true,
    });

    if (result.success && result.data) {
      const analysis = result.data;

      console.log(
        `${colors.bold}${colors.green}Analysis Results:${colors.reset}`,
      );
      console.log(
        `\n${colors.bold}Error Type:${colors.reset} ${analysis.error_type}`,
      );
      console.log(
        `${colors.bold}Category:${colors.reset} ${analysis.error_category}`,
      );
      console.log(
        `${colors.bold}Severity:${colors.reset} ${analysis.severity}`,
      );
      console.log(
        `${colors.bold}Confidence:${colors.reset} ${analysis.confidence}%`,
      );

      console.log(`\n${colors.bold}Root Cause:${colors.reset}`);
      console.log(`  ${analysis.root_cause}`);

      console.log(`\n${colors.bold}Suggested Fix:${colors.reset}`);
      console.log(`  ${analysis.suggested_fix}`);

      if (analysis.step_by_step_fix && analysis.step_by_step_fix.length > 0) {
        console.log(`\n${colors.bold}Step-by-Step Fix:${colors.reset}`);
        analysis.step_by_step_fix.forEach((step, i) => {
          console.log(`  ${colors.cyan}${i + 1}.${colors.reset} ${step}`);
        });
      }

      if (analysis.affected_files && analysis.affected_files.length > 0) {
        console.log(`\n${colors.bold}Affected Files:${colors.reset}`);
        analysis.affected_files.forEach((file) => {
          console.log(`  - ${file}`);
        });
      }

      console.log(
        `\n${colors.dim}Analysis powered by ${result.source} (${result.model})${colors.reset}`,
      );
    } else {
      console.log(
        `${colors.red}Analysis failed: ${result.error}${colors.reset}`,
      );
    }
  } catch (error) {
    console.error(`${colors.red}Error analyzing logs: ${error}${colors.reset}`);
    process.exit(1);
  }
}

function listTools() {
  console.log(`${colors.bold}Available Tools:${colors.reset}\n`);

  const tools = [
    { name: "execute_command", desc: "Run terminal commands" },
    { name: "read_file", desc: "Read file contents" },
    { name: "write_to_file", desc: "Create or overwrite files" },
    { name: "replace_in_file", desc: "Make targeted edits to files" },
    { name: "search_files", desc: "Search for patterns in files" },
    { name: "list_files", desc: "List directory contents" },
    { name: "ask_followup_question", desc: "Ask user for clarification" },
    { name: "attempt_completion", desc: "Present final result" },
    { name: "browser_action", desc: "Control a web browser" },
    { name: "screen_capture", desc: "Take screenshots" },
    { name: "app_control", desc: "Launch and control applications" },
    { name: "clipboard", desc: "Interact with system clipboard" },
  ];

  tools.forEach((tool) => {
    console.log(
      `  ${colors.cyan}${tool.name.padEnd(20)}${colors.reset} ${tool.desc}`,
    );
  });

  console.log(
    `\n${colors.dim}Tools are used automatically by the AI agent based on task requirements.${colors.reset}`,
  );
}

async function showStatus() {
  console.log(`${colors.bold}System Status:${colors.reset}\n`);

  // Check environment
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  console.log(
    `  ${hasOpenRouter ? colors.green + "✓" : colors.red + "✗"}${colors.reset} OpenRouter API`,
  );
  console.log(
    `  ${hasOpenAI ? colors.green + "✓" : colors.red + "✗"}${colors.reset} OpenAI API`,
  );

  // Check Python
  const pythonStatus = await pythonBridge.checkPythonEnvironment();
  console.log(
    `  ${pythonStatus.available ? colors.green + "✓" : colors.red + "✗"}${colors.reset} Python ${pythonStatus.version || ""}`,
  );

  if (pythonStatus.available) {
    const deps = await pythonBridge.checkPythonDependencies();
    console.log(
      `    ${colors.dim}Installed: ${deps.installed.join(", ")}${colors.reset}`,
    );
    if (deps.missing.length > 0) {
      console.log(
        `    ${colors.yellow}Missing: ${deps.missing.join(", ")}${colors.reset}`,
      );
    }
  }

  // Working directory
  console.log(
    `\n  ${colors.bold}Working Directory:${colors.reset} ${process.cwd()}`,
  );

  // Model info
  console.log(
    `  ${colors.bold}Default Model:${colors.reset} ${process.env.DEFAULT_MODEL || "auto-select"}`,
  );
}

function showHelp() {
  console.log(`
${colors.bold}DevOps AI - Desktop Automation Agent${colors.reset}

${colors.bold}Usage:${colors.reset}
  devops-ai-agent                 Start interactive mode
  devops-ai-agent run <task>      Execute a task
  devops-ai-agent plan <task>     Plan a task without executing
  devops-ai-agent analyze <file>  Analyze error logs
  devops-ai-agent tools           List available tools
  devops-ai-agent status          Show system status
  devops-ai-agent help            Show this help message

${colors.bold}Examples:${colors.reset}
  devops-ai-agent run "Create a new React component called Button"
  devops-ai-agent run "Fix the TypeScript error in src/index.ts"
  devops-ai-agent run "Run the tests and fix any failures"
  devops-ai-agent plan "Set up a new Express.js project"
  devops-ai-agent analyze logs/error.log

${colors.bold}Interactive Commands:${colors.reset}
  /help              Show help
  /cd <path>         Change working directory
  /status            Show current status
  /clear             Clear conversation history
  /plan <task>       Plan a task without executing
  exit               Exit the CLI

${colors.bold}Environment Variables:${colors.reset}
  OPENROUTER_API_KEY    API key for OpenRouter (required)
  OPENAI_API_KEY        API key for OpenAI (optional)
  DEFAULT_MODEL         Default model to use

${colors.bold}Documentation:${colors.reset}
  https://github.com/SairajMN/DevOps_AI
`);
}

function showVersion() {
  const packageJson = require("../../package.json");
  console.log(`DevOps AI v${packageJson.version}`);
}

// ============================================================================
// Entry Point
// ============================================================================

main().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error}${colors.reset}`);
  process.exit(1);
});

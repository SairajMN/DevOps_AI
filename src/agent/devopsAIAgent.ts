/**
 * DevOps AI Agent - Autonomous task planning and execution
 * Full desktop automation with tool use capabilities
 */

import * as readline from "readline";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";

import { ToolExecutor } from "../tools/executor";
import {
  ToolName,
  ToolUse,
  ToolResult,
  AgentState,
  AgentConfig,
  AgentMessage,
  TaskPlan,
  TaskStep,
  TaskProgress,
} from "../tools/types";
import { TOOL_DEFINITIONS, getAllTools } from "../tools/definitions";
import {
  callLLMWithFallback,
  parseJSONResponse,
  ChatMessage,
} from "../ai/openrouterClient";
import { selectModel } from "../ai/modelRouter";

// ============================================================================
// Types
// ============================================================================

interface DevOpsAIAgentConfig extends AgentConfig {
  serverUrl?: string;
  useLocalLLM?: boolean;
}

interface TaskAnalysis {
  goal: string;
  steps: string[];
  tools_needed: ToolName[];
  complexity: "simple" | "moderate" | "complex";
  estimated_iterations: number;
}

interface ExecutionResult {
  success: boolean;
  steps_completed: number;
  steps_failed: number;
  total_steps: number;
  final_message: string;
  tool_results: ToolResult[];
}

// ============================================================================
// System Prompts
// ============================================================================

const DEVOPS_AI_SYSTEM_PROMPT = `You are DevOps AI, a highly skilled software engineer with extensive knowledge in many programming languages, frameworks, design patterns, and best practices.

## Your Capabilities

You have access to a set of tools that let you execute CLI commands, read and write files, search code, and perform desktop automation. You use these tools step-by-step to accomplish a given task.

## Tool Use Policy

1. Invoke tools only in assistant messages; they will not execute if placed inside reasoning blocks.
2. Use reasoning blocks solely for analysis/option-weighing.
3. Place all tool XML blocks in assistant messages to execute them.

## Available Tools

You have access to the following tools:
- execute_command: Run terminal commands
- read_file: Read file contents
- write_to_file: Create or overwrite files
- replace_in_file: Make targeted edits to files
- search_files: Search for patterns in files
- list_files: List directory contents
- ask_followup_question: Ask user for clarification
- attempt_completion: Present final result when done
- browser_action: Control a web browser
- screen_capture: Take screenshots
- app_control: Launch and control applications
- clipboard: Interact with system clipboard

## Workflow

1. **Analyze**: Understand the task and break it down into steps
2. **Plan**: Create a clear plan with specific actions
3. **Execute**: Use tools to accomplish each step
4. **Verify**: Check results and iterate if needed
5. **Complete**: Present the final result

## Important Rules

- Always explore the codebase before making changes
- Use replace_in_file for targeted edits, write_to_file for new files
- Ask for approval before executing potentially dangerous commands
- Provide clear explanations of what you're doing and why
- If something fails, analyze the error and try a different approach
- When done, use attempt_completion to present the result

## Output Format

When you need to use a tool, respond with a tool use block:

\`\`\`xml
<tool_name>
<parameter>value</parameter>
</tool_name>
\`\`\`

Example:
\`\`\`xml
<read_file>
<path>src/index.ts</path>
</read_file>
\`\`\`

For multiple parameters:
\`\`\`xml
<execute_command>
<command>npm install</command>
<requires_approval>false</requires_approval>
</execute_command>
\`\`\`

Always think through the problem before using tools. Explain your reasoning, then invoke the appropriate tool.`;

const TASK_PLANNING_PROMPT = `Analyze the following task and create a step-by-step plan.

Task: {TASK}

Available tools: {TOOLS}

Respond with a JSON object containing:
{
  "goal": "Clear statement of what needs to be accomplished",
  "steps": [
    "Step 1 description",
    "Step 2 description",
    ...
  ],
  "tools_needed": ["tool1", "tool2", ...],
  "complexity": "simple|moderate|complex",
  "estimated_iterations": number
}`;

// ============================================================================
// DevOps AI Agent Class
// ============================================================================

export class DevOpsAIAgent {
  private config: DevOpsAIAgentConfig;
  private state: AgentState;
  private toolExecutor: ToolExecutor;
  private conversationHistory: ChatMessage[] = [];
  private rl: readline.Interface | null = null;

  constructor(config: Partial<DevOpsAIAgentConfig> = {}) {
    this.config = {
      model: config.model || selectModel("code-generation"),
      max_tokens: config.max_tokens || 4096,
      temperature: config.temperature || 0,
      max_iterations: config.max_iterations || 50,
      require_approval: config.require_approval ?? true,
      auto_execute: config.auto_execute ?? false,
      working_directory: config.working_directory || process.cwd(),
      serverUrl: config.serverUrl || "http://localhost:3000",
      useLocalLLM: config.useLocalLLM ?? false,
    };

    this.state = {
      status: "idle",
      conversation_history: [],
      working_directory: this.config.working_directory,
      environment: {},
      capabilities: Object.keys(TOOL_DEFINITIONS) as ToolName[],
    };

    this.toolExecutor = new ToolExecutor({
      workingDirectory: this.config.working_directory,
      autoApprove: !this.config.require_approval,
    });

    // Initialize conversation with system prompt
    this.conversationHistory = [
      { role: "system", content: DEVOPS_AI_SYSTEM_PROMPT },
    ];
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Start interactive CLI session
   */
  async startInteractive(): Promise<void> {
    this.printHeader();
    this.setupReadline();

    console.log("📁 Working Directory:", this.state.working_directory);
    console.log("🤖 Model:", this.config.model);
    console.log("");

    await this.chatLoop();
  }

  /**
   * Execute a single task
   */
  async executeTask(task: string): Promise<ExecutionResult> {
    this.state.status = "thinking";

    // Add task to conversation
    this.conversationHistory.push({
      role: "user",
      content: task,
    });

    const results: ToolResult[] = [];
    let iterations = 0;
    let completed = false;

    while (!completed && iterations < this.config.max_iterations) {
      iterations++;
      this.state.status = "thinking";

      // Get AI response
      const response = await this.getAIResponse();

      // Check for completion
      if (response.includes("<attempt_completion>")) {
        completed = true;
      }

      // Extract and execute tool uses
      const toolUses = this.extractToolUses(response);

      for (const toolUse of toolUses) {
        this.state.status = "executing";
        console.log(`\n⚡ Executing: ${toolUse.name}`);

        const result = await this.toolExecutor.execute(toolUse);
        results.push(result);

        // Add result to conversation
        this.conversationHistory.push({
          role: "assistant",
          content: response,
        });
        this.conversationHistory.push({
          role: "user",
          content: `Tool result:\n${result.content}`,
        });

        console.log(`✅ Result: ${result.content.slice(0, 200)}...`);
      }

      if (toolUses.length === 0) {
        // No tools used, just a text response
        console.log(`\n🤖 ${response}`);
        completed = true;
      }
    }

    this.state.status = completed ? "completed" : "error";

    return {
      success: completed,
      steps_completed: results.filter((r) => !r.is_error).length,
      steps_failed: results.filter((r) => r.is_error).length,
      total_steps: results.length,
      final_message: results[results.length - 1]?.content || "",
      tool_results: results,
    };
  }

  /**
   * Plan a task without executing
   */
  async planTask(task: string): Promise<TaskAnalysis> {
    const planningPrompt = TASK_PLANNING_PROMPT.replace("{TASK}", task).replace(
      "{TOOLS}",
      this.state.capabilities.join(", "),
    );

    const response = await callLLMWithFallback(
      {
        model: this.config.model,
        messages: [
          {
            role: "system",
            content:
              "You are a task planning assistant. Respond only with valid JSON.",
          },
          { role: "user", content: planningPrompt },
        ],
        temperature: 0,
        max_tokens: 1024,
      },
      "code-generation",
    );

    const analysis = parseJSONResponse<TaskAnalysis>(response.content);

    if (!analysis) {
      return {
        goal: task,
        steps: ["Analyze task", "Execute required actions", "Verify results"],
        tools_needed: ["execute_command", "read_file", "write_to_file"],
        complexity: "moderate",
        estimated_iterations: 5,
      };
    }

    return analysis;
  }

  /**
   * Set working directory
   */
  setWorkingDirectory(dir: string): void {
    this.state.working_directory = dir;
    this.toolExecutor.setWorkingDirectory(dir);
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return { ...this.state };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  private printHeader(): void {
    console.log(`
\x1b[36m╔════════════════════════════════════════════════════════════════════════════╗
║\x1b[1m\x1b[37m                    🤖 DevOps AI - Desktop Automation Agent                  \x1b[0m\x1b[36m║
║\x1b[2m\x1b[37m                    Autonomous Task Execution & Desktop Control                \x1b[0m\x1b[36m║
╚════════════════════════════════════════════════════════════════════════════╝\x1b[0m
`);
  }

  private setupReadline(): void {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "",
    });
  }

  private async chatLoop(): Promise<void> {
    if (!this.rl) return;

    const ask = () => {
      this.rl!.question("\x1b[32mYou:\x1b[0m ", async (input) => {
        const trimmed = input.trim();

        if (!trimmed) {
          ask();
          return;
        }

        // Handle special commands
        if (trimmed.startsWith("/")) {
          const handled = await this.handleCommand(trimmed);
          if (!handled) {
            ask();
            return;
          }
        }

        if (
          trimmed.toLowerCase() === "exit" ||
          trimmed.toLowerCase() === "quit"
        ) {
          console.log("\n👋 Goodbye!\n");
          this.rl!.close();
          return;
        }

        // Execute task
        console.log("\n\x1b[33m🤔 Thinking...\x1b[0m");

        try {
          const result = await this.executeTask(trimmed);
          console.log(
            `\n\x1b[32m✅ Task completed!\x1b[0m Steps: ${result.steps_completed}/${result.total_steps}`,
          );
        } catch (error) {
          console.error(`\n\x1b[31m❌ Error:\x1b[0m ${error}`);
        }

        ask();
      });
    };

    ask();
  }

  private async handleCommand(command: string): Promise<boolean> {
    const parts = command.slice(1).split(" ");
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case "help":
        this.showHelp();
        return false;

      case "cd":
        const newDir = parts[1];
        if (newDir && fs.existsSync(newDir)) {
          this.setWorkingDirectory(path.resolve(newDir));
          console.log(
            `\n📁 Changed directory to: ${this.state.working_directory}`,
          );
        } else {
          console.log(`\n❌ Directory not found: ${newDir}`);
        }
        return false;

      case "status":
        console.log(`\n📊 Status: ${this.state.status}`);
        console.log(`📁 Working Directory: ${this.state.working_directory}`);
        console.log(`🤖 Model: ${this.config.model}`);
        return false;

      case "clear":
        this.conversationHistory = [
          { role: "system", content: DEVOPS_AI_SYSTEM_PROMPT },
        ];
        console.log("\n🧹 Conversation cleared");
        return false;

      case "plan":
        const task = parts.slice(1).join(" ");
        if (task) {
          console.log("\n📋 Planning task...");
          const plan = await this.planTask(task);
          console.log("\n📊 Task Analysis:");
          console.log(`Goal: ${plan.goal}`);
          console.log(`Complexity: ${plan.complexity}`);
          console.log(`Estimated iterations: ${plan.estimated_iterations}`);
          console.log("\nSteps:");
          plan.steps.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
          console.log(`\nTools needed: ${plan.tools_needed.join(", ")}`);
        } else {
          console.log("\nUsage: /plan <task description>");
        }
        return false;

      default:
        console.log(
          `\n❓ Unknown command: ${cmd}. Type /help for available commands.`,
        );
        return false;
    }
  }

  private showHelp(): void {
    console.log(`
\x1b[36m═════════════════════════════════════════════════════════════════════════════
                            📚 DevOps AI Help
═════════════════════════════════════════════════════════════════════════════\x1b[0m

\x1b[1mCommands:\x1b[0m
  /help              Show this help message
  /cd <path>         Change working directory
  /status            Show current status
  /clear             Clear conversation history
  /plan <task>       Plan a task without executing
  exit               Exit the CLI

\x1b[1mNatural Language:\x1b[0m
  Just describe what you want to do in plain English!
  
  Examples:
    \x1b[2m"Create a new React component called Button"\x1b[0m
    \x1b[2m"Fix the TypeScript error in src/index.ts"\x1b[0m
    \x1b[2m"Run the tests and fix any failures"\x1b[0m
    \x1b[2m"Take a screenshot of my desktop"\x1b[0m
    \x1b[2m"Open Chrome and navigate to github.com"\x1b[0m

\x1b[1mTips:\x1b[0m
  • Be specific about what you want
  • Provide file paths when relevant
  • The agent will ask for approval on risky operations
  • Use /plan to preview what the agent will do
`);
  }

  private async getAIResponse(): Promise<string> {
    try {
      const response = await callLLMWithFallback(
        {
          model: this.config.model,
          messages: this.conversationHistory,
          temperature: this.config.temperature,
          max_tokens: this.config.max_tokens,
        },
        "code-generation",
      );

      return response.content;
    } catch (error) {
      console.error("LLM Error:", error);
      return "I encountered an error. Please try again.";
    }
  }

  private extractToolUses(response: string): ToolUse[] {
    const toolUses: ToolUse[] = [];

    // Match XML-style tool invocations
    const toolPattern = /<(\w+)>([\s\S]*?)<\/\1>/g;
    let match;

    // Find all tool tags
    const toolTags: { name: string; content: string }[] = [];
    while ((match = toolPattern.exec(response)) !== null) {
      toolTags.push({
        name: match[1],
        content: match[2],
      });
    }

    // Group consecutive tags of the same tool
    let currentTool: string | null = null;
    let currentParams: Record<string, unknown> = {};

    for (const tag of toolTags) {
      if (this.state.capabilities.includes(tag.name as ToolName)) {
        if (currentTool && currentTool !== tag.name) {
          // Save previous tool
          toolUses.push({
            type: "tool_use",
            id: `tool-${uuidv4()}`,
            name: currentTool as ToolName,
            input: currentParams,
          });
          currentParams = {};
        }

        currentTool = tag.name;

        // Parse parameter from content
        const paramMatch = tag.content.match(/<(\w+)>([\s\S]*?)<\/\1>/);
        if (paramMatch) {
          currentParams[paramMatch[1]] = paramMatch[2].trim();
        } else {
          // Direct value (for simple tools)
          const lines = tag.content.trim().split("\n");
          for (const line of lines) {
            const paramLine = line.match(/<(\w+)>([\s\S]*?)<\/\1>/);
            if (paramLine) {
              currentParams[paramLine[1]] = paramLine[2].trim();
            } else if (line.includes(">") && line.includes("<")) {
              const simple = line.match(/<(\w+)>(.*?)<\/\1>/);
              if (simple) {
                currentParams[simple[1]] = simple[2].trim();
              }
            }
          }
        }
      }
    }

    // Save last tool
    if (currentTool && Object.keys(currentParams).length > 0) {
      toolUses.push({
        type: "tool_use",
        id: `tool-${uuidv4()}`,
        name: currentTool as ToolName,
        input: currentParams,
      });
    }

    return toolUses;
  }
}

// ============================================================================
// Singleton & Exports
// ============================================================================

export const devopsAIAgent = new DevOpsAIAgent();

export async function runDevOpsAI(task: string): Promise<ExecutionResult> {
  return devopsAIAgent.executeTask(task);
}

export async function planDevOpsAITask(task: string): Promise<TaskAnalysis> {
  return devopsAIAgent.planTask(task);
}

export default DevOpsAIAgent;

/**
 * Tool Executor - Executes tools and returns results
 * Implements all tool functionality for the DevOps AI agent
 */

import * as fs from "fs";
import * as path from "path";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as readline from "readline";

import {
  ToolName,
  ToolUse,
  ToolResult,
  ToolError,
  ExecuteCommandInput,
  ExecuteCommandOutput,
  ReadFileInput,
  ReadFileOutput,
  WriteFileInput,
  WriteFileOutput,
  ReplaceInFileInput,
  ReplaceInFileOutput,
  SearchFilesInput,
  SearchFilesOutput,
  ListFilesInput,
  ListFilesOutput,
  ApprovalRequest,
  ApprovalResponse,
  ApprovalHandler,
} from "./types";
import {
  validateToolInput,
  toolRequiresApproval,
  TOOL_DEFINITIONS,
} from "./definitions";

const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const accessAsync = promisify(fs.access);
const mkdirAsync = promisify(fs.mkdir);
const statAsync = promisify(fs.stat);
const readdirAsync = promisify(fs.readdir);

// ============================================================================
// Tool Executor Class
// ============================================================================

export class ToolExecutor {
  private workingDirectory: string;
  private approvalHandler: ApprovalHandler | null = null;
  private autoApprove: boolean = false;

  constructor(
    options: {
      workingDirectory?: string;
      approvalHandler?: ApprovalHandler;
      autoApprove?: boolean;
    } = {},
  ) {
    this.workingDirectory = options.workingDirectory || process.cwd();
    this.approvalHandler = options.approvalHandler || null;
    this.autoApprove = options.autoApprove || false;
  }

  /**
   * Set the working directory
   */
  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }

  /**
   * Set approval handler
   */
  setApprovalHandler(handler: ApprovalHandler): void {
    this.approvalHandler = handler;
  }

  /**
   * Execute a tool use
   */
  async execute(toolUse: ToolUse): Promise<ToolResult> {
    const { id, name, input } = toolUse;

    // Validate input
    const validation = validateToolInput(name, input);
    if (!validation.valid) {
      return {
        type: "tool_result",
        tool_use_id: id,
        content: `Invalid input: ${validation.errors.join(", ")}`,
        is_error: true,
      };
    }

    // Check if approval is needed
    if (toolRequiresApproval(name) && !this.autoApprove) {
      const approved = await this.requestApproval(name, input);
      if (!approved) {
        return {
          type: "tool_result",
          tool_use_id: id,
          content: "Tool use was not approved by user",
          is_error: true,
        };
      }
    }

    // Execute the tool
    try {
      let result: string;

      switch (name) {
        case "execute_command":
          result = await this.executeCommand(
            input as unknown as ExecuteCommandInput,
          );
          break;
        case "read_file":
          result = await this.readFile(input as unknown as ReadFileInput);
          break;
        case "write_to_file":
          result = await this.writeFile(input as unknown as WriteFileInput);
          break;
        case "replace_in_file":
          result = await this.replaceInFile(
            input as unknown as ReplaceInFileInput,
          );
          break;
        case "search_files":
          result = await this.searchFiles(input as unknown as SearchFilesInput);
          break;
        case "list_files":
          result = await this.listFiles(input as unknown as ListFilesInput);
          break;
        case "ask_followup_question":
          result = await this.askFollowupQuestion(input);
          break;
        case "attempt_completion":
          result = await this.attemptCompletion(input);
          break;
        case "browser_action":
          result = await this.browserAction(input);
          break;
        case "screen_capture":
          result = await this.screenCapture(input);
          break;
        case "app_control":
          result = await this.appControl(input);
          break;
        case "clipboard":
          result = await this.clipboard(input);
          break;
        case "web_search":
          result = await this.webSearch(input);
          break;
        case "web_fetch":
          result = await this.webFetch(input);
          break;
        default:
          result = `Tool ${name} not implemented yet`;
      }

      return {
        type: "tool_result",
        tool_use_id: id,
        content: result,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        type: "tool_result",
        tool_use_id: id,
        content: `Error: ${errorMessage}`,
        is_error: true,
      };
    }
  }

  /**
   * Request approval for a tool use
   */
  private async requestApproval(
    toolName: ToolName,
    input: Record<string, unknown>,
  ): Promise<boolean> {
    if (this.autoApprove) {
      return true;
    }

    if (this.approvalHandler) {
      const request: ApprovalRequest = {
        id: `approval-${Date.now()}`,
        tool_name: toolName,
        tool_input: input,
        reason: `Tool ${toolName} requires approval`,
        risk_level: this.assessRisk(toolName, input),
        timestamp: new Date(),
      };

      const response = await this.approvalHandler(request);
      return response.approved;
    }

    // Default: ask via CLI
    return this.cliApproval(toolName, input);
  }

  /**
   * CLI-based approval
   */
  private async cliApproval(
    toolName: ToolName,
    input: Record<string, unknown>,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const riskLevel = this.assessRisk(toolName, input);
      const riskColor = {
        low: "\x1b[32m",
        medium: "\x1b[33m",
        high: "\x1b[31m",
        critical: "\x1b[35m",
      }[riskLevel];

      console.log(
        `\n${riskColor}[Approval Required]${"\x1b[0m"} Tool: ${toolName}`,
      );
      console.log(`Risk Level: ${riskLevel}`);
      console.log(`Input: ${JSON.stringify(input, null, 2).slice(0, 200)}...`);

      rl.question("Approve? (y/n): ", (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
      });
    });
  }

  /**
   * Assess risk level of a tool use
   */
  private assessRisk(
    toolName: ToolName,
    input: Record<string, unknown>,
  ): "low" | "medium" | "high" | "critical" {
    // Critical risk operations
    if (toolName === "execute_command") {
      const cmd = (input.command as string).toLowerCase();
      if (
        cmd.includes("rm ") ||
        cmd.includes("del ") ||
        cmd.includes("format") ||
        cmd.includes("shutdown") ||
        cmd.includes("reboot")
      ) {
        return "critical";
      }
      if (
        cmd.includes("npm publish") ||
        cmd.includes("git push") ||
        cmd.includes("docker push")
      ) {
        return "high";
      }
      return "medium";
    }

    if (toolName === "write_to_file" || toolName === "replace_in_file") {
      const filePath = (input.path as string).toLowerCase();
      if (
        filePath.includes(".env") ||
        filePath.includes("config") ||
        filePath.includes("secret")
      ) {
        return "high";
      }
      return "medium";
    }

    if (toolName === "app_control") {
      if (input.action === "close") {
        return "high";
      }
      return "medium";
    }

    return "low";
  }

  // ==========================================================================
  // Tool Implementations
  // ==========================================================================

  /**
   * Execute a shell command
   */
  private async executeCommand(input: ExecuteCommandInput): Promise<string> {
    const { command, cwd, timeout = 60000, env } = input;
    const workingDir = cwd || this.workingDirectory;

    console.log(`[Executor] Running command: ${command}`);
    console.log(`[Executor] Working directory: ${workingDir}`);

    const startTime = Date.now();

    try {
      const mergedEnv = { ...process.env, ...env };

      const { stdout, stderr } = await execAsync(command, {
        cwd: workingDir,
        env: mergedEnv,
        timeout,
        maxBuffer: 1024 * 1024 * 10, // 10MB
      });

      const duration = Date.now() - startTime;
      const output: ExecuteCommandOutput = {
        stdout: stdout || "",
        stderr: stderr || "",
        exit_code: 0,
        duration,
        success: true,
      };

      return JSON.stringify(output, null, 2);
    } catch (error: any) {
      const duration = Date.now() - startTime;
      const output: ExecuteCommandOutput = {
        stdout: error.stdout || "",
        stderr: error.stderr || error.message,
        exit_code: error.code || 1,
        duration,
        success: false,
      };

      return JSON.stringify(output, null, 2);
    }
  }

  /**
   * Read a file
   */
  private async readFile(input: ReadFileInput): Promise<string> {
    const { path: filePath, start_line, end_line } = input;
    const absolutePath = this.resolvePath(filePath);

    try {
      await accessAsync(absolutePath, fs.constants.R_OK);
    } catch {
      const output: ReadFileOutput = {
        path: filePath,
        content: "",
        lines: 0,
        exists: false,
      };
      return JSON.stringify(output, null, 2);
    }

    const content = await readFileAsync(absolutePath, "utf-8");
    const lines = content.split("\n");

    let selectedContent = content;
    if (start_line !== undefined || end_line !== undefined) {
      const start = (start_line || 1) - 1;
      const end = end_line || lines.length;
      selectedContent = lines.slice(start, end).join("\n");
    }

    const output: ReadFileOutput = {
      path: filePath,
      content: selectedContent,
      lines: lines.length,
      exists: true,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Write to a file
   */
  private async writeFile(input: WriteFileInput): Promise<string> {
    const { path: filePath, content, create_dirs = true } = input;
    const absolutePath = this.resolvePath(filePath);

    // Check if file exists
    let exists = false;
    try {
      await accessAsync(absolutePath, fs.constants.F_OK);
      exists = true;
    } catch {
      // File doesn't exist
    }

    // Create directories if needed
    if (create_dirs) {
      const dir = path.dirname(absolutePath);
      await mkdirAsync(dir, { recursive: true });
    }

    // Write file
    await writeFileAsync(absolutePath, content, "utf-8");

    const output: WriteFileOutput = {
      path: filePath,
      bytes_written: Buffer.byteLength(content, "utf-8"),
      created: !exists,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Replace in file using SEARCH/REPLACE blocks
   */
  private async replaceInFile(input: ReplaceInFileInput): Promise<string> {
    const { path: filePath, diff } = input;
    const absolutePath = this.resolvePath(filePath);

    // Read current content
    let content = await readFileAsync(absolutePath, "utf-8");
    let replacements = 0;

    // Parse SEARCH/REPLACE blocks
    const blocks = this.parseDiffBlocks(diff);

    for (const block of blocks) {
      const { search, replace } = block;

      if (content.includes(search)) {
        content = content.replace(search, replace);
        replacements++;
      }
    }

    // Write back
    await writeFileAsync(absolutePath, content, "utf-8");

    const output: ReplaceInFileOutput = {
      path: filePath,
      replacements,
      success: replacements > 0,
      message:
        replacements > 0
          ? `Made ${replacements} replacement(s)`
          : "No matches found",
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Parse SEARCH/REPLACE blocks from diff string
   */
  private parseDiffBlocks(
    diff: string,
  ): Array<{ search: string; replace: string }> {
    const blocks: Array<{ search: string; replace: string }> = [];
    const lines = diff.split("\n");

    let inSearch = false;
    let inReplace = false;
    let searchLines: string[] = [];
    let replaceLines: string[] = [];

    for (const line of lines) {
      if (line.includes("------- SEARCH")) {
        inSearch = true;
        inReplace = false;
        searchLines = [];
        replaceLines = [];
      } else if (line.includes("=======")) {
        inSearch = false;
        inReplace = true;
      } else if (line.includes("+++++++ REPLACE")) {
        inSearch = false;
        inReplace = false;
        blocks.push({
          search: searchLines.join("\n"),
          replace: replaceLines.join("\n"),
        });
      } else if (inSearch) {
        searchLines.push(line);
      } else if (inReplace) {
        replaceLines.push(line);
      }
    }

    return blocks;
  }

  /**
   * Search files with regex
   */
  private async searchFiles(input: SearchFilesInput): Promise<string> {
    const { path: searchPath, regex, file_pattern, max_results = 100 } = input;
    const absolutePath = this.resolvePath(searchPath);
    const pattern = new RegExp(regex, "gm");

    const results: SearchFilesOutput["results"] = [];
    let filesSearched = 0;

    const searchDir = async (dir: string) => {
      const entries = await readdirAsync(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= max_results) break;

        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, etc.
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await searchDir(fullPath);
        } else if (entry.isFile()) {
          // Check file pattern
          if (file_pattern) {
            const patternRegex = new RegExp(
              file_pattern.replace(/\*/g, ".*").replace(/\?/g, "."),
            );
            if (!patternRegex.test(entry.name)) continue;
          }

          filesSearched++;

          try {
            const content = await readFileAsync(fullPath, "utf-8");
            const lines = content.split("\n");

            for (let i = 0; i < lines.length; i++) {
              if (results.length >= max_results) break;

              const match = pattern.exec(lines[i]);
              if (match) {
                results.push({
                  file: fullPath,
                  line: i + 1,
                  column: match.index + 1,
                  match: match[0],
                  context_before: lines.slice(Math.max(0, i - 2), i),
                  context_after: lines.slice(i + 1, i + 3),
                });
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    };

    await searchDir(absolutePath);

    const output: SearchFilesOutput = {
      results,
      total_matches: results.length,
      files_searched: filesSearched,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * List files in a directory
   */
  private async listFiles(input: ListFilesInput): Promise<string> {
    const { path: listPath, recursive = false, max_depth = 10 } = input;
    const absolutePath = this.resolvePath(listPath);

    const files: ListFilesOutput["files"] = [];
    let totalFiles = 0;
    let totalDirs = 0;

    const listDir = async (dir: string, depth: number) => {
      if (depth > max_depth) return;

      const entries = await readdirAsync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden files and common ignore patterns
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist"
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          totalDirs++;
          files.push({
            name: entry.name,
            path: fullPath,
            type: "directory",
          });

          if (recursive) {
            await listDir(fullPath, depth + 1);
          }
        } else if (entry.isFile()) {
          totalFiles++;
          const stats = await statAsync(fullPath);
          files.push({
            name: entry.name,
            path: fullPath,
            type: "file",
            size: stats.size,
            modified: stats.mtime,
            extension: path.extname(entry.name),
          });
        }
      }
    };

    await listDir(absolutePath, 0);

    const output: ListFilesOutput = {
      files,
      total_files: totalFiles,
      total_directories: totalDirs,
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * Ask followup question
   */
  private async askFollowupQuestion(
    input: Record<string, unknown>,
  ): Promise<string> {
    const { question, options } = input;

    return new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log(`\n❓ ${question}`);
      if (options && Array.isArray(options)) {
        options.forEach((opt, i) => console.log(`  ${i + 1}. ${opt}`));
      }

      rl.question("\nYour answer: ", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  /**
   * Attempt completion
   */
  private async attemptCompletion(
    input: Record<string, unknown>,
  ): Promise<string> {
    const { result, command } = input;

    let output = `✅ Task Completed!\n\n${result}`;

    if (command) {
      output += `\n\n💡 You can verify with: ${command}`;
    }

    return output;
  }

  /**
   * Browser action (placeholder - requires puppeteer/playwright)
   */
  private async browserAction(input: Record<string, unknown>): Promise<string> {
    const { action, url, selector, value } = input;

    // This is a placeholder - in production, integrate with puppeteer/playwright
    return JSON.stringify({
      success: false,
      error:
        "Browser automation requires puppeteer or playwright to be installed",
      action,
      url,
      selector,
      value,
    });
  }

  /**
   * Screen capture (placeholder - requires platform-specific tools)
   */
  private async screenCapture(input: Record<string, unknown>): Promise<string> {
    const { region, format = "png" } = input;

    // Try to use platform-specific screenshot tools
    try {
      if (process.platform === "win32") {
        // Windows: Use PowerShell or nircmd
        const screenshotPath = path.join(
          this.workingDirectory,
          `screenshot-${Date.now()}.${format}`,
        );
        await execAsync(
          `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bitmap = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Location, [System.Drawing.Point]::Empty, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Size); $bitmap.Save('${screenshotPath}');"`,
        );
        return JSON.stringify({
          success: true,
          path: screenshotPath,
          format,
        });
      } else if (process.platform === "darwin") {
        // macOS: Use screencapture
        const screenshotPath = path.join(
          this.workingDirectory,
          `screenshot-${Date.now()}.${format}`,
        );
        await execAsync(`screencapture -x "${screenshotPath}"`);
        return JSON.stringify({
          success: true,
          path: screenshotPath,
          format,
        });
      } else if (process.platform === "linux") {
        // Linux: Use scrot or gnome-screenshot
        const screenshotPath = path.join(
          this.workingDirectory,
          `screenshot-${Date.now()}.${format}`,
        );
        await execAsync(`scrot "${screenshotPath}"`);
        return JSON.stringify({
          success: true,
          path: screenshotPath,
          format,
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Screen capture failed. Ensure screenshot tools are installed.",
      });
    }

    return JSON.stringify({
      success: false,
      error: "Screen capture not supported on this platform",
    });
  }

  /**
   * App control
   */
  private async appControl(input: Record<string, unknown>): Promise<string> {
    const { action, app_name, app_path, args } = input;

    if (action === "launch") {
      const appToLaunch = app_path || app_name;
      if (!appToLaunch) {
        return JSON.stringify({
          success: false,
          error: "app_name or app_path required for launch action",
        });
      }

      try {
        const proc = spawn(appToLaunch as string, (args as string[]) || [], {
          detached: true,
          stdio: "ignore",
        });
        proc.unref();

        return JSON.stringify({
          success: true,
          pid: proc.pid,
        });
      } catch (error) {
        return JSON.stringify({
          success: false,
          error: `Failed to launch ${appToLaunch}: ${error}`,
        });
      }
    }

    // Other actions would require platform-specific window management
    return JSON.stringify({
      success: false,
      error: `Action '${action}' not yet implemented`,
    });
  }

  /**
   * Clipboard operations
   */
  private async clipboard(input: Record<string, unknown>): Promise<string> {
    const { action, content } = input;

    try {
      if (process.platform === "win32") {
        if (action === "get") {
          const { stdout } = await execAsync(
            "powershell -command Get-Clipboard",
          );
          return JSON.stringify({ success: true, content: stdout.trim() });
        } else if (action === "set") {
          await execAsync(
            `powershell -command Set-Clipboard -Value '${content}'`,
          );
          return JSON.stringify({ success: true });
        }
      } else if (process.platform === "darwin") {
        if (action === "get") {
          const { stdout } = await execAsync("pbpaste");
          return JSON.stringify({ success: true, content: stdout });
        } else if (action === "set") {
          await execAsync(`echo '${content}' | pbcopy`);
          return JSON.stringify({ success: true });
        }
      } else if (process.platform === "linux") {
        if (action === "get") {
          const { stdout } = await execAsync("xclip -selection clipboard -o");
          return JSON.stringify({ success: true, content: stdout });
        } else if (action === "set") {
          await execAsync(`echo '${content}' | xclip -selection clipboard`);
          return JSON.stringify({ success: true });
        }
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: "Clipboard operation failed",
      });
    }

    return JSON.stringify({
      success: false,
      error: `Action '${action}' not supported`,
    });
  }

  /**
   * Web search (placeholder - requires search API)
   */
  private async webSearch(input: Record<string, unknown>): Promise<string> {
    const { query, num_results = 5 } = input;

    // Placeholder - integrate with search API (Google, Bing, DuckDuckGo)
    return JSON.stringify({
      success: false,
      error: "Web search requires API integration",
      query,
      num_results,
    });
  }

  /**
   * Web fetch
   */
  private async webFetch(input: Record<string, unknown>): Promise<string> {
    const { url, selector } = input;

    try {
      // Use curl or fetch
      const { stdout } = await execAsync(`curl -s "${url}"`);
      return JSON.stringify({
        success: true,
        content: stdout.slice(0, 10000), // Limit content size
        url,
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        error: `Failed to fetch ${url}`,
      });
    }
  }

  /**
   * Resolve path relative to working directory
   */
  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.workingDirectory, filePath);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const toolExecutor = new ToolExecutor();

// ============================================================================
// Convenience Functions
// ============================================================================

export async function executeTool(toolUse: ToolUse): Promise<ToolResult> {
  return toolExecutor.execute(toolUse);
}

export default ToolExecutor;

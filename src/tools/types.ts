/**
 * Tool Types - Core type definitions for the DevOps AI tool system
 * Based on DevOps AI's tool architecture
 */

// ============================================================================
// Base Tool Types
// ============================================================================

export type ToolName =
  | "execute_command"
  | "read_file"
  | "write_to_file"
  | "replace_in_file"
  | "search_files"
  | "list_files"
  | "list_code_definition_names"
  | "ask_followup_question"
  | "attempt_completion"
  | "plan_mode_respond"
  | "new_task"
  | "web_search"
  | "web_fetch"
  | "browser_action"
  | "screen_capture"
  | "app_control"
  | "clipboard";

export interface ToolParameter {
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required?: boolean;
  enum?: string[];
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: Record<string, ToolParameter>;
  requiresApproval?: boolean;
}

export interface ToolUse {
  type: "tool_use";
  id: string;
  name: ToolName;
  input: Record<string, unknown>;
}

export interface ToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ============================================================================
// Execute Command Tool
// ============================================================================

export interface ExecuteCommandInput {
  command: string;
  requires_approval: boolean;
  cwd?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecuteCommandOutput {
  stdout: string;
  stderr: string;
  exit_code: number;
  duration: number;
  success: boolean;
}

// ============================================================================
// File Tools
// ============================================================================

export interface ReadFileInput {
  path: string;
  start_line?: number;
  end_line?: number;
}

export interface ReadFileOutput {
  path: string;
  content: string;
  lines: number;
  exists: boolean;
}

export interface WriteFileInput {
  path: string;
  content: string;
  create_dirs?: boolean;
}

export interface WriteFileOutput {
  path: string;
  bytes_written: number;
  created: boolean;
}

export interface ReplaceInFileInput {
  path: string;
  diff: string; // SEARCH/REPLACE blocks
}

export interface ReplaceInFileOutput {
  path: string;
  replacements: number;
  success: boolean;
  message?: string;
}

export interface SearchFilesInput {
  path: string;
  regex: string;
  file_pattern?: string;
  max_results?: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context_before: string[];
  context_after: string[];
}

export interface SearchFilesOutput {
  results: SearchResult[];
  total_matches: number;
  files_searched: number;
}

export interface ListFilesInput {
  path: string;
  recursive?: boolean;
  max_depth?: number;
}

export interface FileInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: Date;
  extension?: string;
}

export interface ListFilesOutput {
  files: FileInfo[];
  total_files: number;
  total_directories: number;
}

// ============================================================================
// Desktop Automation Tools
// ============================================================================

export interface BrowserActionInput {
  action:
    | "navigate"
    | "click"
    | "type"
    | "screenshot"
    | "scroll"
    | "wait"
    | "extract";
  selector?: string;
  value?: string;
  url?: string;
  timeout?: number;
}

export interface BrowserActionOutput {
  success: boolean;
  data?: unknown;
  screenshot?: string; // Base64
  error?: string;
}

export interface ScreenCaptureInput {
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  format?: "png" | "jpg";
}

export interface ScreenCaptureOutput {
  image: string; // Base64
  width: number;
  height: number;
  format: string;
}

export interface AppControlInput {
  action: "launch" | "close" | "focus" | "minimize" | "maximize";
  app_name?: string;
  app_path?: string;
  args?: string[];
}

export interface AppControlOutput {
  success: boolean;
  pid?: number;
  error?: string;
}

export interface ClipboardInput {
  action: "copy" | "paste" | "get" | "set";
  content?: string;
}

export interface ClipboardOutput {
  success: boolean;
  content?: string;
  error?: string;
}

// ============================================================================
// Task Management
// ============================================================================

export interface TaskStep {
  id: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  tool_uses?: ToolUse[];
  results?: ToolResult[];
  error?: string;
  started_at?: Date;
  completed_at?: Date;
}

export interface TaskPlan {
  id: string;
  goal: string;
  steps: TaskStep[];
  context: string;
  created_at: Date;
  updated_at: Date;
}

export interface TaskProgress {
  current_step: number;
  total_steps: number;
  completed_steps: number;
  failed_steps: number;
  status: "planning" | "executing" | "completed" | "failed" | "paused";
  message: string;
}

// ============================================================================
// Agent Types
// ============================================================================

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_uses?: ToolUse[];
  tool_results?: ToolResult[];
  timestamp: Date;
}

export interface AgentState {
  status: "idle" | "thinking" | "executing" | "waiting" | "completed" | "error";
  current_task?: TaskPlan;
  conversation_history: AgentMessage[];
  working_directory: string;
  environment: Record<string, string>;
  capabilities: ToolName[];
}

export interface AgentConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  max_iterations: number;
  require_approval: boolean;
  auto_execute: boolean;
  working_directory: string;
  environment?: Record<string, string>;
}

// ============================================================================
// Approval System
// ============================================================================

export interface ApprovalRequest {
  id: string;
  tool_name: ToolName;
  tool_input: Record<string, unknown>;
  reason: string;
  risk_level: "low" | "medium" | "high" | "critical";
  timestamp: Date;
}

export interface ApprovalResponse {
  id: string;
  approved: boolean;
  modified_input?: Record<string, unknown>;
  feedback?: string;
}

export type ApprovalHandler = (
  request: ApprovalRequest,
) => Promise<ApprovalResponse>;

// ============================================================================
// Error Types
// ============================================================================

export class ToolError extends Error {
  constructor(
    public tool_name: ToolName,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ToolError";
  }
}

export class ApprovalDeniedError extends Error {
  constructor(
    public request: ApprovalRequest,
    public response: ApprovalResponse,
  ) {
    super(`Tool use denied: ${response.feedback || "User denied approval"}`);
    this.name = "ApprovalDeniedError";
  }
}

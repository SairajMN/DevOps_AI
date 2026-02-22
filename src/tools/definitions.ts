/**
 * Tool Definitions - Defines all available tools for the DevOps AI agent
 * Each tool has a name, description, and parameter schema
 */

import { ToolDefinition, ToolName } from "./types";

// ============================================================================
// Tool Definitions
// ============================================================================

export const TOOL_DEFINITIONS: Record<ToolName, ToolDefinition> = {
  // ==========================================================================
  // Command Execution
  // ==========================================================================
  execute_command: {
    name: "execute_command",
    description: `Execute a terminal command in the specified directory.
    
Key features:
- Runs shell commands with configurable timeout
- Captures stdout, stderr, and exit code
- Supports custom environment variables
- Can run in any working directory

Use for:
- Running build commands (npm run build, pip install)
- Git operations (git status, git commit)
- Running tests
- Any CLI operations

IMPORTANT: Set requires_approval to true for potentially dangerous commands
like file deletion, system modifications, or network operations.`,
    parameters: {
      command: {
        type: "string",
        description: "The command to execute",
        required: true,
      },
      requires_approval: {
        type: "boolean",
        description:
          "Whether this command requires user approval before execution",
        required: true,
      },
      cwd: {
        type: "string",
        description:
          "Working directory for the command (defaults to current directory)",
        required: false,
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 60000)",
        required: false,
      },
      env: {
        type: "object",
        description: "Additional environment variables",
        required: false,
      },
    },
    requiresApproval: true,
  },

  // ==========================================================================
  // File Operations
  // ==========================================================================
  read_file: {
    name: "read_file",
    description: `Read the contents of a file from the local filesystem.

Features:
- Reads entire file or specific line ranges
- Returns content with line numbers
- Handles various encodings
- Reports file metadata (size, existence)

Use for:
- Examining source code
- Reading configuration files
- Viewing logs
- Understanding existing implementations`,
    parameters: {
      path: {
        type: "string",
        description: "The path to the file to read (relative or absolute)",
        required: true,
      },
      start_line: {
        type: "number",
        description: "Starting line number (1-indexed, optional)",
        required: false,
      },
      end_line: {
        type: "number",
        description: "Ending line number (1-indexed, optional)",
        required: false,
      },
    },
    requiresApproval: false,
  },

  write_to_file: {
    name: "write_to_file",
    description: `Write content to a file, creating it if it doesn't exist or overwriting if it does.

Features:
- Creates parent directories if needed
- Atomic write operation
- Reports bytes written
- Can create new files or completely replace existing ones

Use for:
- Creating new files
- Generating boilerplate code
- Writing configuration files
- Creating entire components or modules

IMPORTANT: This overwrites the entire file. For targeted edits, use replace_in_file.`,
    parameters: {
      path: {
        type: "string",
        description: "The path where the file should be written",
        required: true,
      },
      content: {
        type: "string",
        description: "The complete content to write to the file",
        required: true,
      },
      create_dirs: {
        type: "boolean",
        description: "Whether to create parent directories if they don't exist",
        required: false,
      },
    },
    requiresApproval: true,
  },

  replace_in_file: {
    name: "replace_in_file",
    description: `Make targeted edits to specific parts of a file without overwriting the entire file.

Features:
- Uses SEARCH/REPLACE blocks for precise edits
- Multiple edits can be made in a single call
- Preserves the rest of the file unchanged
- More efficient for small changes

SEARCH/REPLACE Block Format:
\`\`\`
------- SEARCH
[exact content to find]
=======
[new content to replace with]
+++++++ REPLACE
\`\`\`

Use for:
- Updating function implementations
- Changing variable names
- Modifying specific sections
- Small, localized changes

IMPORTANT: SEARCH blocks must contain exact, complete lines from the file.`,
    parameters: {
      path: {
        type: "string",
        description: "The path to the file to edit",
        required: true,
      },
      diff: {
        type: "string",
        description: "One or more SEARCH/REPLACE blocks for the edits",
        required: true,
      },
    },
    requiresApproval: true,
  },

  search_files: {
    name: "search_files",
    description: `Perform a regex search across files in a directory.

Features:
- Regex pattern matching
- File pattern filtering (e.g., "*.ts", "*.py")
- Returns context around matches
- Configurable result limit

Use for:
- Finding specific code patterns
- Locating function definitions
- Searching for error messages
- Understanding code relationships`,
    parameters: {
      path: {
        type: "string",
        description: "The directory to search in",
        required: true,
      },
      regex: {
        type: "string",
        description: "The regex pattern to search for",
        required: true,
      },
      file_pattern: {
        type: "string",
        description: "Glob pattern to filter files (e.g., '*.ts', '*.py')",
        required: false,
      },
      max_results: {
        type: "number",
        description: "Maximum number of results to return (default: 100)",
        required: false,
      },
    },
    requiresApproval: false,
  },

  list_files: {
    name: "list_files",
    description: `List the contents of a directory.

Features:
- Recursive or flat listing
- Returns file metadata (size, type, modified date)
- Configurable depth limit
- Identifies file types by extension

Use for:
- Exploring project structure
- Finding specific files
- Understanding directory organization
- Locating resources`,
    parameters: {
      path: {
        type: "string",
        description: "The directory path to list",
        required: true,
      },
      recursive: {
        type: "boolean",
        description: "Whether to list recursively",
        required: false,
      },
      max_depth: {
        type: "number",
        description: "Maximum recursion depth",
        required: false,
      },
    },
    requiresApproval: false,
  },

  list_code_definition_names: {
    name: "list_code_definition_names",
    description: `Get an overview of source code definitions (functions, classes, variables) in a file or directory.

Features:
- Extracts function names
- Extracts class names
- Extracts variable definitions
- Shows code structure at a glance

Use for:
- Understanding code organization
- Finding specific implementations
- Navigating large codebases
- Quick code overview`,
    parameters: {
      path: {
        type: "string",
        description: "The file or directory to analyze",
        required: true,
      },
    },
    requiresApproval: false,
  },

  // ==========================================================================
  // Interaction Tools
  // ==========================================================================
  ask_followup_question: {
    name: "ask_followup_question",
    description: `Ask the user a follow-up question when more information is needed.

Use when:
- Task requirements are unclear
- Multiple approaches are possible
- User preference is needed
- Critical decision points

The question should be:
- Clear and specific
- Provide relevant context
- Offer options when appropriate`,
    parameters: {
      question: {
        type: "string",
        description: "The question to ask the user",
        required: true,
      },
      options: {
        type: "array",
        description: "Optional list of choices for the user",
        items: {
          type: "string",
          description: "A choice option",
        },
        required: false,
      },
    },
    requiresApproval: false,
  },

  attempt_completion: {
    name: "attempt_completion",
    description: `Present the final result to the user when the task is complete.

Use when:
- All task objectives have been met
- No further steps are needed
- Ready to deliver the result

The result should:
- Summarize what was accomplished
- Highlight key changes or outputs
- Provide any relevant next steps or usage instructions`,
    parameters: {
      result: {
        type: "string",
        description: "The final result description",
        required: true,
      },
      command: {
        type: "string",
        description: "Optional command to demonstrate the result",
        required: false,
      },
    },
    requiresApproval: false,
  },

  plan_mode_respond: {
    name: "plan_mode_respond",
    description: `Respond to the user in plan mode with a detailed plan for accomplishing the task.

Use in PLAN MODE to:
- Present the proposed approach
- Outline steps and milestones
- Discuss trade-offs
- Get user approval before implementation`,
    parameters: {
      response: {
        type: "string",
        description: "The plan response to present to the user",
        required: true,
      },
      needs_more_exploration: {
        type: "boolean",
        description:
          "Whether more exploration is needed before finalizing the plan",
        required: false,
      },
    },
    requiresApproval: false,
  },

  new_task: {
    name: "new_task",
    description: `Create a new task with preloaded context.

Use when:
- Starting a new independent task
- Need to switch context completely
- Current task spawns a separate task`,
    parameters: {
      context: {
        type: "string",
        description: "Context to preload the new task with",
        required: true,
      },
    },
    requiresApproval: false,
  },

  // ==========================================================================
  // Web Tools
  // ==========================================================================
  web_search: {
    name: "web_search",
    description: `Search the web for current information.

Use for:
- Finding latest documentation
- Looking up current best practices
- Finding solutions to specific problems
- Getting up-to-date information`,
    parameters: {
      query: {
        type: "string",
        description: "The search query",
        required: true,
      },
      num_results: {
        type: "number",
        description: "Number of results to return (default: 5)",
        required: false,
      },
    },
    requiresApproval: false,
  },

  web_fetch: {
    name: "web_fetch",
    description: `Fetch and extract content from a web URL.

Use for:
- Reading documentation pages
- Fetching API references
- Getting content from URLs found in search results`,
    parameters: {
      url: {
        type: "string",
        description: "The URL to fetch",
        required: true,
      },
      selector: {
        type: "string",
        description: "Optional CSS selector to extract specific content",
        required: false,
      },
    },
    requiresApproval: false,
  },

  // ==========================================================================
  // Desktop Automation Tools
  // ==========================================================================
  browser_action: {
    name: "browser_action",
    description: `Control a web browser for automation tasks.

Actions:
- navigate: Go to a URL
- click: Click an element by selector
- type: Type text into an element
- screenshot: Capture the current page
- scroll: Scroll the page
- wait: Wait for an element or timeout
- extract: Extract data from the page

Use for:
- Web testing
- Form filling
- Data scraping
- Screenshot capture
- Browser automation`,
    parameters: {
      action: {
        type: "string",
        description: "The browser action to perform",
        enum: [
          "navigate",
          "click",
          "type",
          "screenshot",
          "scroll",
          "wait",
          "extract",
        ],
        required: true,
      },
      selector: {
        type: "string",
        description: "CSS selector for the target element",
        required: false,
      },
      value: {
        type: "string",
        description: "Value for type action or scroll direction",
        required: false,
      },
      url: {
        type: "string",
        description: "URL for navigate action",
        required: false,
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds",
        required: false,
      },
    },
    requiresApproval: true,
  },

  screen_capture: {
    name: "screen_capture",
    description: `Capture a screenshot of the screen or a region.

Features:
- Full screen capture
- Region-specific capture
- Multiple output formats
- Returns base64 encoded image

Use for:
- Visual verification
- Documentation
- Debugging UI issues
- Recording state`,
    parameters: {
      region: {
        type: "object",
        description: "Optional region to capture (x, y, width, height)",
        properties: {
          x: { type: "number", description: "X coordinate" },
          y: { type: "number", description: "Y coordinate" },
          width: { type: "number", description: "Width of region" },
          height: { type: "number", description: "Height of region" },
        },
        required: false,
      },
      format: {
        type: "string",
        description: "Output format (png or jpg)",
        enum: ["png", "jpg"],
        required: false,
      },
    },
    requiresApproval: true,
  },

  app_control: {
    name: "app_control",
    description: `Control desktop applications.

Actions:
- launch: Start an application
- close: Close an application
- focus: Bring an application to front
- minimize: Minimize an application
- maximize: Maximize an application

Use for:
- Opening applications
- Managing windows
- Application automation`,
    parameters: {
      action: {
        type: "string",
        description: "The application control action",
        enum: ["launch", "close", "focus", "minimize", "maximize"],
        required: true,
      },
      app_name: {
        type: "string",
        description: "Name of the application",
        required: false,
      },
      app_path: {
        type: "string",
        description: "Path to the application executable",
        required: false,
      },
      args: {
        type: "array",
        description: "Command line arguments",
        items: { type: "string", description: "A command line argument" },
        required: false,
      },
    },
    requiresApproval: true,
  },

  clipboard: {
    name: "clipboard",
    description: `Interact with the system clipboard.

Actions:
- get: Get current clipboard content
- set: Set clipboard content
- copy: Simulate copy (Ctrl+C)
- paste: Simulate paste (Ctrl+V)

Use for:
- Copying/pasting text
- Transferring data between applications
- Clipboard automation`,
    parameters: {
      action: {
        type: "string",
        description: "The clipboard action",
        enum: ["copy", "paste", "get", "set"],
        required: true,
      },
      content: {
        type: "string",
        description: "Content to set for 'set' action",
        required: false,
      },
    },
    requiresApproval: false,
  },
};

// ============================================================================
// Tool Categories
// ============================================================================

export const TOOL_CATEGORIES = {
  file_operations: [
    "read_file",
    "write_to_file",
    "replace_in_file",
    "list_files",
    "search_files",
    "list_code_definition_names",
  ] as ToolName[],
  command_execution: ["execute_command"] as ToolName[],
  interaction: [
    "ask_followup_question",
    "attempt_completion",
    "plan_mode_respond",
    "new_task",
  ] as ToolName[],
  web: ["web_search", "web_fetch"] as ToolName[],
  desktop_automation: [
    "browser_action",
    "screen_capture",
    "app_control",
    "clipboard",
  ] as ToolName[],
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all tool definitions as an array
 */
export function getAllTools(): ToolDefinition[] {
  return Object.values(TOOL_DEFINITIONS);
}

/**
 * Get tool definitions for a specific category
 */
export function getToolsByCategory(
  category: keyof typeof TOOL_CATEGORIES,
): ToolDefinition[] {
  return TOOL_CATEGORIES[category].map((name) => TOOL_DEFINITIONS[name]);
}

/**
 * Check if a tool requires approval
 */
export function toolRequiresApproval(toolName: ToolName): boolean {
  return TOOL_DEFINITIONS[toolName]?.requiresApproval ?? false;
}

/**
 * Get tool definition by name
 */
export function getToolDefinition(
  toolName: ToolName,
): ToolDefinition | undefined {
  return TOOL_DEFINITIONS[toolName];
}

/**
 * Validate tool input against definition
 */
export function validateToolInput(
  toolName: ToolName,
  input: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const definition = TOOL_DEFINITIONS[toolName];
  if (!definition) {
    return { valid: false, errors: [`Unknown tool: ${toolName}`] };
  }

  const errors: string[] = [];

  for (const [paramName, paramDef] of Object.entries(definition.parameters)) {
    if (paramDef.required && !(paramName in input)) {
      errors.push(`Missing required parameter: ${paramName}`);
    }

    if (paramName in input) {
      const value = input[paramName];
      const expectedType = paramDef.type;

      if (expectedType === "string" && typeof value !== "string") {
        errors.push(`Parameter ${paramName} must be a string`);
      } else if (expectedType === "number" && typeof value !== "number") {
        errors.push(`Parameter ${paramName} must be a number`);
      } else if (expectedType === "boolean" && typeof value !== "boolean") {
        errors.push(`Parameter ${paramName} must be a boolean`);
      } else if (expectedType === "array" && !Array.isArray(value)) {
        errors.push(`Parameter ${paramName} must be an array`);
      } else if (
        expectedType === "object" &&
        (typeof value !== "object" || Array.isArray(value))
      ) {
        errors.push(`Parameter ${paramName} must be an object`);
      }

      if (paramDef.enum && !paramDef.enum.includes(value as string)) {
        errors.push(
          `Parameter ${paramName} must be one of: ${paramDef.enum.join(", ")}`,
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export default TOOL_DEFINITIONS;

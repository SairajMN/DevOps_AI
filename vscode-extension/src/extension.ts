/**
 * DevOps AI - VS Code Chat Provider
 * Chat sidebar with DevOps automation
 */

import * as vscode from "vscode";
import axios from "axios";
import { DevOpsAIChatProvider } from "./chatProvider";

// ============================================================================
// Extension Activation
// ============================================================================

export function activate(context: vscode.ExtensionContext) {
  console.log("DevOps AI extension is now active!");

  // Register Chat View Provider
  const chatProvider = new DevOpsAIChatProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      DevOpsAIChatProvider.viewType,
      chatProvider,
    ),
  );

  // Register Commands
  registerCommands(context);

  // Show welcome message
  vscode.window.showInformationMessage(
    "🤖 DevOps AI is ready! Open the sidebar to start chatting.",
  );
}

// ============================================================================
// Command Registration
// ============================================================================

function registerCommands(context: vscode.ExtensionContext) {
  // Open Project Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.openProject", async () => {
      const folderUri = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Open Project",
      });

      if (folderUri && folderUri[0]) {
        vscode.commands.executeCommand("vscode.openFolder", folderUri[0]);
      }
    }),
  );

  // Run Tests Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.runTests", async () => {
      await executeInTerminal("npm test", "Run Tests");
    }),
  );

  // Build Project Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.buildProject", async () => {
      await executeInTerminal("npm run build", "Build");
    }),
  );

  // Install Dependencies Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.installDeps", async () => {
      await executeInTerminal("npm install", "Install Dependencies");
    }),
  );

  // Analyze Current File Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.analyzeFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active file");
        return;
      }

      const content = editor.document.getText();
      const serverUrl = vscode.workspace
        .getConfiguration("devops-ai")
        .get("serverUrl", "http://localhost:3000");

      try {
        const response = await axios.post(`${serverUrl}/api/analyze`, {
          log: content,
          preferAccomplishAI: true,
        });

        const analysis = response.data.analysis;
        if (analysis) {
          const panel = vscode.window.createWebviewPanel(
            "devopsAi.analysis",
            "DevOps AI Analysis",
            vscode.ViewColumn.Beside,
            {},
          );

          panel.webview.html = getAnalysisHtml(analysis);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
      }
    }),
  );

  // Fix Code Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.fixCode", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active file");
        return;
      }

      const code = editor.document.getText();
      const errorMessage = await vscode.window.showInputBox({
        prompt: "Enter the error message or description",
        placeHolder: "e.g., TypeError: Cannot read property of undefined",
      });

      if (!errorMessage) {
        return;
      }

      const serverUrl = vscode.workspace
        .getConfiguration("devops-ai")
        .get("serverUrl", "http://localhost:3000");

      try {
        vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "DevOps AI: Generating fix...",
            cancellable: false,
          },
          async () => {
            const response = await axios.post(`${serverUrl}/api/fix`, {
              code,
              errorMessage,
              language: editor.document.languageId,
            });

            const fix = response.data.fix;
            if (fix) {
              const apply = await vscode.window.showInformationMessage(
                "Fix generated! Apply to editor?",
                "Apply",
                "Copy to Clipboard",
                "View",
              );

              if (apply === "Apply") {
                editor.edit((editBuilder) => {
                  const fullRange = new vscode.Range(
                    editor.document.positionAt(0),
                    editor.document.positionAt(code.length),
                  );
                  editBuilder.replace(fullRange, fix.fixed_code);
                });
                vscode.window.showInformationMessage("Fix applied!");
              } else if (apply === "Copy to Clipboard") {
                vscode.env.clipboard.writeText(fix.fixed_code);
                vscode.window.showInformationMessage(
                  "Fix copied to clipboard!",
                );
              } else if (apply === "View") {
                const panel = vscode.window.createWebviewPanel(
                  "devopsAi.fix",
                  "DevOps AI Fix",
                  vscode.ViewColumn.Beside,
                  {},
                );
                panel.webview.html = getFixHtml(fix);
              }
            }
          },
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Fix generation failed: ${error}`);
      }
    }),
  );

  // Quick Chat Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.quickChat", async () => {
      const input = await vscode.window.showInputBox({
        prompt: "Ask DevOps AI",
        placeHolder: 'e.g., "run my tests", "fix this error", "analyze logs"',
      });

      if (input) {
        // This will be handled by the chat provider
        vscode.commands.executeCommand("workbench.view.extension.devopsAi");
      }
    }),
  );

  // Status Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.status", async () => {
      const serverUrl = vscode.workspace
        .getConfiguration("devops-ai")
        .get("serverUrl", "http://localhost:3000");

      try {
        const response = await axios.get(`${serverUrl}/api/health`);
        const health = response.data;

        vscode.window.showInformationMessage(
          `DevOps AI Status: ${health.status} | OpenRouter: ${health.checks.openrouter ? "✅" : "❌"}`,
        );
      } catch {
        vscode.window.showErrorMessage(
          "DevOps AI server is not running. Start it with: npm run dev",
        );
      }
    }),
  );

  // Start Server Command
  context.subscriptions.push(
    vscode.commands.registerCommand("devops-ai.startServer", async () => {
      const terminal = vscode.window.createTerminal("DevOps AI Server");
      terminal.sendText("npm run dev");
      terminal.show();
      vscode.window.showInformationMessage("DevOps AI server starting...");
    }),
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

async function executeInTerminal(command: string, name: string) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }

  const terminal = vscode.window.createTerminal(`DevOps AI: ${name}`);
  terminal.sendText(command);
  terminal.show();
}

function getAnalysisHtml(analysis: any): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DevOps AI Analysis</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        .header { color: #007acc; font-size: 24px; margin-bottom: 20px; }
        .section { margin-bottom: 16px; }
        .label { font-weight: bold; color: #666; }
        .value { margin-top: 4px; }
        .error-type { color: #d32f2f; font-size: 18px; }
        .confidence { color: #388e3c; }
        .fix { background: #e8f5e9; padding: 12px; border-radius: 8px; }
        pre { background: #f5f5f5; padding: 12px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1 class="header">📊 Analysis Results</h1>
    
    <div class="section">
        <div class="label">Error Type</div>
        <div class="value error-type">${analysis.error_type || "Unknown"}</div>
    </div>
    
    <div class="section">
        <div class="label">Category</div>
        <div class="value">${analysis.error_category || "Unknown"}</div>
    </div>
    
    <div class="section">
        <div class="label">Confidence</div>
        <div class="value confidence">${analysis.confidence || 0}%</div>
    </div>
    
    <div class="section">
        <div class="label">Severity</div>
        <div class="value">${analysis.severity || "Unknown"}</div>
    </div>
    
    <div class="section">
        <div class="label">Root Cause</div>
        <div class="value">${analysis.root_cause || "Could not determine"}</div>
    </div>
    
    <div class="section">
        <div class="label">Suggested Fix</div>
        <div class="value fix">${analysis.suggested_fix || "No suggestion available"}</div>
    </div>
    
    ${
      analysis.step_by_step_fix?.length
        ? `
    <div class="section">
        <div class="label">Step-by-Step Fix</div>
        <ol>
            ${analysis.step_by_step_fix.map((s: string) => `<li>${s}</li>`).join("")}
        </ol>
    </div>
    `
        : ""
    }
</body>
</html>`;
}

function getFixHtml(fix: any): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DevOps AI Fix</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
        .header { color: #007acc; font-size: 24px; margin-bottom: 20px; }
        .section { margin-bottom: 16px; }
        .label { font-weight: bold; color: #666; }
        .value { margin-top: 4px; }
        pre { background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1 class="header">🔧 Generated Fix</h1>
    
    <div class="section">
        <div class="label">Description</div>
        <div class="value">${fix.fix_description || ""}</div>
    </div>
    
    <div class="section">
        <div class="label">Explanation</div>
        <div class="value">${fix.explanation || ""}</div>
    </div>
    
    ${
      fix.changes_made?.length
        ? `
    <div class="section">
        <div class="label">Changes Made</div>
        <ul>
            ${fix.changes_made.map((c: string) => `<li>${c}</li>`).join("")}
        </ul>
    </div>
    `
        : ""
    }
    
    <div class="section">
        <div class="label">Fixed Code</div>
        <pre><code>${fix.fixed_code || ""}</code></pre>
    </div>
</body>
</html>`;
}

// ============================================================================
// Deactivation
// ============================================================================

export function deactivate() {
  console.log("DevOps AI extension deactivated");
}

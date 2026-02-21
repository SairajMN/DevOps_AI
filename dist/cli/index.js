#!/usr/bin/env node
"use strict";
/**
 * DevOps AI CLI - Command Line Interface
 * Analyze logs, fix code, and manage incidents from terminal
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const accomplishAgent_1 = require("../agent/accomplishAgent");
const models_1 = require("../ai/models");
// Load environment
dotenv.config();
const program = new commander_1.Command();
// Colors for terminal
const colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m"
};
function colorLog(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}
function printBanner() {
    console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════╗
║              ${colors.bold}DevOps AI - Log Intelligence CLI${colors.reset}${colors.cyan}              ║
║                    Powered by Accomplish AI                    ║
╚══════════════════════════════════════════════════════════════╝${colors.reset}
`);
}
// ============================================================================
// CLI Commands
// ============================================================================
program
    .name("devops-ai")
    .description("Universal DevOps Log Intelligence & Auto-Triage System")
    .version("1.0.0");
// Analyze command
program
    .command("analyze <file>")
    .description("Analyze a log file for errors and suggest fixes")
    .option("-m, --model <model>", "AI model to use", "deepseek-r1")
    .option("-e, --enhanced", "Use enhanced reasoning prompt", false)
    .option("-j, --json", "Output as JSON", false)
    .option("-v, --verbose", "Verbose output", false)
    .action(async (file, options) => {
    printBanner();
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
        colorLog(`❌ Error: File not found: ${filePath}`, colors.red);
        process.exit(1);
    }
    const logContent = fs.readFileSync(filePath, "utf-8");
    colorLog(`\n📄 Analyzing: ${filePath}`, colors.blue);
    colorLog(`🤖 Model: ${options.model}`, colors.blue);
    colorLog(`⚡ Enhanced: ${options.enhanced ? "Yes" : "No"}\n`, colors.blue);
    const spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let spinnerIndex = 0;
    const spinnerInterval = setInterval(() => {
        process.stdout.write(`\r${colors.cyan}${spinner[spinnerIndex]} Analyzing...${colors.reset}`);
        spinnerIndex = (spinnerIndex + 1) % spinner.length;
    }, 100);
    try {
        const result = await (0, accomplishAgent_1.runLogWorkflow)(logContent, {
            modelId: models_1.AI_MODELS.find(m => m.id === options.model)?.model,
            useEnhancedPrompt: options.enhanced,
            preferAccomplishAI: true
        });
        clearInterval(spinnerInterval);
        process.stdout.write("\r");
        if (result.success && result.data) {
            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                colorLog("\n✅ Analysis Complete!", colors.green);
                colorLog(`   Source: ${result.source}`, colors.cyan);
                colorLog(`   Duration: ${result.duration}ms\n`, colors.cyan);
                colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", colors.yellow);
                colorLog("📊 ANALYSIS RESULTS", colors.bold + colors.yellow);
                colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", colors.yellow);
                colorLog(`🔍 Error Type: ${result.data.error_type}`, colors.red);
                colorLog(`📁 Category: ${result.data.error_category}`, colors.magenta);
                colorLog(`📈 Confidence: ${result.data.confidence}%`, colors.green);
                colorLog(`⚠️  Severity: ${result.data.severity}\n`, colors.yellow);
                colorLog("📝 Root Cause:", colors.cyan);
                console.log(`   ${result.data.root_cause}\n`);
                colorLog("💡 Suggested Fix:", colors.green);
                console.log(`   ${result.data.suggested_fix}\n`);
                if (result.data.step_by_step_fix && result.data.step_by_step_fix.length > 0) {
                    colorLog("📋 Step-by-Step Fix:", colors.blue);
                    result.data.step_by_step_fix.forEach((step, i) => {
                        console.log(`   ${i + 1}. ${step}`);
                    });
                    console.log();
                }
                if (result.data.affected_files && result.data.affected_files.length > 0) {
                    colorLog("📁 Affected Files:", colors.magenta);
                    result.data.affected_files.forEach(f => {
                        console.log(`   - ${f}`);
                    });
                    console.log();
                }
                // Issue flags
                colorLog("🏷️  Issue Flags:", colors.cyan);
                console.log(`   Environment Issue: ${result.data.is_environment_issue ? "✅" : "❌"}`);
                console.log(`   Dependency Issue: ${result.data.is_dependency_issue ? "✅" : "❌"}`);
                console.log(`   Code Issue: ${result.data.is_code_issue ? "✅" : "❌"}`);
                console.log(`   Configuration Issue: ${result.data.is_configuration_issue ? "✅" : "❌"}`);
            }
        }
        else {
            colorLog(`\n❌ Analysis failed: ${result.error}`, colors.red);
            process.exit(1);
        }
    }
    catch (error) {
        clearInterval(spinnerInterval);
        colorLog(`\n❌ Error: ${error}`, colors.red);
        process.exit(1);
    }
});
// Fix command
program
    .command("fix <file>")
    .description("Generate a fix for code with errors")
    .option("-e, --error <message>", "Error message", "")
    .option("-l, --language <lang>", "Programming language", "python")
    .option("-m, --model <model>", "AI model to use", "deepseek-v3")
    .action(async (file, options) => {
    printBanner();
    const filePath = path.resolve(file);
    if (!fs.existsSync(filePath)) {
        colorLog(`❌ Error: File not found: ${filePath}`, colors.red);
        process.exit(1);
    }
    const code = fs.readFileSync(filePath, "utf-8");
    colorLog(`\n🔧 Fixing: ${filePath}`, colors.blue);
    colorLog(`📝 Language: ${options.language}`, colors.blue);
    colorLog(`🤖 Model: ${options.model}\n`, colors.blue);
    try {
        const result = await (0, accomplishAgent_1.runCodeFixWorkflow)(code, options.error, options.language, {
            modelId: models_1.AI_MODELS.find(m => m.id === options.model)?.model,
            preferAccomplishAI: true
        });
        if (result.success && result.data) {
            colorLog("\n✅ Fix Generated!", colors.green);
            colorLog(`   Source: ${result.source}`, colors.cyan);
            colorLog(`   Duration: ${result.duration}ms\n`, colors.cyan);
            colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", colors.yellow);
            colorLog("🔧 FIX DETAILS", colors.bold + colors.yellow);
            colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", colors.yellow);
            colorLog("📝 Description:", colors.cyan);
            console.log(`   ${result.data.fix_description}\n`);
            colorLog("💡 Explanation:", colors.green);
            console.log(`   ${result.data.explanation}\n`);
            if (result.data.changes_made && result.data.changes_made.length > 0) {
                colorLog("📋 Changes Made:", colors.blue);
                result.data.changes_made.forEach((change, i) => {
                    console.log(`   ${i + 1}. ${change}`);
                });
                console.log();
            }
            colorLog("📄 Fixed Code:", colors.magenta);
            console.log("─".repeat(60));
            console.log(result.data.fixed_code);
            console.log("─".repeat(60));
            if (result.data.test_suggestions && result.data.test_suggestions.length > 0) {
                colorLog("\n🧪 Test Suggestions:", colors.cyan);
                result.data.test_suggestions.forEach((test, i) => {
                    console.log(`   ${i + 1}. ${test}`);
                });
            }
        }
        else {
            colorLog(`\n❌ Fix generation failed: ${result.error}`, colors.red);
            process.exit(1);
        }
    }
    catch (error) {
        colorLog(`\n❌ Error: ${error}`, colors.red);
        process.exit(1);
    }
});
// Quick analyze command (from stdin or string)
program
    .command("quick <log>")
    .description("Quick analyze a log string")
    .option("-j, --json", "Output as JSON", false)
    .action(async (log, options) => {
    printBanner();
    colorLog(`\n⚡ Quick Analysis\n`, colors.blue);
    try {
        const result = await (0, accomplishAgent_1.runLogWorkflow)(log, { preferAccomplishAI: true });
        if (result.success && result.data) {
            if (options.json) {
                console.log(JSON.stringify(result, null, 2));
            }
            else {
                colorLog(`✅ ${result.data.error_type}`, colors.red);
                colorLog(`   ${result.data.root_cause}`, colors.cyan);
                colorLog(`   Fix: ${result.data.suggested_fix}`, colors.green);
                colorLog(`   Confidence: ${result.data.confidence}%`, colors.yellow);
            }
        }
        else {
            colorLog(`❌ Analysis failed: ${result.error}`, colors.red);
            process.exit(1);
        }
    }
    catch (error) {
        colorLog(`❌ Error: ${error}`, colors.red);
        process.exit(1);
    }
});
// Status command
program
    .command("status")
    .description("Check system status and AI availability")
    .action(async () => {
    printBanner();
    colorLog("🔍 Checking system status...\n", colors.blue);
    const health = await (0, accomplishAgent_1.getAgentHealth)();
    colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", colors.yellow);
    colorLog("📊 SYSTEM STATUS", colors.bold + colors.yellow);
    colorLog("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n", colors.yellow);
    colorLog(`Overall Status: ${health.status === "healthy" ? "✅ Healthy" : health.status === "degraded" ? "⚠️  Degraded" : "❌ Unhealthy"}`, health.status === "healthy" ? colors.green : health.status === "degraded" ? colors.yellow : colors.red);
    console.log("\n📋 Component Status:");
    console.log(`   Accomplish AI: ${health.checks.accomplishAI ? "✅ Available" : "❌ Unavailable"}`);
    console.log(`   OpenRouter: ${health.checks.openrouter ? "✅ Connected" : "❌ Disconnected"}`);
    console.log(`   Environment: ${health.checks.environment ? "✅ Configured" : "❌ Not Configured"}`);
    console.log("\n🤖 Available Models:");
    models_1.AI_MODELS.forEach(model => {
        console.log(`   - ${model.id}: ${model.name}`);
    });
    console.log();
});
// Models command
program
    .command("models")
    .description("List available AI models")
    .action(() => {
    printBanner();
    colorLog("🤖 Available AI Models\n", colors.cyan);
    models_1.AI_MODELS.forEach(model => {
        colorLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, colors.yellow);
        colorLog(`📦 ${model.name}`, colors.bold + colors.green);
        console.log(`   ID: ${model.id}`);
        console.log(`   Model: ${model.model}`);
        console.log(`   Description: ${model.description}`);
        console.log(`   Strengths: ${model.strengths.join(", ")}`);
        console.log(`   Best for: ${model.taskTypes.join(", ")}`);
    });
    console.log();
});
// Interactive mode
program
    .command("interactive")
    .alias("i")
    .description("Start interactive mode")
    .action(async () => {
    printBanner();
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    colorLog("🎮 Interactive Mode - Type 'help' for commands, 'exit' to quit\n", colors.cyan);
    const askQuestion = () => {
        rl.question(`${colors.green}devops-ai>${colors.reset} `, async (input) => {
            const trimmed = input.trim();
            if (trimmed === "exit" || trimmed === "quit") {
                colorLog("\n👋 Goodbye!", colors.cyan);
                rl.close();
                return;
            }
            if (trimmed === "help") {
                console.log(`
Commands:
  analyze <log>  - Analyze a log message
  fix <code>     - Generate a fix for code
  status         - Check system status
  models         - List available models
  help           - Show this help
  exit           - Exit interactive mode
                    `);
                askQuestion();
                return;
            }
            if (trimmed === "status") {
                const health = await (0, accomplishAgent_1.getAgentHealth)();
                colorLog(`Status: ${health.status}`, health.status === "healthy" ? colors.green : colors.yellow);
                askQuestion();
                return;
            }
            if (trimmed === "models") {
                models_1.AI_MODELS.forEach(m => console.log(`  - ${m.id}: ${m.name}`));
                askQuestion();
                return;
            }
            if (trimmed.startsWith("analyze ")) {
                const log = trimmed.slice(8);
                const result = await (0, accomplishAgent_1.runLogWorkflow)(log, { preferAccomplishAI: true });
                if (result.success && result.data) {
                    colorLog(`\n✅ ${result.data.error_type}`, colors.red);
                    console.log(`   ${result.data.root_cause}`);
                    console.log(`   Fix: ${result.data.suggested_fix}`);
                    console.log(`   Confidence: ${result.data.confidence}%\n`);
                }
                else {
                    colorLog(`❌ Failed: ${result.error}`, colors.red);
                }
                askQuestion();
                return;
            }
            if (trimmed) {
                // Default: treat as log to analyze
                const result = await (0, accomplishAgent_1.runLogWorkflow)(trimmed, { preferAccomplishAI: true });
                if (result.success && result.data) {
                    colorLog(`\n✅ ${result.data.error_type}`, colors.red);
                    console.log(`   ${result.data.root_cause}`);
                    console.log(`   Fix: ${result.data.suggested_fix}\n`);
                }
                else {
                    colorLog(`❌ Failed: ${result.error}`, colors.red);
                }
            }
            askQuestion();
        });
    };
    askQuestion();
});
// Parse arguments
program.parse();
//# sourceMappingURL=index.js.map
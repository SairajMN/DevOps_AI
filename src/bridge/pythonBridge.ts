/**
 * Python Bridge - Integrates TypeScript AI layer with Python pipeline
 * Allows calling Python modules from Node.js
 */

import { spawn, exec } from "child_process";
import { promisify } from "util";
import * as path from "path";

const execAsync = promisify(exec);

// ============================================================================
// Types
// ============================================================================

export interface PythonAnalysisResult {
    log_entry: Record<string, unknown>;
    parsed_data: {
        timestamp?: string;
        level?: string;
        message?: string;
        error_type?: string;
        stack_trace?: string;
        raw: string;
    };
    classification: {
        category: string;
        subcategory?: string;
        confidence: number;
        is_critical: boolean;
    };
    analysis: {
        root_cause?: string;
        affected_files?: string[];
        suggested_fixes?: string[];
    };
    fixes: Array<{
        type: string;
        description: string;
        confidence: number;
        changes?: unknown[];
    }>;
    patches: Array<{
        file: string;
        content: string;
    }>;
}

export interface PythonBridgeOptions {
    pythonPath?: string;
    projectRoot?: string;
    timeout?: number;
}

// ============================================================================
// Python Bridge Class
// ============================================================================

class PythonBridge {
    private pythonPath: string;
    private projectRoot: string;
    private timeout: number;

    constructor(options: PythonBridgeOptions = {}) {
        this.pythonPath = options.pythonPath || "python";
        this.projectRoot = options.projectRoot || process.cwd();
        this.timeout = options.timeout || 60000;
    }

    /**
     * Execute a Python script and return JSON output
     */
    private async runPythonScript(
        scriptPath: string,
        args: string[] = []
    ): Promise<Record<string, unknown>> {
        const fullPath = path.join(this.projectRoot, scriptPath);

        try {
            const { stdout, stderr } = await execAsync(
                `${this.pythonPath} "${fullPath}" ${args.map(a => `"${a}"`).join(" ")}`,
                {
                    timeout: this.timeout,
                    cwd: this.projectRoot,
                    maxBuffer: 1024 * 1024 * 10 // 10MB buffer
                }
            );

            if (stderr && !stdout) {
                throw new Error(`Python error: ${stderr}`);
            }

            // Try to parse JSON output
            try {
                return JSON.parse(stdout);
            } catch {
                // Return raw output if not JSON
                return { raw_output: stdout };
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Python script failed: ${errorMessage}`);
        }
    }

    /**
     * Run Python CLI analyze command
     */
    async analyzeLog(logFile: string, format: string = "json"): Promise<PythonAnalysisResult> {
        const result = await this.runPythonScript("cli.py", [
            "analyze",
            "--file", logFile,
            "--format", format
        ]);

        return result as unknown as PythonAnalysisResult;
    }

    /**
     * Parse log content using Python parser
     */
    async parseLog(logContent: string): Promise<Record<string, unknown>> {
        // Create a temporary script to parse the log
        const parseScript = `
import sys
import json
sys.path.insert(0, '${this.projectRoot.replace(/\\/g, "/")}')

from parser.structured_parser import StructuredParser
from config import Config

config = Config()
parser = StructuredParser(config)

log_content = '''${logContent.replace(/'/g, "\\'")}'''

result = parser.parse(log_content)
print(json.dumps(result))
`;

        const { stdout } = await execAsync(
            `${this.pythonPath} -c "${parseScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`,
            { timeout: this.timeout, cwd: this.projectRoot }
        );

        try {
            return JSON.parse(stdout);
        } catch {
            return { raw: stdout };
        }
    }

    /**
     * Classify error using Python classifier
     */
    async classifyError(parsedData: Record<string, unknown>): Promise<Record<string, unknown>> {
        const classifyScript = `
import sys
import json
sys.path.insert(0, '${this.projectRoot.replace(/\\/g, "/")}')

from classifier.error_classifier import ErrorClassifier
from config import Config

config = Config()
classifier = ErrorClassifier(config)

parsed_data = json.loads('''${JSON.stringify(parsedData).replace(/'/g, "\\'")}''')

result = classifier.classify(parsed_data)
print(json.dumps(result))
`;

        const { stdout } = await execAsync(
            `${this.pythonPath} -c "${classifyScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`,
            { timeout: this.timeout, cwd: this.projectRoot }
        );

        try {
            return JSON.parse(stdout);
        } catch {
            return { raw: stdout };
        }
    }

    /**
     * Generate fixes using Python fix engine
     */
    async generateFixes(
        classification: Record<string, unknown>,
        analysis: Record<string, unknown>
    ): Promise<Record<string, unknown>> {
        const fixScript = `
import sys
import json
sys.path.insert(0, '${this.projectRoot.replace(/\\/g, "/")}')

from fix_engine.deterministic_fix_engine import DeterministicFixEngine
from config import Config

config = Config()
fix_engine = DeterministicFixEngine(config)

classification = json.loads('''${JSON.stringify(classification).replace(/'/g, "\\'")}''')
analysis = json.loads('''${JSON.stringify(analysis).replace(/'/g, "\\'")}''')

result = fix_engine.generate_fixes(classification, analysis)
print(json.dumps(result))
`;

        const { stdout } = await execAsync(
            `${this.pythonPath} -c "${fixScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`,
            { timeout: this.timeout, cwd: this.projectRoot }
        );

        try {
            return JSON.parse(stdout);
        } catch {
            return { raw: stdout };
        }
    }

    /**
     * Get incident history from Python memory
     */
    async getIncidentHistory(limit: number = 20, errorType?: string): Promise<Record<string, unknown>> {
        const args = ["history", "--limit", String(limit)];
        if (errorType) {
            args.push("--type", errorType);
        }

        return this.runPythonScript("cli.py", args);
    }

    /**
     * Generate report using Python report builder
     */
    async generateReport(reportType: string = "summary"): Promise<Record<string, unknown>> {
        return this.runPythonScript("cli.py", ["report", "--type", reportType]);
    }

    /**
     * Get system status from Python
     */
    async getSystemStatus(): Promise<Record<string, unknown>> {
        return this.runPythonScript("cli.py", ["status"]);
    }

    /**
     * Run full Python pipeline on log content
     */
    async runFullPipeline(logContent: string): Promise<PythonAnalysisResult> {
        console.log("[PythonBridge] Running full Python pipeline...");

        // Step 1: Parse
        console.log("[PythonBridge] Step 1: Parsing log...");
        const parsedData = await this.parseLog(logContent);

        // Step 2: Classify
        console.log("[PythonBridge] Step 2: Classifying error...");
        const classification = await this.classifyError(parsedData);

        // Step 3: Analyze (simplified - would need codebase analyzer)
        const analysis = { root_cause: "Analysis from Python pipeline" };

        // Step 4: Generate fixes
        console.log("[PythonBridge] Step 3: Generating fixes...");
        const fixes = await this.generateFixes(classification, analysis);

        return {
            log_entry: { raw: logContent },
            parsed_data: parsedData as PythonAnalysisResult["parsed_data"],
            classification: classification as PythonAnalysisResult["classification"],
            analysis: analysis as PythonAnalysisResult["analysis"],
            fixes: fixes as unknown as PythonAnalysisResult["fixes"],
            patches: []
        };
    }

    /**
     * Check if Python environment is available
     */
    async checkPythonEnvironment(): Promise<{
        available: boolean;
        version?: string;
        error?: string;
    }> {
        try {
            const { stdout } = await execAsync(`${this.pythonPath} --version`);
            const versionMatch = stdout.match(/Python (\d+\.\d+\.\d+)/);

            return {
                available: true,
                version: versionMatch ? versionMatch[1] : stdout.trim()
            };
        } catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Check if required Python packages are installed
     */
    async checkPythonDependencies(): Promise<{
        installed: string[];
        missing: string[];
    }> {
        const requiredPackages = [
            "watchdog",
            "jinja2",
            "markdown",
            "python-dateutil"
        ];

        const installed: string[] = [];
        const missing: string[] = [];

        for (const pkg of requiredPackages) {
            try {
                await execAsync(`${this.pythonPath} -c "import ${pkg}"`);
                installed.push(pkg);
            } catch {
                missing.push(pkg);
            }
        }

        return { installed, missing };
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const pythonBridge = new PythonBridge();

// ============================================================================
// Convenience Functions
// ============================================================================

export async function analyzeWithPython(logContent: string): Promise<PythonAnalysisResult> {
    return pythonBridge.runFullPipeline(logContent);
}

export async function parseWithPython(logContent: string): Promise<Record<string, unknown>> {
    return pythonBridge.parseLog(logContent);
}

export async function classifyWithPython(parsedData: Record<string, unknown>): Promise<Record<string, unknown>> {
    return pythonBridge.classifyError(parsedData);
}

export async function getPythonStatus(): Promise<Record<string, unknown>> {
    return pythonBridge.getSystemStatus();
}

export default PythonBridge;
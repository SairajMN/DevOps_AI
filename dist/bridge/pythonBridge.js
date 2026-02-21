"use strict";
/**
 * Python Bridge - Integrates TypeScript AI layer with Python pipeline
 * Allows calling Python modules from Node.js
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
exports.pythonBridge = void 0;
exports.analyzeWithPython = analyzeWithPython;
exports.parseWithPython = parseWithPython;
exports.classifyWithPython = classifyWithPython;
exports.getPythonStatus = getPythonStatus;
const child_process_1 = require("child_process");
const util_1 = require("util");
const path = __importStar(require("path"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// ============================================================================
// Python Bridge Class
// ============================================================================
class PythonBridge {
    constructor(options = {}) {
        this.pythonPath = options.pythonPath || "python";
        this.projectRoot = options.projectRoot || process.cwd();
        this.timeout = options.timeout || 60000;
    }
    /**
     * Execute a Python script and return JSON output
     */
    async runPythonScript(scriptPath, args = []) {
        const fullPath = path.join(this.projectRoot, scriptPath);
        try {
            const { stdout, stderr } = await execAsync(`${this.pythonPath} "${fullPath}" ${args.map(a => `"${a}"`).join(" ")}`, {
                timeout: this.timeout,
                cwd: this.projectRoot,
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
            if (stderr && !stdout) {
                throw new Error(`Python error: ${stderr}`);
            }
            // Try to parse JSON output
            try {
                return JSON.parse(stdout);
            }
            catch {
                // Return raw output if not JSON
                return { raw_output: stdout };
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new Error(`Python script failed: ${errorMessage}`);
        }
    }
    /**
     * Run Python CLI analyze command
     */
    async analyzeLog(logFile, format = "json") {
        const result = await this.runPythonScript("cli.py", [
            "analyze",
            "--file", logFile,
            "--format", format
        ]);
        return result;
    }
    /**
     * Parse log content using Python parser
     */
    async parseLog(logContent) {
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
        const { stdout } = await execAsync(`${this.pythonPath} -c "${parseScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`, { timeout: this.timeout, cwd: this.projectRoot });
        try {
            return JSON.parse(stdout);
        }
        catch {
            return { raw: stdout };
        }
    }
    /**
     * Classify error using Python classifier
     */
    async classifyError(parsedData) {
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
        const { stdout } = await execAsync(`${this.pythonPath} -c "${classifyScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`, { timeout: this.timeout, cwd: this.projectRoot });
        try {
            return JSON.parse(stdout);
        }
        catch {
            return { raw: stdout };
        }
    }
    /**
     * Generate fixes using Python fix engine
     */
    async generateFixes(classification, analysis) {
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
        const { stdout } = await execAsync(`${this.pythonPath} -c "${fixScript.replace(/"/g, '\\"').replace(/\n/g, "; ")}"`, { timeout: this.timeout, cwd: this.projectRoot });
        try {
            return JSON.parse(stdout);
        }
        catch {
            return { raw: stdout };
        }
    }
    /**
     * Get incident history from Python memory
     */
    async getIncidentHistory(limit = 20, errorType) {
        const args = ["history", "--limit", String(limit)];
        if (errorType) {
            args.push("--type", errorType);
        }
        return this.runPythonScript("cli.py", args);
    }
    /**
     * Generate report using Python report builder
     */
    async generateReport(reportType = "summary") {
        return this.runPythonScript("cli.py", ["report", "--type", reportType]);
    }
    /**
     * Get system status from Python
     */
    async getSystemStatus() {
        return this.runPythonScript("cli.py", ["status"]);
    }
    /**
     * Run full Python pipeline on log content
     */
    async runFullPipeline(logContent) {
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
            parsed_data: parsedData,
            classification: classification,
            analysis: analysis,
            fixes: fixes,
            patches: []
        };
    }
    /**
     * Check if Python environment is available
     */
    async checkPythonEnvironment() {
        try {
            const { stdout } = await execAsync(`${this.pythonPath} --version`);
            const versionMatch = stdout.match(/Python (\d+\.\d+\.\d+)/);
            return {
                available: true,
                version: versionMatch ? versionMatch[1] : stdout.trim()
            };
        }
        catch (error) {
            return {
                available: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Check if required Python packages are installed
     */
    async checkPythonDependencies() {
        const requiredPackages = [
            "watchdog",
            "jinja2",
            "markdown",
            "python-dateutil"
        ];
        const installed = [];
        const missing = [];
        for (const pkg of requiredPackages) {
            try {
                await execAsync(`${this.pythonPath} -c "import ${pkg}"`);
                installed.push(pkg);
            }
            catch {
                missing.push(pkg);
            }
        }
        return { installed, missing };
    }
}
// ============================================================================
// Singleton Instance
// ============================================================================
exports.pythonBridge = new PythonBridge();
// ============================================================================
// Convenience Functions
// ============================================================================
async function analyzeWithPython(logContent) {
    return exports.pythonBridge.runFullPipeline(logContent);
}
async function parseWithPython(logContent) {
    return exports.pythonBridge.parseLog(logContent);
}
async function classifyWithPython(parsedData) {
    return exports.pythonBridge.classifyError(parsedData);
}
async function getPythonStatus() {
    return exports.pythonBridge.getSystemStatus();
}
exports.default = PythonBridge;
//# sourceMappingURL=pythonBridge.js.map
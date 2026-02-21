/**
 * Python Bridge - Integrates TypeScript AI layer with Python pipeline
 * Allows calling Python modules from Node.js
 */
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
declare class PythonBridge {
    private pythonPath;
    private projectRoot;
    private timeout;
    constructor(options?: PythonBridgeOptions);
    /**
     * Execute a Python script and return JSON output
     */
    private runPythonScript;
    /**
     * Run Python CLI analyze command
     */
    analyzeLog(logFile: string, format?: string): Promise<PythonAnalysisResult>;
    /**
     * Parse log content using Python parser
     */
    parseLog(logContent: string): Promise<Record<string, unknown>>;
    /**
     * Classify error using Python classifier
     */
    classifyError(parsedData: Record<string, unknown>): Promise<Record<string, unknown>>;
    /**
     * Generate fixes using Python fix engine
     */
    generateFixes(classification: Record<string, unknown>, analysis: Record<string, unknown>): Promise<Record<string, unknown>>;
    /**
     * Get incident history from Python memory
     */
    getIncidentHistory(limit?: number, errorType?: string): Promise<Record<string, unknown>>;
    /**
     * Generate report using Python report builder
     */
    generateReport(reportType?: string): Promise<Record<string, unknown>>;
    /**
     * Get system status from Python
     */
    getSystemStatus(): Promise<Record<string, unknown>>;
    /**
     * Run full Python pipeline on log content
     */
    runFullPipeline(logContent: string): Promise<PythonAnalysisResult>;
    /**
     * Check if Python environment is available
     */
    checkPythonEnvironment(): Promise<{
        available: boolean;
        version?: string;
        error?: string;
    }>;
    /**
     * Check if required Python packages are installed
     */
    checkPythonDependencies(): Promise<{
        installed: string[];
        missing: string[];
    }>;
}
export declare const pythonBridge: PythonBridge;
export declare function analyzeWithPython(logContent: string): Promise<PythonAnalysisResult>;
export declare function parseWithPython(logContent: string): Promise<Record<string, unknown>>;
export declare function classifyWithPython(parsedData: Record<string, unknown>): Promise<Record<string, unknown>>;
export declare function getPythonStatus(): Promise<Record<string, unknown>>;
export default PythonBridge;
//# sourceMappingURL=pythonBridge.d.ts.map
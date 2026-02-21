/**
 * Accomplish AI Agent - Primary AI orchestration layer
 * Uses @accomplish_ai/agent-core as primary with OpenRouter fallback
 */
import { LogAnalysisResult, CodeFixResult } from "./prompts";
export interface AgentState {
    status: "idle" | "running" | "completed" | "failed";
    currentStep: string;
    attempts: number;
    maxAttempts: number;
    lastError?: string;
    startTime?: Date;
    endTime?: Date;
}
export interface WorkflowResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    model: string;
    attempts: number;
    duration: number;
    source: "accomplish-ai" | "openrouter";
}
export interface LogWorkflowOptions {
    useEnhancedPrompt?: boolean;
    confidenceThreshold?: number;
    maxRetries?: number;
    modelId?: string;
    taskType?: string;
    preferAccomplishAI?: boolean;
}
/**
 * Check if Accomplish AI is available
 */
export declare function isAccomplishAIAvailable(): Promise<boolean>;
/**
 * Run log analysis using Accomplish AI (primary) or OpenRouter (fallback)
 */
export declare function runLogWorkflow(logText: string, options?: LogWorkflowOptions): Promise<WorkflowResult<LogAnalysisResult>>;
/**
 * Run code fix workflow
 */
export declare function runCodeFixWorkflow(code: string, errorMessage: string, language?: string, options?: LogWorkflowOptions): Promise<WorkflowResult<CodeFixResult>>;
export interface MultiStepResult {
    analysis: LogAnalysisResult;
    fix?: CodeFixResult;
    classification?: {
        category: string;
        priority: string;
        tags: string[];
    };
}
/**
 * Run comprehensive multi-step analysis
 */
export declare function runMultiStepWorkflow(logText: string, code?: string, language?: string): Promise<WorkflowResult<MultiStepResult>>;
/**
 * Process multiple logs in batch
 */
export declare function runBatchAnalysis(logs: Array<{
    id: string;
    content: string;
}>, options?: LogWorkflowOptions): Promise<Map<string, WorkflowResult<LogAnalysisResult>>>;
/**
 * Get agent health status
 */
export declare function getAgentHealth(): Promise<{
    status: "healthy" | "degraded" | "unhealthy";
    checks: Record<string, boolean>;
}>;
declare const _default: {
    runLogWorkflow: typeof runLogWorkflow;
    runCodeFixWorkflow: typeof runCodeFixWorkflow;
    runMultiStepWorkflow: typeof runMultiStepWorkflow;
    runBatchAnalysis: typeof runBatchAnalysis;
    getAgentHealth: typeof getAgentHealth;
    isAccomplishAIAvailable: typeof isAccomplishAIAvailable;
};
export default _default;
//# sourceMappingURL=accomplishAgent.d.ts.map
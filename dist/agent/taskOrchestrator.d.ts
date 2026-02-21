/**
 * Task Orchestrator - Manages complex multi-step tasks
 * Coordinates between different tools and workflows
 */
import { WorkflowResult } from "./accomplishAgent";
import { LogAnalysisResult, CodeFixResult } from "./prompts";
import { TaskType } from "../ai/modelRouter";
export type TaskStatus = "pending" | "running" | "completed" | "failed" | "cancelled";
export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    priority: "low" | "medium" | "high" | "critical";
    input: TaskInput;
    output?: TaskOutput;
    error?: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    metadata?: Record<string, unknown>;
}
export interface TaskInput {
    logText?: string;
    code?: string;
    language?: string;
    modelId?: string;
    options?: Record<string, unknown>;
}
export interface TaskOutput {
    analysis?: LogAnalysisResult;
    fix?: CodeFixResult;
    classification?: {
        category: string;
        priority: string;
        tags: string[];
    };
    raw?: unknown;
}
export interface TaskQueue {
    pending: Task[];
    running: Task[];
    completed: Task[];
    failed: Task[];
}
declare class TaskManager {
    private queue;
    private maxConcurrent;
    private taskIdCounter;
    /**
     * Create a new task
     */
    createTask(type: TaskType, input: TaskInput, priority?: "low" | "medium" | "high" | "critical", metadata?: Record<string, unknown>): Task;
    /**
     * Insert task by priority
     */
    private insertByPriority;
    /**
     * Execute a task
     */
    executeTask(taskId: string): Promise<Task>;
    /**
     * Process next task in queue
     */
    processNext(): Promise<Task | null>;
    /**
     * Process all pending tasks
     */
    processAll(): Promise<Task[]>;
    /**
     * Get task by ID
     */
    getTask(taskId: string): Task | undefined;
    /**
     * Get queue status
     */
    getQueueStatus(): TaskQueue;
    /**
     * Cancel a task
     */
    cancelTask(taskId: string): boolean;
    /**
     * Clear completed tasks
     */
    clearCompleted(): number;
    /**
     * Retry a failed task
     */
    retryTask(taskId: string): Promise<Task>;
}
export declare const taskManager: TaskManager;
/**
 * Quick analyze log
 */
export declare function quickAnalyze(logText: string): Promise<WorkflowResult<LogAnalysisResult>>;
/**
 * Quick fix code
 */
export declare function quickFix(code: string, errorMessage: string, language?: string): Promise<WorkflowResult<CodeFixResult>>;
/**
 * Full analysis with fix
 */
export declare function fullAnalysis(logText: string, code?: string, language?: string): Promise<WorkflowResult<TaskOutput>>;
declare const _default: {
    taskManager: TaskManager;
    quickAnalyze: typeof quickAnalyze;
    quickFix: typeof quickFix;
    fullAnalysis: typeof fullAnalysis;
};
export default _default;
//# sourceMappingURL=taskOrchestrator.d.ts.map
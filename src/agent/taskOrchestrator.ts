/**
 * Task Orchestrator - Manages complex multi-step tasks
 * Coordinates between different tools and workflows
 */

import { runLogWorkflow, runCodeFixWorkflow, runMultiStepWorkflow, WorkflowResult } from "./accomplishAgent";
import { LogAnalysisResult, CodeFixResult } from "./prompts";
import { detectTaskType, TaskType } from "../ai/modelRouter";

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Task Manager
// ============================================================================

class TaskManager {
    private queue: TaskQueue = {
        pending: [],
        running: [],
        completed: [],
        failed: []
    };
    private maxConcurrent: number = 5;
    private taskIdCounter: number = 0;

    /**
     * Create a new task
     */
    createTask(
        type: TaskType,
        input: TaskInput,
        priority: "low" | "medium" | "high" | "critical" = "medium",
        metadata?: Record<string, unknown>
    ): Task {
        const task: Task = {
            id: `task-${++this.taskIdCounter}-${Date.now()}`,
            type,
            status: "pending",
            priority,
            input,
            createdAt: new Date(),
            metadata
        };

        // Insert based on priority
        this.insertByPriority(task);
        console.log(`[TaskManager] Created task ${task.id} with priority ${priority}`);

        return task;
    }

    /**
     * Insert task by priority
     */
    private insertByPriority(task: Task): void {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const insertIndex = this.queue.pending.findIndex(
            t => priorityOrder[t.priority] > priorityOrder[task.priority]
        );

        if (insertIndex === -1) {
            this.queue.pending.push(task);
        } else {
            this.queue.pending.splice(insertIndex, 0, task);
        }
    }

    /**
     * Execute a task
     */
    async executeTask(taskId: string): Promise<Task> {
        const taskIndex = this.queue.pending.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            throw new Error(`Task ${taskId} not found in pending queue`);
        }

        const task = this.queue.pending.splice(taskIndex, 1)[0];
        task.status = "running";
        task.startedAt = new Date();
        this.queue.running.push(task);

        console.log(`[TaskManager] Executing task ${task.id}`);

        try {
            let result: WorkflowResult<unknown>;

            switch (task.type) {
                case "log-analysis":
                case "debugging":
                case "root-cause-analysis":
                    result = await runLogWorkflow(task.input.logText || "", {
                        modelId: task.input.modelId,
                        taskType: task.type
                    });
                    if (result.success && result.data) {
                        task.output = { analysis: result.data as LogAnalysisResult };
                    }
                    break;

                case "code-generation":
                case "refactoring":
                    result = await runCodeFixWorkflow(
                        task.input.code || "",
                        task.input.logText || "",
                        task.input.language || "python"
                    );
                    if (result.success && result.data) {
                        task.output = { fix: result.data as CodeFixResult };
                    }
                    break;

                default:
                    // Multi-step workflow for complex tasks
                    const multiResult = await runMultiStepWorkflow(
                        task.input.logText || "",
                        task.input.code,
                        task.input.language
                    );
                    if (multiResult.success && multiResult.data) {
                        task.output = {
                            analysis: multiResult.data.analysis,
                            fix: multiResult.data.fix,
                            classification: multiResult.data.classification
                        };
                    }
            }

            task.status = "completed";
            task.completedAt = new Date();
        } catch (error) {
            task.status = "failed";
            task.error = error instanceof Error ? error.message : String(error);
            console.error(`[TaskManager] Task ${task.id} failed:`, task.error);
        }

        // Move to appropriate queue
        const runningIndex = this.queue.running.findIndex(t => t.id === taskId);
        this.queue.running.splice(runningIndex, 1);

        if (task.status === "completed") {
            this.queue.completed.push(task);
        } else {
            this.queue.failed.push(task);
        }

        return task;
    }

    /**
     * Process next task in queue
     */
    async processNext(): Promise<Task | null> {
        if (this.queue.pending.length === 0) {
            return null;
        }

        if (this.queue.running.length >= this.maxConcurrent) {
            console.log(`[TaskManager] Max concurrent tasks reached`);
            return null;
        }

        const nextTask = this.queue.pending[0];
        return this.executeTask(nextTask.id);
    }

    /**
     * Process all pending tasks
     */
    async processAll(): Promise<Task[]> {
        const results: Task[] = [];

        while (this.queue.pending.length > 0) {
            const task = await this.processNext();
            if (task) {
                results.push(task);
            } else {
                break;
            }
        }

        return results;
    }

    /**
     * Get task by ID
     */
    getTask(taskId: string): Task | undefined {
        return [
            ...this.queue.pending,
            ...this.queue.running,
            ...this.queue.completed,
            ...this.queue.failed
        ].find(t => t.id === taskId);
    }

    /**
     * Get queue status
     */
    getQueueStatus(): TaskQueue {
        return { ...this.queue };
    }

    /**
     * Cancel a task
     */
    cancelTask(taskId: string): boolean {
        const pendingIndex = this.queue.pending.findIndex(t => t.id === taskId);
        if (pendingIndex !== -1) {
            const task = this.queue.pending.splice(pendingIndex, 1)[0];
            task.status = "cancelled";
            this.queue.failed.push(task);
            return true;
        }
        return false;
    }

    /**
     * Clear completed tasks
     */
    clearCompleted(): number {
        const count = this.queue.completed.length;
        this.queue.completed = [];
        return count;
    }

    /**
     * Retry a failed task
     */
    async retryTask(taskId: string): Promise<Task> {
        const failedTask = this.queue.failed.find(t => t.id === taskId);
        if (!failedTask) {
            throw new Error(`Task ${taskId} not found in failed queue`);
        }

        // Remove from failed queue
        const failedIndex = this.queue.failed.findIndex(t => t.id === taskId);
        this.queue.failed.splice(failedIndex, 1);

        // Reset and re-queue
        failedTask.status = "pending";
        failedTask.error = undefined;
        failedTask.completedAt = undefined;
        this.insertByPriority(failedTask);

        return this.executeTask(failedTask.id);
    }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const taskManager = new TaskManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick analyze log
 */
export async function quickAnalyze(logText: string): Promise<WorkflowResult<LogAnalysisResult>> {
    return runLogWorkflow(logText);
}

/**
 * Quick fix code
 */
export async function quickFix(
    code: string,
    errorMessage: string,
    language: string = "python"
): Promise<WorkflowResult<CodeFixResult>> {
    return runCodeFixWorkflow(code, errorMessage, language);
}

/**
 * Full analysis with fix
 */
export async function fullAnalysis(
    logText: string,
    code?: string,
    language?: string
): Promise<WorkflowResult<TaskOutput>> {
    const result = await runMultiStepWorkflow(logText, code, language);

    if (result.success && result.data) {
        return {
            success: true,
            data: {
                analysis: result.data.analysis,
                fix: result.data.fix,
                classification: result.data.classification
            },
            model: result.model,
            attempts: result.attempts,
            duration: result.duration,
            source: result.source
        };
    }

    return {
        success: false,
        error: result.error,
        model: result.model,
        attempts: result.attempts,
        duration: result.duration,
        source: "openrouter"
    };
}

export default {
    taskManager,
    quickAnalyze,
    quickFix,
    fullAnalysis
};
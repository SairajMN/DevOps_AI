/**
 * Analyze Routes - API endpoints for log analysis
 * Express/Fastify compatible route handlers
 */
import { Request, Response } from "express";
export declare function healthCheckHandler(req: Request, res: Response): Promise<void>;
export declare function listModelsHandler(req: Request, res: Response): void;
export declare function getModelHandler(req: Request, res: Response): void;
export declare function analyzeLogHandler(req: Request, res: Response): Promise<void>;
export declare function quickAnalyzeHandler(req: Request, res: Response): Promise<void>;
export declare function fixCodeHandler(req: Request, res: Response): Promise<void>;
export declare function multiStepHandler(req: Request, res: Response): Promise<void>;
export declare function batchAnalyzeHandler(req: Request, res: Response): Promise<void>;
export declare function createTaskHandler(req: Request, res: Response): void;
export declare function executeTaskHandler(req: Request, res: Response): Promise<void>;
export declare function getTaskHandler(req: Request, res: Response): void;
export declare function getQueueStatusHandler(req: Request, res: Response): void;
export declare function retryTaskHandler(req: Request, res: Response): Promise<void>;
export declare function detectTaskTypeHandler(req: Request, res: Response): void;
export declare function pythonStatusHandler(req: Request, res: Response): Promise<void>;
export declare function pythonAnalyzeHandler(req: Request, res: Response): Promise<void>;
export declare function pythonHistoryHandler(req: Request, res: Response): Promise<void>;
export declare function pythonReportHandler(req: Request, res: Response): Promise<void>;
export declare function hybridAnalyzeHandler(req: Request, res: Response): Promise<void>;
export declare function registerRoutes(app: import("express").Application): void;
declare const _default: {
    healthCheckHandler: typeof healthCheckHandler;
    listModelsHandler: typeof listModelsHandler;
    getModelHandler: typeof getModelHandler;
    analyzeLogHandler: typeof analyzeLogHandler;
    quickAnalyzeHandler: typeof quickAnalyzeHandler;
    fixCodeHandler: typeof fixCodeHandler;
    multiStepHandler: typeof multiStepHandler;
    batchAnalyzeHandler: typeof batchAnalyzeHandler;
    createTaskHandler: typeof createTaskHandler;
    executeTaskHandler: typeof executeTaskHandler;
    getTaskHandler: typeof getTaskHandler;
    getQueueStatusHandler: typeof getQueueStatusHandler;
    retryTaskHandler: typeof retryTaskHandler;
    detectTaskTypeHandler: typeof detectTaskTypeHandler;
    registerRoutes: typeof registerRoutes;
};
export default _default;
//# sourceMappingURL=analyze.d.ts.map
"use strict";
/**
 * DevOps AI - Main Entry Point
 * Express server with OpenRouter integration
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv = __importStar(require("dotenv"));
const analyze_1 = require("./routes/analyze");
const accomplishAgent_1 = require("./agent/accomplishAgent");
// Load environment variables
dotenv.config();
// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;
// Create Express app
const app = (0, express_1.default)();
exports.app = app;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Request logging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});
// Register API routes
(0, analyze_1.registerRoutes)(app);
// Root endpoint
app.get("/", (req, res) => {
    res.json({
        name: "DevOps AI Log Analyzer",
        version: "1.0.0",
        description: "Universal DevOps Log Intelligence & Auto-Triage System",
        endpoints: {
            health: "GET /api/health",
            models: "GET /api/models",
            analyze: "POST /api/analyze",
            quickAnalyze: "POST /api/analyze/quick",
            multiStep: "POST /api/analyze/multi",
            batch: "POST /api/analyze/batch",
            fixCode: "POST /api/fix",
            tasks: "POST /api/tasks",
            queue: "GET /api/queue"
        }
    });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error("Error:", err.message);
    res.status(500).json({
        error: "Internal server error",
        message: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
});
// Start server
async function startServer() {
    try {
        // Check health on startup
        console.log("Checking system health...");
        const health = await (0, accomplishAgent_1.getAgentHealth)();
        console.log("Health check:", health);
        if (health.status === "unhealthy") {
            console.warn("⚠️  System is unhealthy. Check configuration.");
        }
        else if (health.status === "degraded") {
            console.warn("⚠️  System is degraded. Some features may not work.");
        }
        else {
            console.log("✅ System is healthy");
        }
        // Start listening
        app.listen(PORT, () => {
            console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DevOps AI Log Analyzer                    ║
╠══════════════════════════════════════════════════════════════╣
║  Server running at: ${APP_URL.padEnd(38)}║
║  Environment: ${process.env.NODE_ENV || "development".padEnd(45)}║
║  OpenRouter: ${health.checks.openrouter ? "✅ Connected" : "❌ Disconnected".padEnd(43)}║
╚══════════════════════════════════════════════════════════════╝

Available Endpoints:
  GET  /              - API info
  GET  /api/health    - Health check
  GET  /api/models    - List available models
  POST /api/analyze   - Analyze log
  POST /api/fix       - Fix code
  POST /api/tasks     - Create task
            `);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
// Handle graceful shutdown
process.on("SIGTERM", () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    process.exit(0);
});
process.on("SIGINT", () => {
    console.log("Received SIGINT, shutting down gracefully...");
    process.exit(0);
});
// Start the server
startServer();
//# sourceMappingURL=index.js.map
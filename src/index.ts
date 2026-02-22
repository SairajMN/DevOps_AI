/**
 * DevOps AI - Main Entry Point
 * Express server with OpenRouter integration
 */

import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import * as dotenv from "dotenv";
import * as path from "path";
import { registerRoutes } from "./routes/analyze";
import { getAgentHealth } from "./agent/accomplishAgent";

// Load environment variables
dotenv.config();

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`;

// Create Express app
const app: Express = express();

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "cdnjs.cloudflare.com",
          "fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "cdnjs.cloudflare.com", "fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://openrouter.ai"],
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "../public")));

// Register API routes
registerRoutes(app);

// Serve the web app at /app
app.get("/app", (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "../public/app.html"));
});

// Root endpoint - redirect to app or show API info
app.get("/", (req: Request, res: Response) => {
  const acceptHtml = req.headers.accept?.includes("text/html");
  if (acceptHtml) {
    res.redirect("/app");
    return;
  }
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
      queue: "GET /api/queue",
    },
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err.message);
  res.status(500).json({
    error: "Internal server error",
    message: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Start server
async function startServer() {
  try {
    // Check health on startup
    console.log("Checking system health...");
    const health = await getAgentHealth();
    console.log("Health check:", health);

    if (health.status === "unhealthy") {
      console.warn("⚠️  System is unhealthy. Check configuration.");
    } else if (health.status === "degraded") {
      console.warn("⚠️  System is degraded. Some features may not work.");
    } else {
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
  } catch (error) {
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

export { app };

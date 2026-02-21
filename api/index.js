/**
 * Vercel Serverless Function - API Entry Point
 * Handles API requests for the DevOps AI landing page
 */

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { path } = req.query;

  // API endpoints
  if (path === "health") {
    return res.status(200).json({
      status: "healthy",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  }

  if (path === "models") {
    return res.status(200).json({
      models: [
        {
          id: "deepseek-r1",
          name: "DeepSeek R1",
          description: "Best for reasoning and debugging",
        },
        {
          id: "deepseek-v3",
          name: "DeepSeek V3",
          description: "Best for code generation",
        },
        {
          id: "llama-70b",
          name: "Llama 3.1 70B",
          description: "Best for documentation",
        },
        {
          id: "mixtral",
          name: "Mixtral 8x7B",
          description: "Fast fallback model",
        },
        {
          id: "qwen",
          name: "Qwen 2.5 7B",
          description: "Good for coding tasks",
        },
        {
          id: "gemini-flash",
          name: "Gemini Flash 1.5",
          description: "General purpose",
        },
      ],
    });
  }

  if (path === "analyze" && req.method === "POST") {
    const { log } = req.body || {};

    if (!log) {
      return res.status(400).json({ error: "No log content provided" });
    }

    // Return demo analysis
    return res.status(200).json({
      success: true,
      analysis: {
        error_type: "detected_error",
        error_category: "application",
        root_cause: "Demo analysis - deploy full system for real analysis",
        confidence: 85,
        suggested_fix:
          "Deploy the full DevOps AI system for comprehensive analysis",
        severity: "medium",
        is_code_issue: false,
        is_dependency_issue: false,
        is_environment_issue: false,
      },
      metadata: {
        model: "demo",
        duration: 0,
        source: "landing-page-demo",
      },
      message:
        "This is a demo response. Deploy the full system for real AI-powered analysis.",
    });
  }

  // Default response
  return res.status(200).json({
    name: "DevOps AI API",
    version: "1.0.0",
    endpoints: [
      { path: "/api/health", method: "GET", description: "Health check" },
      {
        path: "/api/models",
        method: "GET",
        description: "List available models",
      },
      {
        path: "/api/analyze",
        method: "POST",
        description: "Analyze log (demo)",
      },
    ],
    message: "Deploy the full DevOps AI system for complete functionality",
  });
};
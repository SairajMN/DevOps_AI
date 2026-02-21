/**
 * Vercel Serverless Function - Log Analysis
 */

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { log } = req.body || {};

  if (!log) {
    return res.status(400).json({ error: "No log content provided" });
  }

  return res.status(200).json({
    success: true,
    analysis: {
      error_type: "detected_error",
      error_category: "application",
      root_cause: "Demo analysis - deploy full system for real analysis",
      confidence: 85,
      suggested_fix: "Deploy the full DevOps AI system for comprehensive analysis",
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
    message: "This is a demo response. Deploy the full system for real AI-powered analysis.",
  });
};
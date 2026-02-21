/**
 * Vercel Serverless Function - API Root
 */

module.exports = function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    name: "DevOps AI API",
    version: "1.0.0",
    endpoints: [
      { path: "/api/health", method: "GET", description: "Health check" },
      { path: "/api/models", method: "GET", description: "List available models" },
      { path: "/api/analyze", method: "POST", description: "Analyze log (demo)" },
    ],
    message: "Deploy the full DevOps AI system for complete functionality",
  });
};
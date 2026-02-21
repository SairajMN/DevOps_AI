/**
 * Vercel Serverless Function - Models List
 */

module.exports = function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  return res.status(200).json({
    models: [
      { id: "deepseek-r1", name: "DeepSeek R1", description: "Best for reasoning and debugging" },
      { id: "deepseek-v3", name: "DeepSeek V3", description: "Best for code generation" },
      { id: "llama-70b", name: "Llama 3.1 70B", description: "Best for documentation" },
      { id: "mixtral", name: "Mixtral 8x7B", description: "Fast fallback model" },
      { id: "qwen", name: "Qwen 2.5 7B", description: "Good for coding tasks" },
      { id: "gemini-flash", name: "Gemini Flash 1.5", description: "General purpose" },
    ],
  });
};
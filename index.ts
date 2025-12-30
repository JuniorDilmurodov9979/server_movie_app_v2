import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRoute from "./routes/ai";
import tmdbRoute from "./routes/tmdb";
import { rateLimiter } from "./middleware/rateLimiter";

const app = express();

app.use(cors());
app.use(express.json());

// Apply rate limiting to AI discovery endpoint (20 requests per day)
app.use("/api/ai-discover", rateLimiter, aiRoute);

// TMDB endpoint doesn't need strict rate limiting (TMDB has its own limits)
app.use("/api/tmdb-discover", tmdbRoute);

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

// Optional: Rate limit status endpoint
app.get("/api/rate-limit-status", rateLimiter, (req, res) => {
  const remaining = res.getHeader("X-RateLimit-Remaining");
  const reset = res.getHeader("X-RateLimit-Reset");

  res.json({
    limit: 20,
    remaining: Number(remaining) || 0,
    resetAt: reset,
  });
});

app.listen(3000, () => {
  console.log("✅ Backend running on http://localhost:3000");
  console.log("📊 Rate limit: 20 requests per day per IP");
});

export default app;

import "dotenv/config";
import express from "express";
import cors from "cors";
import aiRoute from "./routes/ai";
import tmdbRoute from "./routes/tmdb";
import { rateLimiter } from "./middleware/rateLimiter";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/ai-discover", rateLimiter, aiRoute);
app.use("/api/tmdb-discover", tmdbRoute);

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/api/rate-limit-status", rateLimiter, (_, res) => {
  const remaining = res.getHeader("X-RateLimit-Remaining");
  const reset = res.getHeader("X-RateLimit-Reset");

  res.json({
    limit: 20,
    remaining: Number(remaining) || 0,
    resetAt: reset,
  });
});

export default app;

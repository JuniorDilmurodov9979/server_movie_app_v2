import { Router } from "express";
import { getAIFilters } from "../services/aiService";

const router = Router();

router.post("/", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Prompt required" });

  const filters = await getAIFilters(prompt);
  res.json(filters);
});

export default router;
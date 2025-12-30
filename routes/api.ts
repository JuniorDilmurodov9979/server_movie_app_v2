// server/routes/api.ts
import { Router } from "express";
import { getAIFilters } from "../services/aiService";
import { discoverMovies, searchByKeywords } from "../services/tmdbService";
import type { Request, Response } from "express";
import type { DiscoverFilters } from "../types/filters";
import type { TMDBDiscoverResponse, TMDBMovie } from "../types/tmdb";

const router = Router();

// AI parsing endpoint
router.post("/ai-discover", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const filters = await getAIFilters(prompt);

    res.json(filters);
  } catch (error) {
    console.error("AI parsing error:", error);
    res.status(500).json({
      error: "Failed to parse your request. Please try rephrasing.",
    });
  }
});

// TMDB discovery endpoint
router.post(
  "/tmdb-discover",
  async (req: Request<{}, any, DiscoverFilters>, res: Response) => {
    try {
      const filters: DiscoverFilters = req.body;

      // Main discovery query
      const mainResults: TMDBDiscoverResponse = await discoverMovies(filters);

      // If we have keywords, also try keyword-based search
      let keywordResults: Pick<TMDBDiscoverResponse, "results"> = {
        results: [],
      };
      if (filters.keywords && filters.keywords.length > 0) {
        try {
          keywordResults = await searchByKeywords(filters.keywords, filters);
        } catch (err) {
          console.error("Keyword search failed:", err);
        }
      }

      // Merge results, prioritizing main results
      const allMovies = [
        ...mainResults.results,
        ...keywordResults.results.filter(
          (kr: TMDBMovie) =>
            !mainResults.results.some((mr: TMDBMovie) => mr.id === kr.id)
        ),
      ].slice(0, 20); // Limit to 20 results

      res.json({
        results: allMovies as TMDBMovie[],
        total_results: mainResults.total_results,
      });
    } catch (error) {
      console.error("TMDB discovery error:", error);
      res.status(500).json({
        error: "Failed to search movies. Please try again.",
      });
    }
  }
);

export default router;

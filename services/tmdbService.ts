// server/services/tmdbService.ts
import fetch from "node-fetch";
import { genresToIds, MovieFilters } from "./aiService";
import type { TMDBDiscoverResponse } from "../types/tmdb";

const TMDB_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE = "https://api.themoviedb.org/3";

export async function discoverMovies(
  filters: MovieFilters
): Promise<TMDBDiscoverResponse> {
  if (!TMDB_KEY) {
    throw new Error("TMDB_API_KEY is missing");
  }

  const params = new URLSearchParams({
    api_key: TMDB_KEY,
    sort_by: filters.sort_by || "popularity.desc",
    "vote_count.gte": "50", // Ensure movies have enough votes
    language: "en-US",
    include_adult: "false",
  });

  // Add genre filtering
  if (filters.genres && filters.genres.length > 0) {
    const genreIds = genresToIds(filters.genres);
    if (genreIds.length > 0) {
      params.set("with_genres", genreIds.join(","));
    }
  }

  // Rating filter
  if (filters.min_rating !== null && filters.min_rating !== undefined) {
    params.set("vote_average.gte", String(filters.min_rating));
  }

  // Year range
  if (filters.year_from) {
    params.set("primary_release_date.gte", `${filters.year_from}-01-01`);
  }

  if (filters.year_to) {
    params.set("primary_release_date.lte", `${filters.year_to}-12-31`);
  }

  // Runtime filter
  if (filters.max_runtime) {
    params.set("with_runtime.lte", String(filters.max_runtime));
  }

  const res = await fetch(`${TMDB_BASE}/discover/movie?${params}`);

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`TMDB error: ${res.status} - ${errorText}`);
  }

  return (await res.json()) as TMDBDiscoverResponse;
}

// Search by keywords if AI extracted specific themes
export async function searchByKeywords(
  keywords: string[],
  filters: MovieFilters
): Promise<Pick<TMDBDiscoverResponse, "results">> {
  if (!TMDB_KEY || keywords.length === 0) {
    return { results: [] };
  }

  // Search for keyword IDs first
  const keywordIds: number[] = [];

  for (const keyword of keywords.slice(0, 3)) {
    // Limit to 3 keywords
    try {
      const res = await fetch(
        `${TMDB_BASE}/search/keyword?api_key=${TMDB_KEY}&query=${encodeURIComponent(
          keyword
        )}`
      );

      if (res.ok) {
        const data: any = await res.json();
        if (data.results && data.results.length > 0) {
          keywordIds.push(data.results[0].id);
        }
      }
    } catch (err) {
      console.error(`Failed to search keyword: ${keyword}`, err);
    }
  }

  // If we found keywords, use them in discovery
  if (keywordIds.length > 0) {
    const params = new URLSearchParams({
      api_key: TMDB_KEY,
      with_keywords: keywordIds.join("|"), // OR logic
      sort_by: filters.sort_by || "popularity.desc",
      "vote_count.gte": "50",
    });

    const res = await fetch(`${TMDB_BASE}/discover/movie?${params}`);

    if (res.ok) {
      const data = (await res.json()) as TMDBDiscoverResponse;
      return { results: data.results };
    }
  }

  return { results: [] };
}
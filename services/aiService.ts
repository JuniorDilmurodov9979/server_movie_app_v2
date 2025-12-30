// server/services/aiService.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type MovieFilters = {
  genres: string[];
  min_rating: number | null;
  year_from: number | null;
  year_to: number | null;
  sort_by: string | null;
  max_runtime: number | null;
  keywords: string[];
};

// TMDB genre mapping
export const GENRE_MAP: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "science fiction": 878,
  "sci-fi": 878,
  thriller: 53,
  war: 10752,
  western: 37,
};

export async function getAIFilters(prompt: string): Promise<MovieFilters> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.1,
    max_tokens: 300,
    messages: [
      {
        role: "system",
        content: `You are a movie query parser. Analyze user prompts and extract movie preferences.

Available genres: ${Object.keys(GENRE_MAP).join(", ")}

Return ONLY valid JSON with this exact schema:
{
  "genres": string[],          // genre names from the list above
  "min_rating": number | null, // 0-10 scale, e.g., 7.5 for "high rating"
  "year_from": number | null,  // e.g., 2010
  "year_to": number | null,    // e.g., 2020
  "sort_by": string | null,    // "popularity.desc", "vote_average.desc", "release_date.desc"
  "max_runtime": number | null,// in minutes
  "keywords": string[]         // key themes/moods like "dark", "gritty", "uplifting"
}

Guidelines:
- "high rating" = min_rating: 7.5
- "underrated" = min_rating: 6.5, sort_by: "vote_count.asc"
- "popular" = sort_by: "popularity.desc"
- "recent" = year_from: current_year - 3
- "classic" = year_to: 1990
- "under 2 hours" = max_runtime: 120
- Extract mood keywords like "dark", "fast-paced", "emotional"

Return ONLY the JSON object, no markdown formatting.`
      },
      {
        role: "user",
        content: prompt
      }
    ],
    response_format: { type: "json_object" }
  });

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new Error("AI returned empty response");
  }

  // Clean any potential markdown
  const cleanText = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  
  const filters = JSON.parse(cleanText) as MovieFilters;
  
  // Validate and set defaults
  return {
    genres: filters.genres || [],
    min_rating: filters.min_rating,
    year_from: filters.year_from,
    year_to: filters.year_to,
    sort_by: filters.sort_by || "popularity.desc",
    max_runtime: filters.max_runtime,
    keywords: filters.keywords || []
  };
}

// Convert genre names to TMDB IDs
export function genresToIds(genreNames: string[]): number[] {
  return genreNames
    .map(name => GENRE_MAP[name.toLowerCase()])
    .filter(id => id !== undefined);
}
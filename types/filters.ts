export interface DiscoverFilters {
  genres: string[]; // TMDB genre IDs
  year?: number; // Release year
  rating?: number; // Minimum vote_average
  keywords: string[]; // TMDB keyword IDs
  sort_by: string; // e.g. "popularity.desc"
  page?: number;
  min_rating: number;
  year_from: number;
  year_to: number;
  max_runtime: number;
}

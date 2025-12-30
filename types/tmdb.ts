export interface TMDBMovie {
  id: number;
  title: string;
  original_title?: string;

  overview: string;
  poster_path: string | null;
  backdrop_path?: string | null;

  release_date: string;
  vote_average: number;
  vote_count?: number;

  popularity?: number;
  adult?: boolean;
  genre_ids?: number[];
}

export interface TMDBDiscoverResponse {
  page?: number;
  results: TMDBMovie[];
  total_results: number;
  total_pages?: number;
}
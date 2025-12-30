export interface Movie {
  title: string;
  originalTitle: string;
  year: number;
  rating: number;
  ratingCount: number;
  directors: string[];
  actors: string[];
  genres: string[];
  countries: string[];
  duration: string;
  summary: string;
  coverImageUrl: string;
  localCoverPath: string;
  doubanUrl: string;
  rank: number;
  quote?: string;
  releaseDate: string;
  imdbId?: string;
  language: string;
  aka: string[];
}

export interface ScraperConfig {
  baseUrl: string;
  totalPages: number;
  itemsPerPage: number;
  outputDir: string;
  imagesDir: string;
  delayBetweenRequests: number;
}
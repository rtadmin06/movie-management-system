export interface Movie {
  _id: string;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface Comment {
  _id: string;
  movieId: string;
  userId: string;
  username: string;
  content: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface RegisterData extends LoginData {
  email?: string;
}
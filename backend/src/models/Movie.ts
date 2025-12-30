import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
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
  createdAt: Date;
  updatedAt: Date;
}

const MovieSchema: Schema = new Schema({
  title: { type: String, required: true, index: true },
  originalTitle: { type: String, required: true },
  year: { type: Number, required: true, index: true },
  rating: { type: Number, required: true, index: true },
  ratingCount: { type: Number, default: 0 },
  directors: [{ type: String }],
  actors: [{ type: String }],
  genres: [{ type: String, index: true }],
  countries: [{ type: String }],
  duration: { type: String },
  summary: { type: String, text: true },
  coverImageUrl: { type: String },
  localCoverPath: { type: String },
  doubanUrl: { type: String },
  rank: { type: Number, unique: true },
  quote: { type: String },
  releaseDate: { type: String },
  imdbId: { type: String },
  language: { type: String },
  aka: [{ type: String }]
}, {
  timestamps: true
});

MovieSchema.index(
  { title: 'text', summary: 'text', originalTitle: 'text' },
  { language_override: 'none' }
);

export default mongoose.model<IMovie>('Movie', MovieSchema);
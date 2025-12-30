import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  userId: mongoose.Types.ObjectId;
  movieId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema: Schema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  movieId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true 
  }
}, {
  timestamps: true
});

// 确保用户不能重复收藏同一部电影
FavoriteSchema.index({ userId: 1, movieId: 1 }, { unique: true });

export const Favorite = mongoose.model<IFavorite>('Favorite', FavoriteSchema);
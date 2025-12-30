import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  movieId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  username: string;
  content: string;
  rating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema({
  movieId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Movie', 
    required: true,
    index: true
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  content: { 
    type: String, 
    required: true,
    maxlength: 1000
  },
  rating: { 
    type: Number,
    min: 0,
    max: 10
  }
}, {
  timestamps: true
});

export const Comment = mongoose.model<IComment>('Comment', CommentSchema);
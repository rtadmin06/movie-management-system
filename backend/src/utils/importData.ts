import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import Movie from '../models/Movie';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/movie_management';
const JSON_FILE_PATH = path.join(__dirname, '../../../crawler/data/movies.json');

async function importData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');

    console.log('Reading movies data from:', JSON_FILE_PATH);
    const jsonData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
    const movies = JSON.parse(jsonData);
    console.log(`Found ${movies.length} movies to import`);

    console.log('Clearing existing movies...');
    await Movie.deleteMany({});

    console.log('Importing movies...');
    let successCount = 0;
    let errorCount = 0;

    for (const movieData of movies) {
      try {
        const movie = new Movie(movieData);
        await movie.save();
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`Imported ${successCount}/${movies.length} movies...`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`Error importing movie "${movieData.title}":`, error.message);
      }
    }

    console.log('\n===========================================');
    console.log('Import completed!');
    console.log(`Successfully imported: ${successCount} movies`);
    console.log(`Failed: ${errorCount} movies`);
    console.log('===========================================\n');

    console.log('Creating text index for full-text search...');
    
    try {
      await Movie.collection.dropIndexes();
    } catch (e) {
      // 忽略索引不存在的错误
    }

    await Movie.collection.createIndex(
      { title: 'text', summary: 'text', originalTitle: 'text' },
      { language_override: 'none' }
    );
    
    console.log('Text index created successfully');

    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Import failed:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

importData();
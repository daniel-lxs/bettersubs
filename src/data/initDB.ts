import { Database } from 'bun:sqlite';

const db = new Database('./src/data/db/sqlite.db', { create: true });

export function initDb() {
  if (!db) {
    throw new Error('Database is invalid or nonexistent');
  }

  try {
    const query = db.query(`CREATE TABLE IF NOT EXISTS feature_details (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      featureType TEXT,
      year TEXT,
      title TEXT,
      featureName TEXT,
      imdbId TEXT,
      seasonNumber INTEGER,
      episodeNumber INTEGER
    );
    
    CREATE TABLE IF NOT EXISTS subtitles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      externalId TEXT,
      provider TEXT,
      fileId TEXT,
      createdOn TEXT,
      url TEXT,
      releaseName TEXT,
      language TEXT,
      featureDetailsId INTEGER, -- Foreign key referencing feature_details table
      comments TEXT,
      downloadCount INTEGER,
      FOREIGN KEY (featureDetailsId) REFERENCES feature_details(id)
    );`);

    query.run();
    console.log('SQLite database initialized successfully.');
  } catch (error) {
    console.error('Error initializing SQLite database:', error);
    process.exit(1);
  }
}

initDb();

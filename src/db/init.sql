CREATE TABLE IF NOT EXISTS subtitles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  originId TEXT,
  provider TEXT,
  fileId TEXT,
  createdOn TEXT,
  url TEXT,
  releaseName TEXT,
  featureType TEXT,
  year INTEGER,
  title TEXT,
  featureName TEXT,
  imdbId TEXT,
  seasonNumber INTEGER,
  episodeNumber INTEGER,
  comments TEXT,
  downloadCount INTEGER
);

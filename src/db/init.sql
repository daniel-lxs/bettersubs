CREATE TABLE IF NOT EXISTS feature_details (
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
);

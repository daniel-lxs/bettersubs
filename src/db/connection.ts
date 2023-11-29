import { Database } from 'bun:sqlite';

const db = new Database('./src/db/sqlite.db', { create: true });

export function getDb(): Database {
  if (!db) {
    throw new Error('Database is invalid or nonexistent');
  }
  return db;
}

import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT COUNT(*) as count FROM batch_items", [], (err, rows) => {
  console.log(`📦 Total Ítems Registrados en batch_items: ${rows[0].count}`);
});

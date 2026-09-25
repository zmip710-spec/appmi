import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const db = new sqlite3.Database(dbPath);

console.log("Ejecutando eliminación permanente de productos de prueba en:", dbPath);

db.serialize(() => {
  db.run("DELETE FROM transfer_items");
  db.run("DELETE FROM inventory_transfers");
  db.run("DELETE FROM store_inventory");
  db.run("DELETE FROM products");
  db.run("DELETE FROM inventory");
  db.run("DELETE FROM batch_items");
  db.run("DELETE FROM batches");
  db.run("DELETE FROM transactions");
  db.run("DELETE FROM price_history");
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('products', 'store_inventory', 'inventory_transfers', 'transfer_items', 'inventory', 'batches', 'batch_items', 'transactions', 'price_history')");
  
  db.run(`
    INSERT OR IGNORE INTO stores (id, name) VALUES 
    ('tienda_1', 'Tienda Central'),
    ('tienda_2', 'Sucursal Norte'),
    ('tienda_3', 'Sucursal Sur')
  `);

  console.log("✅ Eliminación completada. La base de datos está totalmente limpia sin productos demo.");
});

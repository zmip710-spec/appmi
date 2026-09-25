import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT id, sku, name, brand, model, stock, unitCost FROM inventory ORDER BY id ASC", [], (err, rows) => {
  console.log(`Total filas en inventario: ${rows.length}`);
  const totalStock = rows.reduce((s, r) => s + r.stock, 0);
  console.log(`Total stock acumulado: ${totalStock}`);

  // Find any row with stock > 15 or odd count
  rows.forEach((r, idx) => {
    console.log(`${idx + 1}. [${r.sku}] Brand: "${r.brand}" | Model: "${r.model}" | Name: "${r.name}" | Stock: ${r.stock} | Landed: $${r.unitCost}`);
  });
});

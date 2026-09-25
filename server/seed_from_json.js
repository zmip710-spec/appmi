import fs from 'fs';
import path from 'path';
import http from 'http';
import sqlite3 from 'sqlite3';

const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const jsonPath = path.resolve('seed_batch_oficial.json');
const batchPayload = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Step 1: Wipe previous test data cleanly (keep users)
db.serialize(() => {
  db.run("DELETE FROM batch_items", () => {});
  db.run("DELETE FROM batches", () => {});
  db.run("DELETE FROM inventory", () => {});
  db.run("DELETE FROM price_history", () => {
    console.log("🧹 1. Base de datos vaciada correctamente.");
    sendJsonBatchRequest();
  });
});

function sendJsonBatchRequest() {
  const postData = JSON.stringify(batchPayload);

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/batches',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log(`🚀 2. Ejecutando seed desde '${jsonPath}'...`);
  console.log(`📦 Nombre de Lote: ${batchPayload.name}`);
  console.log(`📊 Productos en JSON: ${batchPayload.items.length}`);

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const parsed = JSON.parse(data);
        console.log(`✅ ¡Lote registrado exitosamente! ID: ${parsed.id}`);

        // Step 3: Check SQLite database counts
        db.all("SELECT * FROM inventory ORDER BY id ASC", [], (err, rows) => {
          if (err) {
            console.error("Error al consultar inventario:", err.message);
            return;
          }

          const totalUnits = rows.reduce((sum, r) => sum + (r.stock || 0), 0);
          console.log(`\n📊 VERIFICACIÓN FINAL EN BASE DE DATOS:`);
          console.log(`• Total Filas en 'batch_items': ${parsed.items.length}`);
          console.log(`• Total Filas Únicas en 'inventory': ${rows.length}`);
          console.log(`• Total Unidades Físicas en Stock: ${totalUnits}`);

          if (rows.length === 66 && totalUnits === 510) {
            console.log("\n🎉 ¡ÉXITO TOTAL! EXACTAMENTE 66 ÍTEMS Y 510 UNIDADES EN STOCK.");
          } else {
            console.warn(`\n⚠️ Filas: ${rows.length}/66 | Unidades: ${totalUnits}/510`);
          }
        });
      } else {
        console.error(`❌ Error en respuesta del servidor (${res.statusCode}):`, data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error de conexión HTTP: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

import sqlite3 from 'sqlite3';
import path from 'path';
import http from 'http';

const dbPath = path.resolve('server/database.sqlite');
const db = new sqlite3.Database(dbPath);

const rawProducts = [
  {"name": "Pantalla", "brand": "Samsung", "model": "A16 4G/5G/A17 4G/5G/A26 5G", "quality": "INCELL", "qty": 5, "fob": 6.60},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A16 4G", "quality": "INCELL", "qty": 15, "fob": 7.50},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A32 4G", "quality": "INCELL", "qty": 2, "fob": 7.10},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A15", "quality": "INCELL", "qty": 15, "fob": 7.10},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A25", "quality": "OLED Big 6.52", "qty": 2, "fob": 25.90},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A32 4g", "quality": "OLED Big", "qty": 2, "fob": 20.30},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A35", "quality": "OLED Big 6.67", "qty": 2, "fob": 24.20},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "Z Flip 7", "quality": "Original", "qty": 1, "fob": 249.00},
  {"name": "Pantalla", "brand": "Samsung", "model": "A03S/A02S/A04E", "quality": "Original", "qty": 10, "fob": 5.10},
  {"name": "Pantalla", "brand": "Samsung", "model": "A05", "quality": "Original", "qty": 15, "fob": 5.40},
  {"name": "Pantalla", "brand": "Samsung", "model": "A05s", "quality": "Original", "qty": 10, "fob": 6.20},
  {"name": "Pantalla", "brand": "Samsung", "model": "A06 4G", "quality": "Original", "qty": 15, "fob": 5.40},
  {"name": "Pantalla", "brand": "Samsung", "model": "A20S", "quality": "Original", "qty": 3, "fob": 5.50},
  {"name": "Pantalla", "brand": "Samsung", "model": "A22 5G", "quality": "Original", "qty": 5, "fob": 6.10},
  {"name": "Pantalla", "brand": "Honor", "model": "Honor 90 Lite", "quality": "Original", "qty": 5, "fob": 8.90},
  {"name": "Pantalla", "brand": "Honor", "model": "X5B/X5B Plus/X5 Plus/X6A/X6A Plus", "quality": "Original", "qty": 10, "fob": 5.30},
  {"name": "Pantalla", "brand": "Honor", "model": "X5C", "quality": "Original", "qty": 10, "fob": 6.20},
  {"name": "Pantalla", "brand": "Honor", "model": "X6B", "quality": "Original", "qty": 10, "fob": 5.30},
  {"name": "Pantalla", "brand": "Honor", "model": "X6C", "quality": "Original", "qty": 10, "fob": 5.80},
  {"name": "Pantalla", "brand": "Moto", "model": "G35", "quality": "Original", "qty": 2, "fob": 6.00},
  {"name": "Pantalla", "brand": "Motorola", "model": "G06", "quality": "Original", "qty": 10, "fob": 6.20},
  {"name": "Pantalla", "brand": "Redmi", "model": "Redmi A3", "quality": "Original", "qty": 5, "fob": 5.30},
  {"name": "Pantalla", "brand": "Redmi", "model": "Redmi A5", "quality": "Original", "qty": 5, "fob": 5.60},
  {"name": "Pantalla", "brand": "Tecno", "model": "Go 1", "quality": "Original", "qty": 10, "fob": 5.30},
  {"name": "Pantalla", "brand": "Zte", "model": "A35", "quality": "Original", "qty": 10, "fob": 6.70},
  {"name": "Pantalla", "brand": "ZTE", "model": "A36", "quality": "Original", "qty": 10, "fob": 7.50},
  {"name": "Pantalla", "brand": "Samsung", "model": "A13 4G/A23 4G/A23 5G", "quality": "Original", "qty": 10, "fob": 5.80},
  {"name": "Pantalla", "brand": "Samsung", "model": "A04S/A13 5G", "quality": "Original", "qty": 10, "fob": 5.10},
  {"name": "Pantalla", "brand": "Samsung", "model": "A12/A02/A32 5G", "quality": "Original", "qty": 6, "fob": 5.10},
  {"name": "Pantalla", "brand": "Samsung", "model": "A21S", "quality": "Original", "qty": 6, "fob": 7.10},
  {"name": "Pantalla", "brand": "Tecno/Infinix", "model": "Spark 30C", "quality": "Original", "qty": 5, "fob": 5.40},
  {"name": "Pantalla", "brand": "Iphone", "model": "13", "quality": "OLED SOFT", "qty": 1, "fob": 33.00},
  {"name": "Charging Flex", "brand": "Samsung", "model": "A05", "quality": "Original", "qty": 15, "fob": 1.80},
  {"name": "Charging Flex", "brand": "Samsung", "model": "A05S", "quality": "Original", "qty": 10, "fob": 1.80},
  {"name": "Charging Flex", "brand": "Samsung", "model": "A06 5G", "quality": "Original", "qty": 10, "fob": 6.10},
  {"name": "Charging Flex", "brand": "Samsung", "model": "S22 Ultra 5G/S908B", "quality": "Original", "qty": 3, "fob": 8.30},
  {"name": "Charging Flex", "brand": "Samsung", "model": "S23 Ultra/S918B", "quality": "Original", "qty": 3, "fob": 6.90},
  {"name": "Charging Flex", "brand": "Samsung", "model": "S24 Ultra/S928B", "quality": "Original", "qty": 3, "fob": 8.70},
  {"name": "Charging Flex", "brand": "Samsung", "model": "S25 Ultra/S938B", "quality": "Original", "qty": 3, "fob": 8.70},
  {"name": "Charging Flex", "brand": "Samsung", "model": "S26 Ultra/S948B", "quality": "Original", "qty": 3, "fob": 10.80},
  {"name": "Pantalla Tablet", "brand": "Samsung", "model": "T500", "quality": "Original", "qty": 1, "fob": 16.00},
  {"name": "Pantalla Con Marco", "brand": "Samsung", "model": "A25", "quality": "INCELL", "qty": 1, "fob": 0.00},
  {"name": "Pantalla", "brand": "Samsung", "model": "A04S", "quality": "Original", "qty": 1, "fob": 0.00},
  {"name": "Pantalla", "brand": "Honor", "model": "X6B", "quality": "Original", "qty": 1, "fob": 0.00},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone X", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone Xs", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone Xs Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 11 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 11 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 12 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 12/12 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 13", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 13 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 13 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 14", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 14 Plus", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 14 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 14 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 15", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 15 Plus", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 15 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 15 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 16", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 16 Plus", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 16 Pro", "quality": "Standard", "qty": 10, "fob": 0.45},
  {"name": "Glass / Mica", "brand": "Apple", "model": "iPhone 16 Pro Max", "quality": "Standard", "qty": 10, "fob": 0.45}
];

// Clean SQLite database first
db.serialize(() => {
  db.run("DELETE FROM batch_items", () => {});
  db.run("DELETE FROM batches", () => {});
  db.run("DELETE FROM inventory", () => {});
  db.run("DELETE FROM price_history", () => {
    console.log("🧹 Tablas de SQLite limpiadas completamente.");
    sendBatchRequest();
  });
});

function sendBatchRequest() {
  const batchPayload = {
    name: "Lote Comercial #01 - Repuestos Teléfonos",
    totalCustomsTax: 810.64,
    totalShippingCost: 260.00,
    exchangeRateGtq: 7.80,
    profitMarginPct: 15.0,
    costUpdateStrategy: "weighted",
    items: rawProducts.map((item, index) => {
      const skuNum = (index + 1).toString().padStart(3, '0');
      const sku = `PROD-${skuNum}`;
      const formattedName = item.quality && item.quality !== 'Standard' ? `${item.name} (${item.quality})` : item.name;
      return {
        sku,
        productName: formattedName,
        brand: item.brand,
        model: item.model,
        quantity: item.qty,
        unitCostFob: item.fob
      };
    })
  };

  const postData = JSON.stringify(batchPayload);

  const options = {
    hostname: 'localhost',
    port: 4000,
    path: '/api/batches',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  console.log('🚀 Registrando Lote Completo de 66 Productos (510 Unidades) con Costo Real de Aduana ($810.64 USD)...');

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const parsed = JSON.parse(data);
        console.log('✅ ¡Lote de 66 productos inyectado con ÉXITO!');
        console.log(`📌 ID Lote: ${parsed.id}`);
        console.log(`📦 Productos Procesados en Lote: ${parsed.items.length}`);
        
        // Verify inventory table count and sum of units
        db.all("SELECT * FROM inventory", [], (err, rows) => {
          if (err) {
            console.error("Error al consultar inventario:", err.message);
            return;
          }
          const totalUnits = rows.reduce((sum, r) => sum + (r.stock || 0), 0);
          console.log(`📊 TOTAL FILAS EN INVENTARIO (PRODUCTOS): ${rows.length}`);
          console.log(`📦 TOTAL UNIDADES DISPONIBLES EN STOCK: ${totalUnits}`);

          if (rows.length === 66 && totalUnits === 510) {
            console.log("🎉 ¡VERIFICACIÓN EXITOSA! 66 Productos y 510 Unidades Exactas Registradas.");
          } else {
            console.warn(`⚠️ Atención: Filas en BD: ${rows.length}/66 | Unidades: ${totalUnits}/510`);
          }
        });
      } else {
        console.error(`❌ Error en respuesta (${res.statusCode}):`, data);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Error de conexión: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

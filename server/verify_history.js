import http from 'http';

function checkHistory(sku) {
  return new Promise((resolve) => {
    http.get(`http://localhost:3000/api/inventory/history/${sku}`, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch {
          resolve([]);
        }
      });
    });
  });
}

async function runVerification() {
  console.log("🔍 COMPROBANDO HISTORIAL DE PRECIOS POR SKU:");
  for (const sku of ['PROD-015', 'PROD-001', 'PROD-018', 'PROD-044', 'PROD-066']) {
    const history = await checkHistory(sku);
    console.log(`\n📌 SKU: ${sku} -> Total Entradas en Histórico: ${history.length}`);
    history.forEach((h, idx) => {
      console.log(`  Entry #${idx + 1}: Lote: ${h.batchName} (${h.batchId}) | Costo Anterior: $${h.oldCost} | Costo Nuevo: $${h.newCost} | Variación (delta): $${h.delta} | Pct: ${h.pct}%`);
    });
  }
}

runVerification();

import db from './database.js';

console.log('🧹 Vaciando la base de datos (preservando únicamente los usuarios)...');

const tablesToWipe = ['transactions', 'batch_items', 'batches', 'inventory', 'price_history'];

async function wipeDatabase() {
  // Give database initialization time to complete
  await new Promise(resolve => setTimeout(resolve, 500));

  for (const table of tablesToWipe) {
    await new Promise((resolve) => {
      db.run(`DELETE FROM ${table}`, [], (err) => {
        if (err) console.error(`Error al limpiar ${table}:`, err.message);
        else console.log(`✓ Tabla ${table} vaciada.`);
        resolve();
      });
    });
  }

  // Vacuum if SQLite
  if (!db.isPg) {
    await new Promise((resolve) => {
      db.run('VACUUM', [], () => resolve());
    });
  }

  setTimeout(() => {
    console.log('\n📊 ESTADO FINAL DE LA BASE DE DATOS:');
    db.get('SELECT COUNT(*) as cnt FROM users', [], (e, r) => console.log(`• usuarios (users): ${r ? r.cnt : 0} usuarios activos (PRESERVADO)`));
    db.get('SELECT COUNT(*) as cnt FROM inventory', [], (e, r) => console.log(`• inventario (inventory): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM batches', [], (e, r) => console.log(`• lotes (batches): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM batch_items', [], (e, r) => console.log(`• ítems de lotes (batch_items): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM transactions', [], (e, r) => console.log(`• ventas (transactions): ${r ? r.cnt : 0} filas`));
    db.get('SELECT COUNT(*) as cnt FROM price_history', [], (e, r) => console.log(`• historial de precios (price_history): ${r ? r.cnt : 0} filas`));
    
    setTimeout(() => {
      console.log('\n✨ ¡Base de datos vaciada completamente con éxito!');
      process.exit(0);
    }, 500);
  }, 500);
}

wipeDatabase();

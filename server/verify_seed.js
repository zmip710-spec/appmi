import http from 'http';

http.get('http://localhost:3000/api/inventory', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const inv = JSON.parse(data);
    console.log(`📊 Total Productos en Inventario SQLite: ${inv.length}`);
    console.log('--- MUESTRA DE PRIMEROS 5 PRODUCTOS ---');
    inv.slice(0, 5).forEach(p => {
      console.log(`• SKU: ${p.sku} | Marca: ${p.brand} | Modelo: ${p.model} | Nombre: ${p.name} | Stock: ${p.stock} | Landed: $${p.unitCost} USD`);
    });
    console.log('--- MUESTRA DE ÚLTIMOS 5 PRODUCTOS ---');
    inv.slice(-5).forEach(p => {
      console.log(`• SKU: ${p.sku} | Marca: ${p.brand} | Modelo: ${p.model} | Nombre: ${p.name} | Stock: ${p.stock} | Landed: $${p.unitCost} USD`);
    });
  });
});

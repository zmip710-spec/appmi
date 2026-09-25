import { User, DashboardStats, InventoryProduct, Transaction, ImportBatch } from '../services/api';

interface ExportContextData {
  activeTab: string;
  user: User | null;
  stats: DashboardStats;
  inventory: InventoryProduct[];
  transactions: Transaction[];
  batches: ImportBatch[];
  users: User[];
}

const fallbackImage = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80';

const getBaseStyles = () => `
  @page { size: A4; margin: 12mm; }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; margin: 0; padding: 0; font-size: 11px; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-size: 22px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .subbrand { font-size: 11px; color: #64748b; font-weight: 500; }
  .meta { text-align: right; font-size: 10px; color: #475569; }
  
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
  .kpi-card { background: #f8fafc !important; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; }
  .kpi-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 2px; }
  .kpi-val { font-size: 15px; font-weight: 800; color: #0f172a; }
  .kpi-sub { font-size: 9px; color: #10b981; font-weight: 600; margin-top: 2px; }

  .section-title { font-size: 13px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 16px; margin-bottom: 10px; }
  
  /* Printable SVG Vector Charts Styling */
  .charts-container { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; margin-bottom: 20px; }
  .chart-box { background: #f8fafc !important; border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
  .chart-box-title { font-size: 11px; font-weight: 700; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  
  .legend-container { margin-top: 10px; display: flex; flex-direction: column; gap: 6px; }
  .legend-item { display: flex; justify-content: space-between; font-size: 10px; align-items: center; }
  .legend-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; margin-right: 6px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
  th { background: #f1f5f9 !important; text-align: left; padding: 6px 8px; font-weight: 700; color: #475569; border-bottom: 2px solid #cbd5e1; text-transform: uppercase; font-size: 8px; }
  td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: middle; }
  tr:nth-child(even) { background: #f8fafc !important; }
  
  .thumb-img { width: 34px; height: 34px; object-fit: cover; border-radius: 6px; border: 1px solid #cbd5e1; display: block; }
  .avatar-img { width: 32px; height: 32px; object-fit: cover; border-radius: 50%; border: 1px solid #cbd5e1; display: block; }
  
  .badge { padding: 2px 6px; border-radius: 4px; font-size: 8px; font-weight: 700; display: inline-block; }
  .badge-green { background: #dcfce7 !important; color: #15803d !important; }
  .badge-amber { background: #fef3c7 !important; color: #b45309 !important; }
  .badge-rose { background: #ffe4e6 !important; color: #be123c !important; }
  .badge-blue { background: #dbeafe !important; color: #1e40af !important; }
  
  .footer { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 8px; text-align: center; font-size: 9px; color: #94a3b8; }
`;

export const exportViewPdf = ({ activeTab, user, stats, inventory, transactions, batches, users }: ExportContextData) => {
  const currentDate = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let reportTitle = '';
  let bodyContent = '';

  // Calculate Chart Ciphers from real SQLite Stats
  const totalSales = stats.totalSales || 0;
  const totalExpenses = stats.totalImportExpenses || 0;
  const inventoryValue = stats.inventoryValue || 0;
  const customsTax = stats.customsTaxPaid || 0;
  const shippingCost = stats.shippingPaid || 0;

  const maxVal = Math.max(totalSales, inventoryValue, totalExpenses, customsTax, shippingCost, 1);
  
  const getBarHeight = (val: number) => Math.max(12, Math.round((val / maxVal) * 110));

  const grandTotal = totalSales + inventoryValue + totalExpenses;
  const salesPct = grandTotal > 0 ? parseFloat(((totalSales / grandTotal) * 100).toFixed(1)) : 0;
  const invPct = grandTotal > 0 ? parseFloat(((inventoryValue / grandTotal) * 100).toFixed(1)) : 0;
  const expPct = grandTotal > 0 ? parseFloat(((totalExpenses / grandTotal) * 100).toFixed(1)) : 0;

  // Render SVG Vector Graphics for 100% Crisp PDF Chart Printing
  const renderVisualChartsHtml = () => `
    <div class="section-title">Análisis Visual de Gráficas Financieras</div>
    <div class="charts-container">
      
      <!-- 1. SVG Vector Bar Chart -->
      <div class="chart-box">
        <div class="chart-box-title">📊 Gráfica Comparativa de Valores ($USD)</div>
        <svg width="100%" height="160" viewBox="0 0 350 160" style="overflow: visible;">
          <!-- Grid Lines -->
          <line x1="0" y1="130" x2="350" y2="130" stroke="#cbd5e1" stroke-width="1.5" />
          <line x1="0" y1="80" x2="350" y2="80" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
          <line x1="0" y1="30" x2="350" y2="30" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />

          <!-- Bar 1: Ventas -->
          <g>
            <text x="35" y="${125 - getBarHeight(totalSales)}" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">$${totalSales.toFixed(0)}</text>
            <rect x="15" y="${130 - getBarHeight(totalSales)}" width="40" height="${getBarHeight(totalSales)}" fill="#10b981" rx="4" />
            <text x="35" y="146" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">Ventas</text>
          </g>

          <!-- Bar 2: Inventario -->
          <g>
            <text x="105" y="${125 - getBarHeight(inventoryValue)}" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">$${inventoryValue.toFixed(0)}</text>
            <rect x="85" y="${130 - getBarHeight(inventoryValue)}" width="40" height="${getBarHeight(inventoryValue)}" fill="#3b82f6" rx="4" />
            <text x="105" y="146" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">Inventario</text>
          </g>

          <!-- Bar 3: Importación -->
          <g>
            <text x="175" y="${125 - getBarHeight(totalExpenses)}" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">$${totalExpenses.toFixed(0)}</text>
            <rect x="155" y="${130 - getBarHeight(totalExpenses)}" width="40" height="${getBarHeight(totalExpenses)}" fill="#6366f1" rx="4" />
            <text x="175" y="146" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">Importación</text>
          </g>

          <!-- Bar 4: Aduana -->
          <g>
            <text x="245" y="${125 - getBarHeight(customsTax)}" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">$${customsTax.toFixed(0)}</text>
            <rect x="225" y="${130 - getBarHeight(customsTax)}" width="40" height="${getBarHeight(customsTax)}" fill="#f59e0b" rx="4" />
            <text x="245" y="146" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">Aduana</text>
          </g>

          <!-- Bar 5: Fletes -->
          <g>
            <text x="315" y="${125 - getBarHeight(shippingCost)}" font-size="9" font-weight="bold" fill="#0f172a" text-anchor="middle">$${shippingCost.toFixed(0)}</text>
            <rect x="295" y="${130 - getBarHeight(shippingCost)}" width="40" height="${getBarHeight(shippingCost)}" fill="#ec4899" rx="4" />
            <text x="315" y="146" font-size="9" font-weight="bold" fill="#475569" text-anchor="middle">Fletes</text>
          </g>
        </svg>
      </div>

      <!-- 2. SVG Vector Donut / Distribution Bar Chart -->
      <div class="chart-box">
        <div class="chart-box-title">🥧 Distribución Porcentual</div>
        
        <svg width="100%" height="45" viewBox="0 0 200 45">
          <rect x="0" y="10" width="200" height="18" fill="#e2e8f0" rx="9" />
          <rect x="0" y="10" width="${salesPct * 2}" height="18" fill="#10b981" rx="4" />
          <rect x="${salesPct * 2}" y="10" width="${invPct * 2}" height="18" fill="#3b82f6" />
          <rect x="${(salesPct + invPct) * 2}" y="10" width="${expPct * 2}" height="18" fill="#6366f1" rx="4" />
        </svg>

        <div class="legend-container">
          <div class="legend-item">
            <span><span class="legend-dot" style="background: #10b981;"></span>Ventas Totales</span>
            <strong>${salesPct}%</strong>
          </div>
          <div class="legend-item">
            <span><span class="legend-dot" style="background: #3b82f6;"></span>Valor Inventario</span>
            <strong>${invPct}%</strong>
          </div>
          <div class="legend-item">
            <span><span class="legend-dot" style="background: #6366f1;"></span>Gastos Importación</span>
            <strong>${expPct}%</strong>
          </div>
        </div>
      </div>

    </div>
  `;

  switch (activeTab) {
    case 'inventory':
      reportTitle = 'Reporte Oficial de Inventario & Stock Físico';
      bodyContent = `
        <div class="section-title">Catálogo Consolidado por SKU y Salud de Stock (${inventory.length} Productos)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">Foto</th>
              <th>Código SKU</th>
              <th>Nombre del Producto</th>
              <th>Categoría</th>
              <th>Salud Stock</th>
              <th>Stock Físico</th>
              <th>Costo Landed</th>
              <th>Valor Total GTQ</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(p => {
              let healthBadge = '<span class="badge badge-green">🟢 Saludable</span>';
              if (p.stock === 0) healthBadge = '<span class="badge badge-rose">🔴 Agotado</span>';
              else if (p.stock <= 5) healthBadge = '<span class="badge badge-amber">🟡 Reordenar</span>';
              const costGtq = (p.unitCost || 0) * 7.80;
              const totalGtq = p.stock * costGtq;

              return `
                <tr>
                  <td><img src="${p.image || fallbackImage}" class="thumb-img" alt="${p.name}" /></td>
                  <td><strong>${p.sku}</strong></td>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.category || 'General'}</td>
                  <td>${healthBadge}</td>
                  <td><strong>${p.stock} uds</strong></td>
                  <td>Q ${costGtq.toFixed(2)}</td>
                  <td><strong>Q ${totalGtq.toFixed(2)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
      break;

    case 'sales':
      reportTitle = 'Reporte Oficial de Ventas & Transacciones POS';
      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Ingresos Totales</div>
            <div class="kpi-val">$${stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Recaudado en SQLite</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Ventas Completadas</div>
            <div class="kpi-val">${stats.completedSalesCount} Ventas</div>
            <div class="kpi-sub">Transacciones procesadas</div>
          </div>
        </div>

        <div class="section-title">Historial Completo de Transacciones</div>
        <table>
          <thead>
            <tr>
              <th>ID Transacción</th>
              <th>Cliente</th>
              <th>Producto / Servicio</th>
              <th>Fecha</th>
              <th>Monto Recaudado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.client}</td>
                <td>${t.service}</td>
                <td>${t.date}</td>
                <td><strong>${t.amount}</strong></td>
                <td>
                  <span class="badge ${t.status === 'Completado' ? 'badge-green' : 'badge-amber'}">
                    ${t.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;

    case 'batches':
      reportTitle = 'Reporte de Lotes de Importación & Gastos de Aduana';
      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Total Gastos Importación</div>
            <div class="kpi-val">$${stats.totalImportExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Aduana + Fletes</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Impuestos Aduana</div>
            <div class="kpi-val">$${stats.customsTaxPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Pagados en aduana</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Fletes de Envío</div>
            <div class="kpi-val">$${stats.shippingPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Transporte pagado</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Lotes Recibidos</div>
            <div class="kpi-val">${stats.totalBatchesCount} Lotes</div>
            <div class="kpi-sub">Procesados</div>
          </div>
        </div>

        <div class="section-title">Desglose de Lotes Registrados en SQLite</div>
        ${batches.map(b => `
          <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 8px;">
              <span>${b.name} (${b.id})</span>
              <span style="color: #2563eb;">Aduana: $${b.totalCustomsTax.toFixed(2)} | Flete: $${b.totalShippingCost.toFixed(2)}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Foto</th>
                  <th>SKU</th>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Costo FOB</th>
                  <th>% Impuesto Prorrateado</th>
                  <th>Costo Landed Final</th>
                </tr>
              </thead>
              <tbody>
                ${(b.items || []).map(item => `
                  <tr>
                    <td><img src="${item.image || fallbackImage}" class="thumb-img" /></td>
                    <td><strong>${item.sku}</strong></td>
                    <td>${item.productName}</td>
                    <td>${item.quantity} uds</td>
                    <td>$${item.unitCostFob.toFixed(2)}</td>
                    <td>+$${(item.unitTax || 0).toFixed(2)} (${item.sharePercentage}%)</td>
                    <td><strong>$${(item.finalUnitCost || item.unitCostFob).toFixed(2)} USD</strong></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `).join('')}
      `;
      break;

    case 'analytics':
      reportTitle = 'Reporte de Inteligencia de Negocios & Analítica Landed Cost';
      bodyContent = `
        ${renderVisualChartsHtml()}

        <div class="section-title">Métricas de Evaluación de Productos</div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Producto</th>
              <th>Stock Físico</th>
              <th>Costo Landed Unitario</th>
              <th>Valor Total en Almacén</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(p => `
              <tr>
                <td><strong>${p.sku}</strong></td>
                <td>${p.name}</td>
                <td>${p.stock} uds</td>
                <td>$${p.unitCost.toFixed(2)} USD</td>
                <td><strong>$${(p.stock * p.unitCost).toFixed(2)} USD</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;

    case 'users':
      reportTitle = 'Reporte Oficial del Equipo de Trabajo & Usuarios de Sistema';
      bodyContent = `
        <div class="section-title">Directorio de Miembros Registrados (${users.length} Usuarios)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 45px;">Avatar</th>
              <th>Nombre Completo</th>
              <th>Correo Electrónico</th>
              <th>Rol en la Empresa</th>
              <th>Estado</th>
              <th>Último Acceso</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td><img src="${u.avatar}" class="avatar-img" alt="${u.name}" /></td>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span class="badge badge-blue">${u.role}</span></td>
                <td><span class="badge ${u.status === 'Activo' ? 'badge-green' : 'badge-rose'}">${u.status}</span></td>
                <td>${u.lastLogin}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;

    default: // Dashboard PDF: ONLY KPIs, Vector Charts, Sales & Transactions (NO product descriptions)
      reportTitle = 'Reporte Ejecutivo Dashboard (Gráficas, Ventas & Transacciones)';
      bodyContent = `
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-title">Ventas Totales</div>
            <div class="kpi-val">$${stats.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">${stats.completedSalesCount} Ventas completadas</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Stock en Almacén</div>
            <div class="kpi-val">${stats.totalStock} uds</div>
            <div class="kpi-sub">Físico disponible</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Gastos Importación</div>
            <div class="kpi-val">$${stats.totalImportExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            <div class="kpi-sub">Aduana + Fletes</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-title">Catálogo SKUs</div>
            <div class="kpi-val">${stats.totalSkus} SKUs</div>
            <div class="kpi-sub">Productos únicos</div>
          </div>
        </div>

        ${renderVisualChartsHtml()}

        <div class="section-title">Historial Completo de Ventas & Transacciones Recientes</div>
        <table>
          <thead>
            <tr>
              <th>ID Transacción</th>
              <th>Cliente</th>
              <th>Producto / Servicio Sold</th>
              <th>Fecha</th>
              <th>Monto Recaudado</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(t => `
              <tr>
                <td><strong>${t.id}</strong></td>
                <td>${t.client}</td>
                <td>${t.service}</td>
                <td>${t.date}</td>
                <td><strong>${t.amount}</strong></td>
                <td>
                  <span class="badge ${t.status === 'Completado' ? 'badge-green' : 'badge-amber'}">
                    ${t.status}
                  </span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      break;
  }

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>AppG - ${reportTitle} - ${currentDate}</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">AppG</div>
          <div class="subbrand">${reportTitle}</div>
        </div>
        <div class="meta">
          <div><strong>Fecha Emisión:</strong> ${currentDate}</div>
          <div><strong>Generado Por:</strong> ${user?.name || 'Usuario'} (${user?.role || 'Admin'})</div>
        </div>
      </div>

      ${bodyContent}

      <div class="footer">
        Este documento es un informe oficial generado automáticamente por el sistema <strong>AppG v0.1 (beta)</strong>.
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
};

export const exportSingleBatchPdf = (batch: ImportBatch, user?: User | null) => {
  const currentDate = new Date().toLocaleString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rate = batch.exchangeRateGtq || 7.80;
  const margin = batch.profitMarginPct || 15.0;

  let grandTotalFob = 0;
  let grandTotalLanded = 0;
  let grandTotalSelling = 0;
  let totalUnits = 0;

  const itemsDetailed = (batch.items || []).map(item => {
    const qty = item.quantity || 0;
    totalUnits += qty;
    const fobCost = item.unitCostFob || 0;
    const totalFob = item.totalFobValue || (qty * fobCost);
    grandTotalFob += totalFob;

    const sharePct = item.sharePercentage || 0;
    const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : (sharePct / 100) * (batch.totalCustomsTax || 0);
    const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : (sharePct / 100) * (batch.totalShippingCost || 0);
    const itemTotalExpense = itemCustoms + itemShipping;

    const unitTax = qty > 0 ? itemTotalExpense / qty : 0;
    const landedCost = item.finalUnitCost || (fobCost + unitTax);
    const totalLanded = landedCost * qty;
    grandTotalLanded += totalLanded;

    const sellingPrice = item.finalSellingPrice || (landedCost * (1 + margin / 100));
    const totalSelling = sellingPrice * qty;
    grandTotalSelling += totalSelling;

    const cleanBrand = item.brand ? item.brand.trim() : '';
    const cleanModel = item.model ? item.model.trim() : '';
    let brandModelCombined = '';
    if (cleanBrand && cleanModel) {
      if (cleanModel.toLowerCase().startsWith(cleanBrand.toLowerCase())) {
        brandModelCombined = cleanModel;
      } else {
        brandModelCombined = `${cleanBrand} ${cleanModel}`;
      }
    } else if (cleanModel) {
      brandModelCombined = cleanModel;
    } else if (cleanBrand) {
      brandModelCombined = cleanBrand;
    }

    const displayTitle = brandModelCombined
      ? `${brandModelCombined} - ${item.productName.trim()}`
      : item.productName.trim();

    return {
      ...item,
      qty,
      fobCost,
      totalFob,
      sharePct,
      unitTax,
      landedCost,
      totalLanded,
      sellingPrice,
      totalSelling,
      displayTitle
    };
  });

  const totalCustomsTax = batch.totalCustomsTax || 0;
  const totalShippingCost = batch.totalShippingCost || 0;
  const totalLandedExpenses = totalCustomsTax + totalShippingCost;
  const grandTotalProfit = grandTotalSelling - grandTotalLanded;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8" />
      <title>AppG - Informe Oficial de Lote ${batch.id} - ${batch.name}</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="brand">AppG</div>
          <div class="subbrand">Informe Oficial de Lote: ${batch.name} (${batch.id})</div>
        </div>
        <div class="meta">
          <div><strong>Fecha Lote:</strong> ${batch.importDate}</div>
          <div><strong>Fecha Emisión:</strong> ${currentDate}</div>
          <div><strong>Generado Por:</strong> ${user?.name || 'Administrador'} (${user?.role || 'Admin'})</div>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-title">Total FOB (Compra)</div>
          <div class="kpi-val">$${grandTotalFob.toFixed(2)} USD</div>
          <div class="kpi-sub">Q ${(grandTotalFob * rate).toFixed(2)} GTQ</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Gastos Aduana + Flete</div>
          <div class="kpi-val">$${totalLandedExpenses.toFixed(2)} USD</div>
          <div class="kpi-sub">Aduana: $${totalCustomsTax.toFixed(2)} | Flete: $${totalShippingCost.toFixed(2)}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Costo Landed Total</div>
          <div class="kpi-val">$${grandTotalLanded.toFixed(2)} USD</div>
          <div class="kpi-sub">Q ${(grandTotalLanded * rate).toFixed(2)} GTQ</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-title">Ganancia Estimada</div>
          <div class="kpi-val">+Q ${(grandTotalProfit * rate).toFixed(2)} GTQ</div>
          <div class="kpi-sub">+${margin.toFixed(1)}% Venta ($${grandTotalProfit.toFixed(2)} USD)</div>
        </div>
      </div>

      <div class="section-title">Detalle Completo de Productos del Lote (${itemsDetailed.length} SKUs • ${totalUnits} Unidades • Tasa Q ${rate.toFixed(2)})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">Foto</th>
            <th>SKU</th>
            <th>Producto (Marca Modelo - Nombre)</th>
            <th style="text-align: center;">Cantidad</th>
            <th style="text-align: right;">Precio FOB Unit.</th>
            <th style="text-align: right;">% Part.</th>
            <th style="text-align: right;">+ Recargo Unit.</th>
            <th style="text-align: right;">= Costo Landed Unit.</th>
            <th style="text-align: right;">Precio Venta Sugerido</th>
          </tr>
        </thead>
        <tbody>
          ${itemsDetailed.map(item => `
            <tr>
              <td><img src="${item.image || fallbackImage}" class="thumb-img" alt="${item.productName}" /></td>
              <td><strong>${item.sku}</strong></td>
              <td><strong>${item.displayTitle}</strong></td>
              <td style="text-align: center;"><strong>${item.qty} uds</strong></td>
              <td style="text-align: right;">$${item.fobCost.toFixed(2)} USD</td>
              <td style="text-align: right;">${item.sharePct.toFixed(1)}%</td>
              <td style="text-align: right;">+$${item.unitTax.toFixed(2)} USD</td>
              <td style="text-align: right;"><strong>$${item.landedCost.toFixed(2)} USD</strong><br/><span style="font-size: 8px; color: #475569;">Q ${(item.landedCost * rate).toFixed(2)}</span></td>
              <td style="text-align: right;"><strong style="color: #15803d;">Q ${(item.sellingPrice * rate).toFixed(2)} GTQ</strong><br/><span style="font-size: 8px; color: #64748b;">($${item.sellingPrice.toFixed(2)} USD)</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="footer">
        Este documento es un informe oficial de importación generado por <strong>AppG v0.1 (beta)</strong>.
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 300);
        }
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(fullHtml);
  printWindow.document.close();
};

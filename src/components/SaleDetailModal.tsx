import React from 'react';
import { X, ShoppingBag, Store, Calendar, Package } from 'lucide-react';
import { getStoreColor } from '../utils/storeColors';

interface SaleDetailModalProps {
  sale: any | null;
  onClose: () => void;
}

export const SaleDetailModal: React.FC<SaleDetailModalProps> = ({ sale, onClose }) => {
  if (!sale) return null;

  const items = sale.items || [];
  const totalUnits = items.reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no disponible';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-GT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Venta #{sale.id}</h2>
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Completada
                </span>
              </div>
              <p className="text-xs text-slate-300">Auditoría de Ticket de Salida de Inventario</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Info Cards */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Store Card */}
            {(() => {
              const stCol = getStoreColor(sale.store_id);
              return (
                <div className={`p-3 rounded-xl flex items-center gap-3 border ${stCol.borderClass}/30 ${stCol.bgClass}`}>
                  <div className={`p-2 rounded-lg border ${stCol.badgeClass}`}>
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block font-medium">Sucursal Origen</span>
                    <span className={`text-xs font-bold ${stCol.textClass}`}>{sale.store_name || sale.store_id}</span>
                  </div>
                </div>
              );
            })()}

            {/* Date Card */}
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-medium">Fecha y Hora</span>
                <span className="text-xs font-bold text-slate-100 font-mono">{formatDate(sale.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-indigo-400" /> Desglose de Productos ({totalUnits} uds)
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cantidad</th>
                      <th className="py-2.5 px-3 text-right">Precio Unit. (Q)</th>
                      <th className="py-2.5 px-3 text-right">Subtotal (Q)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-200">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No se encontraron ítems detallados.
                        </td>
                      </tr>
                    ) : (
                      items.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition">
                          <td className="py-2.5 px-3 font-mono text-[11px] font-semibold text-slate-300">
                            {item.sku || `PROD-${item.product_id}`}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {item.product_name || `Producto #${item.product_id}`}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-300">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                            Q {(item.unit_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            Q {(item.subtotal || (item.quantity * item.unit_price) || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Total Consolidado del Ticket</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black font-mono text-emerald-400">
              Q {(sale.total_amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

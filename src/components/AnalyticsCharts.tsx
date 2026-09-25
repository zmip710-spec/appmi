import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { DashboardStats } from '../services/api';
import { PieChart as PieIcon, BarChart2 } from 'lucide-react';

interface AnalyticsChartsProps {
  stats?: DashboardStats;
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ stats }) => {
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  const totalSales = stats?.totalSales || 0;
  const totalExpenses = stats?.totalImportExpenses || 0;
  const inventoryValue = stats?.inventoryValue || 0;
  const customsTax = stats?.customsTaxPaid || 0;
  const shippingCost = stats?.shippingPaid || 0;

  // Real Financial Comparison Chart Data matching EXACT SQLite Figures
  const comparisonData = [
    { name: 'Ventas Totales', amount: totalSales, fill: '#10b981' },
    { name: 'Valor Inventario', amount: inventoryValue, fill: '#3b82f6' },
    { name: 'Gastos Importación', amount: totalExpenses, fill: '#6366f1' },
    { name: 'Impuesto Aduana', amount: customsTax, fill: '#f59e0b' },
    { name: 'Costo Flete/Envío', amount: shippingCost, fill: '#ec4899' },
  ];

  // Financial Distribution Donut Breakdown
  const grandTotal = totalSales + inventoryValue + totalExpenses;

  const distributionData = [
    {
      name: 'Ventas Totales',
      value: totalSales,
      percentage: grandTotal > 0 ? ((totalSales / grandTotal) * 100).toFixed(1) : '0.0',
      color: '#10b981'
    },
    {
      name: 'Valor Almacén',
      value: inventoryValue,
      percentage: grandTotal > 0 ? ((inventoryValue / grandTotal) * 100).toFixed(1) : '0.0',
      color: '#3b82f6'
    },
    {
      name: 'Gastos Importación',
      value: totalExpenses,
      percentage: grandTotal > 0 ? ((totalExpenses / grandTotal) * 100).toFixed(1) : '0.0',
      color: '#6366f1'
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Real-time Comparative Bar / Area Chart */}
      <div className="lg:col-span-2 bg-slate-800 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <BarChart2 className="w-5 h-5 text-blue-400" />
              <span>Gráfica Comparativa Financiera en Tiempo Real</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Montos acumulados sincronizados con tu base de datos SQLite</p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => setChartType('bar')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Barras
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition ${chartType === 'area' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Área
            </button>
          </div>
        </div>

        <div className="h-[290px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: number) => [`$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 'Monto Real']}
                />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <AreaChart data={comparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: number) => [`$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 'Monto Real']}
                />
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Real-time Distribution Donut Chart */}
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between shadow-lg">
        <div>
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <PieIcon className="w-5 h-5 text-indigo-400" />
            <span>Distribución de Capital</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Proporción financiera porcentual de la empresa</p>
        </div>

        <div className="h-[220px] w-full flex items-center justify-center my-2">
          {grandTotal === 0 ? (
            <div className="text-center text-xs text-slate-400 p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
              <span className="block font-semibold text-slate-300 mb-1">Sin registros activos en SQLite</span>
              <span>Crea ventas o registra lotes para actualizar la gráfica en tiempo real.</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '10px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: number) => [`$${val.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 'Monto Real']}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-slate-700/60">
          {distributionData.map((item) => (
            <div key={item.name}>
              <span className="block text-slate-400 text-[11px] truncate">{item.name}</span>
              <span className="font-bold text-white text-xs block">${item.value.toFixed(0)}</span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

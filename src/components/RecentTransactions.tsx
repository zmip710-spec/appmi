import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Database, ShoppingCart, AlertCircle, CheckCircle, Package, Search } from 'lucide-react';
import { fetchTransactions, createTransaction, updateTransactionStatusApi, deleteTransactionApi, fetchInventory, Transaction, InventoryProduct } from '../services/api';

const fallbackTransactions: Transaction[] = [];

interface RecentTransactionsProps {
  searchTerm: string;
}

export interface CartItem {
  id: string;
  sku: string;
  name: string;
  category?: string;
  stock: number;
  unitCost: number;
  quantity: number;
  unitPriceGtq: number; // Unit selling price in GTQ Quetzales
}

export const formatAmountInGtq = (amt: string) => {
  if (!amt) return 'Q 0.00 GTQ';
  if (amt.startsWith('Q')) return amt;
  const num = parseFloat(amt.replace('$', '').replace(/,/g, ''));
  if (isNaN(num)) return amt;
  const gtq = num * 7.80;
  return `Q ${gtq.toFixed(2)} GTQ`;
};

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ searchTerm }) => {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_transactions') || localStorage.getItem('appg_cache_transactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_transactions') || localStorage.getItem('appg_cache_transactions');
      return !cached;
    } catch {
      return true;
    }
  });
  const [inventoryList, setInventoryList] = useState<InventoryProduct[]>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_inventory') || localStorage.getItem('appg_cache_inventory');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  const DRAFT_SALES_KEY = 'draft_sales_form';

  // Multi-Product Cart & Customer Form State with localStorage Draft Recovery
  const [clientName, setClientName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_sales_form');
      if (saved) return JSON.parse(saved).clientName || '';
    } catch {}
    return '';
  });
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('draft_sales_form');
      if (saved) return JSON.parse(saved).cartItems || [];
    } catch {}
    return [];
  });
  const [productSearch, setProductSearch] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [saleStatus, setSaleStatus] = useState<string>('Completado');
  const [posNetworkError, setPosNetworkError] = useState<string | null>(null);
  const [isSavingTransaction, setIsSavingTransaction] = useState<boolean>(false);

  // Autosave Debounced Effect (400ms)
  useEffect(() => {
    const hasContent = clientName.trim() !== '' || cartItems.length > 0;
    const timer = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem('draft_sales_form', JSON.stringify({ clientName, cartItems }));
        } else {
          localStorage.removeItem('draft_sales_form');
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [clientName, cartItems]);

  // Window beforeunload Accidental Navigation Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = clientName.trim() !== '' || cartItems.length > 0;
      if (hasContent) {
        e.preventDefault();
        e.returnValue = 'Tienes una venta en proceso en el Punto de Venta. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [clientName, cartItems]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTransactions();
      const invData = await fetchInventory();
      if (Array.isArray(data)) {
        setTransactions(data);
        setIsDbConnected(true);
      }
      if (Array.isArray(invData)) {
        setInventoryList(invData);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When a product is selected from search dropdown -> Add to Cart or Increment Quantity (in Quetzales)
  const handleSelectProduct = (product: InventoryProduct) => {
    const existingIndex = cartItems.findIndex(item => item.sku.toLowerCase() === product.sku.toLowerCase());
    if (existingIndex >= 0) {
      const updatedCart = [...cartItems];
      updatedCart[existingIndex].quantity += 1;
      setCartItems(updatedCart);
    } else {
      const priceGtq = product.unitCost * 1.15 * 7.80;
      const newItem: CartItem = {
        id: product.sku,
        sku: product.sku,
        name: product.name,
        category: product.category,
        stock: product.stock,
        unitCost: product.unitCost,
        quantity: 1,
        unitPriceGtq: parseFloat(priceGtq.toFixed(2))
      };
      setCartItems([...cartItems, newItem]);
    }
    setProductSearch('');
    setShowSearchDropdown(false);
  };

  // Cart Helper Operations
  const updateCartQuantity = (sku: string, newQty: number) => {
    const qty = Math.max(1, newQty);
    setCartItems(cartItems.map(item => item.sku === sku ? { ...item, quantity: qty } : item));
  };

  const updateCartUnitPriceGtq = (sku: string, priceGtq: number) => {
    const p = Math.max(0, priceGtq);
    setCartItems(cartItems.map(item => item.sku === sku ? { ...item, unitPriceGtq: p } : item));
  };

  const removeCartItem = (sku: string) => {
    setCartItems(cartItems.filter(item => item.sku !== sku));
  };

  // Filtered Inventory List for Search
  const cleanSearch = productSearch.trim().toLowerCase();
  const matchingProducts = cleanSearch.length >= 1
    ? inventoryList.filter(p =>
        p.sku.toLowerCase().includes(cleanSearch) ||
        p.name.toLowerCase().includes(cleanSearch) ||
        (p.brand && p.brand.toLowerCase().includes(cleanSearch)) ||
        (p.model && p.model.toLowerCase().includes(cleanSearch))
      )
    : inventoryList;

  // Grand Totals Calculation (Primarily in Quetzales)
  const grandTotalGtq = cartItems.reduce((sum, item) => sum + (item.quantity * item.unitPriceGtq), 0);
  const grandTotalUsd = grandTotalGtq / 7.80;

  const hasInsufficientStock = cartItems.some(item => item.quantity > item.stock);

  const handleAddTransaction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!clientName.trim() || cartItems.length === 0 || isSavingTransaction) return;

    setPosNetworkError(null);
    setIsSavingTransaction(true);

    const formattedService = cartItems
      .map(item => `${item.name} (${item.quantity} ${item.quantity > 1 ? 'unidades' : 'unidad'})`)
      .join(', ');

    const payload = {
      client: clientName.trim(),
      service: formattedService,
      amount: `Q ${grandTotalGtq.toFixed(2)} GTQ`,
      status: saleStatus,
      items: cartItems.map(i => ({
        sku: i.sku,
        quantity: i.quantity,
        unitPrice: parseFloat((i.unitPriceGtq / 7.80).toFixed(2))
      }))
    };

    try {
      await createTransaction(payload);
    } catch (err: any) {
      console.error('Error de conexión o servidor al registrar venta:', err);
      // DO NOT RESET FORM OR CLEAR STATE!
      setPosNetworkError("Error de conexión con el host. Tus datos siguen guardados aquí. Presiona 'Reintentar' cuando se restablezca la conexión.");
      setIsSavingTransaction(false);
      return;
    }

    // HTTP 200/201 SUCCESS: Immediately clear errors, remove draft, reset form and close modal
    setPosNetworkError(null);
    try { localStorage.removeItem(DRAFT_SALES_KEY); } catch {}
    setCartItems([]);
    setClientName('');
    setProductSearch('');
    setShowAddModal(false);
    setIsSavingTransaction(false);

    // Refresh transaction list in background safely
    try {
      await loadData();
      setIsDbConnected(true);
    } catch (loadErr) {
      console.warn('Venta registrada correctamente, pero falló la actualización del listado:', loadErr);
    }
  };

  const handleStatusChange = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Completado' ? 'Pendiente' : currentStatus === 'Pendiente' ? 'Cancelado' : 'Completado';
    try {
      await updateTransactionStatusApi(id, nextStatus);
    } catch {
      // local fallback
    }
    setTransactions(transactions.map(t => t.id === id ? { ...t, status: nextStatus as any } : t));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransactionApi(id);
    } catch {
      // local fallback
    }
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const filteredData = transactions.filter((item) => {
    const matchesSearch =
      item.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.service.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="bg-slate-800 border border-slate-700/80 rounded-xl overflow-hidden shadow-sm p-5 space-y-4 min-h-[500px] animate-pulse">
        <div className="h-12 bg-slate-700/60 rounded-xl w-full"></div>
        <div className="h-20 bg-slate-700/40 rounded-xl w-full"></div>
        <div className="h-20 bg-slate-700/40 rounded-xl w-full"></div>
        <div className="h-20 bg-slate-700/40 rounded-xl w-full"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-sm space-y-0 min-h-[500px]">
      {/* Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Ventas & Transacciones en Punto de Venta</span>
            </h3>
            {isDbConnected && (
              <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
                <Database className="w-3 h-3" />
                <span>SQLite</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Buscador inteligente con vista previa de productos e imágenes en tiempo real</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
          {/* Status Filters */}
          <div className="flex items-center space-x-1 text-xs bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto whitespace-nowrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold ${filterStatus === 'all' ? 'bg-white text-slate-900 shadow border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('Completado')}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold ${filterStatus === 'Completado' ? 'bg-white text-slate-900 shadow border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Completados
            </button>
            <button
              onClick={() => setFilterStatus('Pendiente')}
              className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold ${filterStatus === 'Pendiente' ? 'bg-white text-slate-900 shadow border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-transparent' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Pendientes
            </button>
          </div>

          <button
            onClick={() => {
              setProductSearch('');
              setCartItems([]);
              setShowAddModal(true);
            }}
            className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-blue-600/20 shrink-0 w-full sm:w-auto active:scale-95"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>+ Registrar Nueva Venta</span>
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Visible only on small screens md:hidden) */}
      <div className="md:hidden p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-20 w-full"></div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl h-20 w-full"></div>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="text-center py-6 text-slate-500 dark:text-slate-400 text-sm">
            No se encontraron ventas. Haz clic en "+ Registrar Nueva Venta" para realizar una.
          </div>
        ) : (
          filteredData.map((item) => {
            let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
            if (item.status === 'Pendiente') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
            if (item.status === 'Cancelado') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';

            return (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                    {item.id}
                  </span>
                  <button
                    onClick={() => handleStatusChange(item.id, item.status)}
                    className={`px-2.5 py-1 rounded text-xs font-bold border transition ${badgeClass}`}
                  >
                    {item.status}
                  </button>
                </div>

                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.client}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">{item.service}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Fecha</span>
                    <span className="text-xs text-slate-700 dark:text-slate-300">{item.date}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{formatAmountInGtq(item.amount)}</span>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-900/60 text-xs uppercase text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="px-6 py-3.5">ID Transacción</th>
              <th className="px-6 py-3.5">Cliente</th>
              <th className="px-6 py-3.5">Producto / Servicio Vendido</th>
              <th className="px-6 py-3.5">Fecha</th>
              <th className="px-6 py-3.5">Monto Total</th>
              <th className="px-6 py-3.5">Estado (Clic p/ cambiar)</th>
              <th className="px-6 py-3.5 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700/60">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No se encontraron ventas registradas. Haz clic en "+ Registrar Nueva Venta" para realizar una.
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
                if (item.status === 'Pendiente') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
                if (item.status === 'Cancelado') badgeClass = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';

                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition">
                    <td className="px-6 py-4 font-mono font-medium text-blue-600 dark:text-blue-400">{item.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">{item.client}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300 font-medium">{item.service}</td>
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs">{item.date}</td>
                    <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 text-base">{formatAmountInGtq(item.amount)}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleStatusChange(item.id, item.status)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition cursor-pointer hover:opacity-80 ${badgeClass}`}
                        title="Haz clic para cambiar de estado"
                      >
                        {item.status} ↺
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 transition cursor-pointer"
                        title="Eliminar de SQLite"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal POS Add Multi-Product Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span>Punto de Venta - Registrar Venta en Quetzales (GTQ)</span>
                </h3>
                {(clientName.trim() !== '' || cartItems.length > 0) && (
                  <span className="text-[10px] font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    📝 Borrador autoguardado
                  </span>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold text-base cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddTransaction} className="flex flex-col space-y-4 overflow-y-auto max-h-[calc(92vh-100px)] pr-1 text-xs">
              {/* Notificación de Error de Red / Conexión en POS */}
              {posNetworkError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-600 dark:text-rose-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in shrink-0">
                  <div className="flex items-center space-x-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 dark:text-rose-400" />
                    <span className="font-semibold">{posNetworkError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddTransaction()}
                    disabled={isSavingTransaction}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow shrink-0 cursor-pointer flex items-center space-x-1"
                  >
                    <span>{isSavingTransaction ? 'Guardando...' : '🔄 Reintentar Guardar'}</span>
                  </button>
                </div>
              )}
              {/* Customer Name Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej. Empresa Beta S.A. / Juan Pérez"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              {/* Searchable Product Input */}
              <div className="relative">
                <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-1">
                  🔍 Buscar y Agregar Productos al Carrito
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Escribe SKU o Nombre (ej. PROD-001 o Gorras) para agregar..."
                    value={productSearch}
                    onFocus={() => setShowSearchDropdown(true)}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-blue-300 dark:border-blue-500/40 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                {/* Search Results Dropdown Overlay */}
                {showSearchDropdown && matchingProducts.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl z-[99999] max-h-56 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 ring-4 ring-blue-500/20">
                    <div className="p-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase bg-slate-50 dark:bg-slate-950 flex justify-between items-center sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
                      <span>Selecciona un producto para sumar al carrito ({matchingProducts.length})</span>
                      <button
                        type="button"
                        onClick={() => setShowSearchDropdown(false)}
                        className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    {matchingProducts.map((prod) => {
                      const sellingGtq = prod.unitCost * 1.15 * 7.80;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => handleSelectProduct(prod)}
                          className="p-2.5 hover:bg-blue-50 dark:hover:bg-blue-600/30 hover:text-slate-900 dark:hover:text-white cursor-pointer flex items-center justify-between transition"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs shrink-0">📦</div>
                          <div>
                            <span className="font-mono font-bold text-blue-700 dark:text-blue-400 block">{prod.sku} {prod.brand ? `| ${prod.brand}` : ''}</span>
                            <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold">
                              {[prod.brand, prod.model].filter(Boolean).join(' ')
                                ? `${[prod.brand, prod.model].filter(Boolean).join(' ')} - ${prod.name}`
                                : prod.name}
                            </span>
                          </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block">Q {sellingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                              prod.stock > 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}>
                              Stock: {prod.stock}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Multi-Product Cart Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center space-x-1.5">
                    <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Carrito de la Venta ({cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'})</span>
                  </label>
                  {cartItems.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setCartItems([])}
                      className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                    >
                      Vaciar Carrito
                    </button>
                  )}
                </div>

                {cartItems.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-700 p-6 rounded-2xl text-center space-y-2">
                    <div className="text-2xl">🛒</div>
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                      El carrito de ventas está vacío. Usa el buscador de arriba para agregar uno o varios productos a esta venta.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {cartItems.map((item) => {
                      const subtotalGtq = item.quantity * item.unitPriceGtq;
                      const subtotalUsd = subtotalGtq / 7.80;
                      const isOverStock = item.quantity > item.stock;

                      return (
                        <div key={item.sku} className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isOverStock ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-500/40' : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-700/80 shadow-sm'
                        }`}>
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base shrink-0">📦</div>
                            <div className="min-w-0">
                              <span className="font-mono text-[10px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
                                {item.sku}
                              </span>
                              <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate mt-0.5">{item.name}</h4>
                              <span className={`text-[10px] font-mono font-bold ${isOverStock ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                Stock Disponible: {item.stock} uds
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0">
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-1 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.sku, item.quantity - 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateCartQuantity(item.sku, parseInt(e.target.value) || 1)}
                                className="w-12 text-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-xs py-0.5 rounded border border-slate-200 dark:border-slate-700 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => updateCartQuantity(item.sku, item.quantity + 1)}
                                className="w-6 h-6 flex items-center justify-center text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            {/* Unit Price Input (GTQ Quetzales) */}
                            <div className="w-28">
                              <label className="block text-[9px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Precio Unit. (Q)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.unitPriceGtq}
                                onChange={(e) => updateCartUnitPriceGtq(item.sku, parseFloat(e.target.value) || 0)}
                                className="w-full bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-500/50 text-emerald-600 dark:text-emerald-400 font-bold text-xs px-2 py-1 rounded text-right focus:outline-none focus:border-emerald-500"
                              />
                            </div>

                            {/* Subtotal Display in Quetzales */}
                            <div className="text-right min-w-[80px]">
                              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block">Q {subtotalGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 block">${subtotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            </div>

                            {/* Remove Item Button */}
                            <button
                              type="button"
                              onClick={() => removeCartItem(item.sku)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                              title="Remover del Carrito"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Stock Warning Banner if insufficient stock */}
              {hasInsufficientStock && (
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-3 rounded-xl text-xs text-rose-700 dark:text-rose-400 flex items-center space-x-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>¡Atención! Uno o más productos en el carrito superan las existencias disponibles en inventario.</span>
                </div>
              )}

              {/* Total Calculation Banner in Quetzales */}
              <div className="bg-emerald-50/70 dark:bg-slate-900/90 p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/50 flex justify-between items-center shadow-sm">
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">MONTO TOTAL DE LA VENTA (QUETZALES)</span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400 block">${grandTotalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                </div>
                <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">Q {grandTotalGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cartItems.length === 0 || isSavingTransaction}
                  className={`px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer flex items-center space-x-2`}
                >
                  <span>{isSavingTransaction ? 'Guardando Venta...' : '🛒 Guardar Venta en Quetzales & Descontar Stock'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

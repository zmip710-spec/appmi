import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Store,
  Receipt,
  Package,
  LayoutGrid,
  List,
  Eye,
  Calendar,
  Filter,
  X
} from 'lucide-react';
import { fetchStoresApi, fetchInventoryMatrixApi, createSaleApi, fetchSalesApi, Store as StoreType, User } from '../services/api';
import { SaleDetailModal } from './SaleDetailModal';
import { useStoreColors } from '../utils/storeColors';

interface SalesViewProps {
  currentUser?: User | null;
}

interface CartItem {
  product_id: number;
  sku: string;
  name: string;
  unit_price: number;
  quantity: number;
  available_stock: number;
}

export const SalesView: React.FC<SalesViewProps> = ({ currentUser }) => {
  const { getColor } = useStoreColors();
  const [activeSubTab, setActiveSubTab] = useState<'pos' | 'history'>('pos');
  const [stores, setStores] = useState<StoreType[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [lastSaleReceipt, setLastSaleReceipt] = useState<{
    id: number;
    total: number;
    storeName: string;
    itemsCount: number;
  } | null>(null);

  // Historial de ventas estado
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [historyFilterStore, setHistoryFilterStore] = useState<string>('all');
  const [historySearchTerm, setHistorySearchTerm] = useState<string>('');
  const [selectedDetailSale, setSelectedDetailSale] = useState<any | null>(null);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  const loadSalesHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetchSalesApi();
      if (res && res.sales) {
        setSalesHistory(res.sales);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al cargar el historial de ventas.', 'error');
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadData = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);

    try {
      const [storesData, matrixProducts, salesRes] = await Promise.all([
        fetchStoresApi(),
        fetchInventoryMatrixApi(),
        fetchSalesApi().catch(() => ({ sales: [] }))
      ]);

      if (storesData && storesData.length > 0) {
        setStores(storesData);
        if (!selectedStoreId || !storesData.some(s => s.id === selectedStoreId)) {
          setSelectedStoreId(storesData[0].id);
        }
      }

      if (matrixProducts) {
        setProducts(matrixProducts);
      }

      if (salesRes && salesRes.sales) {
        setSalesHistory(salesRes.sales);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al cargar existencias y tiendas.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectStore = (storeId: string) => {
    if (cart.length > 0) {
      if (window.confirm('Cambiar de sucursal limpiará el ticket actual. ¿Deseas continuar?')) {
        setSelectedStoreId(storeId);
        setCart([]);
      }
    } else {
      setSelectedStoreId(storeId);
    }
  };

  const getStoreStock = (product: any, storeId: string): number => {
    if (!storeId) return 0;
    if (storeId === 'tienda_1') return product.stock_tienda_1 || 0;
    if (storeId === 'tienda_2') return product.stock_tienda_2 || 0;
    if (storeId === 'tienda_3') return product.stock_tienda_3 || 0;
    return product[`stock_${storeId}`] || 0;
  };

  const getStoreName = (id: string) => {
    const s = stores.find(st => st.id === id);
    return s ? s.name : id;
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Fecha no disponible';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-GT', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  // Filtrado de productos en Punto de Venta
  const filteredProducts = products.filter(p => {
    return (
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Filtrado de Ventas en Historial
  const filteredSales = salesHistory.filter(sale => {
    const matchStore = historyFilterStore === 'all' || sale.store_id === historyFilterStore;
    const searchLower = historySearchTerm.toLowerCase();
    const ticketIdStr = `#v-${sale.id}`.toLowerCase();
    const idOnly = String(sale.id).toLowerCase();

    const matchSearch =
      !historySearchTerm ||
      ticketIdStr.includes(searchLower) ||
      idOnly.includes(searchLower) ||
      (sale.store_name || '').toLowerCase().includes(searchLower) ||
      (sale.items || []).some(
        (i: any) =>
          (i.product_name || '').toLowerCase().includes(searchLower) ||
          (i.sku || '').toLowerCase().includes(searchLower)
      );

    return matchStore && matchSearch;
  });

  const addToCart = (product: any) => {
    const availableStock = getStoreStock(product, selectedStoreId);
    if (availableStock <= 0) {
      triggerToast(`El producto "${product.name}" no tiene existencias disponibles en ${getStoreName(selectedStoreId)}.`, 'error');
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);

    if (existingIndex >= 0) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty >= availableStock) {
        triggerToast(`No puedes agregar más de ${availableStock} uds (stock disponible en ${getStoreName(selectedStoreId)}).`, 'error');
        return;
      }
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += 1;
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          sku: product.sku || `PROD-${product.id}`,
          name: product.name,
          unit_price: product.sale_price || 0,
          quantity: 1,
          available_stock: availableStock
        }
      ]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prevCart => {
      return prevCart
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.available_stock) {
              triggerToast(`Límite alcanzado (${item.available_stock} uds en stock).`, 'error');
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const totalAmount = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || !selectedStoreId) return;

    setSubmitting(true);
    try {
      const payload = {
        store_id: selectedStoreId,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      };

      const res = await createSaleApi(payload);
      if (res.success) {
        triggerToast('Venta registrada y stock descontado exitosamente.', 'success');
        setLastSaleReceipt({
          id: res.sale_id,
          total: res.total_amount,
          storeName: getStoreName(selectedStoreId),
          itemsCount: cart.reduce((acc, i) => acc + i.quantity, 0)
        });
        setCart([]);
        setIsMobileCartOpen(false);
        await loadData(true);
      }
    } catch (err: any) {
      triggerToast(err.message || 'Error al procesar la salida de inventario.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-full min-h-screen px-3 sm:px-6 overflow-x-hidden space-y-3 sm:space-y-4">
      {/* Toast notification */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-[100001] flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium transition-all duration-300 transform translate-y-0 ${
            toast.type === 'success'
              ? 'bg-slate-900/95 border-emerald-500/40 text-emerald-400 backdrop-blur-md shadow-emerald-500/10'
              : 'bg-slate-900/95 border-rose-500/40 text-rose-400 backdrop-blur-md shadow-rose-500/10'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 1. BARRA DE FILTROS Y SUCURSALES (Punto de Venta, Historial, Tienda 1, Tienda 2) */}
      <div className="w-full flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1 scrollbar-none bg-slate-900/70 border border-slate-800 rounded-xl px-2.5 sm:px-4 py-2 backdrop-blur-sm shadow-md">
        {/* Pestañas: Punto de Venta & Historial */}
        <button
          type="button"
          onClick={() => setActiveSubTab('pos')}
          className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'pos'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800/60'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Punto de Venta</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSubTab('history');
            loadSalesHistory();
          }}
          className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800/60'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Historial</span>
          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
            {salesHistory.length}
          </span>
        </button>

        {/* Separador y Tiendas */}
        {activeSubTab === 'pos' && stores.length > 0 && (
          <div className="h-5 w-px bg-slate-800 shrink-0 mx-0.5" />
        )}

        {activeSubTab === 'pos' && stores.map(st => {
          const stColor = getColor(st.id);
          const isSelected = selectedStoreId === st.id;
          return (
            <button
              key={st.id}
              type="button"
              onClick={() => handleSelectStore(st.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? stColor.activeBtnClass
                  : 'text-slate-400 hover:text-slate-200 bg-slate-950/60 border border-slate-800/60'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: stColor.hex }}
              />
              <Store className="w-3.5 h-3.5" />
              <span>{st.name}</span>
            </button>
          );
        })}

        {/* Botón Refrescar */}
        <button
          type="button"
          onClick={() => {
            loadData(true);
            if (activeSubTab === 'history') loadSalesHistory();
          }}
          disabled={refreshing}
          className="shrink-0 ml-auto h-8 w-8 inline-flex items-center justify-center rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
          title="Refrescar existencias"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* 2. LAYOUT PRINCIPAL DE 2 COLUMNAS (h-auto en móvil, h-[calc(100vh-140px)] en desktop) */}
      {activeSubTab === 'pos' ? (
        <div className="grid grid-cols-12 gap-4 h-auto lg:h-[calc(100vh-140px)] min-h-[500px]">
          {/* PANEL IZQUIERDO: Catálogo de Productos (col-span-12 en móvil, lg:col-span-7) */}
          <div className="col-span-12 lg:col-span-7 xl:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 sm:p-4 flex flex-col h-[calc(100vh-210px)] sm:h-[calc(100vh-160px)] lg:h-full overflow-hidden shadow-lg">
            {/* Barra de herramientas superior: Buscador + Layout Toggle */}
            <div className="flex items-center gap-3 mb-3 shrink-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por SKU o Nombre de producto..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 shadow-inner"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300 font-semibold"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Switch de vista (Grid / Lista) */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800/80 h-10 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'grid' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vista Cuadrícula / Tarjetas"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Vista Lista Compacta"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Catálogo con scroll propio */}
            <div className="flex-1 overflow-y-auto pr-1 pb-24 lg:pb-1 scrollbar-thin scrollbar-thumb-slate-700">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                  <span className="text-sm">Cargando existencias...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-slate-950/30 border border-slate-800/60 rounded-xl p-6 space-y-2">
                  <Package className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-400">No se encontraron productos en catálogo.</p>
                  {searchTerm && <p className="text-xs text-slate-500">Prueba con otro término de búsqueda.</p>}
                </div>
              ) : viewMode === 'grid' ? (
                /* Modo Grid: 2 Columnas */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredProducts.map(product => {
                    const storeStock = getStoreStock(product, selectedStoreId);
                    const cartItem = cart.find(i => i.product_id === product.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;
                    const isOutOfStock = storeStock <= 0;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && addToCart(product)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                          isOutOfStock
                            ? 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed'
                            : qtyInCart > 0
                            ? 'bg-slate-900 border-indigo-500/50 shadow-md shadow-indigo-500/5'
                            : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] font-mono font-semibold text-slate-400 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800">
                              {product.sku || `PROD-${product.id}`}
                            </span>
                            {qtyInCart > 0 && (
                              <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">
                                {qtyInCart} en ticket
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug">{product.name}</h3>
                        </div>

                        <div className="flex items-end justify-between pt-2 border-t border-slate-800/60">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase font-sans">Stock disponible</span>
                            <span className={`text-xs font-bold font-mono ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isOutOfStock ? 'Agotado (0)' : `${storeStock} uds`}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block uppercase font-sans">Precio Venta</span>
                            <span className="text-sm font-black font-mono text-white">
                              Q {(product.sale_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Modo Lista Compacta */
                <div className="space-y-2">
                  {filteredProducts.map(product => {
                    const storeStock = getStoreStock(product, selectedStoreId);
                    const cartItem = cart.find(i => i.product_id === product.id);
                    const qtyInCart = cartItem ? cartItem.quantity : 0;
                    const isOutOfStock = storeStock <= 0;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !isOutOfStock && addToCart(product)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isOutOfStock
                            ? 'bg-slate-950/40 border-slate-900 opacity-60 cursor-not-allowed'
                            : qtyInCart > 0
                            ? 'bg-slate-900 border-indigo-500/50 shadow-md'
                            : 'bg-slate-900/60 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/30'
                        }`}
                      >
                        {/* Izquierda: SKU y Nombre */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-3">
                          <span className="text-[10px] font-mono font-semibold text-slate-400 px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 shrink-0">
                            {product.sku || `PROD-${product.id}`}
                          </span>
                          <h3 className="text-xs font-bold text-white truncate">{product.name}</h3>
                          {qtyInCart > 0 && (
                            <span className="text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30 shrink-0">
                              {qtyInCart} en ticket
                            </span>
                          )}
                        </div>

                        {/* Derecha: Stock, Precio y Botón + */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right hidden sm:block">
                            <span className={`text-xs font-bold font-mono ${isOutOfStock ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {isOutOfStock ? 'Agotado' : `${storeStock} uds`}
                            </span>
                          </div>

                          <div className="text-right font-mono font-bold text-sm text-white">
                            Q {(product.sale_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>

                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isOutOfStock) addToCart(product);
                            }}
                            className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                              isOutOfStock
                                ? 'bg-slate-800/40 text-slate-600 cursor-not-allowed'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 cursor-pointer'
                            }`}
                            title="Agregar al ticket"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PANEL DERECHO: Ticket de Salida / Cobro (hidden en móvil, lg:flex lg:col-span-5) */}
          <div className="hidden lg:flex lg:col-span-5 xl:col-span-5 bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex-col h-full overflow-hidden shadow-xl">
            {/* Header del Ticket */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4.5 h-4.5 text-emerald-400" />
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">TICKET DE SALIDA</h2>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${getColor(selectedStoreId).badgeClass}`}>
                {getStoreName(selectedStoreId)}
              </span>
            </div>

            {/* Lista de productos del ticket con scroll independiente */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 my-3 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
              {cart.length === 0 ? (
                <div className="py-16 text-center space-y-3 flex flex-col items-center justify-center h-full">
                  <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">El ticket está vacío.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs">
                    Haz clic en los productos del catálogo para agregarlos a la venta.
                  </p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">{item.sku}</span>
                      </div>
                      <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                      <div className="text-[11px] text-emerald-400 font-mono">
                        Q {item.unit_price.toFixed(2)} × {item.quantity} = <strong className="font-bold">Q {(item.unit_price * item.quantity).toFixed(2)}</strong>
                      </div>
                    </div>

                    {/* Controles de Cantidad */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="h-7 w-7 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-xs text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="h-7 w-7 rounded-md bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="h-7 w-7 ml-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"
                        title="Eliminar ítem"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pie del Ticket (Fijado abajo) */}
            <div className="border-t border-slate-800 pt-3 space-y-3 shrink-0">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Ítems a descontar:</span>
                <span className="text-white font-mono font-bold">
                  {cart.reduce((acc, i) => acc + i.quantity, 0)} unidades
                </span>
              </div>

              {/* Caja de Total destacada */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">TOTAL GENERAL:</span>
                <span className="text-xl font-black font-mono text-emerald-400">
                  Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Botón principal de acción */}
              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirmar Salida / Cobro</span>
              </button>

              {/* Comprobante de última venta */}
              {lastSaleReceipt && (
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5" /> Venta #{lastSaleReceipt.id} Procesada
                    </span>
                    <span className="font-mono text-[10px] text-emerald-500">{lastSaleReceipt.storeName}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">
                    Descontadas <strong className="text-white">{lastSaleReceipt.itemsCount} uds</strong> por{' '}
                    <strong className="text-emerald-400 font-mono">Q {lastSaleReceipt.total.toFixed(2)}</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN FLOTANTE MÓVIL (< lg) SOBRE LA BARRA DE NAVEGACIÓN */}
          <div className="lg:hidden fixed bottom-[72px] left-3 right-3 sm:left-6 sm:right-6 z-40">
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="w-full py-2.5 sm:py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white rounded-xl sm:rounded-2xl shadow-2xl shadow-emerald-950/70 border border-emerald-400/30 flex items-center justify-between transition cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="relative p-1.5 rounded-lg bg-emerald-950/50 border border-emerald-400/30 text-white">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
                  {cart.reduce((acc, i) => acc + i.quantity, 0) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white text-emerald-900 font-extrabold text-[10px] flex items-center justify-center shadow">
                      {cart.reduce((acc, i) => acc + i.quantity, 0)}
                    </span>
                  )}
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider block">
                    Ver Ticket ({cart.reduce((acc, i) => acc + i.quantity, 0)})
                  </span>
                  <span className="text-[10px] sm:text-xs text-emerald-100 font-medium">
                    {cart.length > 0 ? 'Toca para revisar y cobrar' : 'Ticket vacío'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] sm:text-xs font-mono text-emerald-200 block uppercase font-semibold">Total</span>
                <span className="text-sm sm:text-lg font-black font-mono text-white">
                  Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </button>
          </div>

          {/* MODAL / PANTALLA COMPLETA DEL TICKET EN MÓVIL (< lg) */}
          {isMobileCartOpen && (
            <div className="lg:hidden fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] w-screen h-screen bg-slate-950 flex flex-col m-0 p-0">
              {/* Header Fijo */}
              <div className="w-full px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">TICKET DE SALIDA</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${getColor(selectedStoreId).badgeClass}`}>
                      {getStoreName(selectedStoreId)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </button>
              </div>

              {/* Lista de productos scrolleable */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-4 space-y-1">
                {cart.length === 0 ? (
                  <div className="py-20 text-center space-y-3 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">El ticket está vacío.</p>
                    <p className="text-[11px] text-slate-500 max-w-xs">
                      Selecciona productos del catálogo para agregarlos a la venta.
                    </p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.product_id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold">{item.sku}</span>
                        <h4 className="text-xs font-semibold text-white truncate">{item.name}</h4>
                        <div className="text-[11px] text-emerald-400 font-mono">
                          Q {item.unit_price.toFixed(2)} × {item.quantity} = <strong className="font-bold">Q {(item.unit_price * item.quantity).toFixed(2)}</strong>
                        </div>
                      </div>

                      {/* Controles de Cantidad */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, -1)}
                          className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-mono font-bold text-xs text-white">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.product_id, 1)}
                          className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 flex items-center justify-center cursor-pointer active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product_id)}
                          className="h-8 w-8 ml-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 flex items-center justify-center cursor-pointer"
                          title="Eliminar ítem"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Fijo con Total y Cobro */}
              <div className="border-t border-slate-800 p-4 bg-slate-900/90 space-y-3 shrink-0">
                <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span>Ítems a descontar:</span>
                  <span className="text-white font-mono font-bold">
                    {cart.reduce((acc, i) => acc + i.quantity, 0)} unidades
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-emerald-500/30">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">TOTAL GENERAL:</span>
                  <span className="text-xl font-black font-mono text-emerald-400">
                    Q {totalAmount.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleCheckout();
                  }}
                  disabled={cart.length === 0 || submitting}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Procesando Venta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>REGISTRAR SALIDA / COBRAR</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* HISTORIAL DE VENTAS */
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col h-[calc(100vh-140px)] overflow-hidden shadow-lg space-y-3">
          {/* Header & Filtros de Historial */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 shrink-0">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">Historial de Salidas / Ventas</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                <button
                  onClick={() => setHistoryFilterStore('all')}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer font-semibold ${
                    historyFilterStore === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Todas
                </button>
                {stores.map(st => {
                  const stCol = getColor(st.id);
                  const isAct = historyFilterStore === st.id;
                  return (
                    <button
                      key={st.id}
                      onClick={() => setHistoryFilterStore(st.id)}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer font-semibold flex items-center gap-1.5 ${
                        isAct
                          ? stCol.activeBtnClass
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stCol.hex }} />
                      <span>{st.name}</span>
                    </button>
                  );
                })}
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Buscar por Ticket #V-001..."
                  value={historySearchTerm}
                  onChange={e => setHistorySearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 w-56"
                />
              </div>
            </div>
          </div>

          {/* Lista de Ventas con scroll independiente */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-slate-700">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
                <RefreshCw className="w-5 h-5 animate-spin text-indigo-400" />
                <span className="text-sm">Cargando historial de ventas...</span>
              </div>
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-20 bg-slate-950/30 border border-slate-800/60 rounded-xl p-6 space-y-2">
                <Receipt className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-400">No se encontraron ventas registradas.</p>
                {historySearchTerm && <p className="text-xs text-slate-500">Prueba con otro término de búsqueda.</p>}
              </div>
            ) : (
              filteredSales.map(sale => {
                const totalPieces = (sale.items || []).reduce((acc: number, i: any) => acc + (i.quantity || 0), 0);
                const itemsCount = (sale.items || []).length;

                return (
                  <div
                    key={sale.id}
                    onClick={() => setSelectedDetailSale(sale)}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <span className="text-xs font-mono font-bold text-slate-200 bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700/60">
                        #V-{String(sale.id).padStart(3, '0')}
                      </span>
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Completado
                      </span>
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className={`px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold ${getColor(sale.store_id).badgeClass}`}>
                          <Store className="w-3.5 h-3.5" />
                          <span>{sale.store_name || sale.store_id}</span>
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 truncate max-w-xs">
                      <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {itemsCount > 0
                          ? `${itemsCount} prod. (${totalPieces} piezas)`
                          : 'Salida de inventario'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-slate-300 font-mono hidden sm:inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(sale.created_at)}
                      </span>
                      <span className="text-sm font-black font-mono text-emerald-400">
                        Q {(sale.total_amount || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDetailSale(sale);
                        }}
                        className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition cursor-pointer"
                        title="Ver auditoría completa"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal de Auditoría de Venta */}
      {selectedDetailSale && (
        <SaleDetailModal
          sale={selectedDetailSale}
          onClose={() => setSelectedDetailSale(null)}
        />
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Search,
  PackageCheck,
  DollarSign,
  Minus,
  Database,
  Camera,
  Eye,
  TrendingUp,
  Tag,
  Info,
  Calendar,
  Sliders,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Building2
} from 'lucide-react';
import {
  InventoryProduct,
  fetchInventory,
  createInventoryApi,
  deleteInventoryApi,
  updateStockApi,
  updateProductImageApi,
  PriceHistoryEntry,
  fetchPriceHistoryApi,
  fetchStoresApi,
  fetchInventoryMatrixApi,
  createProductApi,
  addStockEntryApi,
  Store,
  User
} from '../services/api';
import { ImagePicker } from './ImagePicker';

interface InventoryViewProps {
  currentUser?: User | null;
  readOnly?: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({ currentUser, readOnly }) => {
  const isVendedor = readOnly || currentUser?.role === 'Vendedor';
  const [inventory, setInventory] = useState<InventoryProduct[]>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_inventory') || localStorage.getItem('appg_cache_inventory');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_inventory') || localStorage.getItem('appg_cache_inventory');
      return !cached;
    } catch {
      return true;
    }
  });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const [showAddModal, setShowAddModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProduct | null>(null);
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<InventoryProduct | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [historyProduct, setHistoryProduct] = useState<InventoryProduct | null>(null);
  const [stockManageProduct, setStockManageProduct] = useState<InventoryProduct | null>(null);
  const [stockChangeAmount, setStockChangeAmount] = useState<string>('1');
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<InventoryProduct | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryEntry[]>([]);
  const [editImageUrl, setEditImageUrl] = useState<string>('');
  const [selectedProductImportDetails, setSelectedProductImportDetails] = useState<{
    fobUsd: number;
    sharePercentage: number;
    unitCustomsUsd: number;
    unitShippingUsd: number;
    unitTaxUsd: number;
    landedUsd: number;
    finalSellingPriceUsd: number;
    totalExpensesUsd: number;
    customsPct: number;
    shippingPct: number;
    recargoPct: number;
    batchName?: string;
  } | null>(null);

  const [selectedDetailMatrix, setSelectedDetailMatrix] = useState<{
    stock_tienda_1: number;
    stock_tienda_2: number;
    stock_tienda_3: number;
    stock_transito: number;
    stock_total: number;
    transits: Array<{ from_store_name?: string; to_store_name?: string; from_store_id: string; to_store_id: string; quantity: number }>;
  } | null>(null);

  useEffect(() => {
    if (!selectedDetailProduct) {
      setSelectedDetailMatrix(null);
      return;
    }
    let isMounted = true;
    Promise.all([
      fetchInventoryMatrixApi(),
      fetch(`/api/transfers/in-transit/${selectedDetailProduct.id}`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([matrix, inTransitList]) => {
      if (!isMounted) return;
      const found = matrix.find(m => m.sku === selectedDetailProduct.sku || m.id === selectedDetailProduct.id);
      if (found) {
        setSelectedDetailMatrix({
          stock_tienda_1: found.stock_tienda_1 || 0,
          stock_tienda_2: found.stock_tienda_2 || 0,
          stock_tienda_3: found.stock_tienda_3 || 0,
          stock_transito: found.stock_transito || 0,
          stock_total: found.stock_total || 0,
          transits: Array.isArray(inTransitList) ? inTransitList : []
        });
      } else {
        setSelectedDetailMatrix({
          stock_tienda_1: selectedDetailProduct.stock,
          stock_tienda_2: 0,
          stock_tienda_3: 0,
          stock_transito: 0,
          stock_total: selectedDetailProduct.stock,
          transits: []
        });
      }
    }).catch(() => {
      if (!isMounted) return;
      setSelectedDetailMatrix({
        stock_tienda_1: selectedDetailProduct.stock,
        stock_tienda_2: 0,
        stock_tienda_3: 0,
        stock_transito: 0,
        stock_total: selectedDetailProduct.stock,
        transits: []
      });
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDetailProduct]);

  useEffect(() => {
    if (!selectedDetailProduct) {
      setSelectedProductImportDetails(null);
      return;
    }

    // Reset import details immediately so previous product metrics never linger
    setSelectedProductImportDetails(null);

    let isMounted = true;
    const loadDetailImportMetrics = async () => {
      try {
        const history = await fetchPriceHistoryApi(selectedDetailProduct.sku, selectedDetailProduct.name);
        if (!isMounted) return;

        if (history && history.length > 0) {
          // history[0] is the most recent batch item entry
          const latest = history[0];
          const landed = latest.finalUnitCost !== undefined && latest.finalUnitCost > 0 ? latest.finalUnitCost : selectedDetailProduct.unitCost;
          const fob = latest.unitCostFob !== undefined && latest.unitCostFob >= 0 ? latest.unitCostFob : landed;
          const qty = latest.quantity && latest.quantity > 0 ? latest.quantity : (selectedDetailProduct.stock || 1);

          const uCustoms = latest.allocatedCustoms !== undefined && qty > 0 ? latest.allocatedCustoms / qty : 0;
          const uShipping = latest.allocatedShipping !== undefined && qty > 0 ? latest.allocatedShipping / qty : (latest.unitTax !== undefined ? Math.max(0, latest.unitTax - uCustoms) : 0);
          const uTax = latest.unitTax !== undefined ? latest.unitTax : (uCustoms + uShipping);

          const customsPct = fob > 0 ? (uCustoms / fob) * 100 : 0;
          const shippingPct = fob > 0 ? (uShipping / fob) * 100 : 0;
          const recargo = fob > 0 ? ((landed - fob) / fob) * 100 : 0;

          const sellingPrice = latest.finalSellingPrice !== undefined && latest.finalSellingPrice > 0
            ? latest.finalSellingPrice
            : landed * 1.15;

          setSelectedProductImportDetails({
            fobUsd: fob,
            sharePercentage: latest.sharePercentage || 0,
            unitCustomsUsd: uCustoms,
            unitShippingUsd: uShipping,
            unitTaxUsd: uTax,
            landedUsd: landed,
            finalSellingPriceUsd: sellingPrice,
            totalExpensesUsd: latest.allocatedTax !== undefined ? latest.allocatedTax : (uTax * selectedDetailProduct.stock),
            customsPct,
            shippingPct,
            recargoPct: recargo,
            batchName: latest.batchName
          });
        } else {
          const landed = selectedDetailProduct.unitCost;
          const fob = landed;
          setSelectedProductImportDetails({
            fobUsd: fob,
            sharePercentage: 0,
            unitCustomsUsd: 0,
            unitShippingUsd: 0,
            unitTaxUsd: 0,
            landedUsd: landed,
            finalSellingPriceUsd: landed * 1.15,
            totalExpensesUsd: 0,
            customsPct: 0,
            shippingPct: 0,
            recargoPct: 0
          });
        }
      } catch {
        if (!isMounted) return;
        const landed = selectedDetailProduct.unitCost;
        const fob = landed;
        setSelectedProductImportDetails({
          fobUsd: fob,
          sharePercentage: 0,
          unitCustomsUsd: 0,
          unitShippingUsd: 0,
          unitTaxUsd: 0,
          landedUsd: landed,
          finalSellingPriceUsd: landed * 1.15,
          totalExpensesUsd: 0,
          customsPct: 0,
          shippingPct: 0,
          recargoPct: 0
        });
      }
    };

    loadDetailImportMetrics();
    return () => { isMounted = false; };
  }, [selectedDetailProduct?.sku]);

  const DRAFT_INVENTORY_KEY = 'draft_form_inventory';

  // Form State for new SKU/Product with localStorage Draft Recovery
  const [sku, setSku] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).sku || '';
    } catch {}
    return '';
  });
  const [name, setName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });
  const [brand, setBrand] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).brand || '';
    } catch {}
    return '';
  });
  const [model, setModel] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).model || '';
    } catch {}
    return '';
  });
  const [category, setCategory] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).category || 'General';
    } catch {}
    return 'General';
  });
  const [unitCost, setUnitCost] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).unitCost || '10.0';
    } catch {}
    return '10.0';
  });
  const [salePrice, setSalePrice] = useState<string>('0.0');
  const [image, setImage] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_inventory');
      if (saved) return JSON.parse(saved).image || '';
    } catch {}
    return '';
  });

  // Multi-Store Setup & Initial Stock Distribution State
  const [storesList, setStoresList] = useState<Store[]>([]);
  const [initialStocks, setInitialStocks] = useState<Record<string, number>>({
    tienda_1: 0,
    tienda_2: 0,
    tienda_3: 0,
  });

  // Quick Stock Entry Modal State
  const [stockEntryModalProduct, setStockEntryModalProduct] = useState<InventoryProduct | null>(null);
  const [entryStoreId, setEntryStoreId] = useState<string>('tienda_1');
  const [entryQty, setEntryQty] = useState<number>(1);
  const [isSavingStockEntry, setIsSavingStockEntry] = useState<boolean>(false);

  useEffect(() => {
    fetchStoresApi()
      .then(data => setStoresList(data))
      .catch(() => [
        { id: 'tienda_1', name: 'Tienda Central' },
        { id: 'tienda_2', name: 'Sucursal Norte' },
        { id: 'tienda_3', name: 'Sucursal Sur' }
      ]);
  }, []);

  const totalInitialStock = Object.values(initialStocks).reduce((acc, curr) => acc + (curr || 0), 0);

  const [errorMessage, setErrorMessage] = useState('');
  const [invNetworkError, setInvNetworkError] = useState<string | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState<boolean>(false);

  // Autosave Debounced Effect (400ms)
  useEffect(() => {
    const hasContent = name.trim() !== '' || sku.trim() !== '' || brand.trim() !== '';
    const timer = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem('draft_form_inventory', JSON.stringify({
            sku, name, brand, model, category, initialStocks, unitCost, salePrice
          }));
        } else {
          localStorage.removeItem('draft_form_inventory');
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [sku, name, brand, model, category, initialStocks, unitCost, salePrice]);

  // Window beforeunload Accidental Navigation Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = name.trim() !== '' || sku.trim() !== '';
      if (hasContent) {
        e.preventDefault();
        e.returnValue = 'Tienes datos sin guardar en el formulario de producto. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [sku, name]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const data = await fetchInventory();
      if (Array.isArray(data)) {
        setInventory(data);
        setIsDbConnected(true);
      }
    } catch {
      setIsDbConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleOpenPriceHistory = async (product: InventoryProduct) => {
    setHistoryProduct(product);
    setShowHistoryModal(true);
    try {
      const history = await fetchPriceHistoryApi(product.sku, product.name);
      setPriceHistory(history);
    } catch {
      setPriceHistory([]);
    }
  };

  const handleCreateProduct = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage('');
    setInvNetworkError(null);

    if (!sku.trim() || !name.trim()) {
      setErrorMessage('Código SKU y Nombre de producto son requeridos.');
      return;
    }

    if (isSavingProduct) return;
    setIsSavingProduct(true);

    try {
      await createProductApi({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category: category.trim() || 'General',
        cost_price: parseFloat(unitCost) || 0.0,
        sale_price: parseFloat(salePrice) || 0.0,
        initial_stocks: initialStocks,
      });
      window.dispatchEvent(new Event('stores_updated'));
    } catch (err: any) {
      console.error('Error al crear producto:', err);
      setInvNetworkError(err.message || "Error al registrar el producto.");
      setIsSavingProduct(false);
      return;
    }

    // HTTP 200/201 SUCCESS: Immediately clear errors, remove draft, reset form and close modal
    setInvNetworkError(null);
    try { localStorage.removeItem(DRAFT_INVENTORY_KEY); } catch {}
    setShowAddModal(false);
    resetForm();
    setIsSavingProduct(false);

    try {
      await loadInventory();
    } catch (loadErr) {
      console.warn('Producto creado correctamente, pero falló la actualización del inventario:', loadErr);
    }
  };

  const handleExecuteStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEntryModalProduct || entryQty <= 0) return;

    setIsSavingStockEntry(true);
    try {
      await addStockEntryApi({
        store_id: entryStoreId,
        product_id: stockEntryModalProduct.id,
        sku: stockEntryModalProduct.sku,
        quantity: entryQty,
      });
      window.dispatchEvent(new Event('stores_updated'));
      setStockEntryModalProduct(null);
      setEntryQty(1);
      await loadInventory();
    } catch (err: any) {
      alert(err.message || 'Error al registrar la entrada de stock.');
    } finally {
      setIsSavingStockEntry(false);
    }
  };

  const handleDeleteProduct = async (product: InventoryProduct) => {
    try {
      await deleteInventoryApi(product.id, product.sku);
      setDeleteConfirmProduct(null);
      if (selectedDetailProduct?.id === product.id) setSelectedDetailProduct(null);
      await loadInventory();
    } catch {
      setInventory(inventory.filter((i) => i.id !== product.id));
      setDeleteConfirmProduct(null);
      if (selectedDetailProduct?.id === product.id) setSelectedDetailProduct(null);
    }
  };

  const handleStockAdjustment = async (delta: number) => {
    if (!stockManageProduct) return;
    const newStock = Math.max(0, stockManageProduct.stock + delta);
    try {
      await updateStockApi(stockManageProduct.id, newStock, stockManageProduct.sku);
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
      setStockManageProduct({ ...stockManageProduct, stock: newStock });
      if (selectedDetailProduct?.id === stockManageProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, stock: newStock });
      }
    } catch {
      setInventory(inventory.map((item) => (item.id === stockManageProduct.id ? { ...item, stock: newStock } : item)));
    }
  };

  const handleSaveProductImage = async () => {
    if (!editingProduct) return;
    try {
      await updateProductImageApi(editingProduct.id, editImageUrl, editingProduct.sku);
      setInventory(inventory.map((item) => (item.id === editingProduct.id ? { ...item, image: editImageUrl } : item)));
      if (selectedDetailProduct?.id === editingProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, image: editImageUrl });
      }
      setEditingProduct(null);
    } catch {
      setInventory(inventory.map((item) => (item.id === editingProduct.id ? { ...item, image: editImageUrl } : item)));
      if (selectedDetailProduct?.id === editingProduct.id) {
        setSelectedDetailProduct({ ...selectedDetailProduct, image: editImageUrl });
      }
      setEditingProduct(null);
    }
  };

  const resetForm = () => {
    setSku('');
    setName('');
    setBrand('');
    setModel('');
    setCategory('General');
    setUnitCost('0.0');
    setSalePrice('0.0');
    setInitialStocks({
      tienda_1: 0,
      tienda_2: 0,
      tienda_3: 0,
    });
    setErrorMessage('');
    setInvNetworkError(null);
    try { localStorage.removeItem(DRAFT_INVENTORY_KEY); } catch {}
  };

  // Real-time Search & Filter Chips (Includes match by Brand & Model)
  const filteredInventory = inventory.filter((item) => {
    const query = search.toLowerCase();
    const matchesSearch =
      item.sku.toLowerCase().includes(query) ||
      item.name.toLowerCase().includes(query) ||
      (item.brand && item.brand.toLowerCase().includes(query)) ||
      (item.model && item.model.toLowerCase().includes(query)) ||
      (item.category && item.category.toLowerCase().includes(query));

    let matchesFilter = true;
    if (filterStatus === 'in_stock') matchesFilter = item.stock > 10;
    else if (filterStatus === 'low_stock') matchesFilter = item.stock > 0 && item.stock <= 10;
    else if (filterStatus === 'out_of_stock') matchesFilter = item.stock === 0;

    return matchesSearch && matchesFilter;
  });

  // Performance Pagination (25 items per page)
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInventory = filteredInventory.slice(startIndex, startIndex + itemsPerPage);

  const totalStockUnits = inventory.reduce((sum, item) => sum + item.stock, 0);
  const totalInventoryValue = inventory.reduce((sum, item) => sum + item.stock * item.unitCost, 0);
  const totalInventoryValueGtq = totalInventoryValue * 7.80;
  const totalUniqueSkus = inventory.length;

  if (isLoading) {
    return (
      <div className="space-y-6 min-h-[500px] animate-pulse">
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-28 w-full"></div>
        </div>
        <div className="space-y-3">
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
          <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 h-24 w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-h-[500px]">
      {/* Compact Minimal Header */}
      <div className="flex items-center justify-between py-2 px-1 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Stock e Inventario</h2>
        {!isVendedor && (
          <button
            onClick={() => {
              setErrorMessage('');
              setShowAddModal(true);
            }}
            className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo SKU</span>
          </button>
        )}
      </div>

      {/* Mini KPI Cards (~70px Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">SKUs Únicos</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">{totalUniqueSkus}</h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">catálogos</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Stock Total</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-indigo-600 dark:text-indigo-300 font-mono">{totalStockUnits}</h3>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">unidades</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Valoración Total</span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">Q {totalInventoryValueGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            <span className="text-[10px] font-mono text-slate-400 font-medium block">Total Quetzales</span>
          </div>
        </div>
      </div>

      {/* Sticky Header Search & Quick Filter Chips */}
      <div className="sticky top-0 sm:top-[57px] z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur py-3 px-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por SKU o Nombre de Producto en tiempo real..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-semibold"
          />
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-0.5 text-xs">
          <button
            onClick={() => {
              setFilterStatus('all');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            Todos ({inventory.length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('in_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'in_stock'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            En Stock ({inventory.filter((i) => i.stock > 10).length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('low_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'low_stock'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-amber-700 dark:text-amber-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            Stock Bajo ({inventory.filter((i) => i.stock > 0 && i.stock <= 10).length})
          </button>

          <button
            onClick={() => {
              setFilterStatus('out_of_stock');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg transition shrink-0 font-bold ${
              filterStatus === 'out_of_stock'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-rose-700 dark:text-rose-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            Agotados ({inventory.filter((i) => i.stock === 0).length})
          </button>
        </div>
      </div>

      {/* MOBILE COMPACT LIST VIEW (Visible on small screens md:hidden) */}
      <div className="md:hidden space-y-2">
        <div className="flex justify-between items-center px-1">
          <h3 className="font-bold text-white text-xs">Productos ({filteredInventory.length})</h3>
          <span className="text-[10px] text-slate-400">Toca una fila para ver detalles</span>
        </div>

        {paginatedInventory.length === 0 ? (
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center text-slate-400 text-xs">
            No se encontraron productos en el inventario.
          </div>
        ) : (
          paginatedInventory.map((item) => {
            let stockBadge = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
            let stockText = `${item.stock} uds`;

            if (item.stock === 0) {
              stockBadge = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
              stockText = 'Agotado';
            } else if (item.stock <= 10) {
              stockBadge = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
              stockText = `${item.stock} uds`;
            }

            const saleVal = item.sale_price && item.sale_price > 0 ? item.sale_price : item.unitCost * 1.15;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailProduct(item)}
                className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 active:bg-slate-800 cursor-pointer shadow-sm transition"
              >
                {/* Center: Name in Bold + SKU */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-white text-xs truncate leading-tight">{item.name}</h4>
                  <div className="flex items-center space-x-1.5 text-[10px] text-slate-400 truncate mt-0.5">
                    <span className="font-mono text-indigo-400 font-semibold">{item.sku}</span>
                    <span>•</span>
                    <span className="truncate">{item.category || 'General'}</span>
                  </div>
                </div>

                {/* Right: Stock Badge + Price in GTQ */}
                <div className="text-right shrink-0">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${stockBadge}`}>
                    {stockText}
                  </span>
                  <span className="block text-xs font-mono font-extrabold text-emerald-400 mt-0.5">
                    Q {saleVal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TABLE VIEW (Visible on md and larger) */}
      <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 dark:text-white text-base">Catálogo de Productos ({filteredInventory.length})</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900/80 text-xs uppercase text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-5 py-3">SKU</th>
                <th className="px-5 py-3">Producto</th>
                <th className="px-5 py-3">Categoría</th>
                <th className="px-5 py-3 text-center">Stock Total</th>
                <th className="px-5 py-3 text-right">Precio Costo</th>
                <th className="px-5 py-3 text-right bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">Precio Venta</th>
                <th className="px-5 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {paginatedInventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                    No se encontraron productos en el inventario.
                  </td>
                </tr>
              ) : (
                paginatedInventory.map((item) => {
                  let stockBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
                  if (item.stock === 0) {
                    stockBadge = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
                  } else if (item.stock <= 10) {
                    stockBadge = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
                  }

                  const salePriceVal = item.sale_price && item.sale_price > 0 ? item.sale_price : item.unitCost * 1.15;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition cursor-pointer" onClick={() => setSelectedDetailProduct(item)}>
                      <td className="px-5 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{item.sku}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        <span className="block truncate font-medium">{item.name}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-md font-medium border border-slate-200 dark:border-slate-600">
                          {item.category || 'General'}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${stockBadge}`}>
                          {item.stock} uds
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 dark:text-white">
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white block">
                          Q {item.unitCost.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right bg-emerald-50/50 dark:bg-emerald-950/20">
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-xs block">
                          Q {salePriceVal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => {
                              setStockEntryModalProduct(item);
                              setEntryStoreId(storesList[0]?.id || 'tienda_1');
                              setEntryQty(1);
                            }}
                            className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/40 rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                            title="Cargar entrada de stock"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Entrada</span>
                          </button>
                          <button
                            onClick={() => setSelectedDetailProduct(item)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-600/20 hover:bg-indigo-100 dark:hover:bg-indigo-600/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/40 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Ver Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Pagination Controls Bar */}
      {filteredInventory.length > itemsPerPage && (
        <div className="flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs font-semibold">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 text-white rounded-lg transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Anterior</span>
          </button>

          <span className="text-slate-400 font-mono">
            Página {currentPage} de {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-600 text-white rounded-lg transition"
          >
            <span>Siguiente</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detalle de Existencias Multitienda Modal */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
            {/* Header without photo */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3.5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded border border-indigo-500/20">
                    {selectedDetailProduct.sku}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {selectedDetailProduct.category || 'General'}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-white tracking-tight">{selectedDetailProduct.name}</h2>
              </div>
              <button onClick={() => setSelectedDetailProduct(null)} className="text-slate-400 hover:text-white p-1 text-lg font-bold cursor-pointer">✕</button>
            </div>

            {/* Main Section: Desglose de existencias físicas por sucursal */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              {(() => {
                const s1 = selectedDetailMatrix?.stock_tienda_1 ?? 0;
                const s2 = selectedDetailMatrix?.stock_tienda_2 ?? 0;
                const s3 = selectedDetailMatrix?.stock_tienda_3 ?? 0;
                const physicalTotal = s1 + s2 + s3;
                const transitTotal = selectedDetailMatrix?.stock_transito ?? 0;
                const grandTotal = selectedDetailMatrix?.stock_total ?? (physicalTotal + transitTotal);

                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        Detalle de Existencias Multitienda
                      </span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        Total Consolidado: {grandTotal} uds (Físico: {physicalTotal} | En camino: {transitTotal})
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                      {storesList.map(s => {
                        let qty = 0;
                        if (s.id === 'tienda_1') qty = s1;
                        else if (s.id === 'tienda_2') qty = s2;
                        else if (s.id === 'tienda_3') qty = s3;

                        return (
                          <div key={s.id} className="bg-slate-900 border border-slate-800 p-2.5 rounded-xl text-center space-y-0.5">
                            <span className="text-[10px] font-semibold text-slate-400 block truncate">{s.name}</span>
                            <span className={`text-lg font-black font-mono block ${qty > 0 ? 'text-white' : 'text-slate-600'}`}>
                              {qty}
                            </span>
                            <span className="text-[9px] text-slate-500 block">unidades</span>
                          </div>
                        );
                      })}

                      {/* 4ta caja: En Tránsito */}
                      <div className="bg-amber-950/20 border border-amber-500/30 p-2.5 rounded-xl text-center space-y-0.5">
                        <span className="text-[10px] font-semibold text-amber-400 block truncate">En Tránsito</span>
                        <span className={`text-lg font-black font-mono block ${transitTotal > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                          {transitTotal}
                        </span>
                        <span className="text-[9px] text-amber-500/70 block">en camino</span>
                      </div>
                    </div>

                    {/* Desglose de envíos en camino si existen */}
                    {selectedDetailMatrix?.transits && selectedDetailMatrix.transits.length > 0 && (
                      <div className="bg-amber-950/30 border border-amber-500/20 p-2.5 rounded-xl space-y-1 text-xs mt-2">
                        <span className="text-[11px] font-bold text-amber-300 block flex items-center gap-1">
                          🚚 Envíos activos en movimiento:
                        </span>
                        {selectedDetailMatrix.transits.map((t: any, idx: number) => {
                          const fromName = t.from_store_name || t.from_store_id;
                          const toName = t.to_store_name || t.to_store_id;
                          return (
                            <div key={idx} className="text-[11px] text-amber-200/90 font-mono flex items-center justify-between">
                              <span>De {fromName} a {toName}:</span>
                              <span className="font-bold">{t.quantity} unidades</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Datos Comerciales Simples */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-slate-400 block uppercase">Precio de Costo (Q)</span>
                <span className="text-lg font-extrabold font-mono text-slate-100 block">
                  Q {selectedDetailProduct.unitCost.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-emerald-400 block uppercase">Precio de Venta (Q)</span>
                <span className="text-lg font-black font-mono text-emerald-400 block">
                  Q {(selectedDetailProduct.sale_price && selectedDetailProduct.sale_price > 0 ? selectedDetailProduct.sale_price : selectedDetailProduct.unitCost * 1.15).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  const prod = selectedDetailProduct;
                  setSelectedDetailProduct(null);
                  setStockEntryModalProduct(prod);
                  setEntryStoreId(storesList[0]?.id || 'tienda_1');
                  setEntryQty(1);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Plus className="w-4 h-4" />
                <span>+ Cargar Entrada</span>
              </button>

              <button
                onClick={() => setSelectedDetailProduct(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Modal Add New Product / SKU directly */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">Registrar Nuevo Producto / SKU</h3>
                {(name.trim() !== '' || sku.trim() !== '') && (
                  <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    📝 Borrador autoguardado
                  </span>
                )}
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            {errorMessage && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg font-medium shrink-0">
                {errorMessage}
              </div>
            )}

            {invNetworkError && (
              <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-2.5 animate-in fade-in shrink-0">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                  <span className="font-semibold">{invNetworkError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCreateProduct()}
                  disabled={isSavingProduct}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow shrink-0 cursor-pointer flex items-center space-x-1"
                >
                  <span>{isSavingProduct ? 'Guardando...' : '🔄 Reintentar Guardar'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs overflow-y-auto max-h-[calc(90vh-100px)] pr-1 pb-1">
              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Código SKU Único *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. PROD-005"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold uppercase mb-1">Nombre del Producto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Audífonos Bluetooth Pro / Smartphone"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Fila de 3 columnas uniformes: Categoría, Precio de Costo, Precio de Venta */}
              <div className="grid grid-cols-3 gap-3 items-start">
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1 truncate">Categoría</label>
                  <input
                    type="text"
                    placeholder="General"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1 truncate">PRECIO DE COSTO (Q) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold uppercase mb-1 truncate">PRECIO DE VENTA (Q) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CONTENEDOR DESTACADO: DISTRIBUCIÓN INICIAL DE STOCK */}
              <div className="bg-slate-900 border border-slate-700/80 p-3.5 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" />
                    DISTRIBUCIÓN INICIAL DE STOCK
                  </span>
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                    Stock Total Inicial: {totalInitialStock} unidades
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 items-end">
                  {storesList.map(store => (
                    <div key={store.id} className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-300 block truncate">
                        {store.name}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={initialStocks[store.id] ?? 0}
                        onChange={e => setInitialStocks({
                          ...initialStocks,
                          [store.id]: Math.max(0, parseInt(e.target.value, 10) || 0)
                        })}
                        className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones inferiores con padding adecuado para evitar recortes */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="h-10 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="h-10 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingProduct ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Quick Stock Adjustment & Options */}
      {stockManageProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Ajustar Stock Físico</h3>
                <span className="text-xs text-blue-400 font-mono font-bold">{stockManageProduct.sku}</span>
              </div>
              <button onClick={() => setStockManageProduct(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-slate-700 text-center space-y-1">
              <span className="text-slate-400 text-xs block uppercase font-bold">Stock Actual</span>
              <span className="text-3xl font-extrabold text-white">{stockManageProduct.stock}</span>
              <span className="text-[10px] text-slate-400 block">unidades disponibles</span>
            </div>

            <div className="space-y-3 text-xs">
              <label className="block text-slate-400 font-semibold uppercase text-center">Cantidad a Modificar</label>
              <div className="flex items-center justify-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={stockChangeAmount}
                  onChange={(e) => setStockChangeAmount(e.target.value)}
                  className="w-24 text-center py-2 bg-slate-900 border border-slate-700 rounded-xl text-lg font-bold text-white focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => handleStockAdjustment(-Math.abs(parseInt(stockChangeAmount, 10) || 1))}
                  className="flex items-center justify-center space-x-1.5 py-2.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/40 font-bold rounded-xl transition active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                  <span>Reducir (-)</span>
                </button>

                <button
                  onClick={() => handleStockAdjustment(Math.abs(parseInt(stockChangeAmount, 10) || 1))}
                  className="flex items-center justify-center space-x-1.5 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 font-bold rounded-xl transition active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Incrementar (+)</span>
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-700">
              <button
                onClick={() => setStockManageProduct(null)}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Photo / Image */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">Actualizar Foto del Producto</h3>
                <span className="text-xs text-blue-400 font-mono font-bold">{editingProduct.sku}</span>
              </div>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white text-base font-bold">✕</button>
            </div>

            <ImagePicker
              value={editImageUrl}
              onChange={(img) => setEditImageUrl(img)}
              label="Selecciona una nueva foto o captura desde la cámara"
            />

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveProductImage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-blue-600/20"
              >
                Actualizar Foto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirm Delete Product */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertTriangle className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="font-bold text-white text-base">¿Eliminar Producto?</h3>
                <span className="text-xs text-slate-400 font-mono">{deleteConfirmProduct.sku}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Esta acción eliminará el SKU <strong className="text-white">{deleteConfirmProduct.name}</strong> del catálogo de la base de datos.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirmProduct)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition shadow-lg shadow-rose-600/20"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Price Variation History */}
      {showHistoryModal && historyProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl overflow-hidden space-y-4">
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
                    {historyProduct.sku}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-700 text-slate-300">
                    {historyProduct.category || 'General'}
                  </span>
                </div>
                <h3 className="font-bold text-white text-base mt-1">{historyProduct.name}</h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white p-1 text-base font-bold">✕</button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-100px)] space-y-3 pr-1">
              {priceHistory.length > 0 ? (
                priceHistory.map((hist, idx) => (
                  <div key={hist.id || idx} className="bg-slate-900/90 p-3 rounded-xl border border-slate-700 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-700/60 pb-1.5">
                      <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                        {hist.batchId || 'Lote Directo'}
                      </span>
                      <span className="text-[11px] text-slate-400">{hist.changeDate}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-0.5">
                      <div className="bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block font-bold">Anterior</span>
                        <span className="font-bold text-slate-300 block text-xs">${hist.oldCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-800 p-2 rounded-lg border border-blue-500/40">
                        <span className="text-[10px] text-blue-400 block font-bold">Actual</span>
                        <span className="font-bold text-white block text-xs">${hist.newCost.toFixed(2)}</span>
                      </div>
                      <div className="bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                        <span className="text-[10px] text-slate-400 block font-bold">Variación</span>
                        <span className={`font-bold block text-xs ${hist.delta > 0 ? 'text-amber-400' : hist.delta < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {hist.delta > 0 ? `+$${hist.delta.toFixed(2)}` : hist.delta < 0 ? `-$${Math.abs(hist.delta).toFixed(2)}` : '$0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-center py-4 bg-slate-900/50 rounded-xl text-xs">
                  Sin variaciones de precio registradas.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-700 shrink-0">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stock Entry Modal */}
      {stockEntryModalProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">+ Cargar Entrada de Stock</h3>
                  <span className="text-xs text-indigo-400 font-mono font-bold">{stockEntryModalProduct.sku} — {stockEntryModalProduct.name}</span>
                </div>
              </div>
              <button onClick={() => setStockEntryModalProduct(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleExecuteStockEntry} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold uppercase">Sucursal / Tienda Destino *</label>
                <select
                  value={entryStoreId}
                  onChange={e => setEntryStoreId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  {storesList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold uppercase">Cantidad a Ingresar *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entryQty}
                  onChange={e => setEntryQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockEntryModalProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingStockEntry}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSavingStockEntry ? 'Guardando...' : 'Confirmar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

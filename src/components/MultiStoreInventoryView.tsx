import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  X,
  Building2,
  RefreshCw,
  Boxes,
  ArrowRight,
  Trash2,
  Eye,
  Package,
  Pencil,
  Check,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import {
  fetchStoresApi,
  fetchInventoryMatrixApi,
  fetchTransfersApi,
  createTransferApi,
  receiveTransferApi,
  addStockEntryApi,
  createProductApi,
  deleteProductApi,
  updateProductApi,
  Store,
  MatrixProduct,
  InventoryTransfer,
  User
} from '../services/api';

interface MultiStoreInventoryViewProps {
  currentUser?: User | null;
}

export const MultiStoreInventoryView: React.FC<MultiStoreInventoryViewProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'matrix' | 'transfers'>('matrix');
  const [stores, setStores] = useState<Store[]>([]);
  const [matrix, setMatrix] = useState<MatrixProduct[]>([]);
  const [transfers, setTransfers] = useState<InventoryTransfer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Toast feedback
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  // 1. Modal: Nuevo Traslado
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [fromStoreId, setFromStoreId] = useState<string>('tienda_1');
  const [toStoreId, setToStoreId] = useState<string>('tienda_2');
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [transferQty, setTransferQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<number | null>(null);
  const [transferSearch, setTransferSearch] = useState<string>('');

  // 2. Modal: Nuevo Producto (SKU + Precios Q + Distribución por Tienda)
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newUnitCost, setNewUnitCost] = useState('0.0');
  const [newSalePrice, setNewSalePrice] = useState('0.0');
  const [pricingMode, setPricingMode] = useState<'fixed' | 'margin'>('fixed');
  const [marginPercent, setMarginPercent] = useState('30');
  const [newInitialStocks, setNewInitialStocks] = useState<Record<string, number>>({
    tienda_1: 0,
    tienda_2: 0,
    tienda_3: 0,
  });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // 3. Modal: Entrada Rápida de Stock
  const [stockEntryProduct, setStockEntryProduct] = useState<MatrixProduct | null>(null);
  const [stockEntryStoreId, setStockEntryStoreId] = useState<string>('tienda_1');
  const [stockEntryQty, setStockEntryQty] = useState<number>(1);
  const [isSubmittingStockEntry, setIsSubmittingStockEntry] = useState<boolean>(false);

  // 4. Modal: Ver Detalle Multitienda
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<MatrixProduct | null>(null);
  const [selectedDetailMatrix, setSelectedDetailMatrix] = useState<{
    stock_tienda_1: number;
    stock_tienda_2: number;
    stock_tienda_3: number;
    stock_transito: number;
    stock_total: number;
    transits: Array<{ from_store_name?: string; to_store_name?: string; from_store_id: string; to_store_id: string; quantity: number }>;
  } | null>(null);

  // State for editing commercial prices in Detail Modal
  const [isEditingPrices, setIsEditingPrices] = useState(false);
  const [editCostPrice, setEditCostPrice] = useState('0.0');
  const [editSalePrice, setEditSalePrice] = useState('0.0');
  const [editPricingMode, setEditPricingMode] = useState<'fixed' | 'margin'>('fixed');
  const [editMarginPercent, setEditMarginPercent] = useState('30');
  const [isSavingPrices, setIsSavingPrices] = useState(false);

  useEffect(() => {
    if (selectedDetailProduct) {
      const cost = selectedDetailProduct.cost_price || 0;
      const sale = selectedDetailProduct.sale_price || 0;
      setEditCostPrice(cost.toString());
      setEditSalePrice(sale.toString());
      const margin = cost > 0 ? (((sale - cost) / cost) * 100).toFixed(1) : '30';
      setEditMarginPercent(margin);
      setEditPricingMode('fixed');
      setIsEditingPrices(false);
    }
  }, [selectedDetailProduct]);

  const handleSavePrices = async () => {
    if (!selectedDetailProduct) return;
    const cost = parseFloat(editCostPrice);
    if (isNaN(cost) || cost < 0) {
      triggerToast('Ingresa un precio de costo válido.', 'error');
      return;
    }

    let finalSale = 0;
    if (editPricingMode === 'margin') {
      const margin = parseFloat(editMarginPercent);
      if (isNaN(margin) || margin < 0) {
        triggerToast('Ingresa un porcentaje de margen válido.', 'error');
        return;
      }
      finalSale = cost * (1 + margin / 100);
    } else {
      finalSale = parseFloat(editSalePrice);
      if (isNaN(finalSale) || finalSale < 0) {
        triggerToast('Ingresa un precio de venta válido.', 'error');
        return;
      }
    }

    setIsSavingPrices(true);
    try {
      await updateProductApi(selectedDetailProduct.id, {
        cost_price: cost,
        sale_price: finalSale
      });
      triggerToast('Precios del producto actualizados correctamente.');
      setSelectedDetailProduct(prev => prev ? { ...prev, cost_price: cost, sale_price: finalSale } : null);
      setIsEditingPrices(false);
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al actualizar precios.', 'error');
    } finally {
      setIsSavingPrices(false);
    }
  };

  // 5. Modal: Confirmación Eliminar Producto
  const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<MatrixProduct | null>(null);

  // 6. Modal: Detalle Amplio de Traslado
  const [selectedDetailTransfer, setSelectedDetailTransfer] = useState<InventoryTransfer | null>(null);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);

    try {
      const [storesRes, matrixRes, transfersRes] = await Promise.all([
        fetchStoresApi().catch(() => [
          { id: 'tienda_1', name: 'Tienda Central' },
          { id: 'tienda_2', name: 'Sucursal Norte' },
          { id: 'tienda_3', name: 'Sucursal Sur' }
        ]),
        fetchInventoryMatrixApi().catch(() => []),
        fetchTransfersApi().catch(() => [])
      ]);

      setStores(storesRes);
      setMatrix(matrixRes);
      setTransfers(transfersRes);
    } catch (err: any) {
      console.error('Error al cargar datos multitienda:', err);
      triggerToast('Error al conectar con la base de datos.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleStoresUpdated = () => loadData(true);
    window.addEventListener('stores_updated', handleStoresUpdated);
    return () => window.removeEventListener('stores_updated', handleStoresUpdated);
  }, []);

  // Fetch in-transit detail breakdown when a product detail modal opens
  useEffect(() => {
    if (!selectedDetailProduct) {
      setSelectedDetailMatrix(null);
      return;
    }
    let isMounted = true;
    Promise.all([
      fetchInventoryMatrixApi(),
      fetch(`/api/transfers/in-transit/${selectedDetailProduct.id}`).then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([matrixRes, inTransitList]) => {
      if (!isMounted) return;
      const found = matrixRes.find(m => m.sku === selectedDetailProduct.sku || m.id === selectedDetailProduct.id);
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
          stock_tienda_1: selectedDetailProduct.stock_tienda_1 || 0,
          stock_tienda_2: selectedDetailProduct.stock_tienda_2 || 0,
          stock_tienda_3: selectedDetailProduct.stock_tienda_3 || 0,
          stock_transito: selectedDetailProduct.stock_transito || 0,
          stock_total: selectedDetailProduct.stock_total || 0,
          transits: []
        });
      }
    }).catch(() => {
      if (!isMounted) return;
      setSelectedDetailMatrix({
        stock_tienda_1: selectedDetailProduct.stock_tienda_1 || 0,
        stock_tienda_2: selectedDetailProduct.stock_tienda_2 || 0,
        stock_tienda_3: selectedDetailProduct.stock_tienda_3 || 0,
        stock_transito: selectedDetailProduct.stock_transito || 0,
        stock_total: selectedDetailProduct.stock_total || 0,
        transits: []
      });
    });

    return () => {
      isMounted = false;
    };
  }, [selectedDetailProduct]);

  // Filter matrix by search term
  const filteredMatrix = useMemo(() => {
    if (!searchTerm.trim()) return matrix;
    const term = searchTerm.toLowerCase().trim();
    return matrix.filter(p =>
      p.name.toLowerCase().includes(term) ||
      (p.sku && p.sku.toLowerCase().includes(term)) ||
      (p.description && p.description.toLowerCase().includes(term))
    );
  }, [matrix, searchTerm]);

  // Total Initial Stock Indicator in Create Modal
  const totalInitialStockInModal = useMemo(() => {
    return Object.values(newInitialStocks).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
  }, [newInitialStocks]);

  const handleOpenTransferModal = () => {
    if (matrix.length > 0) {
      setSelectedProductId(matrix[0].id);
    }
    setTransferQty(1);
    setNotes('');
    setTransferSearch('');
    setShowTransferModal(true);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      triggerToast('Selecciona un producto válido.', 'error');
      return;
    }
    if (fromStoreId === toStoreId) {
      triggerToast('La tienda de origen y destino deben ser distintas.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createTransferApi({
        from_store_id: fromStoreId,
        to_store_id: toStoreId,
        items: [{ product_id: selectedProductId, quantity: transferQty }],
        notes
      });
      triggerToast('Traslado iniciado correctamente en estado "En Tránsito".');
      setShowTransferModal(false);
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al crear la transferencia.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceiveTransfer = async (transferId: number) => {
    setReceivingId(transferId);
    try {
      await receiveTransferApi(transferId);
      triggerToast('Recepción de traslado confirmada y stock actualizado.');
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al procesar la recepción.', 'error');
    } finally {
      setReceivingId(null);
    }
  };

  const handleExecuteStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockEntryProduct || stockEntryQty <= 0) return;

    setIsSubmittingStockEntry(true);
    try {
      await addStockEntryApi({
        store_id: stockEntryStoreId,
        product_id: stockEntryProduct.id,
        sku: stockEntryProduct.sku,
        quantity: stockEntryQty,
      });
      triggerToast(`Entrada de ${stockEntryQty} unidades registrada correctamente.`);
      setStockEntryProduct(null);
      setStockEntryQty(1);
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al registrar la entrada de stock.', 'error');
    } finally {
      setIsSubmittingStockEntry(false);
    }
  };

  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku.trim() || !newName.trim()) {
      triggerToast('Código SKU y Nombre de producto son requeridos.', 'error');
      return;
    }

    const costPriceVal = parseFloat(newUnitCost) || 0.0;
    const finalSalePrice = pricingMode === 'margin'
      ? costPriceVal * (1 + (parseFloat(marginPercent) || 0) / 100)
      : parseFloat(newSalePrice) || 0.0;

    setIsSavingProduct(true);
    try {
      await createProductApi({
        sku: newSku.trim().toUpperCase(),
        name: newName.trim(),
        category: newCategory.trim() || 'General',
        cost_price: costPriceVal,
        sale_price: finalSalePrice,
        initial_stocks: newInitialStocks,
      });
      triggerToast('Producto registrado y stock distribuido exitosamente.');
      setShowAddProductModal(false);
      setNewSku('');
      setNewName('');
      setNewCategory('General');
      setNewUnitCost('0.0');
      setNewSalePrice('0.0');
      setMarginPercent('30');
      setPricingMode('fixed');
      setNewInitialStocks({ tienda_1: 0, tienda_2: 0, tienda_3: 0 });
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al registrar producto.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProductExecute = async () => {
    if (!deleteConfirmProduct) return;
    try {
      await deleteProductApi(deleteConfirmProduct.id);
      triggerToast('Producto eliminado del inventario.');
      setDeleteConfirmProduct(null);
      await loadData(true);
    } catch (err: any) {
      triggerToast(err.message || 'Error al eliminar producto.', 'error');
    }
  };

  const getStoreName = (id: string) => {
    const s = stores.find(st => st.id === id);
    if (s) return s.name;
    if (id === 'tienda_1') return 'Tienda Central';
    if (id === 'tienda_2') return 'Sucursal Norte';
    if (id === 'tienda_3') return 'Sucursal Sur';
    return id;
  };

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
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

      {/* BARRA HORIZONTAL COMPACTA: HEADER, METRICAS Y ACCIONES */}
      {(() => {
        const totalSKUs = matrix.length;
        const s1Total = matrix.reduce((acc, curr) => acc + (curr.stock_tienda_1 || 0), 0);
        const s2Total = matrix.reduce((acc, curr) => acc + (curr.stock_tienda_2 || 0), 0);
        const s3Total = matrix.reduce((acc, curr) => acc + (curr.stock_tienda_3 || 0), 0);
        const totalPhysical = s1Total + s2Total + s3Total;
        const totalInTransit = matrix.reduce((acc, curr) => acc + (curr.stock_transito || 0), 0);
        const totalValuationCost = matrix.reduce((acc, curr) => {
          const cost = curr.cost_price || 0;
          const s1 = curr.stock_tienda_1 || 0;
          const s2 = curr.stock_tienda_2 || 0;
          const s3 = curr.stock_tienda_3 || 0;
          const sTrans = curr.stock_transito || 0;
          const totalQty = curr.stock_total || (s1 + s2 + s3 + sTrans);
          return acc + (totalQty * cost);
        }, 0);

        return (
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 mb-4 backdrop-blur-sm shadow-md">
            {/* 1. Sección Izquierda (Título y Estado) */}
            <div className="flex items-center gap-2.5 shrink-0">
              <h1 className="text-base font-bold text-white whitespace-nowrap">Control de Inventario</h1>
              <span className="text-[11px] text-slate-400 bg-slate-800/70 border border-slate-700/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                3 sucursales
              </span>
            </div>

            {/* 2. Sección Central (Métricas inline / pastillas compactas) */}
            <div className="flex items-center flex-wrap gap-3 text-xs font-mono">
              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-sans">SKUs:</span>
                <strong className="text-white font-semibold">{totalSKUs}</strong>
              </div>

              <span className="text-slate-700">|</span>

              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-sans">Stock:</span>
                <strong className="text-emerald-400 font-semibold">{totalPhysical} uds</strong>
                <span className="text-[10px] text-slate-500 font-mono">(T1:{s1Total} T2:{s2Total} T3:{s3Total})</span>
              </div>

              <span className="text-slate-700">|</span>

              {totalInTransit > 0 ? (
                <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                  🚚 {totalInTransit} en camino
                </span>
              ) : (
                <span className="text-slate-500 font-sans">Tránsito: 0</span>
              )}

              <span className="text-slate-700">|</span>

              <div className="flex items-center gap-1">
                <span className="text-slate-400 font-sans">Total:</span>
                <strong className="text-emerald-400 font-mono font-semibold">
                  Q {totalValuationCost.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>

            {/* 3. Sección Derecha (Acciones compactas) */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddProductModal(true)}
                className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer shadow transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Producto</span>
              </button>

              <button
                onClick={handleOpenTransferModal}
                className="h-8 px-3 text-xs bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Traslado</span>
              </button>

              <button
                onClick={() => loadData(true)}
                disabled={refreshing}
                className="h-8 w-8 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg inline-flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
                title="Refrescar datos"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Matriz de Existencias</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer relative ${
              activeTab === 'transfers'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Historial y Tránsito</span>
            {transfers.filter(t => t.status === 'en_transito').length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-slate-950 rounded-full animate-pulse">
                {transfers.filter(t => t.status === 'en_transito').length}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por SKU o Nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm font-medium">Cargando existencias multitienda...</span>
        </div>
      ) : activeTab === 'matrix' ? (
        /* ==================== TAB A: MATRIZ DE EXISTENCIAS ==================== */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/80 text-slate-300 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-4 px-4">SKU</th>
                  <th className="py-4 px-4">Producto</th>
                  <th className="py-4 px-3 text-center">{getStoreName('tienda_1')}</th>
                  <th className="py-4 px-3 text-center">{getStoreName('tienda_2')}</th>
                  <th className="py-4 px-3 text-center">{getStoreName('tienda_3')}</th>
                  <th className="py-4 px-3 text-center text-amber-400">En Tránsito</th>
                  <th className="py-4 px-4 text-center">Stock Total</th>
                  <th className="py-4 px-4 text-right">Precio Costo</th>
                  <th className="py-4 px-4 text-right text-emerald-400">Precio Venta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {filteredMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      No se encontraron productos coincidentes con el criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredMatrix.map(product => {
                    const s1 = product.stock_tienda_1 || 0;
                    const s2 = product.stock_tienda_2 || 0;
                    const s3 = product.stock_tienda_3 || 0;
                    const sTrans = product.stock_transito || 0;
                    const total = product.stock_total || (s1 + s2 + s3 + sTrans);

                    return (
                      <tr
                        key={product.id}
                        onClick={() => setSelectedDetailProduct(product)}
                        className="cursor-pointer hover:bg-slate-800/60 transition-colors border-b border-slate-800/50"
                      >
                        {/* SKU */}
                        <td className="py-4 px-4 font-mono text-xs font-bold text-indigo-400">
                          {product.sku || `PROD-${product.id}`}
                        </td>

                        {/* Producto */}
                        <td className="py-4 px-4">
                          <div className="font-semibold text-slate-100">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-slate-400 line-clamp-1">{product.description}</div>
                          )}
                        </td>

                        {/* Stock Tienda Central */}
                        <td className="py-4 px-3 text-center">
                          {s1 > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[2.2rem] px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700">
                              {s1}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">0</span>
                          )}
                        </td>

                        {/* Stock Sucursal Norte */}
                        <td className="py-4 px-3 text-center">
                          {s2 > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[2.2rem] px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700">
                              {s2}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">0</span>
                          )}
                        </td>

                        {/* Stock Sucursal Sur */}
                        <td className="py-4 px-3 text-center">
                          {s3 > 0 ? (
                            <span className="inline-flex items-center justify-center min-w-[2.2rem] px-2 py-0.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-100 border border-slate-700">
                              {s3}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">0</span>
                          )}
                        </td>

                        {/* Stock En Tránsito */}
                        <td className="py-4 px-3 text-center">
                          {sTrans > 0 ? (
                            <span className="inline-flex items-center justify-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              🚚 {sTrans} uds
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">-</span>
                          )}
                        </td>

                        {/* Stock Total Consolidado */}
                        <td className="py-4 px-4 text-center font-semibold">
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold ${
                              total > 0
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm'
                                : 'bg-slate-800 text-slate-500 border border-slate-700'
                            }`}
                          >
                            {total} unid.
                          </span>
                        </td>

                        {/* Precio Costo (Q) */}
                        <td className="py-4 px-4 text-right font-mono text-xs font-bold text-slate-200">
                          Q {(product.cost_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Precio Venta (Q) */}
                        <td className="py-4 px-4 text-right font-mono text-xs font-black text-emerald-400">
                          Q {(product.sale_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ==================== TAB B: HISTORIAL Y TRÁNSITO ==================== */
        <div className="space-y-4">
          {transfers.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <ArrowRightLeft className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-semibold text-slate-200">No hay transferencias registradas</h3>
              <p className="text-sm text-slate-500">
                Aún no has realizado movimientos de mercancía entre las tiendas.
              </p>
              <button
                onClick={handleOpenTransferModal}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-500 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Primer Traslado</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {transfers.map(transfer => {
                const isPending = transfer.status === 'en_transito';
                const fromName = transfer.from_store_name || getStoreName(transfer.from_store_id);
                const toName = transfer.to_store_name || getStoreName(transfer.to_store_id);
                const formattedDate = new Date(transfer.created_at).toLocaleString('es-GT', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                });

                return (
                  <div
                    key={transfer.id}
                    onClick={() => setSelectedDetailTransfer(transfer)}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    {/* Bloque Izquierdo (Identificador y Ruta) */}
                    <div className="flex items-center gap-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-slate-200 font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60">
                        #{transfer.id}
                      </span>

                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          <span>En Tránsito</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completado</span>
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60">{fromName}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700/60">{toName}</span>
                      </div>
                    </div>

                    {/* Bloque Central (Productos y Unidades) */}
                    <div className="flex items-center gap-1.5 flex-wrap overflow-hidden">
                      {transfer.items && transfer.items.length > 0 ? (
                        transfer.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/60 px-2.5 py-1 rounded-md whitespace-nowrap"
                          >
                            {item.product_name || `ID #${item.product_id}`}: <strong className="text-white">{item.quantity} uds</strong>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin productos</span>
                      )}
                    </div>

                    {/* Bloque Derecho (Fecha y Acción) */}
                    <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
                      <span className="text-xs text-slate-300 font-mono font-medium">{formattedDate}</span>

                      {isPending && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleReceiveTransfer(transfer.id)}
                            disabled={receivingId === transfer.id}
                            className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            {receivingId === transfer.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Confirmar Recepción</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      </div>

      {/* MODAL 1: NUEVO PRODUCTO CON DISTRIBUCIÓN INICIAL */}
      {showAddProductModal && (
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 w-screen h-screen bg-slate-950 flex flex-col m-0 p-0"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* 1. Header (arriba, altura fija) */}
          <div className="w-full px-8 py-4 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg sm:text-xl tracking-tight">
                  Registrar Nuevo Producto / SKU
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Crea el producto en el catálogo maestro y asigna existencias físicas iniciales por sucursal
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAddProductModal(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* Formulario que contiene cuerpo central scrolleable y footer fijo */}
          <form onSubmit={handleCreateProductSubmit} className="flex-1 flex flex-col min-h-0 w-full m-0 p-0">
            {/* 2. Cuerpo central (resto de pantalla) */}
            <div className="flex-1 w-full px-8 py-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              
              {/* Columna Izquierda: Información General y Precios */}
              <div className="space-y-6">
                {/* Panel 1: Catálogo e Identificación */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider pb-2 border-b border-slate-800/80">
                    <Package className="w-4 h-4" />
                    <span>1. Información del Producto & Catálogo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 font-semibold uppercase mb-1.5 text-xs">Código SKU Único *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. PROD-005"
                        value={newSku}
                        onChange={(e) => setNewSku(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 font-semibold uppercase mb-1.5 text-xs">Categoría</label>
                      <input
                        type="text"
                        placeholder="General (ej. Electrónica, Accesorios)"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold uppercase mb-1.5 text-xs">Nombre del Producto *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Audífonos Bluetooth Pro / Smartphone 128GB"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Panel 2: Precios Comerciales */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
                  {/* Cabecera de Precios con selector de modalidad en línea limpia separada */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-3">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
                      <DollarSign className="w-4 h-4" />
                      <span>2. Estructura de Precios Comerciales (Q)</span>
                    </div>

                    {/* Switch / Tabs limpio para selector de Fijo (Q) / Margen (%) */}
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] text-slate-400 font-medium">Modalidad:</span>
                      <div className="inline-flex bg-slate-950 p-0.5 rounded-xl border border-slate-700/80 text-xs">
                        <button
                          type="button"
                          onClick={() => setPricingMode('fixed')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            pricingMode === 'fixed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Fijo (Q)
                        </button>
                        <button
                          type="button"
                          onClick={() => setPricingMode('margin')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                            pricingMode === 'margin'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Margen (%)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                    {/* Costo */}
                    <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        Precio de Costo (Q) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-slate-500 font-bold text-sm">
                          Q
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={newUnitCost}
                          onChange={(e) => setNewUnitCost(e.target.value)}
                          className="w-full h-11 pl-9 pr-3.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">Costo unitario de compra o importación</p>
                    </div>

                    {/* Venta / Margen */}
                    <div className="bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-xl space-y-2">
                      <label className="block text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                        {pricingMode === 'fixed' ? 'Precio Venta al Público (Q) *' : 'Porcentaje de Margen deseado (%) *'}
                      </label>

                      {pricingMode === 'fixed' ? (
                        <>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-500 font-bold text-sm">
                              Q
                            </span>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              value={newSalePrice}
                              onChange={(e) => setNewSalePrice(e.target.value)}
                              className="w-full h-11 pl-9 pr-3.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                              placeholder="0.00"
                            />
                          </div>
                          {(() => {
                            const cost = parseFloat(newUnitCost) || 0;
                            const sale = parseFloat(newSalePrice) || 0;
                            const profit = sale - cost;
                            const pct = cost > 0 ? (profit / cost) * 100 : 0;
                            return (
                              <div className="text-[11px] font-mono flex items-center justify-between text-slate-400 pt-0.5">
                                <span>Ganancia estimada:</span>
                                <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  Q {profit.toFixed(2)} ({pct.toFixed(1)}%)
                                </span>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              required
                              value={marginPercent}
                              onChange={(e) => setMarginPercent(e.target.value)}
                              className="w-full h-11 px-3.5 pr-8 bg-slate-900 border border-emerald-500/40 rounded-xl text-emerald-300 font-mono text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                              placeholder="30"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-emerald-500 font-bold text-sm">
                              %
                            </span>
                          </div>
                          {(() => {
                            const cost = parseFloat(newUnitCost) || 0;
                            const margin = parseFloat(marginPercent) || 0;
                            const calcSale = cost * (1 + margin / 100);
                            return (
                              <div className="text-[11px] font-mono flex items-center justify-between text-emerald-400 pt-0.5">
                                <span className="text-slate-400">Precio resultante:</span>
                                <span className="font-bold">Q {calcSale.toFixed(2)}</span>
                              </div>
                            );
                          })()}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Distribución Inicial de Stock Físico */}
              <div className="space-y-6">
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-5 shadow-inner">
                  {/* Cabecera con Badge destacado de Stock Total Inicial */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
                    <span className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      3. Existencias Iniciales Físicas
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 font-mono">
                      <span>Stock Inicial:</span>
                      <strong className="text-sm">{totalInitialStockInModal}</strong>
                      <span>uds</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Asigna la cantidad de existencias físicas iniciales con las que se dará de alta este producto en cada sucursal:
                  </p>

                  {/* Filas compactas y ordenadas de Tienda 1, Tienda 2 y Tienda 3 */}
                  <div className="space-y-3">
                    {stores.map(store => (
                      <div
                        key={store.id}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 p-3 sm:p-4 rounded-xl flex items-center justify-between gap-4 transition-colors"
                      >
                        {/* Izquierda: Ícono + nombre/sucursal */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-white text-xs sm:text-sm block truncate">{store.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono block">Sucursal: {store.id}</span>
                          </div>
                        </div>

                        {/* Derecha: Input numérico con ancho fijo adecuado (w-28 o w-32) */}
                        <div className="w-28 sm:w-32 shrink-0">
                          <input
                            type="number"
                            min="0"
                            value={newInitialStocks[store.id] ?? 0}
                            onChange={e => setNewInitialStocks({
                              ...newInitialStocks,
                              [store.id]: Math.max(0, parseInt(e.target.value, 10) || 0)
                            })}
                            className="w-full h-10 px-3 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-sm text-center focus:border-indigo-500 focus:outline-none transition-colors"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3.5 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs text-indigo-300/90 flex items-start gap-2.5 mt-4">
                    <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">
                      El stock ingresado se almacenará directamente en la tabla <strong>store_inventory</strong> como fuente única de verdad.
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* 3. Footer (abajo, altura fija) */}
            <div className="w-full px-8 py-4 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="h-10 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="h-10 px-7 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>{isSavingProduct ? 'Guardando...' : 'Guardar Producto'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: NUEVO TRASLADO */}
      {showTransferModal && (
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 w-screen h-screen bg-slate-950 flex flex-col m-0 p-0"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* 1. Header fijo superior */}
          <div className="w-full px-8 py-5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg sm:text-xl tracking-tight">
                  Crear Traslado entre Tiendas
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Transfiere stock físico entre sucursales de forma atómica y segura
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* Formulario que contiene cuerpo central scrolleable y footer fijo */}
          <form onSubmit={handleCreateTransfer} className="flex-1 flex flex-col min-h-0 w-full m-0 p-0">
            {/* 2. Cuerpo central scrolleable */}
            <div className="flex-1 w-full px-8 py-8 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto w-full items-start">
                
                {/* Columna Izquierda: Ruta y Observaciones */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-inner">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-800/80">
                    <Building2 className="w-4 h-4" />
                    <span>1. Ruta de Sucursales</span>
                  </div>

                  {/* Selectores de Tienda Origen y Tienda Destino */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                    <div className="space-y-2">
                      <label className="font-semibold text-slate-300 uppercase text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                        Tienda Origen (Salida de Stock) *
                      </label>
                      <select
                        value={fromStoreId}
                        onChange={(e) => {
                          const newFrom = e.target.value;
                          setFromStoreId(newFrom);
                          if (newFrom === toStoreId) {
                            const other = stores.find(s => s.id !== newFrom);
                            if (other) setToStoreId(other.id);
                          }
                        }}
                        className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">De donde saldrán las existencias físicas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="font-semibold text-slate-300 uppercase text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Tienda Destino (Entrada de Stock) *
                      </label>
                      <select
                        value={toStoreId}
                        onChange={(e) => {
                          const newTo = e.target.value;
                          setToStoreId(newTo);
                          if (newTo === fromStoreId) {
                            const other = stores.find(s => s.id !== newTo);
                            if (other) setFromStoreId(other.id);
                          }
                        }}
                        className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-medium text-xs sm:text-sm focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-slate-500">Donde se recibirán al confirmar recepción</p>
                    </div>
                  </div>

                  {/* Resumen visual de la ruta */}
                  <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{getStoreName(fromStoreId)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-400 font-sans text-[11px] font-semibold">
                      <ArrowRight className="w-4 h-4 animate-pulse" />
                      <span>En tránsito</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{getStoreName(toStoreId)}</span>
                    </div>
                  </div>

                  {/* Notas / Observaciones con altura adecuada */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <label className="font-semibold text-slate-300 uppercase text-xs block">
                      Notas / Observaciones del Traslado (Opcional)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Ej. Reabastecimiento urgente de existencias para fin de semana..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none text-xs sm:text-sm resize-none transition-colors leading-relaxed"
                    />
                    <p className="text-[11px] text-slate-500">Estas notas se registrarán en el historial de transferencias.</p>
                  </div>
                </div>

                {/* Columna Derecha: Producto y Cantidades */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-6 sm:p-7 space-y-6 shadow-inner">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider pb-3 border-b border-slate-800/80">
                    <Boxes className="w-4 h-4" />
                    <span>2. Producto y Cantidades</span>
                  </div>

                  {/* Selector de producto con buscador integrado */}
                  <div className="space-y-3">
                    <label className="font-semibold text-slate-300 uppercase text-xs block">
                      Seleccionar Producto *
                    </label>

                    {/* Buscador integrado */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar por código SKU o nombre..."
                        value={transferSearch}
                        onChange={(e) => setTransferSearch(e.target.value)}
                        className="w-full h-10 pl-10 pr-8 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      {transferSearch && (
                        <button
                          type="button"
                          onClick={() => setTransferSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Select con productos filtrados */}
                    {(() => {
                      const filteredList = matrix.filter(p => {
                        if (!transferSearch.trim()) return true;
                        const q = transferSearch.toLowerCase();
                        return (p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
                      });

                      return (
                        <select
                          value={selectedProductId || ''}
                          onChange={(e) => setSelectedProductId(Number(e.target.value))}
                          className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none text-xs sm:text-sm transition-colors"
                        >
                          {filteredList.length === 0 ? (
                            <option value="" disabled>No se encontraron productos coincidentes</option>
                          ) : (
                            filteredList.map(p => {
                              let avail = p.stock_tienda_1 || 0;
                              if (fromStoreId === 'tienda_2') avail = p.stock_tienda_2 || 0;
                              if (fromStoreId === 'tienda_3') avail = p.stock_tienda_3 || 0;

                              return (
                                <option key={p.id} value={p.id}>
                                  {p.sku} — {p.name} (Disponible: {avail} uds)
                                </option>
                              );
                            })
                          )}
                        </select>
                      );
                    })()}
                  </div>

                  {/* Tarjeta destacada con el stock disponible en tiempo real */}
                  {(() => {
                    const prod = matrix.find(p => p.id === selectedProductId);
                    let availableStock = 0;
                    if (prod) {
                      if (fromStoreId === 'tienda_1') availableStock = prod.stock_tienda_1 || 0;
                      else if (fromStoreId === 'tienda_2') availableStock = prod.stock_tienda_2 || 0;
                      else if (fromStoreId === 'tienda_3') availableStock = prod.stock_tienda_3 || 0;
                    }

                    return (
                      <>
                        <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between shadow-inner">
                          <div className="space-y-0.5">
                            <span className="text-xs text-slate-400 font-semibold uppercase block">Stock Disponible en Origen</span>
                            <span className="text-xs text-slate-300 font-mono">{getStoreName(fromStoreId)}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-2xl font-black font-mono block ${availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {availableStock}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">unidades físicas</span>
                          </div>
                        </div>

                        {/* Input de cantidad a trasladar con botones rápidos */}
                        <div className="space-y-2">
                          <label className="font-semibold text-slate-300 uppercase text-xs block">
                            Cantidad a Trasladar (Unidades) *
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                max={availableStock > 0 ? availableStock : undefined}
                                required
                                value={transferQty}
                                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full h-11 px-3.5 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:border-indigo-500 focus:outline-none transition-colors"
                              />
                              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                                uds
                              </span>
                            </div>

                            {/* Botones rápidos de incremento */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => Math.max(1, prev - 1))}
                                className="h-11 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                                title="Restar 1 unidad"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 1) : prev + 1))}
                                className="h-11 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 5) : prev + 5))}
                                className="h-11 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                                title="Sumar 5 unidades"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 10) : prev + 10))}
                                className="h-11 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition cursor-pointer"
                                title="Sumar 10 unidades"
                              >
                                +10
                              </button>
                              {availableStock > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setTransferQty(availableStock)}
                                  className="h-11 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition cursor-pointer"
                                  title="Trasladar todo el stock disponible"
                                >
                                  Max ({availableStock})
                                </button>
                              )}
                            </div>
                          </div>

                          {transferQty > availableStock && availableStock > 0 && (
                            <p className="text-xs text-amber-400 font-semibold flex items-center gap-1.5 mt-1">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>La cantidad indicada ({transferQty}) supera las existencias disponibles en origen ({availableStock} uds).</span>
                            </p>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

              </div>
            </div>

            {/* 3. Footer fijo inferior */}
            <div className="w-full px-8 py-4 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center gap-4 shrink-0">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="h-10 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-7 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-indigo-600/25 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>{submitting ? 'Procesando...' : 'Crear Traslado'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: ENTRADA RÁPIDA DE STOCK */}
      {stockEntryProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-400" />
                Cargar Entrada de Stock
              </h3>
              <button onClick={() => setStockEntryProduct(null)} className="text-slate-400 hover:text-white p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-0.5 text-xs">
              <div className="text-indigo-400 font-mono font-bold">{stockEntryProduct.sku}</div>
              <div className="text-white font-bold text-sm">{stockEntryProduct.name}</div>
            </div>

            <form onSubmit={handleExecuteStockEntry} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-400 uppercase">Seleccionar Tienda Destino *</label>
                <select
                  value={stockEntryStoreId}
                  onChange={(e) => setStockEntryStoreId(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
                >
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-400 uppercase">Cantidad a Ingresar *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockEntryQty}
                  onChange={(e) => setStockEntryQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full h-10 px-3 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStockEntryProduct(null)}
                  className="h-10 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingStockEntry}
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingStockEntry ? 'Guardando...' : 'Registrar Entrada'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: DETALLE DE EXISTENCIAS MULTITIENDA */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-[95vw] max-w-6xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
                    {selectedDetailProduct.sku}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                    {selectedDetailProduct.category || selectedDetailProduct.description || 'General'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{selectedDetailProduct.name}</h2>
              </div>
              <button
                onClick={() => setSelectedDetailProduct(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid 2 Columnas Lado a Lado: Existencias Multitienda y Precios Comerciales */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Columna Izquierda (7 cols): Desglose de Existencias por Sucursal */}
              <div className="lg:col-span-7 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                {(() => {
                  const s1 = selectedDetailMatrix?.stock_tienda_1 ?? 0;
                  const s2 = selectedDetailMatrix?.stock_tienda_2 ?? 0;
                  const s3 = selectedDetailMatrix?.stock_tienda_3 ?? 0;
                  const physicalTotal = s1 + s2 + s3;
                  const transitTotal = selectedDetailMatrix?.stock_transito ?? 0;
                  const grandTotal = selectedDetailMatrix?.stock_total ?? (physicalTotal + transitTotal);

                  return (
                    <>
                      <div className="flex items-center justify-between gap-3 w-full border-b border-slate-800/80 pb-3">
                        <span className="font-extrabold text-indigo-400 text-xs uppercase tracking-wider flex items-center gap-2 shrink-0">
                          <Building2 className="w-4 h-4" />
                          Existencias Físicas Multitienda
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap font-mono">
                            Total: {grandTotal} uds
                          </span>
                          {transitTotal > 0 && (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap font-mono">
                              🚚 {transitTotal} en camino
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        {stores.map(s => {
                          let qty = 0;
                          if (s.id === 'tienda_1') qty = s1;
                          else if (s.id === 'tienda_2') qty = s2;
                          else if (s.id === 'tienda_3') qty = s3;

                          return (
                            <div key={s.id} className="bg-slate-900 border border-slate-800/90 p-3.5 rounded-xl text-center space-y-1">
                              <span className="text-[11px] font-semibold text-slate-400 block truncate">{s.name}</span>
                              <span className={`text-2xl font-black font-mono block ${qty > 0 ? 'text-white' : 'text-slate-600'}`}>
                                {qty}
                              </span>
                              <span className="text-[10px] text-slate-500 block uppercase font-mono">unidades</span>
                            </div>
                          );
                        })}

                        {/* 4ta caja: En Tránsito */}
                        <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 rounded-xl text-center space-y-1">
                          <span className="text-[11px] font-semibold text-amber-400 block truncate">En Tránsito</span>
                          <span className={`text-2xl font-black font-mono block ${transitTotal > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                            {transitTotal}
                          </span>
                          <span className="text-[10px] text-amber-500/70 block uppercase font-mono">en camino</span>
                        </div>
                      </div>

                      {/* Desglose de envíos en camino si existen */}
                      {selectedDetailMatrix?.transits && selectedDetailMatrix.transits.length > 0 && (
                        <div className="bg-amber-950/30 border border-amber-500/20 p-3.5 rounded-xl space-y-2 text-xs mt-3">
                          <span className="text-xs font-bold text-amber-300 block flex items-center gap-1.5">
                            🚚 Envíos activos en movimiento:
                          </span>
                          <div className="space-y-1.5">
                            {selectedDetailMatrix.transits.map((t: any, idx: number) => {
                              const fromName = t.from_store_name || getStoreName(t.from_store_id);
                              const toName = t.to_store_name || getStoreName(t.to_store_id);
                              return (
                                <div key={idx} className="text-xs text-amber-200/90 font-mono flex items-center justify-between p-2 rounded-lg bg-amber-950/40 border border-amber-500/10">
                                  <span>De <strong>{fromName}</strong> a <strong>{toName}</strong>:</span>
                                  <span className="font-bold text-amber-300">{t.quantity} unidades</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Columna Derecha (5 cols): Precios Comerciales */}
              <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 w-full">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-indigo-400" />
                    <span>Precios Comerciales (Q)</span>
                  </div>
                  {currentUser?.role !== 'Vendedor' && !isEditingPrices && (
                    <button
                      onClick={() => setIsEditingPrices(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/20 transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {!isEditingPrices ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1">
                        <span className="text-[11px] font-semibold text-slate-400 block uppercase">Precio de Costo</span>
                        <span className="text-lg font-extrabold font-mono text-slate-100 block">
                          Q {(selectedDetailProduct.cost_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="bg-emerald-950/20 border border-emerald-500/20 p-3.5 rounded-xl space-y-1">
                        <span className="text-[11px] font-semibold text-emerald-400 block uppercase">Precio de Venta</span>
                        <span className="text-lg font-black font-mono text-emerald-400 block">
                          Q {(selectedDetailProduct.sale_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const cost = selectedDetailProduct.cost_price || 0;
                      const sale = selectedDetailProduct.sale_price || 0;
                      const profit = sale - cost;
                      const margin = cost > 0 ? (profit / cost) * 100 : 0;

                      return (
                        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Margen Comercial:</span>
                          <span className={`font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            +Q {profit.toFixed(2)} ({margin.toFixed(1)}%)
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                      {/* Columna Costo */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">PRECIO COSTO (Q)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCostPrice}
                          onChange={(e) => setEditCostPrice(e.target.value)}
                          className="h-10 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Columna Venta */}
                      <div>
                        <label className="block text-xs font-semibold text-emerald-400 mb-1.5">
                          {editPricingMode === 'fixed' ? 'PRECIO VENTA (Q)' : 'MARGEN DESEADO (%)'}
                        </label>
                        {editPricingMode === 'fixed' ? (
                          <>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editSalePrice}
                              onChange={(e) => setEditSalePrice(e.target.value)}
                              className="h-10 w-full rounded-lg bg-slate-900 border border-slate-700 px-3 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                            />
                            {(() => {
                              const cost = parseFloat(editCostPrice) || 0;
                              const sale = parseFloat(editSalePrice) || 0;
                              const profit = sale - cost;
                              const pct = cost > 0 ? (profit / cost) * 100 : 0;
                              return (
                                <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                                  Margen: +{pct.toFixed(1)}% (Q {profit.toFixed(2)})
                                </div>
                              );
                            })()}
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              value={editMarginPercent}
                              onChange={(e) => setEditMarginPercent(e.target.value)}
                              className="h-10 w-full rounded-lg bg-slate-900 border border-emerald-500/40 px-3 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                            />
                            {(() => {
                              const cost = parseFloat(editCostPrice) || 0;
                              const margin = parseFloat(editMarginPercent) || 0;
                              const calcSale = cost * (1 + margin / 100);
                              return (
                                <div className="mt-1 text-[11px] text-emerald-400 font-mono font-bold truncate">
                                  Venta: Q {calcSale.toFixed(2)}
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Barra Inferior de Controles */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-800 w-full">
                      <div className="inline-flex bg-slate-900 p-0.5 rounded border border-slate-700/60 text-[10px] shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditPricingMode('fixed')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition ${
                            editPricingMode === 'fixed'
                              ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Fijo (Q)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPricingMode('margin')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition ${
                            editPricingMode === 'margin'
                              ? 'bg-emerald-500/20 text-emerald-400 font-semibold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Margen (%)
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPrices(false);
                            setEditCostPrice((selectedDetailProduct.cost_price || 0).toString());
                            setEditSalePrice((selectedDetailProduct.sale_price || 0).toString());
                          }}
                          className="h-8 px-3 text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePrices}
                          disabled={isSavingPrices}
                          className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isSavingPrices ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer de Acciones del Modal */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const prod = selectedDetailProduct;
                    setSelectedDetailProduct(null);
                    setStockEntryProduct(prod);
                    setStockEntryStoreId(stores[0]?.id || 'tienda_1');
                    setStockEntryQty(1);
                  }}
                  className="h-10 px-4 inline-flex items-center gap-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-lg shadow-emerald-600/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cargar Entrada de Stock</span>
                </button>

                {currentUser?.role !== 'Vendedor' && (
                  <button
                    onClick={() => {
                      const prod = selectedDetailProduct;
                      setSelectedDetailProduct(null);
                      setDeleteConfirmProduct(prod);
                    }}
                    className="h-10 px-4 inline-flex items-center gap-2 text-xs font-semibold rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar SKU</span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedDetailProduct(null)}
                className="h-10 px-6 inline-flex items-center text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: CONFIRMACIÓN DE ELIMINACIÓN */}
      {deleteConfirmProduct && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-center animate-in fade-in duration-200">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-rose-500/20">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">¿Eliminar Producto?</h3>
              <p className="text-xs text-slate-400">
                Esta acción eliminará el SKU <strong className="text-white font-mono">{deleteConfirmProduct.sku}</strong> ({deleteConfirmProduct.name}) y todo su inventario en las sucursales.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                onClick={() => setDeleteConfirmProduct(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteProductExecute}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs cursor-pointer shadow-lg shadow-rose-600/20 transition"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DETALLE AMPLIO DE TRASLADO */}
      {selectedDetailTransfer && (
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 w-screen h-screen bg-slate-950 flex flex-col m-0 p-0"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* 1. Header fijo superior */}
          <div className="w-full px-8 py-5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-white text-xl sm:text-2xl tracking-tight">
                  Traslado #{selectedDetailTransfer.id}
                </h3>
                {selectedDetailTransfer.status === 'en_transito' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>En Tránsito</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completado</span>
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 flex flex-wrap gap-5 font-mono pt-0.5">
                <span>
                  <strong className="text-slate-300">Fecha de Creación:</strong>{' '}
                  {new Date(selectedDetailTransfer.created_at).toLocaleString('es-GT', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
                {selectedDetailTransfer.received_at && (
                  <span>
                    <strong className="text-emerald-400">Fecha de Recepción:</strong>{' '}
                    {new Date(selectedDetailTransfer.received_at).toLocaleString('es-GT', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDetailTransfer(null)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* 2. Cuerpo central scrolleable */}
          <div className="flex-1 w-full px-8 py-8 overflow-y-auto space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Ruta de Traslado: Tarjetas amplias de origen y destino con la flecha central */}
              <div className="bg-slate-900/70 border border-slate-800/90 p-6 rounded-2xl space-y-4 shadow-inner">
                <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Ruta de Traslado entre Sucursales
                </span>
                <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center bg-slate-950/70 border border-slate-800 p-5 rounded-xl">
                  {/* Origen */}
                  <div className="md:col-span-5 text-center sm:text-left space-y-1.5 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Tienda Origen (Salida de Stock)</span>
                    <div className="font-extrabold text-base sm:text-lg text-slate-100 flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      <span>{selectedDetailTransfer.from_store_name || getStoreName(selectedDetailTransfer.from_store_id)}</span>
                    </div>
                  </div>

                  {/* Flecha indicadora central */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center py-2">
                    <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-full border border-indigo-500/30 shadow-lg shadow-indigo-600/10">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] text-indigo-400 font-mono mt-1 font-bold">Traslado</span>
                  </div>

                  {/* Destino */}
                  <div className="md:col-span-5 text-center sm:text-left space-y-1.5 p-4 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Tienda Destino (Entrada de Stock)</span>
                    <div className="font-extrabold text-base sm:text-lg text-slate-100 flex items-center gap-2.5">
                      <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span>{selectedDetailTransfer.to_store_name || getStoreName(selectedDetailTransfer.to_store_id)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla de Productos Trasladados a todo el ancho */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl overflow-hidden shadow-inner">
                <div className="p-5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <Boxes className="w-4 h-4" />
                    Productos y Cantidades Trasladadas
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/20 font-mono">
                    Total de Unidades: {selectedDetailTransfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} piezas
                  </span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-xs">
                      <tr>
                        <th className="py-3.5 px-6 w-48">Código SKU</th>
                        <th className="py-3.5 px-6">Descripción del Producto</th>
                        <th className="py-3.5 px-6 text-right w-56">Cantidad Trasladada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-slate-200">
                      {selectedDetailTransfer.items && selectedDetailTransfer.items.length > 0 ? (
                        selectedDetailTransfer.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-4 px-6 font-mono font-bold text-indigo-400">
                              {item.sku || `PROD-${item.product_id}`}
                            </td>
                            <td className="py-4 px-6 font-semibold text-white">
                              {item.product_name || `Producto #${item.product_id}`}
                            </td>
                            <td className="py-4 px-6 text-right font-mono font-extrabold text-emerald-400 text-base">
                              {item.quantity} <span className="text-xs text-slate-400 font-normal">uds</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-slate-500">
                            No hay items asociados a este traslado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas / Observaciones */}
              <div className="bg-slate-900/70 border border-slate-800/90 p-5 sm:p-6 rounded-2xl space-y-2 shadow-inner">
                <span className="text-xs font-bold text-slate-400 uppercase block tracking-wider">
                  Notas / Observaciones del Envío:
                </span>
                <p className="text-xs sm:text-sm text-slate-200 font-mono italic leading-relaxed">
                  {selectedDetailTransfer.notes && selectedDetailTransfer.notes.trim() !== ''
                    ? `"${selectedDetailTransfer.notes}"`
                    : 'Sin notas adicionales para este traslado.'}
                </p>
              </div>

            </div>
          </div>

          {/* 3. Footer fijo inferior */}
          <div className="w-full px-8 py-4 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center gap-4 shrink-0">
            {selectedDetailTransfer.status === 'en_transito' ? (
              <button
                type="button"
                onClick={() => {
                  const id = selectedDetailTransfer.id;
                  setSelectedDetailTransfer(null);
                  handleReceiveTransfer(id);
                }}
                disabled={receivingId === selectedDetailTransfer.id}
                className="h-10 px-6 inline-flex items-center gap-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Recepción de Traslado</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Traslado Completado y Recibido en Destino
              </span>
            )}

            <button
              type="button"
              onClick={() => setSelectedDetailTransfer(null)}
              className="h-10 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

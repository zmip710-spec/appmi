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
  AlertCircle,
  Store as StoreIcon,
  PackageCheck,
  Calendar
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
import { useStoreColors } from '../utils/storeColors';

interface MultiStoreInventoryViewProps {
  currentUser?: User | null;
}

export const MultiStoreInventoryView: React.FC<MultiStoreInventoryViewProps> = ({ currentUser }) => {
  const { getColor } = useStoreColors();
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

  // 7. Traslado Rápido dentro del Detalle de Producto
  const [quickTransferFromId, setQuickTransferFromId] = useState<string>('tienda_1');
  const [quickTransferToId, setQuickTransferToId] = useState<string>('tienda_2');
  const [quickTransferQty, setQuickTransferQty] = useState<number>(1);
  const [quickTransferNotes, setQuickTransferNotes] = useState<string>('');
  const [isQuickTransferring, setIsQuickTransferring] = useState<boolean>(false);

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

  // Obtener existencias físicas de una tienda para el producto seleccionado
  const getProductStockInStore = (storeId: string) => {
    if (!selectedDetailProduct) return 0;
    if (storeId === 'tienda_1') return selectedDetailMatrix?.stock_tienda_1 ?? selectedDetailProduct.stock_tienda_1 ?? 0;
    if (storeId === 'tienda_2') return selectedDetailMatrix?.stock_tienda_2 ?? selectedDetailProduct.stock_tienda_2 ?? 0;
    if (storeId === 'tienda_3') return selectedDetailMatrix?.stock_tienda_3 ?? selectedDetailProduct.stock_tienda_3 ?? 0;
    return 0;
  };

  // Refrescar reactivamente los datos de existencias y tránsitos del producto
  const refreshProductDetail = async (productId: number, sku?: string) => {
    try {
      const [matrixRes, inTransitList] = await Promise.all([
        fetchInventoryMatrixApi(),
        fetch(`/api/transfers/in-transit/${productId}`).then(r => r.ok ? r.json() : []).catch(() => [])
      ]);
      const found = matrixRes.find(m => m.id === productId || (sku && m.sku === sku));
      if (found) {
        setSelectedDetailMatrix({
          stock_tienda_1: found.stock_tienda_1 || 0,
          stock_tienda_2: found.stock_tienda_2 || 0,
          stock_tienda_3: found.stock_tienda_3 || 0,
          stock_transito: found.stock_transito || 0,
          stock_total: found.stock_total || 0,
          transits: Array.isArray(inTransitList) ? inTransitList : []
        });
        setSelectedDetailProduct(prev => prev ? { ...prev, ...found } : null);
      }
    } catch (err) {
      console.error('Error al refrescar detalle del producto:', err);
    }
  };

  // Cargar datos al abrir modal y configurar tiendas de traslado rápido
  useEffect(() => {
    if (!selectedDetailProduct) {
      setSelectedDetailMatrix(null);
      return;
    }

    refreshProductDetail(selectedDetailProduct.id, selectedDetailProduct.sku);

    const s1 = selectedDetailProduct.stock_tienda_1 || 0;
    const s2 = selectedDetailProduct.stock_tienda_2 || 0;
    const s3 = selectedDetailProduct.stock_tienda_3 || 0;
    let defaultFrom = 'tienda_1';
    if (s1 > 0) defaultFrom = 'tienda_1';
    else if (s2 > 0) defaultFrom = 'tienda_2';
    else if (s3 > 0) defaultFrom = 'tienda_3';

    setQuickTransferFromId(defaultFrom);
    const other = stores.find(s => s.id !== defaultFrom);
    setQuickTransferToId(other ? other.id : (defaultFrom === 'tienda_1' ? 'tienda_2' : 'tienda_1'));
    setQuickTransferQty(1);
    setQuickTransferNotes('');
  }, [selectedDetailProduct?.id]);

  // Manejador del traslado rápido entre tiendas desde el detalle de producto
  const handleQuickTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetailProduct) return;

    const originStock = getProductStockInStore(quickTransferFromId);
    if (originStock <= 0) {
      triggerToast('La tienda de origen seleccionada no tiene existencias físicas disponibles.', 'error');
      return;
    }
    if (quickTransferQty <= 0 || quickTransferQty > originStock) {
      triggerToast(`La cantidad a trasladar debe ser entre 1 y ${originStock} unidades.`, 'error');
      return;
    }
    if (quickTransferFromId === quickTransferToId) {
      triggerToast('La tienda de origen y destino deben ser distintas.', 'error');
      return;
    }

    setIsQuickTransferring(true);
    try {
      await createTransferApi({
        from_store_id: quickTransferFromId,
        to_store_id: quickTransferToId,
        items: [{ product_id: selectedDetailProduct.id, quantity: quickTransferQty }],
        notes: quickTransferNotes.trim() ? quickTransferNotes.trim() : undefined
      });

      triggerToast(`Traslado de ${quickTransferQty} uds iniciado hacia ${getStoreName(quickTransferToId)}.`);
      setQuickTransferQty(1);
      setQuickTransferNotes('');

      // Refrescar reactivamente las existencias en tarjetas y en la matriz global
      await Promise.all([
        refreshProductDetail(selectedDetailProduct.id, selectedDetailProduct.sku),
        loadData(true)
      ]);
    } catch (err: any) {
      triggerToast(err.message || 'Error al procesar el traslado rápido.', 'error');
    } finally {
      setIsQuickTransferring(false);
    }
  };

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
      <div className="w-full max-w-full min-h-screen px-3 sm:px-6 overflow-x-hidden py-3 sm:py-6 space-y-4 sm:space-y-6">
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
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl px-3 sm:px-4 py-2.5 flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 sm:gap-4 mb-4 backdrop-blur-sm shadow-md">
            {/* 1. Sección Izquierda (Título y Estado) */}
            <div className="flex items-center gap-2.5 shrink-0 min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-white truncate">Control de Inventario</h1>
              <span className="text-[11px] text-slate-400 bg-slate-800/70 border border-slate-700/50 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-800 pb-3 sm:pb-4">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap py-1 scrollbar-none bg-slate-900/80 p-1.5 rounded-xl border border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
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
            className={`shrink-0 flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer relative ${
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
        <div className="w-full overflow-x-auto rounded-lg border border-slate-800 bg-slate-900 shadow-xl">
          <table className="w-full text-left text-sm min-w-[850px] whitespace-nowrap">
            <thead className="bg-slate-800/80 text-slate-300 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-4 px-4">SKU</th>
                <th className="py-4 px-4">Producto</th>
                <th className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${getColor('tienda_1').badgeClass}`}>
                    <StoreIcon className="w-3 h-3 shrink-0" />
                    <span>{getStoreName('tienda_1')}</span>
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${getColor('tienda_2').badgeClass}`}>
                    <StoreIcon className="w-3 h-3 shrink-0" />
                    <span>{getStoreName('tienda_2')}</span>
                  </span>
                </th>
                <th className="py-3 px-3 text-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${getColor('tienda_3').badgeClass}`}>
                    <StoreIcon className="w-3 h-3 shrink-0" />
                    <span>{getStoreName('tienda_3')}</span>
                  </span>
                </th>
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
                            <span className={`inline-flex items-center justify-center min-w-[2.2rem] px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${getColor('tienda_1').badgeClass}`}>
                              {s1}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">0</span>
                          )}
                        </td>

                        {/* Stock Sucursal Norte */}
                        <td className="py-4 px-3 text-center">
                          {s2 > 0 ? (
                            <span className={`inline-flex items-center justify-center min-w-[2.2rem] px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${getColor('tienda_2').badgeClass}`}>
                              {s2}
                            </span>
                          ) : (
                            <span className="text-slate-500 font-mono text-xs opacity-50">0</span>
                          )}
                        </td>

                        {/* Stock Sucursal Sur */}
                        <td className="py-4 px-3 text-center">
                          {s3 > 0 ? (
                            <span className={`inline-flex items-center justify-center min-w-[2.2rem] px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono ${getColor('tienda_3').badgeClass}`}>
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
              {/* Encabezado estructurado para desktop */}
              <div className="hidden lg:grid grid-cols-12 gap-4 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900/60 border border-slate-800/80 rounded-xl">
                <div className="col-span-2 flex items-center gap-1.5">
                  <span>ID & Estado</span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <StoreIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Ruta de Sucursales</span>
                </div>
                <div className="col-span-3 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-slate-500" />
                  <span>Detalle de Producto</span>
                </div>
                <div className="col-span-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Fecha y Hora</span>
                </div>
                <div className="col-span-2 text-right">
                  <span>Acción</span>
                </div>
              </div>

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
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 lg:gap-4 items-center p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    {/* Columna 1: ID # y Badge de Estado (En Tránsito / Completado) */}
                    <div className="sm:col-span-1 lg:col-span-2 flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono text-slate-200 font-bold bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700/60">
                        #{transfer.id}
                      </span>

                      {isPending ? (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap">
                          <Clock className="w-3 h-3" />
                          <span>En Tránsito</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completado</span>
                        </span>
                      )}
                    </div>

                    {/* Columna 2: Ruta (Tienda Origen -> Tienda Destino) */}
                    <div className="sm:col-span-1 lg:col-span-3 flex items-center gap-1.5 text-xs font-semibold min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold truncate max-w-[130px] ${getColor(transfer.from_store_id).badgeClass}`}
                        title={fromName}
                      >
                        <StoreIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{fromName}</span>
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold truncate max-w-[130px] ${getColor(transfer.to_store_id).badgeClass}`}
                        title={toName}
                      >
                        <StoreIcon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{toName}</span>
                      </span>
                    </div>

                    {/* Columna 3: Detalle del producto y cantidad */}
                    <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-1.5 flex-wrap min-w-0 overflow-hidden">
                      {transfer.items && transfer.items.length > 0 ? (
                        transfer.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700/60 px-2.5 py-1 rounded-md whitespace-nowrap flex items-center gap-1.5"
                          >
                            <span className="truncate max-w-[130px]">{item.product_name || `ID #${item.product_id}`}:</span>
                            <strong className="text-emerald-400 font-mono shrink-0">{item.quantity} uds</strong>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin productos</span>
                      )}
                    </div>

                    {/* Columna 4: Fecha y hora */}
                    <div className="sm:col-span-1 lg:col-span-2 text-xs text-slate-300 font-mono font-medium flex items-center gap-1.5 whitespace-nowrap">
                      <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0 hidden sm:inline" />
                      <span>{formattedDate}</span>
                    </div>

                    {/* Columna 5: Botón de acción (Confirmar Recepción) */}
                    <div className="sm:col-span-1 lg:col-span-2 flex items-center justify-end whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                      {isPending ? (
                        <button
                          type="button"
                          onClick={() => handleReceiveTransfer(transfer.id)}
                          disabled={receivingId === transfer.id}
                          className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          {receivingId === transfer.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Confirmar Recepción</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/70" />
                          <span>Recibido</span>
                        </span>
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
                          <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${getColor(store.id).badgeClass}`}>
                            <StoreIcon className="w-4 h-4" />
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
          <div className="w-full px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight">
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
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* Formulario que contiene cuerpo central scrolleable y footer fijo */}
          <form onSubmit={handleCreateTransfer} className="flex-1 flex flex-col min-h-0 w-full m-0 p-0">
            {/* 2. Cuerpo central scrolleable */}
            <div className="flex-1 w-full px-6 py-4 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-7xl mx-auto w-full items-start">
                
                {/* Columna Izquierda: Ruta y Observaciones */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
                    <StoreIcon className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-200 font-bold text-xs uppercase tracking-wider">1. Ruta de Sucursales</span>
                  </div>

                  {/* Selectores de Tienda Origen y Tienda Destino */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    <div className="space-y-1.5">
                      <label className="font-medium text-slate-300 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                        Tienda Origen (Salida) *
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
                        className="w-full h-9 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">De donde saldrán las existencias físicas</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="font-medium text-slate-300 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                        Tienda Destino (Entrada) *
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
                        className="w-full h-9 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                      >
                        {stores.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.id})</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500">Donde se recibirán al confirmar recepción</p>
                    </div>
                  </div>

                  {/* Resumen visual de la ruta */}
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${getColor(fromStoreId).badgeClass}`}>
                        <StoreIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{getStoreName(fromStoreId)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-indigo-400 font-sans text-[11px] font-semibold">
                      <ArrowRight className="w-4 h-4 text-slate-400 animate-pulse" />
                      <span>En tránsito</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${getColor(toStoreId).badgeClass}`}>
                        <StoreIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{getStoreName(toStoreId)}</span>
                      </span>
                    </div>
                  </div>

                  {/* Notas / Observaciones con altura adecuada */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <label className="font-medium text-slate-300 text-xs block">
                      Notas / Observaciones del Traslado (Opcional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Ej. Reabastecimiento urgente de existencias para fin de semana..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none text-xs resize-none transition-colors leading-relaxed"
                    />
                    <p className="text-[10px] text-slate-500">Estas notas se registrarán en el historial de transferencias.</p>
                  </div>
                </div>

                {/* Columna Derecha: Producto y Cantidades */}
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 pb-2.5 border-b border-slate-800/80">
                    <PackageCheck className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-200 font-bold text-xs uppercase tracking-wider">2. Producto y Cantidades</span>
                  </div>

                  {/* Selector de producto con buscador integrado */}
                  <div className="space-y-2">
                    <label className="font-medium text-slate-300 text-xs block">
                      Seleccionar Producto *
                    </label>

                    {/* Buscador integrado con Search a la izquierda */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar por código SKU o nombre..."
                        value={transferSearch}
                        onChange={(e) => setTransferSearch(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                      />
                      {transferSearch && (
                        <button
                          type="button"
                          onClick={() => setTransferSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 text-xs cursor-pointer"
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
                          className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:border-indigo-500 focus:outline-none text-xs transition-colors"
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
                        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg flex items-center justify-between shadow-inner">
                          <div className="space-y-0.5">
                            <span className="text-[11px] text-slate-400 font-medium uppercase block">Stock Disponible en Origen</span>
                            <span className="text-xs text-slate-300 font-mono font-medium">{getStoreName(fromStoreId)}</span>
                          </div>
                          <div className="text-right">
                            <span className={`text-xl font-black font-mono block ${availableStock > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {availableStock}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase">unidades físicas</span>
                          </div>
                        </div>

                        {/* Input de cantidad a trasladar con botones rápidos */}
                        <div className="space-y-1.5">
                          <label className="font-medium text-slate-300 text-xs block">
                            Cantidad a Trasladar (Unidades) *
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                max={availableStock > 0 ? availableStock : undefined}
                                required
                                value={transferQty}
                                onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-sm font-bold focus:border-indigo-500 focus:outline-none transition-colors"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono">
                                uds
                              </span>
                            </div>

                            {/* Botones rápidos de incremento */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => Math.max(1, prev - 1))}
                                className="h-9 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Restar 1 unidad"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 1) : prev + 1))}
                                className="h-9 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 5) : prev + 5))}
                                className="h-9 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Sumar 5 unidades"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => setTransferQty(prev => (availableStock > 0 ? Math.min(availableStock, prev + 10) : prev + 10))}
                                className="h-9 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Sumar 10 unidades"
                              >
                                +10
                              </button>
                              {availableStock > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setTransferQty(availableStock)}
                                  className="h-9 px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  title="Trasladar todo el stock disponible"
                                >
                                  Max ({availableStock})
                                </button>
                              )}
                            </div>
                          </div>

                          {transferQty > availableStock && availableStock > 0 && (
                            <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
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
            <div className="w-full px-6 py-3.5 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="h-9 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
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
                Agregar Unidades
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
        <div 
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-50 w-screen h-screen bg-slate-950 flex flex-col m-0 p-0"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* 1. Header fijo superior */}
          <div className="w-full px-8 py-5 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                    {selectedDetailProduct.sku}
                  </span>
                  <span className="text-xs font-semibold text-slate-300 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    {selectedDetailProduct.category || selectedDetailProduct.description || 'General'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{selectedDetailProduct.name}</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDetailProduct(null)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* 2. Cuerpo central scrolleable */}
          <div className="flex-1 w-full px-8 py-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto w-full space-y-6">
              {/* Tarjeta Unificada a Ancho Completo: Existencias y Precios Comerciales */}
              <div className="w-full bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
                {(() => {
                  const s1 = selectedDetailMatrix?.stock_tienda_1 ?? 0;
                  const s2 = selectedDetailMatrix?.stock_tienda_2 ?? 0;
                  const s3 = selectedDetailMatrix?.stock_tienda_3 ?? 0;
                  const physicalTotal = s1 + s2 + s3;
                  const transitTotal = selectedDetailMatrix?.stock_transito ?? 0;
                  const grandTotal = selectedDetailMatrix?.stock_total ?? (physicalTotal + transitTotal);

                  return (
                    <>
                      {/* Cabecera unificada con botones de acción */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full border-b border-slate-800/80 pb-4">
                        {/* Izquierda: Título EXISTENCIAS y al lado el selector/botón de PRECIOS COMERCIALES (Q) [Editar] */}
                        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                          <span className="font-extrabold text-indigo-400 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shrink-0">
                            <Building2 className="w-4 h-4" />
                            EXISTENCIAS
                          </span>

                          <div className="h-4 w-px bg-slate-700/80 hidden sm:block shrink-0" />

                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                              <DollarSign className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">PRECIOS COMERCIALES (Q):</span>
                              <span className="font-mono text-slate-200">
                                Venta <strong className="text-emerald-400 font-bold">Q {(selectedDetailProduct.sale_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                              </span>
                              <span className="text-slate-400 font-mono text-[11px]">
                                (Costo: Q {(selectedDetailProduct.cost_price || 0).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                              </span>
                            </div>

                            {currentUser?.role !== 'Vendedor' && !isEditingPrices && (
                              <button
                                type="button"
                                onClick={() => setIsEditingPrices(true)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition cursor-pointer ml-0.5"
                                title="Editar precios comerciales"
                              >
                                <Pencil className="w-3 h-3" />
                                <span>Editar</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Derecha: Botón + Agregar Unidades, botón Eliminar SKU y el badge Total: X uds */}
                        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              const prod = selectedDetailProduct;
                              setSelectedDetailProduct(null);
                              setStockEntryProduct(prod);
                              setStockEntryStoreId(stores[0]?.id || 'tienda_1');
                              setStockEntryQty(1);
                            }}
                            className="h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-sm shadow-emerald-600/20"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Agregar Unidades</span>
                          </button>

                          {currentUser?.role !== 'Vendedor' && (
                            <button
                              type="button"
                              onClick={() => {
                                const prod = selectedDetailProduct;
                                setSelectedDetailProduct(null);
                                setDeleteConfirmProduct(prod);
                              }}
                              className="h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Eliminar SKU</span>
                            </button>
                          )}

                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap font-mono">
                            Total: {grandTotal} uds
                          </span>
                        </div>
                      </div>

                      {/* Editor de Precios Inline si isEditingPrices está activo */}
                      {isEditingPrices && (
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 space-y-3 animate-in fade-in duration-150">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                              <DollarSign className="w-3.5 h-3.5" />
                              Editar Precios Comerciales (Q)
                            </span>
                            <div className="inline-flex bg-slate-950 p-0.5 rounded border border-slate-700/60 text-[10px]">
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
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                            {/* Columna Costo */}
                            <div>
                              <label className="block text-xs font-semibold text-slate-400 mb-1.5">PRECIO COSTO (Q)</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editCostPrice}
                                onChange={(e) => setEditCostPrice(e.target.value)}
                                className="h-9 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
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
                                    className="h-9 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
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
                                    className="h-9 w-full rounded-lg bg-slate-950 border border-emerald-500/40 px-3 text-sm text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
                                  />
                                  {(() => {
                                    const cost = parseFloat(editCostPrice) || 0;
                                    const margin = parseFloat(editMarginPercent) || 0;
                                    const calcSale = cost * (1 + margin / 100);
                                    return (
                                      <div className="mt-1 text-[11px] text-emerald-400 font-mono font-bold truncate">
                                        Venta estimada: Q {calcSale.toFixed(2)}
                                      </div>
                                    );
                                  })()}
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
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
                              <span>{isSavingPrices ? 'Guardando...' : 'Guardar Precios'}</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Fila única de 4 tarjetas de stock (Tiendas + En Tránsito) */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 w-full pt-1">
                        {stores.map(s => {
                          let qty = 0;
                          if (s.id === 'tienda_1') qty = s1;
                          else if (s.id === 'tienda_2') qty = s2;
                          else if (s.id === 'tienda_3') qty = s3;
                          const stCol = getColor(s.id);

                          return (
                            <div
                              key={s.id}
                              className={`p-3.5 sm:p-4 rounded-xl text-center space-y-1.5 transition-all bg-slate-900/90 border ${stCol.borderClass}/40 hover:${stCol.borderClass}/60 shadow-sm`}
                              style={{ borderColor: `${stCol.hex}40` }}
                            >
                              <div className="flex items-center justify-center gap-1.5 min-w-0">
                                <span
                                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                                  style={{ backgroundColor: stCol.hex }}
                                />
                                <span className="text-xs sm:text-sm font-bold text-slate-200 block truncate">
                                  {s.name}
                                </span>
                              </div>
                              <span className="text-2xl sm:text-3xl font-bold font-mono text-white block">
                                {qty}
                              </span>
                              <span className="text-xs text-slate-400 font-semibold tracking-wider block uppercase">
                                UNIDADES
                              </span>
                            </div>
                          );
                        })}

                        {/* 4ta caja: En Tránsito */}
                        <div className="bg-amber-950/20 border border-amber-500/30 p-3.5 sm:p-4 rounded-xl text-center space-y-1.5 transition-all shadow-sm">
                          <div className="flex items-center justify-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                            <span className="text-xs sm:text-sm font-bold text-amber-400 block truncate">
                              En Tránsito
                            </span>
                          </div>
                          <span className={`text-2xl sm:text-3xl font-bold font-mono block ${transitTotal > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                            {transitTotal}
                          </span>
                          <span className="text-xs text-slate-400 font-semibold tracking-wider block uppercase">
                            EN CAMINO
                          </span>
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

            {/* Panel dedicado inferior: Mover existencias entre sucursales */}
            {(() => {
              const originStores = stores.filter(s => getProductStockInStore(s.id) > 0);
              const destinationStores = stores.filter(s => s.id !== quickTransferFromId);
              const maxStock = getProductStockInStore(quickTransferFromId);

              return (
                <div className="bg-slate-900/70 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-inner space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                        Mover existencias entre sucursales
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      Traslado directo e instantáneo de este SKU entre tiendas
                    </span>
                  </div>

                  {originStores.length === 0 ? (
                    <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl text-center text-xs text-slate-400 font-medium">
                      No hay existencias físicas en ninguna sucursal disponibles para trasladar.
                    </div>
                  ) : (
                    <form onSubmit={handleQuickTransfer} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5 items-end">
                        {/* 1. Selector Origen (3 cols) */}
                        <div className="lg:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm transition-colors"
                              style={{ backgroundColor: getColor(quickTransferFromId).hex }}
                            />
                            <span>Tienda Origen (Salida) *</span>
                          </label>
                          <select
                            value={quickTransferFromId}
                            onChange={(e) => {
                              const newFrom = e.target.value;
                              setQuickTransferFromId(newFrom);
                              if (newFrom === quickTransferToId) {
                                const other = stores.find(s => s.id !== newFrom);
                                if (other) setQuickTransferToId(other.id);
                              }
                              const stock = getProductStockInStore(newFrom);
                              if (quickTransferQty > stock && stock > 0) {
                                setQuickTransferQty(stock);
                              }
                            }}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                          >
                            {originStores.map(s => {
                              const stock = getProductStockInStore(s.id);
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} ({stock} uds)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 2. Selector Destino (3 cols) */}
                        <div className="lg:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block shrink-0 shadow-sm transition-colors"
                              style={{ backgroundColor: getColor(quickTransferToId).hex }}
                            />
                            <span>Tienda Destino (Entrada) *</span>
                          </label>
                          <select
                            value={quickTransferToId}
                            onChange={(e) => setQuickTransferToId(e.target.value)}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white font-medium text-xs focus:border-indigo-500 focus:outline-none transition-colors"
                          >
                            {destinationStores.map(s => {
                              const curStock = getProductStockInStore(s.id);
                              return (
                                <option key={s.id} value={s.id}>
                                  {s.name} (Stock actual: {curStock} uds)
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {/* 3. Input Cantidad + Botones Rápidos (3 cols) */}
                        <div className="lg:col-span-3 space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 block">
                            Cantidad a Mover *
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                min="1"
                                max={maxStock > 0 ? maxStock : undefined}
                                required
                                value={quickTransferQty}
                                onChange={(e) => setQuickTransferQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-full h-9 px-2.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs font-bold focus:border-indigo-500 focus:outline-none transition-colors"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                                uds
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setQuickTransferQty(prev => (maxStock > 0 ? Math.min(maxStock, prev + 1) : prev + 1))}
                                className="h-9 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Sumar 1 unidad"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuickTransferQty(prev => (maxStock > 0 ? Math.min(maxStock, prev + 5) : prev + 5))}
                                className="h-9 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer"
                                title="Sumar 5 unidades"
                              >
                                +5
                              </button>
                              {maxStock > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setQuickTransferQty(maxStock)}
                                  className="h-9 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-semibold transition cursor-pointer"
                                  title="Todo el stock disponible"
                                >
                                  Max
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 4. Campo de notas breve/opcional (2 cols) */}
                        <div className="lg:col-span-2 space-y-1.5">
                          <label className="text-[11px] font-medium text-slate-300 block truncate">
                            Nota (Opcional)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej. Reabastecimiento..."
                            value={quickTransferNotes}
                            onChange={(e) => setQuickTransferNotes(e.target.value)}
                            className="w-full h-9 px-3 bg-slate-950 border border-slate-700 rounded-lg text-white text-xs placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none transition-colors"
                          />
                        </div>

                        {/* 5. Botón de acción: Mover Stock (1 col) */}
                        <div className="lg:col-span-1">
                          <button
                            type="submit"
                            disabled={isQuickTransferring || maxStock <= 0}
                            className="w-full h-9 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs transition shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap"
                            title="Ejecutar traslado inmediato"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                            <span>{isQuickTransferring ? 'Moviendo...' : 'Mover Stock'}</span>
                          </button>
                        </div>
                      </div>

                      {quickTransferQty > maxStock && maxStock > 0 && (
                        <p className="text-xs text-amber-400 font-medium flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span>La cantidad indicada ({quickTransferQty}) supera las existencias en origen ({maxStock} uds).</span>
                        </p>
                      )}
                    </form>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3. Footer fijo inferior */}
          <div className="w-full px-8 py-4 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDetailProduct(null)}
              className="h-10 px-6 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer"
            >
              Cerrar
            </button>
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
          <div className="w-full px-6 py-3 border-b border-slate-800 bg-slate-900/90 flex justify-between items-center shrink-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-white text-base sm:text-lg tracking-tight">
                  Traslado #{selectedDetailTransfer.id}
                </h3>
                {selectedDetailTransfer.status === 'en_transito' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>En Tránsito</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Completado</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex flex-wrap gap-4 font-mono">
                <span>
                  <strong className="text-slate-300 font-sans">Creación:</strong>{' '}
                  {new Date(selectedDetailTransfer.created_at).toLocaleString('es-GT', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
                {selectedDetailTransfer.received_at && (
                  <span>
                    <strong className="text-emerald-400 font-sans">Recepción:</strong>{' '}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition cursor-pointer"
              title="Volver al Inventario (Esc)"
            >
              <X className="w-4 h-4 text-slate-400" />
              <span>Volver al Inventario</span>
            </button>
          </div>

          {/* 2. Cuerpo central scrolleable */}
          <div className="flex-1 w-full px-6 py-4 overflow-y-auto space-y-3.5">
            <div className="max-w-7xl mx-auto space-y-3.5">
              
              {/* Ruta de Traslado: Tarjetas de origen y destino compactas con flecha central w-7 h-7 */}
              <div className="bg-slate-900/70 border border-slate-800/90 p-3.5 sm:p-4 rounded-xl space-y-2.5 shadow-inner">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>Ruta de Traslado entre Sucursales</span>
                </span>
                <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
                  {/* Origen */}
                  {(() => {
                    const fromCol = getColor(selectedDetailTransfer.from_store_id);
                    return (
                      <div className={`md:col-span-5 text-center sm:text-left space-y-1 p-3.5 rounded-lg border ${fromCol.borderClass}/30 ${fromCol.bgClass}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tienda Origen (Salida de Stock)</span>
                        <div className={`font-bold text-sm sm:text-base flex items-center gap-2 ${fromCol.textClass}`}>
                          <StoreIcon className="w-4 h-4 shrink-0" />
                          <span>{selectedDetailTransfer.from_store_name || getStoreName(selectedDetailTransfer.from_store_id)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Flecha indicadora central w-7 h-7 */}
                  <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                    <div className="w-7 h-7 bg-indigo-600/20 text-indigo-400 rounded-full border border-indigo-500/30 flex items-center justify-center shadow-md">
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[9px] text-indigo-400 font-mono mt-0.5 font-bold uppercase">Traslado</span>
                  </div>

                  {/* Destino */}
                  {(() => {
                    const toCol = getColor(selectedDetailTransfer.to_store_id);
                    return (
                      <div className={`md:col-span-5 text-center sm:text-left space-y-1 p-3.5 rounded-lg border ${toCol.borderClass}/30 ${toCol.bgClass}`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Tienda Destino (Entrada de Stock)</span>
                        <div className={`font-bold text-sm sm:text-base flex items-center gap-2 ${toCol.textClass}`}>
                          <StoreIcon className="w-4 h-4 shrink-0" />
                          <span>{selectedDetailTransfer.to_store_name || getStoreName(selectedDetailTransfer.to_store_id)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Tabla de Productos Trasladados a todo el ancho */}
              <div className="bg-slate-900/70 border border-slate-800/90 rounded-xl overflow-hidden shadow-inner">
                <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-slate-400" />
                    <span>Productos y Cantidades Trasladadas</span>
                  </span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-full border border-emerald-500/20 font-mono">
                    Total: {selectedDetailTransfer.items?.reduce((sum, item) => sum + item.quantity, 0) || 0} piezas
                  </span>
                </div>

                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="py-2.5 px-4 w-44">Código SKU</th>
                        <th className="py-2.5 px-4">Descripción del Producto</th>
                        <th className="py-2.5 px-4 text-right w-48">Cantidad Trasladada</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-slate-200">
                      {selectedDetailTransfer.items && selectedDetailTransfer.items.length > 0 ? (
                        selectedDetailTransfer.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-indigo-400">
                              {item.sku || `PROD-${item.product_id}`}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-white">
                              {item.product_name || `Producto #${item.product_id}`}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                              {item.quantity} <span className="text-[11px] text-slate-400 font-normal">uds</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="py-6 text-center text-slate-500">
                            No hay items asociados a este traslado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notas / Observaciones */}
              <div className="bg-slate-900/70 border border-slate-800/90 p-3.5 sm:p-4 rounded-xl space-y-1.5 shadow-inner">
                <span className="text-xs font-semibold text-slate-400 uppercase block tracking-wider">
                  Notas / Observaciones del Envío:
                </span>
                <p className="text-xs text-slate-200 font-mono italic leading-relaxed">
                  {selectedDetailTransfer.notes && selectedDetailTransfer.notes.trim() !== ''
                    ? `"${selectedDetailTransfer.notes}"`
                    : 'Sin notas adicionales para este traslado.'}
                </p>
              </div>

            </div>
          </div>

          {/* 3. Footer fijo inferior */}
          <div className="w-full px-6 py-3 border-t border-slate-800 bg-slate-900/95 flex justify-end items-center gap-3 shrink-0">
            {selectedDetailTransfer.status === 'en_transito' ? (
              <button
                type="button"
                onClick={() => {
                  const id = selectedDetailTransfer.id;
                  setSelectedDetailTransfer(null);
                  handleReceiveTransfer(id);
                }}
                disabled={receivingId === selectedDetailTransfer.id}
                className="h-9 px-5 inline-flex items-center gap-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-md shadow-emerald-600/20 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Recepción de Traslado</span>
              </button>
            ) : (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-lg font-mono">
                <CheckCircle2 className="w-4 h-4" />
                Traslado Completado y Recibido en Destino
              </span>
            )}

            <button
              type="button"
              onClick={() => setSelectedDetailTransfer(null)}
              className="h-9 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

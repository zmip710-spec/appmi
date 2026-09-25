import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Layers,
  Image as ImageIcon,
  Sparkles,
  Database,
  TrendingUp,
  Tag,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  FileText,
  Download
} from 'lucide-react';
import { ImportBatch, fetchBatches, createBatchApi, deleteBatchApi, fetchInventory, InventoryProduct } from '../services/api';
import { exportSingleBatchPdf } from '../utils/pdfExport';
import { ImagePicker } from './ImagePicker';

const fallbackBatches: ImportBatch[] = [
  {
    id: '#5555',
    name: 'Lote #5555 - Importación Tecnológica',
    importDate: '28 Ago 2026',
    totalCustomsTax: 50.00,
    totalShippingCost: 10.00,
    exchangeRateGtq: 7.80,
    profitMarginPct: 15.0,
    costUpdateStrategy: 'weighted',
    items: [
      {
        sku: 'asdasd',
        productName: 'Smartwatch Ultra L5',
        quantity: 17,
        unitCostFob: 25.00,
        allocatedCustoms: 2.94,
        allocatedShipping: 0.59,
        allocatedTax: 3.53,
        unitTax: 3.53,
        finalUnitCost: 28.53,
        profitMarginPct: 15.0,
        finalSellingPrice: 32.81,
        image: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'AUD-Q3',
        productName: 'Audífonos In-Ear Q3',
        quantity: 25,
        unitCostFob: 11.28,
        allocatedCustoms: 1.20,
        allocatedShipping: 0.35,
        allocatedTax: 1.55,
        unitTax: 1.55,
        finalUnitCost: 12.83,
        profitMarginPct: 15.0,
        finalSellingPrice: 14.81,
        image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'CARG-M5',
        productName: 'Cargador Inalámbrico M5',
        quantity: 12,
        unitCostFob: 18.09,
        allocatedCustoms: 1.80,
        allocatedShipping: 0.50,
        allocatedTax: 2.30,
        unitTax: 2.30,
        finalUnitCost: 20.39,
        profitMarginPct: 15.0,
        finalSellingPrice: 23.72,
        image: 'https://images.unsplash.com/photo-1622445268465-843857588a36?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'PWR-20K',
        productName: 'Power Bank 20k-mAh',
        quantity: 20,
        unitCostFob: 30.30,
        allocatedCustoms: 3.10,
        allocatedShipping: 0.85,
        allocatedTax: 3.95,
        unitTax: 3.95,
        finalUnitCost: 34.25,
        profitMarginPct: 15.0,
        finalSellingPrice: 39.74,
        image: 'https://images.unsplash.com/photo-1609592424074-245152a514d0?auto=format&fit=crop&w=120&q=80'
      },
      {
        sku: 'HUB-7IN1',
        productName: 'Hub USB-C 7-en-1',
        quantity: 10,
        unitCostFob: 19.55,
        allocatedCustoms: 1.95,
        allocatedShipping: 0.55,
        allocatedTax: 2.50,
        unitTax: 2.50,
        finalUnitCost: 22.05,
        profitMarginPct: 15.0,
        finalSellingPrice: 25.64,
        image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=120&q=80'
      }
    ]
  }
];

export const ImportBatchesView: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_batches') || localStorage.getItem('appg_cache_batches');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
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
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_batches') || localStorage.getItem('appg_cache_batches');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0].id;
      }
    } catch {}
    return null;
  });
  const [expandedMobileItemKeys, setExpandedMobileItemKeys] = useState<Record<string, boolean>>({});
  const [selectedBatchForFullDetails, setSelectedBatchForFullDetails] = useState<ImportBatch | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addBatchStep, setAddBatchStep] = useState<1 | 2>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('appmi_cache_batches') || localStorage.getItem('appg_cache_batches');
      return !cached;
    } catch {
      return true;
    }
  });

  // Active dropdown open index for SKU selector
  const [openSkuDropdownIndex, setOpenSkuDropdownIndex] = useState<number | null>(null);

  const DRAFT_BATCH_KEY = 'draft_form_batch';

  // New batch form state with localStorage Draft Recovery
  const [batchName, setBatchName] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).batchName || '';
    } catch {}
    return '';
  });
  const [customsTax, setCustomsTax] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).customsTax || '';
    } catch {}
    return '';
  });
  const [customsCurrency, setCustomsCurrency] = useState<'GTQ' | 'USD'>('GTQ');
  const [shippingCost, setShippingCost] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).shippingCost || '';
    } catch {}
    return '';
  });
  const [shippingCurrency, setShippingCurrency] = useState<'GTQ' | 'USD'>('USD');
  const [exchangeRateGtq, setExchangeRateGtq] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).exchangeRateGtq || '7.80';
    } catch {}
    return '7.80';
  });
  const [profitMarginPct, setProfitMarginPct] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).profitMarginPct || '15.0';
    } catch {}
    return '15.0';
  });
  const [costUpdateStrategy, setCostUpdateStrategy] = useState<'weighted' | 'latest'>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).costUpdateStrategy || 'weighted';
    } catch {}
    return 'weighted';
  });
  const [inputItems, setInputItems] = useState<Array<{ sku: string; productName: string; quantity: string; unitCostFob: string; image: string }>>(() => {
    try {
      const saved = localStorage.getItem('draft_form_batch');
      if (saved) return JSON.parse(saved).inputItems || [];
    } catch {}
    return [];
  });

  const [batchNetworkError, setBatchNetworkError] = useState<string | null>(null);
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Autosave Debounced Effect (400ms)
  useEffect(() => {
    const hasContent = batchName.trim() !== '' || inputItems.length > 0 || customsTax !== '' || shippingCost !== '';
    const timer = setTimeout(() => {
      try {
        if (hasContent) {
          localStorage.setItem('draft_form_batch', JSON.stringify({
            batchName, customsTax, shippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, inputItems
          }));
        } else {
          localStorage.removeItem('draft_form_batch');
        }
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [batchName, customsTax, shippingCost, exchangeRateGtq, profitMarginPct, costUpdateStrategy, inputItems]);

  // Window beforeunload Accidental Navigation Protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasContent = batchName.trim() !== '' || inputItems.length > 0;
      if (hasContent) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar en el formulario de Lote. ¿Estás seguro de salir?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [batchName, inputItems]);

  // Bloqueo estricto de desplazamiento a nivel documento cuando los modales están abiertos
  useEffect(() => {
    const isModalOpen = Boolean(showAddModal || showConfirmModal || selectedBatchForFullDetails);
    
    if (isModalOpen) {
      // Guarda el ancho del scrollbar para evitar saltos de layout en PC
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }

    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [showAddModal, showConfirmModal, selectedBatchForFullDetails]);

  const loadBatchesData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBatches();
      const invData = await fetchInventory();
      if (Array.isArray(data)) {
        setBatches(data);
        setIsDbConnected(true);
        if (data.length > 0) setExpandedBatchId(data[0].id);
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
    loadBatchesData();
  }, []);

  // Real-time prorating calculation preview memoized with useMemo
  const parsedGtqRate = useMemo(() => parseFloat(exchangeRateGtq) || 7.80, [exchangeRateGtq]);
  const parsedTax = useMemo(() => {
    const raw = parseFloat(customsTax) || 0;
    if (customsCurrency === 'GTQ') {
      return parsedGtqRate > 0 ? raw / parsedGtqRate : raw;
    }
    return raw;
  }, [customsTax, customsCurrency, parsedGtqRate]);
  const parsedShipping = useMemo(() => {
    const raw = parseFloat(shippingCost) || 0;
    if (shippingCurrency === 'GTQ') {
      return parsedGtqRate > 0 ? raw / parsedGtqRate : raw;
    }
    return raw;
  }, [shippingCost, shippingCurrency, parsedGtqRate]);
  const parsedMargin = useMemo(() => parseFloat(profitMarginPct) || 15.0, [profitMarginPct]);
  const totalLandedExpenses = useMemo(() => parsedTax + parsedShipping, [parsedTax, parsedShipping]);

  const { previewItems, totalBatchFob } = useMemo(() => {
    let totalFob = 0;
    const items = inputItems.map((item, idx) => {
      const qty = Math.max(0, parseInt(item.quantity) || 0);
      const cost = Math.max(0, parseFloat(item.unitCostFob) || 0);
      const totalItemFob = qty * cost;
      totalFob += totalItemFob;
      const sku = item.sku && item.sku.trim() !== '' ? item.sku.trim().toUpperCase() : `PROD-00${idx + 1}`;
      const productName = item.productName && item.productName.trim() !== '' ? item.productName.trim() : `Producto #${idx + 1}`;
      return { sku, productName, quantity: qty, unitCostFob: cost, totalFobValue: totalItemFob, image: item.image || '' };
    });
    return { previewItems: items, totalBatchFob: totalFob };
  }, [inputItems]);

  // Calculate live customs percentage on total FOB (100% Automatic Read-Only)
  const computedCustomsTaxPct = useMemo(() => (totalBatchFob > 0 ? (parsedTax / totalBatchFob) * 100 : 0), [totalBatchFob, parsedTax]);

  const proratedPreview = useMemo(() => {
    return previewItems.map(item => {
      const sharePercentage = totalBatchFob > 0 ? (item.totalFobValue / totalBatchFob) * 100 : 0;
      const allocatedCustoms = (sharePercentage / 100) * parsedTax;
      const allocatedShipping = (sharePercentage / 100) * parsedShipping;
      const allocatedExpenses = allocatedCustoms + allocatedShipping;
      const unitTax = item.quantity > 0 ? allocatedExpenses / item.quantity : 0;
      const finalUnitCost = item.unitCostFob + unitTax;
      const finalSellingPrice = finalUnitCost * (1 + parsedMargin / 100);

      return {
        ...item,
        sharePercentage: isNaN(sharePercentage) ? 0 : parseFloat(sharePercentage.toFixed(2)),
        allocatedCustoms: isNaN(allocatedCustoms) ? 0 : parseFloat(allocatedCustoms.toFixed(2)),
        allocatedShipping: isNaN(allocatedShipping) ? 0 : parseFloat(allocatedShipping.toFixed(2)),
        allocatedTax: isNaN(allocatedExpenses) ? 0 : parseFloat(allocatedExpenses.toFixed(2)),
        unitTax: isNaN(unitTax) ? 0 : parseFloat(unitTax.toFixed(2)),
        finalUnitCost: isNaN(finalUnitCost) ? item.unitCostFob : parseFloat(finalUnitCost.toFixed(2)),
        profitMarginPct: parsedMargin,
        finalSellingPrice: isNaN(finalSellingPrice) ? finalUnitCost : parseFloat(finalSellingPrice.toFixed(2))
      };
    });
  }, [previewItems, totalBatchFob, parsedTax, parsedShipping, parsedMargin]);

  // Check if any item being imported currently has stock > 0 in inventory AND has a price variation
  const detectedPriceVariations = useMemo(() => {
    return proratedPreview.filter(item => {
      const cleanSku = item.sku.trim().toUpperCase();
      if (!cleanSku) return false;
      const existingInStock = inventoryList.find(inv => inv.sku.toUpperCase() === cleanSku && inv.stock > 0);
      if (!existingInStock) return false;
      return Math.abs(item.finalUnitCost - existingInStock.unitCost) >= 0.01;
    });
  }, [proratedPreview, inventoryList]);

  const hasStockWithPriceVariation = useMemo(() => detectedPriceVariations.length > 0, [detectedPriceVariations]);

  const handleAddItemRow = () => {
    setInputItems([...inputItems, { sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' }]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = inputItems.filter((_, i) => i !== index);
    setInputItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...inputItems];
    // @ts-ignore
    updated[index][field] = value;

    if (field === 'sku') {
      const cleanTyped = value.trim().toUpperCase();
      if (cleanTyped.length >= 1) {
        setOpenSkuDropdownIndex(index);
      } else {
        setOpenSkuDropdownIndex(null);
      }

      const match = inventoryList.find(inv => inv.sku.toUpperCase() === cleanTyped);
      if (match) {
        updated[index].productName = match.name;
        if (match.image) updated[index].image = match.image;
        if (match.unitCost && (!updated[index].unitCostFob || updated[index].unitCostFob === '')) {
          updated[index].unitCostFob = match.unitCost.toString();
        }
      }
    }

    setInputItems(updated);
  };

  const handleSelectMatchingSku = (index: number, inv: InventoryProduct) => {
    const updated = [...inputItems];
    updated[index].sku = inv.sku;
    updated[index].productName = inv.name;
    if (inv.image) updated[index].image = inv.image;
    if (inv.unitCost) updated[index].unitCostFob = inv.unitCost.toString();
    setInputItems(updated);
    setOpenSkuDropdownIndex(null);
  };

  // Single Product Form Entry State inside Modal
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [showImagePickerInForm, setShowImagePickerInForm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [singleProductForm, setSingleProductForm] = useState<{ sku: string; productName: string; brand: string; model: string; quantity: string; unitCostFob: string; image: string }>({
    sku: '',
    productName: '',
    brand: '',
    model: '',
    quantity: '1',
    unitCostFob: '',
    image: ''
  });

  const handleOpenSingleProductForm = (indexToEdit: number | null = null) => {
    if (indexToEdit !== null && inputItems[indexToEdit]) {
      setEditingItemIndex(indexToEdit);
      setSingleProductForm({
        sku: inputItems[indexToEdit].sku || '',
        productName: inputItems[indexToEdit].productName || '',
        brand: inputItems[indexToEdit].brand || '',
        model: inputItems[indexToEdit].model || '',
        quantity: inputItems[indexToEdit].quantity || '1',
        unitCostFob: inputItems[indexToEdit].unitCostFob || '',
        image: inputItems[indexToEdit].image || ''
      });
      setShowImagePickerInForm(!!inputItems[indexToEdit].image);
    } else {
      setEditingItemIndex(null);
      setSingleProductForm({ sku: '', productName: '', brand: '', model: '', quantity: '1', unitCostFob: '', image: '' });
      setShowImagePickerInForm(false);
    }
    setIsAddingProduct(true);
    setOpenSkuDropdownIndex(null);
  };

  const handleConfirmSingleProduct = () => {
    if (!singleProductForm.productName || !singleProductForm.quantity || !singleProductForm.unitCostFob) {
      alert('Por favor completa el Nombre del Producto, la Cantidad y el Costo FOB.');
      return;
    }

    const cleanItem = {
      sku: singleProductForm.sku.trim() ? singleProductForm.sku.trim().toUpperCase() : `PROD-00${inputItems.length + 1}`,
      productName: singleProductForm.productName.trim(),
      brand: singleProductForm.brand.trim(),
      model: singleProductForm.model.trim(),
      quantity: singleProductForm.quantity,
      unitCostFob: singleProductForm.unitCostFob,
      image: singleProductForm.image
    };

    if (editingItemIndex !== null) {
      const updated = [...inputItems];
      updated[editingItemIndex] = cleanItem;
      setInputItems(updated);
      setEditingItemIndex(null);
    } else {
      setInputItems([...inputItems, cleanItem]);
    }

    setSingleProductForm({ sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' });
    setIsAddingProduct(false);
    setShowImagePickerInForm(false);
    setOpenSkuDropdownIndex(null);
  };

  const handleRemoveConfirmedItem = (index: number) => {
    const updated = inputItems.filter((_, i) => i !== index);
    setInputItems(updated);
  };

  const handleOpenAddModal = () => {
    setBatchName('');
    setCustomsTax('');
    setShippingCost('');
    setExchangeRateGtq('7.80');
    setProfitMarginPct('15.0');
    setCostUpdateStrategy('weighted');
    setInputItems([]);
    setSingleProductForm({ sku: '', productName: '', quantity: '1', unitCostFob: '', image: '' });
    setIsAddingProduct(false);
    setShowImagePickerInForm(false);
    setEditingItemIndex(null);
    setOpenSkuDropdownIndex(null);
    setShowConfirmModal(false);
    setAddBatchStep(1);
    setShowAddModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchName || previewItems.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleRetryOrSaveBatch = async () => {
    try {
      // Obtener productos desde cualquier origen disponible
      const itemsList = (previewItems && previewItems.length > 0) 
        ? previewItems 
        : ((inputItems && inputItems.length > 0) ? inputItems : []);

      if (itemsList.length === 0) {
        setBatchNetworkError("No hay productos cargados en el lote para guardar.");
        return;
      }

      const payload = {
        name: (batchName || 'Lote Sin Nombre').trim(),
        totalCustomsTax: Number(customsTax) || 0,
        totalShippingCost: Number(shippingCost) || 0,
        exchangeRateGtq: Number(exchangeRateGtq) || 7.80,
        profitMarginPct: Number(profitMarginPct) || 15.0,
        costUpdateStrategy: costUpdateStrategy || 'weighted_average',
        items: itemsList.map((i: any) => ({
          sku: i.sku || '',
          productName: i.productName || 'Producto',
          quantity: Number(i.quantity) || 1,
          unitCostFob: Number(i.unitCostFob) || 0,
          image: i.image || ''
        }))
      };

      setIsSavingBatch(true);

      const response = await fetch('/api/batches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        setShowConfirmModal(false);
        let errorMsg = "El servidor aún se está reconectando. Espera unos segundos y vuelve a presionar Reintentar.";
        try {
          const text = await response.text();
          if (text && !text.trim().startsWith('<') && !text.includes('<!DOCTYPE') && !text.includes('<html')) {
            try {
              const parsed = JSON.parse(text);
              if (parsed.error) errorMsg = parsed.error;
            } catch {
              if (text.length < 150) errorMsg = text;
            }
          }
        } catch {}
        setBatchNetworkError(errorMsg);
        return;
      }

      setBatchNetworkError(null);
      try { localStorage.removeItem(DRAFT_BATCH_KEY); } catch {}
      setBatchName('');
      setCustomsTax('');
      setShippingCost('');
      setExchangeRateGtq('7.80');
      setProfitMarginPct('15.0');
      setInputItems([]);
      setShowConfirmModal(false);
      setShowAddModal(false);
      setAddBatchStep(1);
      await loadBatchesData();
    } catch (error: any) {
      console.error('Error de conexión al guardar lote:', error);
      setShowConfirmModal(false);
      setBatchNetworkError("Error de conexión con el host. Tus datos siguen guardados aquí. Presiona 'Reintentar' cuando se restablezca la conexión.");
    } finally {
      setIsSavingBatch(false);
    }
  };

  const processSaveBatch = handleRetryOrSaveBatch;

  const handleDeleteBatch = async (id: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el lote ${id}? Esta acción eliminará los ítems asociados a este lote.`)) {
      return;
    }
    try {
      await deleteBatchApi(id);
      await loadBatchesData();
    } catch {
      setBatches(batches.filter(b => b.id !== id));
    }
  };

  // Metrics summary memoized
  const { totalCustomsTaxPaid, totalShippingPaid, totalImportExpenses, totalBatchesCount } = useMemo(() => {
    const taxPaid = batches.reduce((sum, b) => sum + (b.totalCustomsTax || 0), 0);
    const shipPaid = batches.reduce((sum, b) => sum + (b.totalShippingCost || 0), 0);
    return {
      totalCustomsTaxPaid: taxPaid,
      totalShippingPaid: shipPaid,
      totalImportExpenses: taxPaid + shipPaid,
      totalBatchesCount: batches.length
    };
  }, [batches]);

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
        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">Lotes de Importación</h2>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Lote</span>
        </button>
      </div>

      {/* Mini KPI Cards (~70px Height) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Lotes Procesados</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white font-mono">{totalBatchesCount}</h3>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">lotes BD</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Gastos Importación</span>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">${totalImportExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</h3>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">Q {(totalImportExpenses * 7.80).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 flex flex-col justify-between h-[72px] shadow-sm">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase truncate">Margen Aplicado</span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-base sm:text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">+15%</h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">Precio Venta</span>
          </div>
        </div>
      </div>

      {/* Batches List */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Historial de Lotes de Importación</h3>

        {batches.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center text-slate-500 dark:text-slate-400">
            No hay lotes registrados. Haz clic en "+ Nuevo Lote de Importación" para agregar uno.
          </div>
        ) : (
          batches.map((batch, index) => {
            const isExpanded = expandedBatchId === batch.id;
            const batchFobTotal = batch.items.reduce((sum, i) => sum + (i.totalFobValue || (i.quantity * i.unitCostFob)), 0);
            const totalBatchLandedExpenses = (batch.totalCustomsTax || 0) + (batch.totalShippingCost || 0);
            const rate = batch.exchangeRateGtq || 7.80;
            const marginPct = batch.profitMarginPct || 15.0;
            const totalGtqExpenses = totalBatchLandedExpenses * rate;

            return (
              <div key={batch.id} className={`bg-white dark:bg-slate-800 border rounded-xl overflow-hidden shadow-sm transition ${
                index === 0 ? 'border-amber-400 dark:border-amber-500/50 ring-1 ring-amber-400/30 dark:ring-amber-500/20' : 'border-slate-200 dark:border-slate-700/80'
              }`}>
                {/* Batch Header Bar (Responsive Stacked Layout) */}
                <div
                  onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                  className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 transition min-h-[70px]"
                >
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {/* Line 1: Badges + Full Batch Name + Mobile Expand Chevron */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-1.5 min-w-0">
                        {index === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/40 text-[9px] font-extrabold shrink-0">
                            ÚLTIMO LOTE
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 shrink-0">
                          {batch.id}
                        </span>
                        <h4 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white leading-snug break-words">
                          {batch.name}
                        </h4>
                      </div>
                      <div className="flex items-center space-x-1 sm:hidden shrink-0">
                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {/* Line 2: Expenses, Margin, Date, Product Count */}
                    <div className="flex items-center flex-wrap text-[11px] text-slate-600 dark:text-slate-300 gap-x-2 gap-y-1">
                      <span className="text-slate-500 dark:text-slate-400">
                        Gastos Importación: <strong className="text-slate-900 dark:text-white">${totalBatchLandedExpenses.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</strong>{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">(Q {totalGtqExpenses.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ)</span>
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-amber-600 dark:text-amber-400 font-bold">Margen: +{marginPct}%</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500 dark:text-slate-400">{batch.importDate}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-700 dark:text-blue-300 font-semibold">{batch.items.length} prods</span>
                    </div>
                  </div>

                  {/* Line 3 / Desktop Action Buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700/60 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        exportSingleBatchPdf(batch);
                      }}
                      className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-md active:scale-95 cursor-pointer"
                      title="Descargar Informe Oficial del Lote en PDF"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Informe</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBatch(batch.id);
                      }}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/20 border border-slate-200 dark:border-slate-700/80 transition cursor-pointer"
                      title="Eliminar lote"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="hidden sm:block pl-1">
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                {/* Batch Items Breakdown */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 p-3 sm:p-4 space-y-3">
                    {/* 2x2 Global Batch Parameters Matrix */}
                    {(() => {
                      const batchCustomsPct = batchFobTotal > 0 ? ((batch.totalCustomsTax || 0) / batchFobTotal) * 100 : 0;
                      const batchShippingPct = batchFobTotal > 0 ? ((batch.totalShippingCost || 0) / batchFobTotal) * 100 : 0;
                      return (
                        <div className="bg-white dark:bg-slate-950 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">Parámetros Globales del Lote ({batch.items.length} SKUs)</span>
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-[10px] font-mono font-semibold">
                              {batch.id}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            {/* Bloque 1: Total FOB */}
                            <div className="bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Total FOB Base</span>
                              <span className="font-extrabold text-slate-900 dark:text-white text-xs sm:text-sm font-mono block">${batchFobTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">Q {(batchFobTotal * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                            </div>

                            {/* Bloque 2: Total Flete */}
                            <div className="bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Flete</span>
                                <span className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 font-mono">+{batchShippingPct.toFixed(1)}%</span>
                              </div>
                              <span className="font-extrabold text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-mono block">${(batch.totalShippingCost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 block">Q {((batch.totalShippingCost || 0) * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                            </div>

                            {/* Bloque 3: Total Aduana */}
                            <div className="bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold">Total Aduana</span>
                                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 font-mono">+{batchCustomsPct.toFixed(1)}%</span>
                              </div>
                              <span className="font-extrabold text-amber-700 dark:text-amber-300 text-xs sm:text-sm font-mono block">${(batch.totalCustomsTax || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 block">Q {((batch.totalCustomsTax || 0) * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                            </div>

                            {/* Bloque 4: Tasa & Margen */}
                            <div className="bg-slate-50 dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">Tasa de Cambio</span>
                              <span className="font-extrabold text-blue-600 dark:text-blue-400 text-xs sm:text-sm font-mono block">Q {rate.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / USD</span>
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block">Margen Venta: +{marginPct}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* MOBILE STACKED PRODUCT CARDS VIEW (Visible on small screens md:hidden - Collapsed by default) */}
                    <div className="md:hidden space-y-2.5">
                      {batch.items.map((item, idx) => {
                        const itemKey = `${batch.id}-${idx}`;
                        const isItemExpanded = !!expandedMobileItemKeys[itemKey];

                        const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                        const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : ((item.sharePercentage || 0) / 100) * (batch.totalShippingCost || 0);
                        const totalAllocatedExpenseForItem = itemCustoms + itemShipping;
                        const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                        const shippingPerUnit = item.quantity > 0 ? itemShipping / item.quantity : 0;
                        const totalTaxPerUnit = customsPerUnit + shippingPerUnit;
                        
                        const valFobNoTax = item.unitCostFob;
                        const valLandedFull = item.finalUnitCost || (item.unitCostFob + totalTaxPerUnit);
                        const itemMargin = item.profitMarginPct || marginPct;
                        const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                        const valFinalSellingGtq = valFinalSellingUsd * rate;
                        
                        const customsPct = valFobNoTax > 0 ? (customsPerUnit / valFobNoTax) * 100 : 0;
                        const shippingPct = valFobNoTax > 0 ? (shippingPerUnit / valFobNoTax) * 100 : 0;
                        const taxSurchargePct = valFobNoTax > 0 ? (totalTaxPerUnit / valFobNoTax) * 100 : 0;
                        const sharePct = item.sharePercentage !== undefined ? item.sharePercentage : (batchFobTotal > 0 ? ((item.quantity * item.unitCostFob) / batchFobTotal) * 100 : 0);

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

                        const itemSku = item.sku || `PROD-00${idx+1}`;
                        const unitProfitUsd = valFinalSellingUsd - valLandedFull;
                        const unitProfitGtq = unitProfitUsd * rate;
                        const totalProfitGtq = unitProfitGtq * item.quantity;

                        return (
                          <div
                            key={idx}
                            className={`bg-white dark:bg-slate-950 border rounded-xl shadow-sm transition overflow-hidden ${
                              isItemExpanded ? 'border-blue-400 dark:border-blue-500/50 ring-1 ring-blue-400/30 dark:ring-blue-500/20' : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            {/* VISTA CERRADA (Fila Resumen Compacta) */}
                            <div
                              onClick={() => setExpandedMobileItemKeys(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                              className="p-3 flex items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition"
                            >
                              {/* Izquierda: Foto + Título + SKU & Uds */}
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                {item.image ? (
                                  <img src={item.image} alt={item.productName} className="w-9 h-9 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800" />
                                ) : (
                                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <h4 className="font-bold text-slate-900 dark:text-white text-xs leading-snug break-words">{displayTitle}</h4>
                                  <div className="flex items-center space-x-1.5 mt-0.5">
                                    <span className="font-mono text-[9px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-200 dark:border-blue-500/20">
                                      {itemSku}
                                    </span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">• {item.quantity} uds</span>
                                  </div>
                                </div>
                              </div>

                              {/* Derecha: Precio Venta Sugerido (Verde) + Chevron */}
                              <div className="flex items-center space-x-2 shrink-0">
                                <div className="text-right">
                                  <span className="font-mono text-xs font-black text-emerald-600 dark:text-emerald-400 block">Q {valFinalSellingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block">${valFinalSellingUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                                <div className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white">
                                  {isItemExpanded ? <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                                </div>
                              </div>
                            </div>

                            {/* VISTA DESPLEGADA (Al hacer tap/clic) */}
                            {isItemExpanded && (
                              <div className="p-3 pt-0 border-t border-slate-200 dark:border-slate-800/80 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/40 text-xs animate-in fade-in duration-150">
                                {/* Badges de Participación & Metadatos */}
                                <div className="flex items-center flex-wrap gap-1.5 pt-2">
                                  {cleanBrand && (
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      Marca: {cleanBrand}
                                    </span>
                                  )}
                                  {cleanModel && (
                                    <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                      Modelo: {cleanModel}
                                    </span>
                                  )}
                                  <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800">
                                    % Part. Lote: {sharePct.toFixed(1)}%
                                  </span>
                                </div>

                                {/* Estructura de Costos Paso a Paso */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {/* 1. Costo FOB Base */}
                                  <div className="bg-white dark:bg-slate-900/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">1. Costo FOB Base</span>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block">${valFobNoTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">Q {(valFobNoTax * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                                  </div>

                                  {/* 2. Recargo Aduana */}
                                  <div className="bg-amber-50/70 dark:bg-slate-900/90 p-2.5 rounded-lg border border-amber-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold uppercase">2. Recargo Aduana</span>
                                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 font-mono">+{customsPct.toFixed(1)}%</span>
                                    </div>
                                    <span className="font-bold text-amber-800 dark:text-amber-300 text-xs block">+$ {customsPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                                    <span className="text-[10px] font-mono text-amber-700 dark:text-amber-400 block">+Q {(customsPerUnit * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                                  </div>

                                  {/* 3. Recargo Flete */}
                                  <div className="bg-indigo-50/70 dark:bg-slate-900/90 p-2.5 rounded-lg border border-indigo-200 dark:border-slate-800 shadow-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-indigo-800 dark:text-indigo-400 font-semibold uppercase">3. Recargo Flete</span>
                                      <span className="text-[9px] font-bold text-indigo-700 dark:text-indigo-400 font-mono">+{shippingPct.toFixed(1)}%</span>
                                    </div>
                                    <span className="font-bold text-indigo-800 dark:text-indigo-300 text-xs block">+$ {shippingPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                                    <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-400 block">+Q {(shippingPerUnit * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                                  </div>

                                  {/* 4. Costo Landed Final */}
                                  <div className="bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-lg border border-blue-200 dark:border-blue-500/40 shadow-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold uppercase">4. Costo Landed Final</span>
                                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 font-mono">+{taxSurchargePct.toFixed(1)}% Recargo</span>
                                    </div>
                                    <span className="font-bold text-slate-900 dark:text-white text-xs block">${valLandedFull.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                                    <span className="text-[10px] font-mono text-indigo-700 dark:text-indigo-300 font-extrabold block">Q {(valLandedFull * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ/u</span>
                                  </div>
                                </div>

                                {/* Bloque Inferior: Venta & Ganancia Estimada */}
                                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-500/30 space-y-1.5 shadow-sm">
                                  <div className="flex justify-between items-center">
                                    <span className="text-emerald-800 dark:text-emerald-400 text-[10px] font-extrabold uppercase">🏷️ Precio Venta Final (+{itemMargin}%)</span>
                                    <span className="font-mono text-xs font-black text-emerald-700 dark:text-emerald-400">
                                      Q {valFinalSellingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ <span className="text-slate-500 dark:text-slate-300 text-[10px] font-normal">(${valFinalSellingUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)</span>
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-300 border-t border-emerald-200 dark:border-emerald-900/50 pt-1">
                                    <span>Ganancia estimada:</span>
                                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                                      +Q {totalProfitGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total <span className="text-slate-500 dark:text-slate-400 font-normal">(+Q {unitProfitGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/u)</span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* DESKTOP TABLE VIEW (Visible only on md and larger) */}
                    <div className="hidden md:block bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 dark:bg-slate-900/90 text-[11px] uppercase font-bold text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                              <th className="py-3 px-4 font-semibold">Producto</th>
                              <th className="py-3 px-3 font-semibold text-right">Precio Inicial (FOB)</th>
                              <th className="py-3 px-3 font-semibold text-center text-blue-700 dark:text-blue-400">% Part. Lote</th>
                              <th className="py-3 px-3 font-semibold text-right text-amber-700 dark:text-amber-400">+ Impuesto & Flete</th>
                              <th className="py-3 px-3 font-semibold text-right text-indigo-700 dark:text-indigo-400">% Recargo Impuesto</th>
                              <th className="py-3 px-3 font-semibold text-right text-blue-700 dark:text-blue-400">= Costo Landed</th>
                              <th className="py-3 px-4 font-semibold text-right text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-l border-emerald-200 dark:border-emerald-500/30">
                                Precio Final Venta (+{marginPct}%)
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 bg-white dark:bg-slate-900/40">
                            {batch.items.map((item, idx) => {
                              const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : ((item.sharePercentage || 0) / 100) * (batch.totalCustomsTax || 0);
                              const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : ((item.sharePercentage || 0) / 100) * (batch.totalShippingCost || 0);
                              const totalAllocatedExpenseForItem = itemCustoms + itemShipping;
                              const customsPerUnit = item.quantity > 0 ? itemCustoms / item.quantity : 0;
                              const shippingPerUnit = item.quantity > 0 ? itemShipping / item.quantity : 0;
                              const totalTaxPerUnit = customsPerUnit + shippingPerUnit;
                              
                              const valFobNoTax = item.unitCostFob;
                              const valLandedFull = item.finalUnitCost || (item.unitCostFob + totalTaxPerUnit);
                              const itemMargin = item.profitMarginPct || marginPct;
                              const valFinalSellingUsd = item.finalSellingPrice || (valLandedFull * (1 + itemMargin / 100));
                              const valFinalSellingGtq = valFinalSellingUsd * rate;
                              
                              // Exact % increase over initial FOB price due to import tax/freight
                              const taxSurchargePct = valFobNoTax > 0 ? (totalTaxPerUnit / valFobNoTax) * 100 : 0;
                              const sharePct = item.sharePercentage !== undefined ? item.sharePercentage : (batchFobTotal > 0 ? ((item.quantity * item.unitCostFob) / batchFobTotal) * 100 : 0);

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

                              const metadataSubtitle = [
                                cleanBrand ? `Marca: ${cleanBrand}` : null,
                                cleanModel ? `Modelo: ${cleanModel}` : null
                              ].filter(Boolean).join(' • ');

                              return (
                                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                                  {/* Producto (Foto, SKU, Marca/Modelo - Nombre, Subtitulo, Cantidad) */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center space-x-3 min-w-[260px]">
                                      {item.image ? (
                                        <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-slate-100 dark:bg-slate-800" />
                                      ) : (
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                          <ImageIcon className="w-5 h-5" />
                                        </div>
                                      )}
                                      <div className="min-w-0">
                                        <div className="flex items-center space-x-2 mb-0.5">
                                          <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 inline-block">
                                            {item.sku || `PROD-00${idx+1}`}
                                          </span>
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">{item.quantity} unidades</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate" title={displayTitle}>{displayTitle}</h4>
                                        {metadataSubtitle && (
                                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate mt-0.5">{metadataSubtitle}</span>
                                        )}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Precio Inicial (FOB Base) */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">${valFobNoTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                    <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400 block">Q {(valFobNoTax * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                                  </td>

                                  {/* % Participación en el Lote */}
                                  <td className="py-3 px-3 text-center">
                                    <span className="font-bold font-mono text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20 text-xs">
                                      {sharePct.toFixed(1)}%
                                    </span>
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 block mt-0.5">del Lote Total</span>
                                  </td>

                                  {/* + Impuesto & Flete ($USD total e individual) */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-amber-700 dark:text-amber-300 block text-xs">+${totalTaxPerUnit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD/u</span>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono block">Total: ${totalAllocatedExpenseForItem.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                  </td>

                                  {/* % Recargo de Impuestos sobre FOB */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-indigo-700 dark:text-indigo-300 font-mono bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/20 text-xs inline-block">
                                      +{taxSurchargePct.toFixed(1)}%
                                    </span>
                                    <span className="text-[9px] text-indigo-600 dark:text-indigo-400 block mt-0.5">Recargo sobre FOB</span>
                                  </td>

                                  {/* = Costo Landed Unitario */}
                                  <td className="py-3 px-3 text-right">
                                    <span className="font-bold text-slate-900 dark:text-white block text-xs">${valLandedFull.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                    <span className="font-mono text-[10px] text-indigo-700 dark:text-indigo-400 block">Q {(valLandedFull * rate).toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                                  </td>

                                  {/* Precio Final Venta (+Margen) */}
                                  <td className="py-3 px-4 text-right bg-emerald-50/50 dark:bg-emerald-950/40 border-l border-emerald-200 dark:border-emerald-500/30">
                                    <span className="font-black text-slate-900 dark:text-white text-xs block">${valFinalSellingUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs block">Q {valFinalSellingGtq.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GTQ</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add New Batch Modal (2-Step Guided Stepper Flow with Fixed Touch Scroll) */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
          <div className="bg-slate-800 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            
            {/* Modal Header with Stepper Progress */}
            <div className="p-4 sm:p-5 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 shrink-0">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-bold text-white text-sm sm:text-base">Registrar Nuevo Lote de Importación</h3>
                  <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    Paso {addBatchStep} de 2
                  </span>
                  {(batchName.trim() !== '' || inputItems.length > 0) && (
                    <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      📝 Borrador autoguardado
                    </span>
                  )}
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  {addBatchStep === 1
                    ? 'Paso 1: Parámetros Generales y Financieros del Lote'
                    : 'Paso 2: Vista Previa Comprimida y Carga de Productos'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white text-base font-bold rounded-lg transition shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Container with Touch Pan Y Scroll */}
            <form onSubmit={handleFormSubmit} className="p-3 sm:p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain touch-pan-y max-h-[calc(92vh-120px)]">
              
              {/* Notificación de Error de Red / Conexión en Modal de Lotes */}
              {batchNetworkError && (
                <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                  <div className="flex items-center space-x-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
                    <span className="font-semibold">
                      Error de conexión con el host. Tus datos siguen guardados aquí. Presiona 'Reintentar' cuando se restablezca la conexión.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRetryOrSaveBatch();
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRetryOrSaveBatch();
                    }}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs transition shadow shrink-0 cursor-pointer flex items-center space-x-1 relative z-50 pointer-events-auto active:scale-95"
                  >
                    <span>{isSavingBatch ? 'Guardando...' : '🔄 Reintentar Guardar'}</span>
                  </button>
                </div>
              )}
              
              {/* PASO 1: Parámetros Generales del Lote */}
              {addBatchStep === 1 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start bg-slate-900/60 p-3.5 sm:p-4 rounded-2xl border border-slate-700/80">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Nombre del Lote *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Lote Calzado Septiembre"
                        value={batchName}
                        onChange={(e) => setBatchName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* IMPUESTO ADUANA */}
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">Impuesto Aduana</label>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                        <span className="pl-2.5 text-slate-400 text-xs font-bold select-none">
                          {customsCurrency === 'GTQ' ? 'Q' : '$'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={customsTax}
                          onChange={(e) => setCustomsTax(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-transparent text-slate-100 text-sm focus:outline-none"
                        />
                        <div className="flex p-0.5 bg-slate-800 border-l border-slate-700 shrink-0">
                          <button
                            type="button"
                            onClick={() => setCustomsCurrency('USD')}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${customsCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            USD
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomsCurrency('GTQ')}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${customsCurrency === 'GTQ' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            GTQ
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 h-3 font-mono">
                        {Number(customsTax) > 0 && (
                          customsCurrency === 'GTQ'
                            ? `≈ $${((Number(customsTax) || 0) / (Number(exchangeRateGtq) || 7.80)).toFixed(2)} USD`
                            : `≈ Q${((Number(customsTax) || 0) * (Number(exchangeRateGtq) || 7.80)).toFixed(2)} GTQ`
                        )}
                      </p>
                    </div>

                    {/* COSTO FLETE */}
                    <div>
                      <label className="text-xs font-medium text-slate-300 block mb-1">Costo Flete</label>
                      <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500">
                        <span className="pl-2.5 text-slate-400 text-xs font-bold select-none">
                          {shippingCurrency === 'GTQ' ? 'Q' : '$'}
                        </span>
                        <input
                          type="number"
                          step="any"
                          value={shippingCost}
                          onChange={(e) => setShippingCost(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 bg-transparent text-slate-100 text-sm focus:outline-none"
                        />
                        <div className="flex p-0.5 bg-slate-800 border-l border-slate-700 shrink-0">
                          <button
                            type="button"
                            onClick={() => setShippingCurrency('USD')}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${shippingCurrency === 'USD' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            USD
                          </button>
                          <button
                            type="button"
                            onClick={() => setShippingCurrency('GTQ')}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${shippingCurrency === 'GTQ' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                          >
                            GTQ
                          </button>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 h-3 font-mono">
                        {Number(shippingCost) > 0 && (
                          shippingCurrency === 'GTQ'
                            ? `≈ $${((Number(shippingCost) || 0) / (Number(exchangeRateGtq) || 7.80)).toFixed(2)} USD`
                            : `≈ Q${((Number(shippingCost) || 0) * (Number(exchangeRateGtq) || 7.80)).toFixed(2)} GTQ`
                        )}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Margen de Venta (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="15.0"
                        value={profitMarginPct}
                        onChange={(e) => setProfitMarginPct(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Exchange Rate GTQ & Stock Price Variation Strategy */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-slate-900/60 p-3.5 rounded-2xl border border-slate-700/80">
                      <label className="text-xs font-medium text-slate-300">Tipo de Cambio (USD a GTQ):</label>
                      <div className="w-36">
                        <input
                          type="number"
                          step="0.01"
                          min="0.1"
                          value={exchangeRateGtq}
                          onChange={(e) => setExchangeRateGtq(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono font-semibold text-right focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {hasStockWithPriceVariation ? (
                      <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl space-y-2.5">
                        <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Variación de Precio en Existencias ({detectedPriceVariations.length} producto{detectedPriceVariations.length > 1 ? 's' : ''} en stock)</span>
                        </div>
                        <p className="text-[11px] text-amber-200/90 leading-relaxed">
                          Detectamos que aún hay unidades guardadas en almacén y el nuevo lote presenta una variación de costo. Elige cómo actualizar el precio del inventario:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div
                            onClick={() => setCostUpdateStrategy('weighted')}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                              costUpdateStrategy === 'weighted'
                                ? 'bg-blue-600/20 border-blue-500 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'weighted'} onChange={() => {}} className="mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Promedio Ponderado</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">Combina las existencias en stock con el nuevo costo del lote.</span>
                            </div>
                          </div>

                          <div
                            onClick={() => setCostUpdateStrategy('latest')}
                            className={`p-3 rounded-xl border cursor-pointer transition flex items-start space-x-2.5 ${
                              costUpdateStrategy === 'latest'
                                ? 'bg-emerald-600/20 border-emerald-500 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                            }`}
                          >
                            <input type="radio" name="costStrategy" checked={costUpdateStrategy === 'latest'} onChange={() => {}} className="mt-0.5" />
                            <div>
                              <span className="font-bold text-white block">Reemplazar con Último Costo</span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">Actualiza el precio del producto al 100% con la nueva importación.</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-700/50 text-[11px] text-slate-400 flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Sin variación de precio sobre existencias activas en stock. El costo se asignará directamente.</span>
                      </div>
                    )}
                  </div>

                  {/* Step 1 Action Bar */}
                  <div className="pt-3 border-t border-slate-700 flex justify-between items-center sticky bottom-0 bg-slate-800 z-20 py-2">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl transition"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (!batchName.trim()) {
                          alert('Por favor ingresa un nombre para el lote.');
                          return;
                        }
                        setAddBatchStep(2);
                        if (inputItems.length === 0) {
                          setIsAddingProduct(true);
                        }
                      }}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center space-x-2 transition shadow-lg shadow-blue-600/20 cursor-pointer active:scale-95"
                    >
                      <span>Continuar a Agregar Productos</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* PASO 2: Vista Previa Comprimida y Carga de Productos */}
              {addBatchStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Vista Previa Comprimida de Parámetros */}
                  <div className="bg-slate-950 p-2.5 sm:p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-2 shadow-sm text-xs">
                    <div className="flex items-center space-x-2 flex-wrap gap-1 min-w-0">
                      <span className="font-bold text-white truncate">📦 {batchName}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-amber-400 font-semibold font-mono text-[11px]">Aduana: ${parseFloat(customsTax || '0').toFixed(2)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-indigo-400 font-semibold font-mono text-[11px]">Flete: ${parseFloat(shippingCost || '0').toFixed(2)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-emerald-400 font-semibold text-[11px]">Margen: +{profitMarginPct}%</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-blue-400 font-semibold font-mono text-[11px]">TC: Q{parseFloat(exchangeRateGtq || '7.80').toFixed(2)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAddBatchStep(1)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] sm:text-[11px] font-bold shrink-0 transition"
                    >
                      ✏️ Editar parámetros
                    </button>
                  </div>

                  {/* Product Entry Section */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center px-1">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">Productos Agregados al Lote ({inputItems.length})</h4>
                        <p className="text-[11px] text-slate-400">Ingresa los datos del producto y presiona confirmar para agregarlo a la lista.</p>
                      </div>
                      {!isAddingProduct && (
                        <button
                          type="button"
                          onClick={() => handleOpenSingleProductForm(null)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition shadow-md shrink-0 cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Agregar Producto</span>
                        </button>
                      )}
                    </div>

                    {/* Single Active Product Form Card (Compact & Fixed Button Bar) */}
                    {isAddingProduct && (
                      <div className="bg-slate-900 border-2 border-blue-500/80 p-3 sm:p-4 rounded-2xl space-y-3 shadow-xl relative z-40">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                          <span className="text-xs font-extrabold text-blue-400">
                            {editingItemIndex !== null ? `Editando Producto #${editingItemIndex + 1}` : 'Ingresar Datos del Producto'}
                          </span>
                          {inputItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(false)}
                              className="text-xs text-slate-400 hover:text-white"
                            >
                              ✕ Cerrar Formulario
                            </button>
                          )}
                        </div>

                        {/* Input Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                          {/* SKU */}
                          <div className="sm:col-span-4 relative">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Código SKU</label>
                            <input
                              type="text"
                              placeholder="Ej. PROD-001"
                              value={singleProductForm.sku}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSingleProductForm({ ...singleProductForm, sku: val });
                                const cleanTyped = val.trim().toUpperCase();
                                if (cleanTyped.length >= 1) {
                                  setOpenSkuDropdownIndex(-1);
                                } else {
                                  setOpenSkuDropdownIndex(null);
                                }
                                const match = inventoryList.find(inv => inv.sku.toUpperCase() === cleanTyped);
                                if (match) {
                                  setSingleProductForm(prev => ({
                                    ...prev,
                                    productName: match.name,
                                    image: match.image || prev.image,
                                    unitCostFob: match.unitCost && !prev.unitCostFob ? match.unitCost.toString() : prev.unitCostFob
                                  }));
                                }
                              }}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500 uppercase"
                            />

                            {/* Sku Dropdown Suggestions */}
                            {openSkuDropdownIndex === -1 && singleProductForm.sku.trim().length >= 1 && (
                              <div className="absolute left-0 w-full sm:w-80 top-full mt-1 bg-slate-900 border-2 border-blue-500 rounded-xl shadow-2xl z-[99999] max-h-52 overflow-y-auto text-xs divide-y divide-slate-800">
                                {inventoryList
                                  .filter(inv => inv.sku.toUpperCase().includes(singleProductForm.sku.trim().toUpperCase()) || inv.name.toUpperCase().includes(singleProductForm.sku.trim().toUpperCase()))
                                  .map(inv => (
                                    <div
                                      key={inv.id}
                                      onClick={() => {
                                        setSingleProductForm(prev => ({
                                          ...prev,
                                          sku: inv.sku,
                                          productName: inv.name,
                                          image: inv.image || prev.image,
                                          unitCostFob: inv.unitCost ? inv.unitCost.toString() : prev.unitCostFob
                                        }));
                                        setOpenSkuDropdownIndex(null);
                                      }}
                                      className="p-2.5 hover:bg-blue-600/30 hover:text-white cursor-pointer flex items-center justify-between transition"
                                    >
                                      <div className="flex items-center space-x-2">
                                        {inv.image ? (
                                          <img src={inv.image} alt={inv.name} className="w-7 h-7 rounded-lg object-cover" />
                                        ) : (
                                          <div className="w-7 h-7 bg-slate-800 rounded-lg flex items-center justify-center text-[10px]">📦</div>
                                        )}
                                        <div>
                                          <span className="font-mono font-bold text-blue-400 block">{inv.sku}</span>
                                          <span className="text-[11px] text-slate-200">{inv.name}</span>
                                        </div>
                                      </div>
                                      <span className="text-[10px] text-emerald-400">Stock: {inv.stock}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>

                          {/* Nombre Producto */}
                          <div className="sm:col-span-8">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Nombre del Producto *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Smartwatch Ultra L5 / Smartphone"
                              value={singleProductForm.productName}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, productName: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Marca & Modelo (Fila de 2 columnas) */}
                          <div className="sm:col-span-6">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Marca (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ej. Xiaomi, Honda, Samsung"
                              value={singleProductForm.brand}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, brand: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="sm:col-span-6">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Modelo (Opcional)</label>
                            <input
                              type="text"
                              placeholder="Ej. Redmi Note 13, CG125"
                              value={singleProductForm.model}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, model: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Cantidad */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Cantidad *</label>
                            <input
                              type="number"
                              min="1"
                              required
                              placeholder="1"
                              value={singleProductForm.quantity}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, quantity: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium text-center focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Costo FOB */}
                          <div className="sm:col-span-4">
                            <label className="block text-[11px] font-medium text-slate-400 mb-1">Costo FOB (USD) *</label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              required
                              placeholder="0.00"
                              value={singleProductForm.unitCostFob}
                              onChange={(e) => setSingleProductForm({ ...singleProductForm, unitCostFob: e.target.value })}
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Total FOB Preview & Live Financial Breakdown */}
                          <div className="sm:col-span-12">
                            {(() => {
                              const liveQty = parseInt(singleProductForm.quantity) || 0;
                              const liveFobUsd = parseFloat(singleProductForm.unitCostFob) || 0;
                              if (liveQty <= 0 || liveFobUsd <= 0) return null;

                              const liveTotalFobUsd = liveQty * liveFobUsd;
                              const liveTotalFobGtq = liveTotalFobUsd * parsedGtqRate;

                              const existingItemsFob = inputItems.reduce((sum, item, idx) => {
                                if (editingItemIndex !== null && idx === editingItemIndex) return sum;
                                return sum + ((parseInt(item.quantity) || 0) * (parseFloat(item.unitCostFob) || 0));
                              }, 0);

                              const estimatedBatchFob = existingItemsFob + liveTotalFobUsd;
                              const liveSharePct = estimatedBatchFob > 0 ? (liveTotalFobUsd / estimatedBatchFob) * 100 : 100;

                              const liveAllocatedTax = (liveSharePct / 100) * parsedTax;
                              const liveAllocatedShipping = (liveSharePct / 100) * parsedShipping;

                              const liveUnitTaxUsd = liveQty > 0 ? liveAllocatedTax / liveQty : 0;
                              const liveUnitShippingUsd = liveQty > 0 ? liveAllocatedShipping / liveQty : 0;

                              const liveCustomsIncrPct = liveFobUsd > 0 ? (liveUnitTaxUsd / liveFobUsd) * 100 : 0;
                              const liveShippingIncrPct = liveFobUsd > 0 ? (liveUnitShippingUsd / liveFobUsd) * 100 : 0;
                              const liveTotalRecargoPct = liveCustomsIncrPct + liveShippingIncrPct;

                              const liveUnitLandedUsd = liveFobUsd + liveUnitTaxUsd + liveUnitShippingUsd;
                              const liveUnitLandedGtq = liveUnitLandedUsd * parsedGtqRate;

                              const liveUnitSellingUsd = liveUnitLandedUsd * (1 + parsedMargin / 100);
                              const liveUnitSellingGtq = liveUnitSellingUsd * parsedGtqRate;

                              const liveUnitGrossProfitUsd = liveUnitSellingUsd - liveUnitLandedUsd;
                              const liveUnitGrossProfitGtq = liveUnitGrossProfitUsd * parsedGtqRate;

                              const liveTotalGrossProfitUsd = liveUnitGrossProfitUsd * liveQty;
                              const liveTotalGrossProfitGtq = liveTotalGrossProfitUsd * liveQty;

                              return (
                                <div className="bg-slate-950 border border-blue-500/40 rounded-xl p-3.5 space-y-3 shadow-inner mt-1">
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                                      📊 Desglose Financiero en Vivo
                                    </span>
                                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                      Recargo Total: +{liveTotalRecargoPct.toFixed(1)}%
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    {/* Total FOB */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Total FOB ({liveQty} uds)</span>
                                      <span className="text-xs font-mono font-bold text-white block">${liveTotalFobUsd.toFixed(2)} USD</span>
                                      <span className="text-[10px] font-mono text-slate-400 block">Q {liveTotalFobGtq.toFixed(2)} GTQ</span>
                                    </div>

                                    {/* Recargos Aduana / Flete */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Recargos Estimados</span>
                                      <span className="text-[11px] font-mono text-amber-400 block font-semibold">
                                        🏛️ Ad: +{liveCustomsIncrPct.toFixed(1)}% (${liveUnitTaxUsd.toFixed(2)}/ud)
                                      </span>
                                      <span className="text-[11px] font-mono text-indigo-400 block font-semibold">
                                        🚚 Fl: +{liveShippingIncrPct.toFixed(1)}% (${liveUnitShippingUsd.toFixed(2)}/ud)
                                      </span>
                                    </div>

                                    {/* Costo Landed Final */}
                                    <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                      <span className="text-[10px] text-slate-400 block font-medium">Costo Landed Final Unit.</span>
                                      <span className="text-xs font-mono font-bold text-indigo-300 block">${liveUnitLandedUsd.toFixed(2)} USD</span>
                                      <span className="text-[11px] font-mono font-extrabold text-indigo-400 block">Q {liveUnitLandedGtq.toFixed(2)} GTQ</span>
                                    </div>

                                    {/* Precio Venta Sugerido */}
                                    <div className="bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/30">
                                      <span className="text-[10px] text-emerald-400 block font-medium">Precio Venta (+{parsedMargin}%)</span>
                                      <span className="text-xs font-mono font-bold text-white block">${liveUnitSellingUsd.toFixed(2)} USD</span>
                                      <span className="text-xs font-mono font-extrabold text-emerald-400 block">Q {liveUnitSellingGtq.toFixed(2)} GTQ</span>
                                    </div>
                                  </div>

                                  {/* Ganancia Bruta Estimada */}
                                  <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
                                    <span className="text-slate-300 font-semibold">Ganancia Bruta Estimada:</span>
                                    <div className="text-right">
                                      <span className="text-emerald-400 font-mono font-extrabold block">
                                        +Q {liveUnitGrossProfitGtq.toFixed(2)} / ud (+${liveUnitGrossProfitUsd.toFixed(2)})
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-mono block">
                                        Total Lote: +Q {liveTotalGrossProfitGtq.toFixed(2)} (+${liveTotalGrossProfitUsd.toFixed(2)} USD)
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Collapsible Photo Section (Oculta por defecto) */}
                        {showImagePickerInForm || singleProductForm.image ? (
                          <div className="space-y-2 pt-1 border-t border-slate-800">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-300">Foto del Producto</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowImagePickerInForm(false);
                                  setSingleProductForm({ ...singleProductForm, image: '' });
                                }}
                                className="text-[11px] text-rose-400 hover:text-rose-300 font-medium"
                              >
                                ✕ Quitar Foto
                              </button>
                            </div>
                            <ImagePicker
                              value={singleProductForm.image || ''}
                              onChange={(img) => setSingleProductForm({ ...singleProductForm, image: img })}
                              label="Foto del Producto"
                            />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowImagePickerInForm(true)}
                            className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700 text-blue-400 border border-slate-700/80 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition cursor-pointer"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>+ Adjuntar Foto (Opcional)</span>
                          </button>
                        )}

                        {/* Sticky Action Button inside Card */}
                        <div className="sticky bottom-0 bg-slate-900 pt-2 pb-1 border-t border-slate-800 flex justify-end space-x-2 z-20">
                          {inputItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setIsAddingProduct(false)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
                            >
                              Cancelar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleConfirmSingleProduct}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/20 cursor-pointer active:scale-95"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>{editingItemIndex !== null ? 'Guardar Cambios' : 'Confirmar e Incluir en el Lote'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Empty State when no products added */}
                    {inputItems.length === 0 && !isAddingProduct && (
                      <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-5 text-center text-slate-400 text-xs space-y-2">
                        <p>Aún no has agregado productos a este lote.</p>
                        <button
                          type="button"
                          onClick={() => handleOpenSingleProductForm(null)}
                          className="inline-flex items-center space-x-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-3 py-1.5 rounded-xl border border-blue-500/20 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Haz clic aquí para ingresar el primer producto</span>
                        </button>
                      </div>
                    )}

                    {/* Confirmed Products Summary List (Stacked Mobile Cards) */}
                    {inputItems.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center px-1 text-xs font-bold text-slate-300">
                          <span>Lista de Productos Confirmados ({inputItems.length})</span>
                          {!isAddingProduct && (
                            <button
                              type="button"
                              onClick={() => handleOpenSingleProductForm(null)}
                              className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                            >
                              + Agregar Otro Producto
                            </button>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {inputItems.map((item, index) => {
                            const qty = parseInt(item.quantity) || 0;
                            const fobCost = parseFloat(item.unitCostFob) || 0;
                            const totalFob = qty * fobCost;

                            const itemSharePct = totalBatchFob > 0 ? (totalFob / totalBatchFob) * 100 : 0;
                            const itemTaxVal = (itemSharePct / 100) * parsedTax;
                            const itemShipVal = (itemSharePct / 100) * parsedShipping;
                            const itemUnitTax = qty > 0 ? itemTaxVal / qty : 0;
                            const itemUnitShip = qty > 0 ? itemShipVal / qty : 0;
                            const itemUnitLandedUsd = fobCost + itemUnitTax + itemUnitShip;
                            const itemUnitLandedGtq = itemUnitLandedUsd * parsedGtqRate;
                            const itemRecargoPct = fobCost > 0 ? ((itemUnitLandedUsd - fobCost) / fobCost) * 100 : 0;
                            const itemSellingUsd = itemUnitLandedUsd * (1 + parsedMargin / 100);
                            const itemSellingGtq = itemSellingUsd * parsedGtqRate;

                            return (
                              <div key={index} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-sm">
                                {/* Header: Photo, SKU, Name & Qty */}
                                <div className="flex items-center space-x-3 pb-2 border-b border-slate-800/80">
                                  {item.image ? (
                                    <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-sm shrink-0">📦</div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold text-blue-400">{item.sku}</span>
                                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                                        {item.quantity} uds
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-semibold text-white truncate mt-0.5">{item.productName}</h4>
                                  </div>
                                </div>

                                {/* Financial Comparison Row */}
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                    <span className="text-[10px] text-slate-400 block font-medium">Costo FOB Unit.</span>
                                    <span className="text-xs font-mono font-bold text-slate-200">${fobCost.toFixed(2)} USD</span>
                                    <span className="text-[10px] font-mono text-slate-400 block">Q {(fobCost * parsedGtqRate).toFixed(2)} GTQ</span>
                                  </div>

                                  <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] text-slate-400 font-medium">Costo Landed</span>
                                      <span className="text-[10px] font-bold text-amber-400 font-mono">+{itemRecargoPct.toFixed(1)}%</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-indigo-300">${itemUnitLandedUsd.toFixed(2)} USD</span>
                                    <span className="text-[10px] font-mono text-indigo-400 font-semibold block">Q {itemUnitLandedGtq.toFixed(2)} GTQ</span>
                                  </div>
                                </div>

                                {/* Selling Price & Quick Action Buttons */}
                                <div className="flex items-center justify-between pt-1">
                                  <div>
                                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">Precio Venta Sugerido</span>
                                    <span className="text-xs font-mono font-extrabold text-emerald-400">
                                      Q {itemSellingGtq.toFixed(2)} GTQ <span className="text-slate-400 font-normal text-[10px]">(${itemSellingUsd.toFixed(2)} USD)</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenSingleProductForm(index)}
                                      className="text-[11px] font-bold text-blue-400 hover:text-blue-300 transition px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 active:scale-95 cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveConfirmedItem(index)}
                                      className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 active:scale-95 cursor-pointer"
                                    >
                                      Eliminar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 Sticky Actions Footer */}
                  <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur pt-3 pb-1 border-t border-slate-700/80 flex justify-between items-center z-30 shrink-0">
                    <button
                      type="button"
                      onClick={() => setAddBatchStep(1)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                    >
                      ← Volver al Paso 1
                    </button>
                    <button
                      type="submit"
                      disabled={inputItems.length === 0 || isSavingBatch}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center space-x-1.5 active:scale-95"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{isSavingBatch ? 'Guardando...' : `Guardar Lote (${inputItems.length})`}</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Seguridad antes de Guardar Lote */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-4">
          <div className="bg-slate-800 border-2 border-amber-500/60 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs">
            {/* Header */}
            <div className="flex items-center space-x-3 border-b border-slate-700 pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white leading-tight">Confirmar Registro de Importación</h3>
                <p className="text-[11px] text-amber-400 font-semibold">Ventana de Seguridad & Verificación de Datos</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Por favor revisa cuidadosamente los datos del lote antes de guardar en la base de datos SQLite. Esta acción actualizará el stock y los costos del inventario.
            </p>

            {/* Summary Box */}
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-700/80 space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Nombre del Lote:</span>
                <span className="font-bold text-white text-sm">{batchName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Gastos Landed Totales:</span>
                <span className="font-bold text-amber-400">${totalLandedExpenses.toFixed(2)} USD <span className="text-emerald-400 text-[11px] font-mono">(Q {(totalLandedExpenses * parsedGtqRate).toFixed(2)} GTQ)</span></span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                <span className="text-slate-400 font-semibold">Ítems a Procesar:</span>
                <span className="font-bold text-blue-400">{proratedPreview.length} Productos</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-semibold">Estrategia de Costo:</span>
                <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {costUpdateStrategy === 'weighted' ? '📊 Promedio Ponderado' : '🏷️ Reemplazar Último Costo'}
                </span>
              </div>
            </div>

            {/* Item List Enriched Preview */}
            <div className="space-y-2 max-h-56 overflow-y-auto bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/80">
              <span className="text-[11px] uppercase font-bold text-slate-300 block px-1 pb-1 border-b border-slate-800">
                Detalle de Productos a Registrar ({proratedPreview.length}):
              </span>
              {proratedPreview.map((item, idx) => {
                const qty = item.quantity;
                const fobUsd = item.unitCostFob;
                const fobGtq = fobUsd * parsedGtqRate;
                const landedUsd = item.finalUnitCost;
                const landedGtq = landedUsd * parsedGtqRate;
                const recargoPct = fobUsd > 0 ? ((landedUsd - fobUsd) / fobUsd) * 100 : 0;
                const sellingUsd = item.finalSellingPrice;
                const sellingGtq = sellingUsd * parsedGtqRate;

                return (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        {item.image ? (
                          <img src={item.image} alt={item.productName} className="w-6 h-6 rounded object-cover border border-slate-700 shrink-0" />
                        ) : (
                          <span className="text-xs shrink-0">📦</span>
                        )}
                        <div>
                          <span className="font-mono text-blue-400 font-bold mr-1.5">{item.sku}</span>
                          <span className="text-white font-semibold truncate max-w-[140px] sm:max-w-[180px] inline-block align-bottom">{item.productName}</span>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                        {qty} uds
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-400 block text-[10px]">FOB ➔ Landed (+{recargoPct.toFixed(1)}%):</span>
                        <span className="font-mono font-medium text-slate-300 block">${fobUsd.toFixed(2)} ➔ ${landedUsd.toFixed(2)} USD</span>
                        <span className="font-mono text-indigo-300 block">Q {fobGtq.toFixed(2)} ➔ Q {landedGtq.toFixed(2)} GTQ</span>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold block uppercase text-[10px]">Precio Venta GTQ</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-xs block">Q {sellingGtq.toFixed(2)} GTQ</span>
                        <span className="font-mono text-slate-400 text-[10px] block">(${sellingUsd.toFixed(2)} USD)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions Buttons */}
            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSavingBatch}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                ✏️ Modificar
              </button>
              <button
                type="button"
                onClick={processSaveBatch}
                disabled={isSavingBatch}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-600/20 active:scale-95 cursor-pointer"
              >
                {isSavingBatch ? 'Guardando Lote...' : '✅ Confirmar y Guardar Lote'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Exhaustivo de Informe Completo del Lote */}
      {selectedBatchForFullDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4 text-xs overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-700 pb-3 shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                      {selectedBatchForFullDetails.id}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ✓ {selectedBatchForFullDetails.status || 'Procesado'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight mt-0.5">{selectedBatchForFullDetails.name}</h3>
                  <span className="text-[11px] text-slate-400 block font-medium">Registrado el {selectedBatchForFullDetails.importDate}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatchForFullDetails(null)}
                className="text-slate-400 hover:text-white p-1 text-base font-bold shrink-0 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(92vh-130px)] space-y-4 pr-1">
              {/* Batch Metadata Configuration Ribbon */}
              {(() => {
                const b = selectedBatchForFullDetails;
                const rate = b.exchangeRateGtq || 7.80;
                const margin = b.profitMarginPct || 15.0;

                let grandTotalFob = 0;
                let grandTotalLanded = 0;
                let grandTotalSelling = 0;
                let totalUnits = 0;

                const itemsDetailed = (b.items || []).map(item => {
                  const qty = item.quantity || 0;
                  totalUnits += qty;
                  const fobCost = item.unitCostFob || 0;
                  const totalFob = item.totalFobValue || (qty * fobCost);
                  grandTotalFob += totalFob;

                  const sharePct = item.sharePercentage || 0;
                  const itemCustoms = item.allocatedCustoms !== undefined ? item.allocatedCustoms : (sharePct / 100) * (b.totalCustomsTax || 0);
                  const itemShipping = item.allocatedShipping !== undefined ? item.allocatedShipping : (sharePct / 100) * (b.totalShippingCost || 0);
                  const itemTotalExpense = itemCustoms + itemShipping;

                  const unitCustoms = qty > 0 ? itemCustoms / qty : 0;
                  const unitShipping = qty > 0 ? itemShipping / qty : 0;
                  const unitTax = qty > 0 ? itemTotalExpense / qty : 0;

                  const customsPct = fobCost > 0 ? (unitCustoms / fobCost) * 100 : 0;
                  const shippingPct = fobCost > 0 ? (unitShipping / fobCost) * 100 : 0;
                  const totalRecargoPct = fobCost > 0 ? (unitTax / fobCost) * 100 : 0;

                  const landedCost = item.finalUnitCost || (fobCost + unitTax);
                  const totalLanded = landedCost * qty;
                  grandTotalLanded += totalLanded;

                  const sellingPrice = item.finalSellingPrice || (landedCost * (1 + margin / 100));
                  const totalSelling = sellingPrice * qty;
                  grandTotalSelling += totalSelling;

                  const unitProfit = sellingPrice - landedCost;
                  const totalProfit = unitProfit * qty;

                  return {
                    ...item,
                    qty,
                    fobCost,
                    totalFob,
                    sharePct,
                    itemCustoms,
                    itemShipping,
                    itemTotalExpense,
                    unitCustoms,
                    unitShipping,
                    unitTax,
                    customsPct,
                    shippingPct,
                    totalRecargoPct,
                    landedCost,
                    totalLanded,
                    sellingPrice,
                    totalSelling,
                    unitProfit,
                    totalProfit
                  };
                });

                const totalCustomsTax = b.totalCustomsTax || 0;
                const totalShippingCost = b.totalShippingCost || 0;
                const totalLandedExpenses = totalCustomsTax + totalShippingCost;
                const grandTotalProfit = grandTotalSelling - grandTotalLanded;

                return (
                  <div className="space-y-4">
                    {/* Key Config Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Tipo de Cambio</span>
                        <span className="font-bold text-blue-400 font-mono text-xs">Q {rate.toFixed(2)} GTQ / USD</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Margen Aplicado</span>
                        <span className="font-bold text-emerald-400 font-mono text-xs">+{margin.toFixed(1)}% Venta</span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Estrategia de Costo</span>
                        <span className="font-bold text-white text-[11px] block truncate">
                          {b.costUpdateStrategy === 'latest' ? '🏷️ Reemplazar Último' : '📊 Promedio Ponderado'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-700/80">
                        <span className="text-[10px] text-slate-400 block font-medium uppercase">Carga Física</span>
                        <span className="font-bold text-indigo-300 font-mono text-xs">{b.items.length} SKUs • {totalUnits} Uds</span>
                      </div>
                    </div>

                    {/* Consolidated Shipment Financial Totals Matrix */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-700/80 space-y-3">
                      <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block border-b border-slate-800 pb-1.5">
                        📊 Totales Consolidados del Embarque
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Total FOB (Compra)</span>
                          <span className="text-xs font-mono font-bold text-white block">${grandTotalFob.toFixed(2)} USD</span>
                          <span className="text-[10px] font-mono text-slate-400 block">Q {(grandTotalFob * rate).toFixed(2)} GTQ</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Gastos Aduana + Flete</span>
                          <span className="text-xs font-mono font-bold text-amber-300 block">${totalLandedExpenses.toFixed(2)} USD</span>
                          <span className="text-[10px] font-mono text-amber-400 block">Q {(totalLandedExpenses * rate).toFixed(2)} GTQ</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                          <span className="text-[10px] text-slate-400 block font-medium">Costo Landed Total</span>
                          <span className="text-xs font-mono font-bold text-indigo-300 block">${grandTotalLanded.toFixed(2)} USD</span>
                          <span className="text-[10px] font-mono text-indigo-400 font-semibold block">Q {(grandTotalLanded * rate).toFixed(2)} GTQ</span>
                        </div>
                        <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/40">
                          <span className="text-[10px] text-emerald-400 block font-medium">Valoración Venta Total</span>
                          <span className="text-xs font-mono font-bold text-white block">${grandTotalSelling.toFixed(2)} USD</span>
                          <span className="text-xs font-mono font-extrabold text-emerald-400 block">Q {(grandTotalSelling * rate).toFixed(2)} GTQ</span>
                        </div>
                      </div>

                      <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center text-xs">
                        <span className="text-slate-300 font-semibold">Ganancia Bruta Proyectada del Lote:</span>
                        <span className="font-mono font-extrabold text-emerald-400 text-sm">
                          +Q {(grandTotalProfit * rate).toLocaleString('en-US', { minimumFractionDigits: 2 })} GTQ <span className="text-xs font-normal text-slate-400">(+${grandTotalProfit.toFixed(2)} USD)</span>
                        </span>
                      </div>
                    </div>

                    {/* Exhaustive Product-by-Product Breakdown List */}
                    <div className="space-y-3">
                      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block px-1">
                        📦 Detalle Completo Producto por Producto ({itemsDetailed.length} Catálogos):
                      </span>

                      <div className="space-y-3">
                        {itemsDetailed.map((item, idx) => {
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

                          const metadataSubtitle = [
                            cleanBrand ? `Marca: ${cleanBrand}` : null,
                            cleanModel ? `Modelo: ${cleanModel}` : null
                          ].filter(Boolean).join(' • ');

                          return (
                            <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md">
                              {/* Product Header */}
                              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                <div className="flex items-center space-x-3 min-w-0">
                                  {item.image ? (
                                    <img src={item.image} alt={item.productName} className="w-10 h-10 rounded-lg object-cover border border-slate-700 shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-xs shrink-0">📦</div>
                                  )}
                                  <div className="min-w-0">
                                    <div className="flex items-center flex-wrap gap-1.5 mb-1">
                                      <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                        {item.sku}
                                      </span>
                                      {cleanBrand && (
                                        <span className="text-[10px] font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                                          {cleanBrand}
                                        </span>
                                      )}
                                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                        {item.sharePct.toFixed(1)}% del lote
                                      </span>
                                    </div>
                                    <h4 className="font-bold text-white text-xs sm:text-sm truncate leading-snug">{displayTitle}</h4>
                                    {metadataSubtitle && (
                                      <span className="text-[10px] text-slate-400 block truncate mt-0.5">{metadataSubtitle}</span>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 shrink-0">
                                  {item.qty} uds
                                </span>
                              </div>

                            {/* Complete Step-by-Step Financial Matrix per Item */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                              {/* 1. FOB Base */}
                              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">1. Costo FOB Base (Compra)</span>
                                <span className="font-bold text-white text-xs block">${item.fobCost.toFixed(2)} USD/u</span>
                                <span className="text-[10px] font-mono text-slate-400 block">Q {(item.fobCost * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[9px] text-slate-500 block pt-1 border-t border-slate-800/80 mt-1">Total: ${item.totalFob.toFixed(2)} USD</span>
                              </div>

                              {/* 2. Recargo Aduana */}
                              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400 font-medium">2. Recargo Aduana</span>
                                  <span className="text-[9px] font-bold text-amber-400 font-mono">+{item.customsPct.toFixed(1)}%</span>
                                </div>
                                <span className="font-bold text-amber-300 text-xs block">+$ {item.unitCustoms.toFixed(2)} USD/u</span>
                                <span className="text-[10px] font-mono text-amber-400 block">+Q {(item.unitCustoms * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[9px] text-slate-500 block pt-1 border-t border-slate-800/80 mt-1">Total: ${item.itemCustoms.toFixed(2)} USD</span>
                              </div>

                              {/* 3. Recargo Flete */}
                              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-slate-400 font-medium">3. Recargo Flete</span>
                                  <span className="text-[9px] font-bold text-indigo-400 font-mono">+{item.shippingPct.toFixed(1)}%</span>
                                </div>
                                <span className="font-bold text-indigo-300 text-xs block">+$ {item.unitShipping.toFixed(2)} USD/u</span>
                                <span className="text-[10px] font-mono text-indigo-400 block">+Q {(item.unitShipping * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[9px] text-slate-500 block pt-1 border-t border-slate-800/80 mt-1">Total: ${item.itemShipping.toFixed(2)} USD</span>
                              </div>

                              {/* 4. Costo Landed Final */}
                              <div className="bg-blue-950/40 p-2.5 rounded-lg border border-blue-500/40">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-blue-300 font-bold">4. Costo Landed Final</span>
                                  <span className="text-[9px] font-bold text-amber-400 font-mono">+{item.totalRecargoPct.toFixed(1)}% Recargo</span>
                                </div>
                                <span className="font-bold text-white text-xs block">${item.landedCost.toFixed(2)} USD/u</span>
                                <span className="text-[10px] font-mono text-indigo-300 font-extrabold block">Q {(item.landedCost * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[9px] text-blue-300/80 block pt-1 border-t border-blue-900/50 mt-1">Total: ${item.totalLanded.toFixed(2)} USD</span>
                              </div>

                              {/* 5. Precio Venta Final */}
                              <div className="bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-500/40">
                                <span className="text-[10px] text-emerald-400 font-extrabold uppercase block">5. Precio Venta (+{margin}%)</span>
                                <span className="font-bold text-white text-xs block">${item.sellingPrice.toFixed(2)} USD/u</span>
                                <span className="text-xs font-mono font-black text-emerald-400 block">Q {(item.sellingPrice * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[9px] text-emerald-300 block pt-1 border-t border-emerald-900/60 mt-1">Total: ${item.totalSelling.toFixed(2)} USD</span>
                              </div>

                              {/* 6. Ganancia Bruta */}
                              <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                                <span className="text-[10px] text-slate-400 block font-medium">6. Ganancia Bruta Estimada</span>
                                <span className="font-bold text-emerald-400 text-xs block">+Q {(item.unitProfit * rate).toFixed(2)} GTQ/u</span>
                                <span className="text-[10px] font-mono text-slate-300 block">(+${item.unitProfit.toFixed(2)} USD/u)</span>
                                <span className="text-[9px] text-emerald-400 font-mono block pt-1 border-t border-slate-800/80 mt-1">Total: +Q {(item.totalProfit * rate).toFixed(2)} GTQ</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer Actions */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => exportSingleBatchPdf(selectedBatchForFullDetails)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5 active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBatchForFullDetails(null)}
                className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cerrar Informe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

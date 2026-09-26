const API_BASE_URL = '/api';

export interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  status: 'Activo' | 'Inactivo';
  avatar: string;
  lastLogin: string;
  password?: string;
}

export interface Transaction {
  id: string;
  client: string;
  service: string;
  date: string;
  amount: string;
  status: 'Completado' | 'Pendiente' | 'Cancelado';
  sku?: string;
  quantity?: number;
  unitPrice?: number;
}

export interface BatchItem {
  id?: number;
  batchId?: string;
  sku?: string;
  productName: string;
  brand?: string;
  model?: string;
  quantity: number;
  unitCostFob: number;
  totalFobValue?: number;
  sharePercentage?: number;
  allocatedCustoms?: number;
  allocatedShipping?: number;
  allocatedTax?: number;
  unitTax?: number;
  finalUnitCost?: number;
  profitMarginPct?: number;
  finalSellingPrice?: number;
}

export interface ImportBatch {
  id: string;
  name: string;
  importDate: string;
  totalCustomsTax: number;
  totalShippingCost: number;
  exchangeRateGtq?: number;
  profitMarginPct?: number;
  costUpdateStrategy?: 'weighted' | 'latest';
  status: string;
  items: BatchItem[];
}

export interface InventoryProduct {
  id: number;
  sku: string;
  name: string;
  brand?: string;
  model?: string;
  category: string;
  stock: number;
  unitCost: number;
  previousUnitCost?: number;
  priceChangeDelta?: number;
  priceChangePct?: number;
  lastUpdated: string;
}

export interface PriceHistoryEntry {
  id: number;
  sku: string;
  batchId?: string;
  batchName?: string;
  oldCost: number;
  newCost: number;
  delta: number;
  pct: number;
  changeDate: string;
  unitCostFob?: number;
  quantity?: number;
  sharePercentage?: number;
  allocatedCustoms?: number;
  allocatedShipping?: number;
  allocatedTax?: number;
  unitTax?: number;
  finalUnitCost?: number;
  profitMarginPct?: number;
  finalSellingPrice?: number;
}

export interface DashboardStats {
  totalSales: number;
  completedSalesCount: number;
  totalSkus: number;
  totalStock: number;
  inventoryValue: number;
  totalImportExpenses: number;
  customsTaxPaid: number;
  shippingPaid: number;
  totalBatchesCount: number;
}

export const loginApi = async (username: string, password?: string): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Error de respuesta en inicio de sesión' }));
    throw new Error(errJson.error || 'Error al iniciar sesión');
  }
  const data = await response.json().catch(() => ({}));
  return data.user;
};

export const registerApi = async (data: { name: string; email: string; password?: string; role?: string; avatar?: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json().catch(() => ({ error: 'Error de respuesta en registro de usuario' }));
    throw new Error(errJson.error || 'Error al registrar usuario');
  }
  const resData = await response.json().catch(() => ({}));
  return resData.user || resData;
};

export const verifySessionApi = async (id?: string | number, username?: string): Promise<{ valid: boolean; user?: User; error?: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, username }),
    });

    if (!response.ok) {
      return { valid: true };
    }

    const data = await response.json().catch(() => ({ valid: true }));
    return data;
  } catch {
    return { valid: true };
  }
};

export const updateUserProfileApi = async (
  id: string | number,
  data: { name: string; email: string; avatar?: string }
): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al actualizar perfil de usuario');
  }
  return response.json();
};

export const changePasswordApi = async (
  id: string | number,
  currentPassword?: string,
  newPassword?: string
): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al cambiar la contraseña');
  }
  return response.json();
};

export const fetchDashboardStatsApi = async (): Promise<DashboardStats> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem('appmi_cache_stats', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('appmi_cache_stats') || localStorage.getItem('appg_cache_stats');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  throw new Error('Error al cargar métricas del Dashboard');
};

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/users`);
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem('appmi_cache_users', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('appmi_cache_users') || localStorage.getItem('appg_cache_users');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [];
};

export const createUser = async (user: { name: string; email: string; role: string; avatar?: string; password?: string }): Promise<User> => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    const errJson = await response.json();
    throw new Error(errJson.error || 'Error al crear usuario en la BD');
  }
  return response.json();
};

export const toggleUserStatusApi = async (id: string | number): Promise<{ id: string | number; status: 'Activo' | 'Inactivo' }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}/toggle`, {
    method: 'PUT',
  });
  if (!response.ok) throw new Error('Error al actualizar estado del usuario');
  return response.json();
};

export const deleteUserApi = async (id: string | number): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar usuario');
  return response.json();
};

export const fetchTransactions = async (): Promise<Transaction[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem('appmi_cache_transactions', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('appmi_cache_transactions') || localStorage.getItem('appg_cache_transactions');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [];
};

export const createTransaction = async (data: {
  client: string;
  service: string;
  amount: string;
  status: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
}): Promise<Transaction> => {
  const response = await fetch(`${API_BASE_URL}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear transacción en la BD');
  return response.json();
};

export const updateTransactionStatusApi = async (id: string, status: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) throw new Error('Error al actualizar estado de la transacción');
  return response.json();
};

export const deleteTransactionApi = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar transacción');
  return response.json();
};

export const fetchBatches = async (): Promise<ImportBatch[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/batches`);
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem('appmi_cache_batches', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('appmi_cache_batches') || localStorage.getItem('appg_cache_batches');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [];
};

export const createBatchApi = async (data: { name: string; totalCustomsTax: number; totalShippingCost: number; items: BatchItem[] }): Promise<ImportBatch> => {
  const response = await fetch(`${API_BASE_URL}/batches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Error al crear lote en la BD');
  return response.json();
};

export const deleteBatchApi = async (id: string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/batches/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar lote');
  return response.json();
};

export const fetchInventory = async (): Promise<InventoryProduct[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/inventory`);
    if (response.ok) {
      const data = await response.json();
      try { localStorage.setItem('appmi_cache_inventory', JSON.stringify(data)); } catch {}
      return data;
    }
  } catch {}
  const cached = localStorage.getItem('appmi_cache_inventory') || localStorage.getItem('appg_cache_inventory');
  if (cached) {
    try { return JSON.parse(cached); } catch {}
  }
  return [];
};

export const createInventoryProductApi = async (data: {
  sku: string;
  name: string;
  category?: string;
  stock: number;
  unitCost: number;
}): Promise<InventoryProduct> => {
  const response = await fetch(`${API_BASE_URL}/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errorJson = await response.json();
    throw new Error(errorJson.error || 'Error al crear producto en inventario');
  }
  return response.json();
};

export const createInventoryApi = createInventoryProductApi;

export const fetchProductBySkuApi = async (sku: string): Promise<InventoryProduct | null> => {
  const response = await fetch(`${API_BASE_URL}/inventory/sku/${encodeURIComponent(sku)}`);
  if (!response.ok) return null;
  return response.json();
};

export const updateStockApi = async (id: number | string, delta: number): Promise<{ success: boolean; stock: number }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}/stock`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta }),
  });
  if (!response.ok) throw new Error('Error al ajustar stock');
  return response.json();
};

export const updateProductImageApi = async (_id: number | string, _image?: string): Promise<{ success: boolean; image: string }> => {
  return { success: true, image: '' };
};

export const deleteInventoryProductApi = async (id: number | string): Promise<{ success: boolean }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Error al eliminar producto del inventario');
  return response.json();
};

export const deleteInventoryApi = deleteInventoryProductApi;

export const fetchPriceHistoryApi = async (sku: string, productName?: string): Promise<PriceHistoryEntry[]> => {
  try {
    const url = `${API_BASE_URL}/inventory/history/${encodeURIComponent(sku)}${productName ? `?name=${encodeURIComponent(productName)}` : ''}`;
    const response = await fetch(url);
    if (!response.ok) return [];
    return await response.json();
  } catch {
    return [];
  }
};

export const checkHealthApi = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${API_BASE_URL}/health`, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
};

// ==========================================
// SERVICIOS MULTITIENDA Y TRASLADOS INTERNOS
// ==========================================

export interface Store {
  id: string;
  name: string;
  color?: string;
}

export interface MatrixProduct {
  id: number;
  name: string;
  sku: string;
  description?: string;
  cost_price?: number;
  sale_price?: number;
  created_at?: string;
  stock_tienda_1: number;
  stock_tienda_2: number;
  stock_tienda_3: number;
  stock_total: number;
}

export interface TransferItem {
  transfer_id?: number;
  product_id: number;
  product_name?: string;
  sku?: string;
  quantity: number;
}

export interface InventoryTransfer {
  id: number;
  from_store_id: string;
  from_store_name?: string;
  to_store_id: string;
  to_store_name?: string;
  status: 'en_transito' | 'completado' | 'cancelado';
  notes?: string;
  created_at?: string;
  received_at?: string;
  items: TransferItem[];
}

export const fetchStoresApi = async (): Promise<Store[]> => {
  const response = await fetch(`${API_BASE_URL}/stores`);
  if (!response.ok) throw new Error('Error al obtener la lista de tiendas');
  return response.json();
};

export const fetchInventoryMatrixApi = async (): Promise<MatrixProduct[]> => {
  const response = await fetch(`${API_BASE_URL}/inventory/matrix`);
  if (!response.ok) throw new Error('Error al obtener la matriz de inventario');
  return response.json();
};

export const fetchTransfersApi = async (): Promise<InventoryTransfer[]> => {
  const response = await fetch(`${API_BASE_URL}/transfers`);
  if (!response.ok) throw new Error('Error al obtener el historial de transferencias');
  return response.json();
};

export const createTransferApi = async (data: {
  from_store_id: string;
  to_store_id: string;
  items: { product_id: number; quantity: number }[];
  notes?: string;
}): Promise<{ success: boolean; transfer_id: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/transfers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al crear la transferencia');
  }
  return response.json();
};

export const receiveTransferApi = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/transfers/${id}/receive`, {
    method: 'POST',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al recepcionar la transferencia');
  }
  return response.json();
};

export const updateStoreApi = async (id: string, name: string, color?: string): Promise<{ success: boolean; id: string; name: string; color?: string; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/stores/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, color }),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al actualizar la tienda');
  }
  return response.json();
};

export const fetchNextSkuApi = async (): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/next-sku`);
    if (response.ok) {
      const data = await response.json();
      return data.next_sku || '0001';
    }
  } catch (err) {
    console.error('Error fetching next_sku:', err);
  }
  return '0001';
};

export const createProductApi = async (data: {
  name: string;
  sku?: string;
  brand?: string;
  model?: string;
  description?: string;
  category?: string;
  cost_price?: number;
  sale_price?: number;
  initial_stocks?: Record<string, number>;
}): Promise<{ success: boolean; product: any; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al crear el producto');
  }
  return response.json();
};

export const addStockEntryApi = async (data: {
  store_id: string;
  product_id?: number;
  sku?: string;
  quantity: number;
}): Promise<{ success: boolean; added_qty: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/inventory/stock-entry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al registrar la entrada de stock');
  }
  return response.json();
};

export const deleteProductApi = async (id: number): Promise<{ success: boolean; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al eliminar el producto');
  }
  return response.json();
};

export const updateProductApi = async (id: number, data: {
  name?: string;
  category?: string;
  description?: string;
  cost_price?: number;
  sale_price?: number;
}): Promise<{ success: boolean; product: any; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al actualizar el producto');
  }
  return response.json();
};

export const createSaleApi = async (data: {
  store_id: string;
  items: Array<{ product_id: number; quantity: number; unit_price: number }>;
}): Promise<{ success: boolean; sale_id: number; total_amount: number; message: string }> => {
  const response = await fetch(`${API_BASE_URL}/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Error al registrar la venta');
  }
  return response.json();
};

export const fetchSalesApi = async (): Promise<{ sales: any[] }> => {
  const response = await fetch(`${API_BASE_URL}/sales`);
  if (!response.ok) {
    throw new Error('Error al consultar historial de ventas');
  }
  return response.json();
};

export const fetchSaleDetailApi = async (id: number): Promise<{ sale: any }> => {
  const response = await fetch(`${API_BASE_URL}/sales/${id}`);
  if (!response.ok) {
    throw new Error('Error al consultar detalle de la venta');
  }
  return response.json();
};

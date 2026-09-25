-- ============================================================================
-- AppMi - PostgreSQL & SQLite Unified Schema
-- ============================================================================

-- 1. Usuarios y Control de Acceso
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Activo',
  avatar TEXT,
  lastLogin VARCHAR(255),
  password VARCHAR(255) DEFAULT '123456'
);

-- 2. Sucursales / Tiendas
CREATE TABLE IF NOT EXISTS stores (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL
);

-- 3. Catálogo Maestro de Productos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) UNIQUE,
  brand VARCHAR(255) DEFAULT '',
  model VARCHAR(255) DEFAULT '',
  category VARCHAR(255) DEFAULT 'General',
  description TEXT,
  cost_price NUMERIC DEFAULT 0,
  sale_price NUMERIC DEFAULT 0,
  image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Existencias por Sucursal (Multitienda)
CREATE TABLE IF NOT EXISTS store_inventory (
  id SERIAL PRIMARY KEY,
  store_id VARCHAR(255) NOT NULL,
  product_id INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE(store_id, product_id)
);

-- 5. Traslados entre Sucursales
CREATE TABLE IF NOT EXISTS inventory_transfers (
  id SERIAL PRIMARY KEY,
  from_store_id VARCHAR(255) NOT NULL,
  to_store_id VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'en_transito',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  received_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfer_items (
  id SERIAL PRIMARY KEY,
  transfer_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL
);

-- 6. Ventas POS y Detalle
CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  store_id VARCHAR(255) NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  subtotal NUMERIC NOT NULL
);

-- 7. Lotes de Importación y Prorrateo
CREATE TABLE IF NOT EXISTS batches (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  importDate VARCHAR(255) NOT NULL,
  totalCustomsTax NUMERIC NOT NULL DEFAULT 0.0,
  totalShippingCost NUMERIC NOT NULL DEFAULT 0.0,
  exchangeRateGtq NUMERIC DEFAULT 7.80,
  profitMarginPct NUMERIC DEFAULT 15.0,
  costUpdateStrategy VARCHAR(50) DEFAULT 'weighted',
  status VARCHAR(255) DEFAULT 'Procesado'
);

CREATE TABLE IF NOT EXISTS batch_items (
  id SERIAL PRIMARY KEY,
  batchId VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL DEFAULT 'PROD-001',
  productName VARCHAR(255) NOT NULL,
  brand VARCHAR(255) DEFAULT '',
  model VARCHAR(255) DEFAULT '',
  quantity INTEGER NOT NULL,
  unitCostFob NUMERIC NOT NULL,
  totalFobValue NUMERIC NOT NULL,
  sharePercentage NUMERIC NOT NULL,
  allocatedCustoms NUMERIC DEFAULT 0.0,
  allocatedShipping NUMERIC DEFAULT 0.0,
  allocatedTax NUMERIC NOT NULL,
  unitTax NUMERIC NOT NULL,
  finalUnitCost NUMERIC NOT NULL,
  profitMarginPct NUMERIC DEFAULT 15.0,
  finalSellingPrice NUMERIC DEFAULT 0.0,
  image TEXT
);

-- 8. Inventario Consolidado por SKU (Legacy)
CREATE TABLE IF NOT EXISTS inventory (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(255) DEFAULT '',
  model VARCHAR(255) DEFAULT '',
  category VARCHAR(255) DEFAULT 'General',
  stock INTEGER NOT NULL DEFAULT 0,
  unitCost NUMERIC NOT NULL DEFAULT 0.0,
  previousUnitCost NUMERIC DEFAULT 0.0,
  priceChangeDelta NUMERIC DEFAULT 0.0,
  priceChangePct NUMERIC DEFAULT 0.0,
  image TEXT,
  lastUpdated VARCHAR(255) NOT NULL
);

-- 8b. Vista Unificada de Inventario (Single Source of Truth en store_inventory)
CREATE OR REPLACE VIEW v_inventory_summary AS
SELECT 
  p.id,
  p.sku,
  p.name,
  COALESCE(p.brand, '') AS brand,
  COALESCE(p.model, '') AS model,
  COALESCE(p.category, 'General') AS category,
  COALESCE(p.description, '') AS description,
  p.cost_price,
  p.sale_price,
  p.cost_price AS "unitCost",
  p.cost_price AS "previousUnitCost",
  0 AS "priceChangeDelta",
  0 AS "priceChangePct",
  p.image,
  COALESCE(SUM(si.stock), 0) AS stock,
  COALESCE(SUM(si.stock), 0) AS total_stock,
  p.created_at,
  p.created_at AS "lastUpdated"
FROM products p
LEFT JOIN store_inventory si ON p.id = si.product_id
GROUP BY p.id, p.sku, p.name, p.brand, p.model, p.category, p.description, p.cost_price, p.sale_price, p.image, p.created_at;

-- 9. Historial de Variación de Costos
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(255) NOT NULL,
  batchId VARCHAR(255),
  oldCost NUMERIC NOT NULL,
  newCost NUMERIC NOT NULL,
  delta NUMERIC NOT NULL,
  pct NUMERIC NOT NULL,
  changeDate VARCHAR(255) NOT NULL
);

-- 10. Transacciones Contables / Auditoría
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(255) PRIMARY KEY,
  client VARCHAR(255) NOT NULL,
  service TEXT NOT NULL,
  date VARCHAR(255) NOT NULL,
  amount VARCHAR(255) NOT NULL,
  status VARCHAR(255) NOT NULL
);

-- Datos Iniciales (Seed)
INSERT INTO stores (id, name) VALUES 
  ('tienda_1', 'Tienda Central'),
  ('tienda_2', 'Sucursal Norte'),
  ('tienda_3', 'Sucursal Sur')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (name, email, role, status, avatar, lastLogin, password) VALUES 
  ('admin', 'admin@appmi.com', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Ahora mismo', 'admin'),
  ('admin-gg', 'admin@appg.com', 'Administrador', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Ahora mismo', 'admin-gg4321$'),
  ('Usuario1', 'usuario@1.com', 'Vendedor', 'Activo', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&q=80', 'Ahora mismo', 'usuario123')
ON CONFLICT (email) DO NOTHING;

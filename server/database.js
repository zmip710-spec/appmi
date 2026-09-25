import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'database.sqlite');

const isPg = Boolean(process.env.DATABASE_URL);

let pgPool = null;
let sqliteDb = null;

function convertSql(sql) {
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const key in row) {
    const val = row[key];
    const lowerKey = key.toLowerCase();

    let targetKey = key;
    if (lowerKey === 'lastlogin') targetKey = 'lastLogin';

    // Batches
    if (lowerKey === 'importdate') targetKey = 'importDate';
    if (lowerKey === 'totalcustomstax') targetKey = 'totalCustomsTax';
    if (lowerKey === 'totalshippingcost') targetKey = 'totalShippingCost';
    if (lowerKey === 'exchangerategtq') targetKey = 'exchangeRateGtq';
    if (lowerKey === 'profitmarginpct') targetKey = 'profitMarginPct';
    if (lowerKey === 'costupdatestrategy') targetKey = 'costUpdateStrategy';

    // Batch Items
    if (lowerKey === 'batchid') targetKey = 'batchId';
    if (lowerKey === 'productname') targetKey = 'productName';
    if (lowerKey === 'brand') targetKey = 'brand';
    if (lowerKey === 'model') targetKey = 'model';
    if (lowerKey === 'unitcostfob') targetKey = 'unitCostFob';
    if (lowerKey === 'totalfobvalue') targetKey = 'totalFobValue';
    if (lowerKey === 'sharepercentage') targetKey = 'sharePercentage';
    if (lowerKey === 'allocatedcustoms') targetKey = 'allocatedCustoms';
    if (lowerKey === 'allocatedshipping') targetKey = 'allocatedShipping';
    if (lowerKey === 'allocatedtax') targetKey = 'allocatedTax';
    if (lowerKey === 'unittax') targetKey = 'unitTax';
    if (lowerKey === 'finalunitcost') targetKey = 'finalUnitCost';
    if (lowerKey === 'finalsellingprice') targetKey = 'finalSellingPrice';

    // Inventory
    if (lowerKey === 'unitcost') targetKey = 'unitCost';
    if (lowerKey === 'previousunitcost') targetKey = 'previousUnitCost';
    if (lowerKey === 'pricechangedelta') targetKey = 'priceChangeDelta';
    if (lowerKey === 'pricechangepct') targetKey = 'priceChangePct';
    if (lowerKey === 'lastupdated') targetKey = 'lastUpdated';

    // Price History
    if (lowerKey === 'oldcost') targetKey = 'oldCost';
    if (lowerKey === 'newcost') targetKey = 'newCost';
    if (lowerKey === 'changedate') targetKey = 'changeDate';
    if (lowerKey === 'batchname') targetKey = 'batchName';

    let parsedVal = val;
    if (val !== null && val !== undefined) {
      if (typeof val === 'string' && !isNaN(val) && val.trim() !== '' &&
          !lowerKey.includes('date') && !lowerKey.includes('name') &&
          !lowerKey.includes('sku') && !lowerKey.includes('id') &&
          !lowerKey.includes('status') && !lowerKey.includes('role') &&
          !lowerKey.includes('email') && !lowerKey.includes('client') &&
          !lowerKey.includes('service') && !lowerKey.includes('amount') &&
          !lowerKey.includes('avatar') && !lowerKey.includes('image') &&
          !lowerKey.includes('category') && !lowerKey.includes('login') &&
          !lowerKey.includes('strategy')) {
        parsedVal = parseFloat(val);
      }
    }

    normalized[targetKey] = parsedVal;
  }
  return normalized;
}

if (isPg) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  console.log('🐘 Conectado exitosamente a PostgreSQL usando process.env.DATABASE_URL');
} else {
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar con SQLite:', err.message);
    } else {
      console.log('Conectado exitosamente a la base de datos SQLite en:', dbPath);
    }
  });
}

// Inicializar tablas y garantizar esquema completo en PostgreSQL
async function initPgTables() {
  if (!pgPool) return;
  try {
    // 1. Usuarios
    await pgPool.query(`
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
    `);

    // 2. Transacciones
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(255) PRIMARY KEY,
        client VARCHAR(255) NOT NULL,
        service TEXT NOT NULL,
        date VARCHAR(255) NOT NULL,
        amount VARCHAR(255) NOT NULL,
        status VARCHAR(255) NOT NULL
      );
    `);

    // 3. Lotes de Importación
    await pgPool.query(`
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
    `);

    // 4. Productos por Lote
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS batch_items (
        id SERIAL PRIMARY KEY,
        batchId VARCHAR(255) NOT NULL,
        sku VARCHAR(255) NOT NULL DEFAULT 'PROD-001',
        productName VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        unitCostFob NUMERIC NOT NULL,
        totalFobValue NUMERIC NOT NULL,
        sharePercentage NUMERIC NOT NULL,
        allocatedTax NUMERIC NOT NULL,
        unitTax NUMERIC NOT NULL,
        finalUnitCost NUMERIC NOT NULL,
        allocatedCustoms NUMERIC DEFAULT 0.0,
        allocatedShipping NUMERIC DEFAULT 0.0,
        profitMarginPct NUMERIC DEFAULT 15.0,
        finalSellingPrice NUMERIC DEFAULT 0.0,
        image TEXT
      );
    `);

    // 5. Inventario Consolidado por SKU
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id SERIAL PRIMARY KEY,
        sku VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(255) DEFAULT 'General',
        stock INTEGER NOT NULL DEFAULT 0,
        unitCost NUMERIC NOT NULL DEFAULT 0.0,
        previousUnitCost NUMERIC DEFAULT 0.0,
        priceChangeDelta NUMERIC DEFAULT 0.0,
        priceChangePct NUMERIC DEFAULT 0.0,
        image TEXT,
        lastUpdated VARCHAR(255) NOT NULL
      );
    `);

    // 6. Historial de Variaciones de Precios
    await pgPool.query(`
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
    `);

    // 7. Ventas POS y Detalle
    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        store_id VARCHAR(255) NOT NULL,
        total_amount NUMERIC NOT NULL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pgPool.query(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price NUMERIC NOT NULL,
        subtotal NUMERIC NOT NULL
      );
    `);

    // Garantizar que todas las columnas existan en tablas PostgreSQL creadas previamente
    await pgPool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS totalShippingCost NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS exchangeRateGtq NUMERIC DEFAULT 7.80");
    await pgPool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS profitMarginPct NUMERIC DEFAULT 15.0");
    await pgPool.query("ALTER TABLE batches ADD COLUMN IF NOT EXISTS costUpdateStrategy VARCHAR(50) DEFAULT 'weighted'");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS sku VARCHAR(255) DEFAULT 'PROD-001'");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS allocatedCustoms NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS allocatedShipping NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS profitMarginPct NUMERIC DEFAULT 15.0");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS finalSellingPrice NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS image TEXT");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image TEXT");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS previousUnitCost NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS priceChangeDelta NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS priceChangePct NUMERIC DEFAULT 0.0");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT ''");
    await pgPool.query("ALTER TABLE batch_items ADD COLUMN IF NOT EXISTS model TEXT DEFAULT ''");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT ''");
    await pgPool.query("ALTER TABLE inventory ADD COLUMN IF NOT EXISTS model TEXT DEFAULT ''");
    await pgPool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456'");

    console.log('✅ Tablas y esquema de PostgreSQL inicializados correctamente.');
  } catch (err) {
    console.error('Error al inicializar las tablas en PostgreSQL:', err);
  }
}

if (isPg) {
  initPgTables();
} else {
  // Inicialización de SQLite Local
  sqliteDb.serialize(() => {
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        status TEXT DEFAULT 'Activo',
        avatar TEXT,
        lastLogin TEXT,
        password TEXT DEFAULT '123456'
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        client TEXT NOT NULL,
        service TEXT NOT NULL,
        date TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT NOT NULL
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS batches (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        importDate TEXT NOT NULL,
        totalCustomsTax REAL NOT NULL DEFAULT 0.0,
        totalShippingCost REAL NOT NULL DEFAULT 0.0,
        status TEXT DEFAULT 'Procesado'
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS batch_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batchId TEXT NOT NULL,
        sku TEXT NOT NULL DEFAULT 'PROD-001',
        productName TEXT NOT NULL,
        brand TEXT DEFAULT '',
        model TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        unitCostFob REAL NOT NULL,
        totalFobValue REAL NOT NULL,
        sharePercentage REAL NOT NULL,
        allocatedTax REAL NOT NULL,
        unitTax REAL NOT NULL,
        finalUnitCost REAL NOT NULL,
        image TEXT,
        FOREIGN KEY (batchId) REFERENCES batches (id) ON DELETE CASCADE
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        brand TEXT DEFAULT '',
        model TEXT DEFAULT '',
        category TEXT DEFAULT 'General',
        stock INTEGER NOT NULL DEFAULT 0,
        unitCost REAL NOT NULL DEFAULT 0.0,
        image TEXT,
        lastUpdated TEXT NOT NULL
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS price_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sku TEXT NOT NULL,
        batchId TEXT,
        oldCost REAL NOT NULL,
        newCost REAL NOT NULL,
        delta REAL NOT NULL,
        pct REAL NOT NULL,
        changeDate TEXT NOT NULL
      )
    `);

    sqliteDb.run("ALTER TABLE batches ADD COLUMN totalShippingCost REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN exchangeRateGtq REAL DEFAULT 7.80", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
    sqliteDb.run("ALTER TABLE batches ADD COLUMN costUpdateStrategy TEXT DEFAULT 'weighted'", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN sku TEXT DEFAULT 'PROD-001'", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN brand TEXT DEFAULT ''", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN model TEXT DEFAULT ''", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN allocatedCustoms REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN allocatedShipping REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN profitMarginPct REAL DEFAULT 15.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN finalSellingPrice REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE batch_items ADD COLUMN image TEXT", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN brand TEXT DEFAULT ''", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN model TEXT DEFAULT ''", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN image TEXT", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN previousUnitCost REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN priceChangeDelta REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE inventory ADD COLUMN priceChangePct REAL DEFAULT 0.0", () => {});
    sqliteDb.run("ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456'", () => {});

    // Multi-Store Tables Setup
    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS stores (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    sqliteDb.run(`
      INSERT OR IGNORE INTO stores (id, name) VALUES 
      ('tienda_1', 'Tienda Central'),
      ('tienda_2', 'Sucursal Norte'),
      ('tienda_3', 'Sucursal Sur')
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        description TEXT,
        cost_price REAL DEFAULT 0,
        sale_price REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS store_inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        stock INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (store_id) REFERENCES stores(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE(store_id, product_id)
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS inventory_transfers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_store_id TEXT NOT NULL,
        to_store_id TEXT NOT NULL,
        status TEXT CHECK(status IN ('en_transito', 'completado', 'cancelado')) DEFAULT 'en_transito',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        received_at DATETIME
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS transfer_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transfer_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        store_id TEXT NOT NULL,
        total_amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    sqliteDb.run(`
      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
      )
    `);

    // Auto-seeding disabled to maintain clean database without demo products.
  });
}

// Adaptador unificado para PostgreSQL / SQLite con normalización automática de CamelCase
const db = {
  isPg,
  getRawDb: () => sqliteDb,
  all: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      const pgSql = convertSql(sql).replace(/ORDER BY rowid DESC/gi, 'ORDER BY id DESC');
      pgPool.query(pgSql, params)
        .then(res => {
          const rows = res.rows.map(normalizeRow);
          if (cb) cb(null, rows);
        })
        .catch(err => {
          if (cb) cb(err, []);
        });
    } else {
      sqliteDb.all(sql, params, cb);
    }
  },

  get: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      const pgSql = convertSql(sql);
      pgPool.query(pgSql, params)
        .then(res => {
          const row = res.rows[0] ? normalizeRow(res.rows[0]) : null;
          if (cb) cb(null, row);
        })
        .catch(err => {
          if (cb) cb(err, null);
        });
    } else {
      sqliteDb.get(sql, params, cb);
    }
  },

  run: function (sql, params, cb) {
    if (typeof params === 'function') {
      cb = params;
      params = [];
    }
    params = params || [];

    if (isPg) {
      let pgSql = convertSql(sql);
      if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
        pgSql += ' RETURNING id';
      }
      pgPool.query(pgSql, params)
        .then(res => {
          const lastID = res.rows && res.rows[0] && res.rows[0].id ? res.rows[0].id : 1;
          if (cb) cb.call({ lastID, changes: res.rowCount }, null);
        })
        .catch(err => {
          if (cb) cb.call({ lastID: 0, changes: 0 }, err);
        });
    } else {
      sqliteDb.run(sql, params, cb);
    }
  },

  serialize: function (fn) {
    if (isPg) {
      if (fn) fn();
    } else {
      sqliteDb.serialize(fn);
    }
  },

  prepare: function (sql) {
    if (isPg) {
      const pgSql = convertSql(sql);
      return {
        run: function (...args) {
          let cb = null;
          if (typeof args[args.length - 1] === 'function') {
            cb = args.pop();
          }
          pgPool.query(pgSql, args)
            .then(res => {
              if (cb) cb(null);
            })
            .catch(err => {
              if (cb) cb(err);
            });
        },
        finalize: function () {}
      };
    } else {
      return sqliteDb.prepare(sql);
    }
  }
};

export default db;

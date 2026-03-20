import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

function logStatus(msg: string) {
  try {
    fs.appendFileSync('status_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {
    console.error("Failed to write to status_debug.log", err);
  }
}

const db = new Database("erp.db");

// Initialize Database Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    order_number TEXT,
    status TEXT DEFAULT 'pending',
    priority TEXT DEFAULT 'medium',
    start_date DATE,
    due_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    part_name TEXT NOT NULL,
    part_number TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price REAL,
    total_price REAL,
    status TEXT DEFAULT 'pending',
    drawing_data TEXT,
    notes TEXT,
    completion_date DATE,
    start_date DATE,
    due_date DATE,
    delivered_quantity INTEGER,
    tool_cost REAL,
    fixture_cost REAL,
    material_cost REAL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS order_processes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER,
    name TEXT NOT NULL,
    is_outsourced INTEGER DEFAULT 0,
    outsourcing_fee REAL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id)
  );

  CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    spec TEXT,
    quantity REAL DEFAULT 0,
    unit TEXT DEFAULT 'kg'
  );

  CREATE TABLE IF NOT EXISTS remnants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER,
    dimensions TEXT,
    photo_data TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id)
  );

  CREATE TABLE IF NOT EXISTS advent_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    formula TEXT NOT NULL,
    target_status TEXT DEFAULT 'pending',
    scopeType TEXT DEFAULT 'general',
    ruleType TEXT DEFAULT 'imminent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Seed Data
  INSERT OR IGNORE INTO customers (id, name, contact) VALUES (1, '大疆创新', '张工 13800138000');
  INSERT OR IGNORE INTO customers (id, name, contact) VALUES (2, '华为技术', '李工 13900139000');
  
  INSERT OR IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (1, '45# 钢', 'Φ30', 50, 'kg');
  INSERT OR IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (2, '6061 铝', '100*100', 20, '块');
  INSERT OR IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (3, 'H59 黄铜', 'Φ20', 15, 'kg');

  -- Seed Orders and Items
  INSERT OR IGNORE INTO orders (id, customer_id, order_number, status, priority, due_date) 
  VALUES (1, 1, 'ORD-20240311-001', 'processing', 'high', '2024-03-20');
  
  INSERT OR IGNORE INTO order_items (id, order_id, part_name, part_number, quantity, unit_price, total_price, status)
  VALUES (1, 1, '主轴连接件', 'DJ-001-A', 5, 120.00, 600.00, 'processing');
  
  INSERT OR IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
  VALUES (1, 1, '下料', 'completed', 1),
         (2, 1, '车', 'processing', 2),
         (3, 1, '铣', 'pending', 3);

  INSERT OR IGNORE INTO orders (id, customer_id, order_number, status, priority, due_date) 
  VALUES (2, 2, 'ORD-20240311-002', 'pending', 'medium', '2024-03-25');
  
  INSERT OR IGNORE INTO order_items (id, order_id, part_name, part_number, quantity, unit_price, total_price, status)
  VALUES (2, 2, '散热片', 'HW-99-S', 100, 15.50, 1550.00, 'pending');
  
  INSERT OR IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
  VALUES (4, 2, '铣', 'pending', 1),
         (5, 2, '表面处理', 'pending', 2);
`);

// Migrations for existing database
const migrations = [
  "ALTER TABLE orders ADD COLUMN start_date DATE;",
  "ALTER TABLE order_items ADD COLUMN start_date DATE;",
  "ALTER TABLE order_items ADD COLUMN due_date DATE;",
  "ALTER TABLE order_items ADD COLUMN completion_date DATE;",
  "ALTER TABLE order_items ADD COLUMN delivered_quantity INTEGER;",
  "ALTER TABLE order_items ADD COLUMN tool_cost REAL;",
  "ALTER TABLE order_items ADD COLUMN fixture_cost REAL;",
  "ALTER TABLE order_items ADD COLUMN material_cost REAL;",
  "ALTER TABLE advent_rules ADD COLUMN target_status TEXT DEFAULT 'pending';",
  "ALTER TABLE advent_rules ADD COLUMN scopeType TEXT DEFAULT 'general';",
  "ALTER TABLE advent_rules ADD COLUMN ruleType TEXT DEFAULT 'imminent';"
];

migrations.forEach(migration => {
  try {
    db.exec(migration);
  } catch (e) {
    // Ignore errors (e.g., column already exists)
  }
});

function calculateStatus(subItems: any[], label: string = 'unknown'): string {
  if (!subItems || subItems.length === 0) {
    logStatus(`calculateStatus(${label}): No items, returning pending`);
    return 'pending';
  }
  
  const statuses = subItems.map(s => s.status || 'pending');
  let result = 'processing';
  
  if (statuses.every(s => s === 'completed' || s === 'delivered')) {
    result = 'completed';
  } else if (statuses.every(s => s === 'pending')) {
    result = 'pending';
  }
  
  logStatus(`calculateStatus(${label}): Input statuses: ${JSON.stringify(statuses)} -> Result: ${result}`);
  return result;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // app.use(cors()); // Removed to fix lint error
  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "v2-logs", time: new Date().toISOString() });
  });

  // API Routes
  
  // Customers
  app.get("/api/customers", (req, res) => {
    const rows = db.prepare("SELECT * FROM customers ORDER BY name").all();
    res.json(rows);
  });

  app.post("/api/customers", (req, res) => {
    const { name, contact } = req.body;
    const info = db.prepare("INSERT INTO customers (name, contact) VALUES (?, ?)").run(name, contact);
    res.json({ id: info.lastInsertRowid });
  });

  // Orders
  app.get("/api/orders", (req, res) => {
    const orders = db.prepare(`
      SELECT orders.*, customers.name as customer_name 
      FROM orders 
      LEFT JOIN customers ON orders.customer_id = customers.id
      ORDER BY 
        CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        due_date ASC
    `).all();

    // Attach items and processes to each order
    const fullOrders = orders.map(order => {
      const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
      const itemsWithProcesses = items.map(item => {
        const processes = db.prepare("SELECT * FROM order_processes WHERE order_item_id = ? ORDER BY sort_order ASC").all(item.id);
        return { ...item, processes };
      });
      return { ...order, items: itemsWithProcesses };
    });

    res.json(fullOrders);
  });

  app.post("/api/orders", (req, res) => {
    const { customer_id, order_number, priority, start_date, due_date, notes, items } = req.body;
    
    if (!customer_id || !start_date || !due_date) {
      return res.status(400).send("Missing customer_id, start_date or due_date");
    }
    
    let finalOrderNumber = order_number;
    if (!finalOrderNumber) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `YHS-${today}-`;
      const ordersToday = db.prepare("SELECT order_number FROM orders WHERE order_number LIKE ?").all(`${prefix}%`);
      let maxSuffix = 0;
      ordersToday.forEach(o => {
        const parts = o.order_number.split('-');
        const suffix = parseInt(parts[parts.length - 1]);
        if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
      });
      finalOrderNumber = `${prefix}${maxSuffix + 1}`;
    }

    const insertOrder = db.prepare(`
      INSERT INTO orders (customer_id, order_number, priority, start_date, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const info = insertOrder.run(customer_id, finalOrderNumber, priority || 'medium', start_date, due_date, notes);
    const orderId = info.lastInsertRowid;

    // Insert items if provided
    if (items && Array.isArray(items)) {
      const insertItem = db.prepare(`
        INSERT INTO order_items (
          order_id, part_name, part_number, quantity, unit_price, total_price, 
          drawing_data, notes, status, completion_date, start_date, due_date, delivered_quantity, 
          tool_cost, fixture_cost, material_cost
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const insertProcess = db.prepare(`
        INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      items.forEach((item) => {
        const total_price = (item.quantity || 1) * (item.unit_price || 0);
        const itemStatus = calculateStatus(item.processes || []);
        const itemInfo = insertItem.run(
          orderId, 
          item.part_name, 
          item.part_number, 
          item.quantity || 1, 
          item.unit_price || 0, 
          total_price, 
          item.drawing_data, 
          item.notes,
          itemStatus,
          item.completion_date,
          item.start_date,
          item.due_date,
          item.delivered_quantity,
          item.tool_cost,
          item.fixture_cost,
          item.material_cost
        );
        const itemId = itemInfo.lastInsertRowid;

        if (item.processes && Array.isArray(item.processes)) {
          item.processes.forEach((p, index) => {
            insertProcess.run(itemId, p.name, p.is_outsourced ? 1 : 0, p.outsourcing_fee || 0, p.status || 'pending', index);
          });
        }
      });
    }

    // Calculate and update order status
    const allItems = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(Number(orderId));
    const orderStatus = calculateStatus(allItems, `Initial Order ${orderId}`);
    logStatus(`Order ${orderId} created. Initial status: ${orderStatus}`);
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(orderStatus, Number(orderId));

    res.json({ id: orderId });
  });

  app.patch("/api/orders/:id", (req, res) => {
    const { id } = req.params;
    const { customer_id, priority, start_date, due_date, notes, status, items } = req.body;
    
    if (start_date === "" || start_date === null || due_date === "" || due_date === null) {
      return res.status(400).send("start_date and due_date cannot be empty");
    }
    
    db.transaction(() => {
      // Update order fields
      if (status && !items) {
        // Simple status update
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
      } else {
        // Full update
        db.prepare(`
          UPDATE orders 
          SET customer_id = ?, priority = ?, start_date = ?, due_date = ?, notes = ?
          WHERE id = ?
        `).run(customer_id, priority, start_date, due_date, notes, id);

        if (items && Array.isArray(items)) {
          // Delete existing items and processes
          const existingItems = db.prepare("SELECT id FROM order_items WHERE order_id = ?").all(id);
          const itemIds = existingItems.map(item => item.id);
          
          if (itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            db.prepare(`DELETE FROM order_processes WHERE order_item_id IN (${placeholders})`).run(...itemIds);
            db.prepare(`DELETE FROM order_items WHERE order_id = ?`).run(id);
          }

          // Re-insert items
          const insertItem = db.prepare(`
            INSERT INTO order_items (
              order_id, part_name, part_number, quantity, unit_price, total_price, 
              drawing_data, notes, status, completion_date, start_date, due_date, delivered_quantity, 
              tool_cost, fixture_cost, material_cost
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          const insertProcess = db.prepare(`
            INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order)
            VALUES (?, ?, ?, ?, ?, ?)
          `);

          items.forEach((item) => {
            const total_price = (item.quantity || 1) * (item.unit_price || 0);
            const itemStatus = calculateStatus(item.processes || []);
            const itemInfo = insertItem.run(
              id, 
              item.part_name, 
              item.part_number, 
              item.quantity || 1, 
              item.unit_price || 0, 
              total_price, 
              item.drawing_data, 
              item.notes,
              itemStatus,
              item.completion_date,
              item.start_date,
              item.due_date,
              item.delivered_quantity,
              item.tool_cost,
              item.fixture_cost,
              item.material_cost
            );
            const itemId = itemInfo.lastInsertRowid;

            if (item.processes && Array.isArray(item.processes)) {
              item.processes.forEach((p, index) => {
                insertProcess.run(itemId, p.name, p.is_outsourced ? 1 : 0, p.outsourcing_fee || 0, p.status || 'pending', index);
              });
            }
          });
        }
      }
      
      // Calculate and update order status
      const allItems = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(Number(id));
      const orderStatus = calculateStatus(allItems, `Order ${id} Patch`);
      logStatus(`Order ${id} patched. New status: ${orderStatus}`);
      db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(orderStatus, Number(id));
    })();

    res.json({ success: true });
  });

  app.patch("/api/order-items/:itemId", (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;
    
    if (status) {
      db.prepare("UPDATE order_items SET status = ? WHERE id = ?").run(status, Number(itemId));
      
      // Auto-update order status
      const itemRow = db.prepare("SELECT order_id FROM order_items WHERE id = ?").get(Number(itemId)) as { order_id: number };
      if (itemRow && itemRow.order_id) {
        const orderId = itemRow.order_id;
        const itemsInOrder = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(Number(orderId));
        const newOrderStatus = calculateStatus(itemsInOrder, `Order ${orderId} (Item ${itemId} update)`);
        logStatus(`Item ${itemId} status manual update. Order ${orderId} new status: ${newOrderStatus}`);
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newOrderStatus, Number(orderId));
      }
    }

    res.json({ success: true });
  });

  app.patch("/api/order-items/:itemId/processes/:processId", (req, res) => {
    const { itemId, processId } = req.params;
    const { status, is_outsourced, outsourcing_fee } = req.body;
    
    let query = "UPDATE order_processes SET ";
    const params = [];
    const updates = [];
    
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (is_outsourced !== undefined) {
      updates.push("is_outsourced = ?");
      params.push(is_outsourced ? 1 : 0);
    }
    if (outsourcing_fee !== undefined) {
      updates.push("outsourcing_fee = ?");
      params.push(outsourcing_fee);
    }
    
    if (updates.length === 0) return res.json({ success: true });
    
    query += updates.join(", ") + " WHERE id = ?";
    params.push(processId);
    db.transaction(() => {
      logStatus(`Process ${processId} updated to ${status}. Re-calculating Item ${itemId}`);
      const info = db.prepare(query).run(...params);
      logStatus(`Update Process OK: changes=${info.changes}`);
      
      const allProcesses = db.prepare("SELECT id, status FROM order_processes WHERE order_item_id = ?").all(Number(itemId));
      const newItemStatus = calculateStatus(allProcesses, `Item ${itemId}`);
      db.prepare("UPDATE order_items SET status = ? WHERE id = ?").run(newItemStatus, Number(itemId));
      logStatus(`Update Item ${itemId} to ${newItemStatus}`);

      const itemRow = db.prepare("SELECT order_id FROM order_items WHERE id = ?").get(Number(itemId)) as { order_id: number };
      if (itemRow && itemRow.order_id) {
        const orderId = itemRow.order_id;
        const itemsInOrder = db.prepare("SELECT id, status FROM order_items WHERE order_id = ?").all(Number(orderId));
        const newOrderStatus = calculateStatus(itemsInOrder, `Order ${orderId}`);
        logStatus(`Updating Order ${orderId} to ${newOrderStatus}`);
        db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newOrderStatus, Number(orderId));
      } else {
        logStatus(`WARNING: Could not find order_id for Item ${itemId}`);
      }
    })();
    logStatus("Transaction committed successfully");
    
    res.json({ success: true });
  });

  // Materials
  app.get("/api/materials", (req, res) => {
    const rows = db.prepare("SELECT * FROM materials").all();
    res.json(rows);
  });

  app.post("/api/materials", (req, res) => {
    const { name, spec, quantity, unit } = req.body;
    const info = db.prepare("INSERT INTO materials (name, spec, quantity, unit) VALUES (?, ?, ?, ?)").run(name, spec, quantity, unit);
    res.json({ id: info.lastInsertRowid });
  });

  // Remnants
  app.get("/api/remnants", (req, res) => {
    const rows = db.prepare(`
      SELECT remnants.*, materials.name as material_name 
      FROM remnants 
      JOIN materials ON remnants.material_id = materials.id
    `).all();
    res.json(rows);
  });

  app.post("/api/remnants", (req, res) => {
    const { material_id, dimensions, photo_data, notes } = req.body;
    const info = db.prepare("INSERT INTO remnants (material_id, dimensions, photo_data, notes) VALUES (?, ?, ?, ?)").run(material_id, dimensions, photo_data, notes);
    res.json({ id: info.lastInsertRowid });
  });

  // Finance / Reconciliation
  app.get("/api/finance/reconciliation", (req, res) => {
    const rows = db.prepare(`
      SELECT 
        strftime('%Y-%m', orders.due_date) as month,
        SUM(order_items.total_price) as total_amount,
        COUNT(DISTINCT orders.id) as order_count,
        SUM(CASE WHEN order_items.status = 'delivered' THEN order_items.total_price ELSE 0 END) as delivered_amount
      FROM orders
      JOIN order_items ON orders.id = order_items.order_id
      GROUP BY month
      ORDER BY month DESC
    `).all();
    res.json(rows);
  });

  // Advent Rules
  app.get("/api/advent-rules", (req, res) => {
    const { name } = req.query;
    let query = "SELECT * FROM advent_rules";
    const params: any[] = [];
    
    if (name) {
      query += " WHERE name LIKE ?";
      params.push(`%${name}%`);
    }
    
    query += " ORDER BY created_at DESC";
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  });

  app.post("/api/advent-rules", (req, res) => {
    const { name, description, formula, target_status, scopeType, ruleType } = req.body;
    const info = db.prepare("INSERT INTO advent_rules (name, description, formula, target_status, scopeType, ruleType) VALUES (?, ?, ?, ?, ?, ?)").run(name, description, formula, target_status || 'pending', scopeType || 'general', ruleType || 'imminent');
    res.json({ id: info.lastInsertRowid });
  });

  app.patch("/api/advent-rules/:id", (req, res) => {
    const { id } = req.params;
    const { name, description, formula, target_status, scopeType, ruleType } = req.body;
    db.prepare("UPDATE advent_rules SET name = ?, description = ?, formula = ?, target_status = ?, scopeType = ?, ruleType = ? WHERE id = ?").run(name, description, formula, target_status, scopeType, ruleType, id);
    res.json({ success: true });
  });

  app.delete("/api/advent-rules/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM advent_rules WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

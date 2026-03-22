import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import path from "path";
import fs from "fs";

function logStatus(msg: string) {
  try {
    fs.appendFileSync('status_debug.log', `[${new Date().toISOString()}] ${msg}\n`);
  } catch (err) {
    console.error("Failed to write to status_debug.log", err);
  }
}

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || "localhost",
  user: process.env.MYSQL_USER || "root",
  password: process.env.MYSQL_PASSWORD || "",
  database: process.env.MYSQL_DATABASE || "erp",
  port: Number(process.env.MYSQL_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize Database Schema
async function initDatabase() {
  const connection = await pool.getConnection();
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT,
        customer_name VARCHAR(255),
        order_number VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        priority VARCHAR(50) DEFAULT 'medium',
        start_date DATE,
        due_date DATE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT,
        part_name VARCHAR(255) NOT NULL,
        part_number VARCHAR(255),
        quantity INT DEFAULT 1,
        scrap_quantity INT DEFAULT 0,
        unit_price DECIMAL(10,2),
        total_price DECIMAL(10,2),
        status VARCHAR(50) DEFAULT 'pending',
        drawing_data LONGTEXT,
        notes TEXT,
        completion_date DATE,
        start_date DATE,
        due_date DATE,
        delivered_quantity INT,
        tool_cost DECIMAL(10,2),
        fixture_cost DECIMAL(10,2),
        material_cost DECIMAL(10,2),
        other_cost DECIMAL(10,2),
        item_notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS order_processes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_item_id INT,
        name VARCHAR(255) NOT NULL,
        is_outsourced TINYINT DEFAULT 0,
        outsourcing_fee DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(50) DEFAULT 'pending',
        sort_order INT DEFAULT 0,
        FOREIGN KEY (order_item_id) REFERENCES order_items(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS materials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        spec VARCHAR(255),
        quantity DECIMAL(10,2) DEFAULT 0,
        unit VARCHAR(50) DEFAULT 'kg'
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS remnants (
        id INT AUTO_INCREMENT PRIMARY KEY,
        material_id INT,
        dimensions VARCHAR(255),
        photo_data LONGTEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (material_id) REFERENCES materials(id)
      )
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS advent_rules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        formula TEXT NOT NULL,
        target_status VARCHAR(50) DEFAULT 'pending',
        scopeType VARCHAR(50) DEFAULT 'general',
        ruleType VARCHAR(50) DEFAULT 'imminent',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed Data
    await connection.execute(`
      INSERT IGNORE INTO customers (id, name, contact) VALUES (1, '大疆创新', '张工 13800138000')
    `);
    await connection.execute(`
      INSERT IGNORE INTO customers (id, name, contact) VALUES (2, '华为技术', '李工 13900139000')
    `);

    await connection.execute(`
      INSERT IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (1, '45# 钢', 'Φ30', 50, 'kg')
    `);
    await connection.execute(`
      INSERT IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (2, '6061 铝', '100*100', 20, '块')
    `);
    await connection.execute(`
      INSERT IGNORE INTO materials (id, name, spec, quantity, unit) VALUES (3, 'H59 黄铜', 'Φ20', 15, 'kg')
    `);

    // Seed Orders and Items
    await connection.execute(`
      INSERT IGNORE INTO orders (id, customer_id, order_number, status, priority, due_date)
      VALUES (1, 1, 'ORD-20240311-001', 'processing', 'high', '2024-03-20')
    `);

    await connection.execute(`
      INSERT IGNORE INTO order_items (id, order_id, part_name, part_number, quantity, unit_price, total_price, status)
      VALUES (1, 1, '主轴连接件', 'DJ-001-A', 5, 120.00, 600.00, 'processing')
    `);

    await connection.execute(`
      INSERT IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
      VALUES (1, 1, '下料', 'completed', 1)
    `);
    await connection.execute(`
      INSERT IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
      VALUES (2, 1, '车', 'processing', 2)
    `);
    await connection.execute(`
      INSERT IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
      VALUES (3, 1, '铣', 'pending', 3)
    `);

    await connection.execute(`
      INSERT IGNORE INTO orders (id, customer_id, order_number, status, priority, due_date)
      VALUES (2, 2, 'ORD-20240311-002', 'pending', 'medium', '2024-03-25')
    `);

    await connection.execute(`
      INSERT IGNORE INTO order_items (id, order_id, part_name, part_number, quantity, unit_price, total_price, status)
      VALUES (2, 2, '散热片', 'HW-99-S', 100, 15.50, 1550.00, 'pending')
    `);

    await connection.execute(`
      INSERT IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
      VALUES (4, 2, '铣', 'pending', 1)
    `);
    await connection.execute(`
      INSERT IGNORE INTO order_processes (id, order_item_id, name, status, sort_order)
      VALUES (5, 2, '表面处理', 'pending', 2)
    `);

    console.log("Database initialized successfully");
  } finally {
    connection.release();
  }
}

// Run migrations
async function runMigrations() {
  const migrations = [
    "ALTER TABLE orders ADD COLUMN start_date DATE",
    "ALTER TABLE order_items ADD COLUMN start_date DATE",
    "ALTER TABLE order_items ADD COLUMN due_date DATE",
    "ALTER TABLE order_items ADD COLUMN completion_date DATE",
    "ALTER TABLE order_items ADD COLUMN delivered_quantity INT",
    "ALTER TABLE order_items ADD COLUMN tool_cost DECIMAL(10,2)",
    "ALTER TABLE order_items ADD COLUMN fixture_cost DECIMAL(10,2)",
    "ALTER TABLE order_items ADD COLUMN material_cost DECIMAL(10,2)",
    "ALTER TABLE order_items ADD COLUMN other_cost DECIMAL(10,2)",
    "ALTER TABLE order_items ADD COLUMN scrap_quantity INT DEFAULT 0",
    "ALTER TABLE order_items ADD COLUMN item_notes TEXT",
    "ALTER TABLE advent_rules ADD COLUMN target_status VARCHAR(50) DEFAULT 'pending'",
    "ALTER TABLE advent_rules ADD COLUMN scopeType VARCHAR(50) DEFAULT 'general'",
    "ALTER TABLE advent_rules ADD COLUMN ruleType VARCHAR(50) DEFAULT 'imminent'",
    "ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255)",
  ];

  for (const migration of migrations) {
    try {
      await pool.execute(migration);
    } catch (e) {
      // Ignore errors (e.g., column already exists)
    }
  }

  // Ensure scrap_quantity column has default values for existing rows
  try {
    await pool.execute("UPDATE order_items SET scrap_quantity = 0 WHERE scrap_quantity IS NULL");
  } catch (e) {
    // Ignore if column doesn't exist
  }
}

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
  // Initialize database
  await initDatabase();
  await runMigrations();

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "mysql", time: new Date().toISOString() });
  });

  // API Routes

  // Customers
  app.get("/api/customers", async (req, res) => {
    const [rows] = await pool.execute("SELECT * FROM customers ORDER BY name");
    res.json(rows);
  });

  app.post("/api/customers", async (req, res) => {
    const { name, contact } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO customers (name, contact) VALUES (?, ?)",
      [name, contact]
    ) as [mysql.ResultSetHeader, any];
    res.json({ id: result.insertId });
  });

  app.patch("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    const { name, contact } = req.body;
    await pool.execute("UPDATE customers SET name = ?, contact = ? WHERE id = ?", [name, contact, id]);
    res.json({ success: true });
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const { id } = req.params;
    await pool.execute("DELETE FROM customers WHERE id = ?", [id]);
    res.json({ success: true });
  });

  // Orders
  app.get("/api/orders", async (req, res) => {
    const [orders] = await pool.execute(`
      SELECT orders.*,
        COALESCE(orders.customer_name, customers.name) as customer_name
      FROM orders
      LEFT JOIN customers ON orders.customer_id = customers.id
      ORDER BY start_date ASC
    `);

    // Attach items and processes to each order
    const fullOrders = await Promise.all((orders as any[]).map(async (order) => {
      const [items] = await pool.execute("SELECT * FROM order_items WHERE order_id = ? ORDER BY due_date ASC", [order.id]);
      const itemsWithProcesses = await Promise.all((items as any[]).map(async (item) => {
        const [processes] = await pool.execute("SELECT * FROM order_processes WHERE order_item_id = ? ORDER BY sort_order ASC", [item.id]);
        return { ...item, processes };
      }));
      return { ...order, items: itemsWithProcesses };
    }));

    res.json(fullOrders);
  });

  app.post("/api/orders", async (req, res) => {
    const { customer_id, customer_name, order_number, priority, start_date, due_date, notes, items } = req.body;

    if (!customer_id || !start_date || !due_date) {
      return res.status(400).send("Missing customer_id, start_date or due_date");
    }

    let finalOrderNumber = order_number;
    if (!finalOrderNumber) {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const prefix = `YHS-${today}-`;
      const [ordersToday] = await pool.execute("SELECT order_number FROM orders WHERE order_number LIKE ?", [`${prefix}%`]);
      let maxSuffix = 0;
      (ordersToday as any[]).forEach(o => {
        const parts = o.order_number.split('-');
        const suffix = parseInt(parts[parts.length - 1]);
        if (!isNaN(suffix) && suffix > maxSuffix) maxSuffix = suffix;
      });
      finalOrderNumber = `${prefix}${maxSuffix + 1}`;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [orderResult] = await connection.execute(
        "INSERT INTO orders (customer_id, customer_name, order_number, priority, start_date, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [customer_id, customer_name, finalOrderNumber, priority || 'medium', start_date, due_date, notes]
      ) as [mysql.ResultSetHeader, any];
      const orderId = orderResult.insertId;

      // Insert items if provided
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const total_price = (item.quantity || 1) * (item.unit_price || 0);
          const itemStatus = calculateStatus(item.processes || []);
          const [itemResult] = await connection.execute(
            `INSERT INTO order_items (
              order_id, part_name, part_number, quantity, scrap_quantity, unit_price, total_price,
              drawing_data, notes, status, completion_date, start_date, due_date, delivered_quantity,
              tool_cost, fixture_cost, material_cost, other_cost, item_notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId, item.part_name, item.part_number, item.quantity || 1, item.scrap_quantity || 0,
              item.unit_price || 0, total_price, item.drawing_data, item.notes, itemStatus,
              item.completion_date, item.start_date, item.due_date, item.delivered_quantity,
              item.tool_cost, item.fixture_cost, item.material_cost, item.other_cost, item.item_notes
            ]
          ) as [mysql.ResultSetHeader, any];
          const itemId = itemResult.insertId;

          if (item.processes && Array.isArray(item.processes)) {
            for (let index = 0; index < item.processes.length; index++) {
              const p = item.processes[index];
              await connection.execute(
                "INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                [itemId, p.name, p.is_outsourced ? 1 : 0, p.outsourcing_fee || 0, p.status || 'pending', index]
              );
            }
          }
        }
      }

      // Calculate and update order status
      const [allItems] = await connection.execute("SELECT status FROM order_items WHERE order_id = ?", [orderId]);
      const orderStatus = calculateStatus(allItems as any[], `Initial Order ${orderId}`);
      logStatus(`Order ${orderId} created. Initial status: ${orderStatus}`);
      await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [orderStatus, orderId]);

      await connection.commit();
      res.json({ id: orderId });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    const { id } = req.params;
    const { customer_id, customer_name, priority, start_date, due_date, notes, status, items } = req.body;

    if (start_date === "" || start_date === null || due_date === "" || due_date === null) {
      return res.status(400).send("start_date and due_date cannot be empty");
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // Update order fields
      if (status && !items) {
        // Simple status update
        await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
      } else {
        // Full update
        await connection.execute(
          `UPDATE orders SET customer_id = ?, customer_name = ?, priority = ?, start_date = ?, due_date = ?, notes = ? WHERE id = ?`,
          [customer_id, customer_name, priority, start_date, due_date, notes, id]
        );

        if (items && Array.isArray(items)) {
          // Delete existing items and processes
          const [existingItems] = await connection.execute("SELECT id FROM order_items WHERE order_id = ?", [id]);
          const itemIds = (existingItems as any[]).map(item => item.id);

          if (itemIds.length > 0) {
            const placeholders = itemIds.map(() => '?').join(',');
            await connection.execute(`DELETE FROM order_processes WHERE order_item_id IN (${placeholders})`, itemIds);
            await connection.execute("DELETE FROM order_items WHERE order_id = ?", [id]);
          }

          // Re-insert items
          for (const item of items) {
            const total_price = (item.quantity || 1) * (item.unit_price || 0);
            const itemStatus = calculateStatus(item.processes || []);
            const [itemResult] = await connection.execute(
              `INSERT INTO order_items (
                order_id, part_name, part_number, quantity, scrap_quantity, unit_price, total_price,
                drawing_data, notes, status, completion_date, start_date, due_date, delivered_quantity,
                tool_cost, fixture_cost, material_cost, other_cost, item_notes
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                id, item.part_name, item.part_number, item.quantity || 1, item.scrap_quantity || 0,
                item.unit_price || 0, total_price, item.drawing_data, item.notes, itemStatus,
                item.completion_date, item.start_date, item.due_date, item.delivered_quantity,
                item.tool_cost, item.fixture_cost, item.material_cost, item.other_cost, item.item_notes
              ]
            ) as [mysql.ResultSetHeader, any];
            const itemId = itemResult.insertId;

            if (item.processes && Array.isArray(item.processes)) {
              for (let index = 0; index < item.processes.length; index++) {
                const p = item.processes[index];
                await connection.execute(
                  "INSERT INTO order_processes (order_item_id, name, is_outsourced, outsourcing_fee, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
                  [itemId, p.name, p.is_outsourced ? 1 : 0, p.outsourcing_fee || 0, p.status || 'pending', index]
                );
              }
            }
          }
        }
      }

      // Calculate and update order status
      const [allItems] = await connection.execute("SELECT status FROM order_items WHERE order_id = ?", [id]);
      const orderStatus = calculateStatus(allItems as any[], `Order ${id} Patch`);
      logStatus(`Order ${id} patched. New status: ${orderStatus}`);
      await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [orderStatus, id]);

      await connection.commit();
      res.json({ success: true });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  });

  app.patch("/api/order-items/:itemId", async (req, res) => {
    const { itemId } = req.params;
    const { status } = req.body;

    if (status) {
      await pool.execute("UPDATE order_items SET status = ? WHERE id = ?", [status, Number(itemId)]);

      // Auto-update order status
      const [itemRows] = await pool.execute("SELECT order_id FROM order_items WHERE id = ?", [Number(itemId)]) as [any[], any];
      if (itemRows.length > 0 && itemRows[0].order_id) {
        const orderId = itemRows[0].order_id;
        const [itemsInOrder] = await pool.execute("SELECT status FROM order_items WHERE order_id = ?", [Number(orderId)]);
        const newOrderStatus = calculateStatus(itemsInOrder as any[], `Order ${orderId} (Item ${itemId} update)`);
        logStatus(`Item ${itemId} status manual update. Order ${orderId} new status: ${newOrderStatus}`);
        await pool.execute("UPDATE orders SET status = ? WHERE id = ?", [newOrderStatus, Number(orderId)]);
      }
    }

    res.json({ success: true });
  });

  app.patch("/api/order-items/:itemId/processes/:processId", async (req, res) => {
    const { itemId, processId } = req.params;
    const { status, is_outsourced, outsourcing_fee } = req.body;

    let query = "UPDATE order_processes SET ";
    const params: any[] = [];
    const updates: string[] = [];

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

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      logStatus(`Process ${processId} updated to ${status}. Re-calculating Item ${itemId}`);
      await connection.execute(query, params);
      logStatus(`Update Process OK`);

      const [allProcesses] = await connection.execute("SELECT id, status FROM order_processes WHERE order_item_id = ?", [Number(itemId)]);
      const newItemStatus = calculateStatus(allProcesses as any[], `Item ${itemId}`);
      await connection.execute("UPDATE order_items SET status = ? WHERE id = ?", [newItemStatus, Number(itemId)]);
      logStatus(`Update Item ${itemId} to ${newItemStatus}`);

      const [itemRows] = await connection.execute("SELECT order_id FROM order_items WHERE id = ?", [Number(itemId)]) as [any[], any];
      if (itemRows.length > 0 && itemRows[0].order_id) {
        const orderId = itemRows[0].order_id;
        const [itemsInOrder] = await connection.execute("SELECT id, status FROM order_items WHERE order_id = ?", [Number(orderId)]);
        const newOrderStatus = calculateStatus(itemsInOrder as any[], `Order ${orderId}`);
        logStatus(`Updating Order ${orderId} to ${newOrderStatus}`);
        await connection.execute("UPDATE orders SET status = ? WHERE id = ?", [newOrderStatus, Number(orderId)]);
      } else {
        logStatus(`WARNING: Could not find order_id for Item ${itemId}`);
      }

      await connection.commit();
      logStatus("Transaction committed successfully");
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    res.json({ success: true });
  });

  // Materials
  app.get("/api/materials", async (req, res) => {
    const [rows] = await pool.execute("SELECT * FROM materials");
    res.json(rows);
  });

  app.post("/api/materials", async (req, res) => {
    const { name, spec, quantity, unit } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO materials (name, spec, quantity, unit) VALUES (?, ?, ?, ?)",
      [name, spec, quantity, unit]
    ) as [mysql.ResultSetHeader, any];
    res.json({ id: result.insertId });
  });

  // Remnants
  app.get("/api/remnants", async (req, res) => {
    const [rows] = await pool.execute(`
      SELECT remnants.*, materials.name as material_name
      FROM remnants
      JOIN materials ON remnants.material_id = materials.id
    `);
    res.json(rows);
  });

  app.post("/api/remnants", async (req, res) => {
    const { material_id, dimensions, photo_data, notes } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO remnants (material_id, dimensions, photo_data, notes) VALUES (?, ?, ?, ?)",
      [material_id, dimensions, photo_data, notes]
    ) as [mysql.ResultSetHeader, any];
    res.json({ id: result.insertId });
  });

  // Finance / Reconciliation
  app.get("/api/finance/reconciliation", async (req, res) => {
    const [rows] = await pool.execute(`
      SELECT
        DATE_FORMAT(orders.due_date, '%Y-%m') as month,
        SUM(order_items.total_price) as total_amount,
        COUNT(DISTINCT orders.id) as order_count,
        SUM(CASE WHEN order_items.status = 'delivered' THEN order_items.total_price ELSE 0 END) as delivered_amount
      FROM orders
      JOIN order_items ON orders.id = order_items.order_id
      GROUP BY month
      ORDER BY month DESC
    `);
    res.json(rows);
  });

  // Advent Rules
  app.get("/api/advent-rules", async (req, res) => {
    const { name } = req.query;
    let query = "SELECT * FROM advent_rules";
    const params: any[] = [];

    if (name) {
      query += " WHERE name LIKE ?";
      params.push(`%${name}%`);
    }

    query += " ORDER BY created_at DESC";
    const [rows] = await pool.execute(query, params);
    res.json(rows);
  });

  app.post("/api/advent-rules", async (req, res) => {
    const { name, description, formula, target_status, scopeType, ruleType } = req.body;
    const [result] = await pool.execute(
      "INSERT INTO advent_rules (name, description, formula, target_status, scopeType, ruleType) VALUES (?, ?, ?, ?, ?, ?)",
      [name, description, formula, target_status || 'pending', scopeType || 'general', ruleType || 'imminent']
    ) as [mysql.ResultSetHeader, any];
    res.json({ id: result.insertId });
  });

  app.patch("/api/advent-rules/:id", async (req, res) => {
    const { id } = req.params;
    const { name, description, formula, target_status, scopeType, ruleType } = req.body;
    await pool.execute(
      "UPDATE advent_rules SET name = ?, description = ?, formula = ?, target_status = ?, scopeType = ?, ruleType = ? WHERE id = ?",
      [name, description, formula, target_status, scopeType, ruleType, id]
    );
    res.json({ success: true });
  });

  app.delete("/api/advent-rules/:id", async (req, res) => {
    const { id } = req.params;
    await pool.execute("DELETE FROM advent_rules WHERE id = ?", [id]);
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

startServer().catch(console.error);
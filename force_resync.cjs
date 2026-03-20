const Database = require('better-sqlite3');
const db = new Database('erp.db');

function calculateStatus(subItems) {
  if (!subItems || subItems.length === 0) return 'pending';
  if (subItems.every(s => s.status === 'completed' || s.status === 'delivered')) return 'completed';
  if (subItems.some(s => s.status === 'processing')) return 'processing';
  if (subItems.every(s => s.status === 'pending')) return 'pending';
  return 'processing';
}

db.transaction(() => {
  // FORCE FIX for ORD-20240311-002 based on user report
  const order2 = db.prepare("SELECT id FROM orders WHERE order_number = ?").get('ORD-20240311-002');
  if (order2) {
    const itemIds = db.prepare("SELECT id FROM order_items WHERE order_id = ?").all(order2.id).map(i => i.id);
    for (const itemId of itemIds) {
      db.prepare("UPDATE order_processes SET status = 'completed' WHERE order_item_id = ?").run(itemId);
    }
    console.log(`Force set processes for ${order2.id} to completed.`);
  }

  // Resync everything
  const items = db.prepare("SELECT id FROM order_items").all();
  for (const item of items) {
    const processes = db.prepare("SELECT status FROM order_processes WHERE order_item_id = ?").all(item.id);
    const newStatus = calculateStatus(processes);
    db.prepare("UPDATE order_items SET status = ? WHERE id = ?").run(newStatus, item.id);
  }

  const orders = db.prepare("SELECT id FROM orders").all();
  for (const order of orders) {
    const itemsInOrder = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(order.id);
    const newStatus = calculateStatus(itemsInOrder);
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newStatus, order.id);
  }
})();

console.log("Database resync complete.");

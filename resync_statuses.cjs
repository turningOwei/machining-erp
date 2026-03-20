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
  // 1. Resync Items from Processes
  const items = db.prepare("SELECT id FROM order_items").all();
  for (const item of items) {
    const processes = db.prepare("SELECT status FROM order_processes WHERE order_item_id = ?").all(item.id);
    const newStatus = calculateStatus(processes);
    db.prepare("UPDATE order_items SET status = ? WHERE id = ?").run(newStatus, item.id);
    console.log(`Updated Item ${item.id} to ${newStatus}`);
  }

  // 2. Resync Orders from Items
  const orders = db.prepare("SELECT id, order_number FROM orders").all();
  for (const order of orders) {
    const itemsInOrder = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(order.id);
    const newStatus = calculateStatus(itemsInOrder);
    db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(newStatus, order.id);
    console.log(`Updated Order ${order.order_number} (id ${order.id}) to ${newStatus}`);
  }
})();

console.log("Resync complete.");

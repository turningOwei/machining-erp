const Database = require('better-sqlite3');
const db = new Database('erp.db');

const order = db.prepare("SELECT id, order_number, status FROM orders WHERE order_number = ?").get('ORD-20240311-002');
console.log("ORDER INFO:", JSON.stringify(order));

if (order) {
  const items = db.prepare("SELECT id, order_id, status FROM order_items WHERE order_id = ?").all(order.id);
  console.log("ITEMS INFO:", JSON.stringify(items));
  
  for (const item of items) {
    const processes = db.prepare("SELECT id, order_item_id, status FROM order_processes WHERE order_item_id = ?").all(item.id);
    console.log(`PROCESSES FOR ITEM ${item.id}:`, JSON.stringify(processes));
  }
}

// Test calculation logic with actual data
function calculateStatus(subItems) {
  if (!subItems || subItems.length === 0) return 'pending';
  if (subItems.every(s => s.status === 'completed' || s.status === 'delivered')) return 'completed';
  if (subItems.some(s => s.status === 'processing')) return 'processing';
  if (subItems.every(s => s.status === 'pending')) return 'pending';
  return 'processing';
}

if (order) {
  const items = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(order.id);
  const result = calculateStatus(items);
  console.log("CALCULATION TEST RESULT FOR ORDER:", result);
}

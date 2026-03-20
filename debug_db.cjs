const Database = require('better-sqlite3');
const db = new Database('erp.db');

const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get('ORD-20240311-002');
if (!order) {
  console.log("Order not found");
} else {
  console.log("Order:", order);
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  console.log("Items:", items);
  for (const item of items) {
    const processes = db.prepare("SELECT * FROM order_processes WHERE order_item_id = ?").all(item.id);
    console.log(`Processes for Item ${item.id}:`, processes);
  }
}

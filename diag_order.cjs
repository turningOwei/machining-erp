const Database = require('better-sqlite3');
const db = new Database('erp.db');

const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get('ORD-20240311-002');
console.log("ORDER:", order);

if (order) {
  const items = db.prepare("SELECT id, part_name, status FROM order_items WHERE order_id = ?").all(order.id);
  console.log("ITEMS:", items);
  
  for (const item of items) {
    const processes = db.prepare("SELECT id, name, status FROM order_processes WHERE order_item_id = ?").all(item.id);
    console.log(`PROCESSES for Item ${item.id} (${item.part_name}):`, processes);
  }
}

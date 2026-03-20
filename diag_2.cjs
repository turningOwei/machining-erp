const Database = require('better-sqlite3');
const db = new Database('erp.db');
const order = db.prepare("SELECT * FROM orders WHERE order_number = 'ORD-20240311-002'").get();
if (order) {
  console.log("ORDER:", order);
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  for (const item of items) {
    console.log(`ITEM ${item.id} (${item.part_name}) status: ${item.status}`);
    const procs = db.prepare("SELECT id, status FROM order_processes WHERE order_item_id = ?").all(item.id);
    console.log("PROCS:", procs);
  }
}
function calc(items) {
  if (!items.length) return 'pending';
  const st = items.map(i => i.status);
  if (st.every(s => s === 'completed' || s === 'delivered')) return 'completed';
  if (st.every(s => s === 'pending')) return 'pending';
  return 'processing';
}
if (order) {
  const items = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(order.id);
  console.log("CALC:", calc(items));
}

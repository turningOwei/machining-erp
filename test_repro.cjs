const Database = require('better-sqlite3');
const db = new Database('erp.db');
function calculateStatus(subItems) {
  if (!subItems || subItems.length === 0) return 'pending';
  const statuses = subItems.map(s => s.status || 'pending');
  if (statuses.every(s => s === 'completed' || s === 'delivered')) return 'completed';
  if (statuses.every(s => s === 'pending')) return 'pending';
  return 'processing';
}
db.transaction(() => {
  db.prepare("UPDATE order_processes SET status = 'completed' WHERE id = 4").run();
  db.prepare("UPDATE order_processes SET status = 'completed' WHERE id = 5").run();
  const allProcs = db.prepare("SELECT status FROM order_processes WHERE order_item_id = 2").all();
  const itemStatus = calculateStatus(allProcs);
  db.prepare("UPDATE order_items SET status = ? WHERE id = 2").run(itemStatus);
  console.log("ITEM 2 STATUS:", itemStatus);
  const itemRow = db.prepare("SELECT order_id FROM order_items WHERE id = 2").get();
  const itemsInOrder = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(itemRow.order_id);
  const orderStatus = calculateStatus(itemsInOrder);
  db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(orderStatus, itemRow.order_id);
  console.log("ORDER STATUS:", orderStatus);
})();
const final = db.prepare("SELECT status FROM orders WHERE id = 2").get();
console.log("FINAL DB STATUS:", final.status);

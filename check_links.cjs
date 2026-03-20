const Database = require('better-sqlite3');
const db = new Database('erp.db');
const item2Procs = db.prepare("SELECT id, order_item_id FROM order_processes WHERE order_item_id = 2").all();
console.log("PROCS WITH order_item_id=2:", item2Procs);
const allOrder2Procs = db.prepare(`
  SELECT p.id, p.order_item_id, i.part_name 
  FROM order_processes p 
  JOIN order_items i ON p.order_item_id = i.id 
  WHERE i.order_id = 2
`).all();
console.log("ALL PROCS FOR ORDER 2 ITEMS:", allOrder2Procs);

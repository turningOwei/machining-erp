const Database = require('better-sqlite3');
const db = new Database('erp.db');

const duplicates = db.prepare(`
  SELECT order_number, COUNT(*) as cnt 
  FROM orders 
  GROUP BY order_number 
  HAVING cnt > 1
`).all();

console.log("DUPLICATE ORDER NUMBERS:", JSON.stringify(duplicates));

const allOrders = db.prepare("SELECT id, order_number, status FROM orders").all();
console.log("ALL ORDERS:", JSON.stringify(allOrders));

const Database = require('better-sqlite3');
const db = new Database('erp.db');
const item = db.prepare("SELECT status FROM order_items WHERE id = 2").get();
console.log(`ITEM STATUS: |${item.status}|`);
const proc = db.prepare("SELECT status FROM order_processes WHERE id = 4").get();
console.log(`PROC STATUS: |${proc.status}|`);
const order = db.prepare("SELECT status FROM orders WHERE id = 2").get();
console.log(`ORDER STATUS: |${order.status}|`);

const Database = require('better-sqlite3');
const db = new Database('erp.db');

function calculateStatusVerbose(subItems, label) {
  if (!subItems || subItems.length === 0) {
    console.log(`[${label}] No items, returning pending`);
    return 'pending';
  }
  
  console.log(`[${label}] Input:`, JSON.stringify(subItems.map(s => s.status)));
  
  const allComp = subItems.every(s => {
    const match = (s.status === 'completed' || s.status === 'delivered');
    // console.log(`  Checking status "${s.status}": ${match}`);
    return match;
  });
  
  if (allComp) {
    console.log(`[${label}] Returning completed`);
    return 'completed';
  }
  
  if (subItems.some(s => s.status === 'processing')) {
    console.log(`[${label}] Returning processing`);
    return 'processing';
  }
  
  if (subItems.every(s => s.status === 'pending')) {
    console.log(`[${label}] Returning pending`);
    return 'pending';
  }
  
  console.log(`[${label}] Returning processing (mix)`);
  return 'processing';
}

db.transaction(() => {
  const item = db.prepare("SELECT * FROM order_items WHERE id = 2").get();
  const processes = db.prepare("SELECT status FROM order_processes WHERE order_item_id = ?").all(item.id);
  const newStatus = calculateStatusVerbose(processes, `Item ${item.id}`);
})();

const Database = require('better-sqlite3');
const db = new Database('erp.db');

function calculateStatus(subItems) {
  if (!subItems || subItems.length === 0) return 'pending';
  const statuses = subItems.map(s => s.status);
  if (statuses.every(s => s === 'completed' || s === 'delivered')) return 'completed';
  if (statuses.some(s => s === 'processing')) return 'processing';
  if (statuses.every(s => s === 'pending')) return 'pending';
  return 'processing';
}

// Test Case 1: One processing, others pending/completed -> should be processing
const items1 = [
  { status: 'processing' },
  { status: 'pending' },
  { status: 'completed' }
];
console.log("Test 1 (One processing):", calculateStatus(items1)); // Expected: processing

// Test Case 2: All pending -> should be pending
const items2 = [
  { status: 'pending' },
  { status: 'pending' }
];
console.log("Test 2 (All pending):", calculateStatus(items2)); // Expected: pending

// Test Case 3: All completed -> should be completed
const items3 = [
  { status: 'completed' },
  { status: 'delivered' }
];
console.log("Test 3 (All completed/delivered):", calculateStatus(items3)); // Expected: completed

// Test Case 4: Mix of pending and completed, none processing -> should be processing (started)
const items4 = [
  { status: 'pending' },
  { status: 'completed' }
];
console.log("Test 4 (Mix pending/completed):", calculateStatus(items4)); // Expected: processing

// Verify DB structure
const order = db.prepare("SELECT * FROM orders LIMIT 1").get();
if (order) {
  const items = db.prepare("SELECT status FROM order_items WHERE order_id = ?").all(order.id);
  console.log(`Order ${order.order_number} actual items in DB:`, items);
  console.log("Calculated status:", calculateStatus(items));
}

import { authFetch } from '../components/shared';
import { Order } from '../types';

// Order filters interface
export interface OrderFilters {
  dueDateStart?: string;
  dueDateEnd?: string;
  orderNumber?: string;
  partNumber?: string;
  partName?: string;
  customerName?: string;
  priority?: string;
  status?: string;
}

// Fetch orders with optional filters (API call)
export const fetchOrders = async (filters?: OrderFilters): Promise<Order[]> => {
  const params = new URLSearchParams();
  if (filters?.dueDateStart) params.set('dueDateStart', filters.dueDateStart);
  if (filters?.dueDateEnd) params.set('dueDateEnd', filters.dueDateEnd);
  if (filters?.orderNumber) params.set('orderNumber', filters.orderNumber);
  if (filters?.partNumber) params.set('partNumber', filters.partNumber);
  if (filters?.partName) params.set('partName', filters.partName);
  if (filters?.customerName) params.set('customerName', filters.customerName);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.status) params.set('status', filters.status);

  const queryString = params.toString();
  const url = `/api/platform/orders${queryString ? '?' + queryString : ''}`;

  const response = await authFetch(url);
  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

// Filter orders locally (client-side filtering)
export const filterOrdersLocal = (
  orders: Order[],
  filters: OrderFilters,
  getOrderMaxDueDate: (order: Order) => string
): Order[] => {
  return orders.filter(o => {
    const maxDueDate = getOrderMaxDueDate(o);
    const matchDueDateStart = !filters.dueDateStart || maxDueDate >= filters.dueDateStart;
    const matchDueDateEnd = !filters.dueDateEnd || maxDueDate <= filters.dueDateEnd;
    const matchOrderNumber = !filters.orderNumber || filters.orderNumber.trim() === '' || String(o.order_number || o.id).toLowerCase().includes(filters.orderNumber.toLowerCase());
    const matchCustomer = !filters.customerName || filters.customerName.trim() === '' || o.customer_name.toLowerCase().includes(filters.customerName.toLowerCase());
    const matchPriority = !filters.priority || filters.priority === '' || o.priority === filters.priority;
    const matchPartNumber = !filters.partNumber || filters.partNumber.trim() === '' || (o.items || []).some(item => (item.part_number || '').toLowerCase().includes(filters.partNumber.toLowerCase()));
    const matchPartName = !filters.partName || filters.partName.trim() === '' || (o.items || []).some(item => (item.part_name || '').toLowerCase().includes(filters.partName.toLowerCase()));
    const matchStatus = !filters.status || filters.status === '' || o.status === filters.status;

    return matchDueDateStart && matchDueDateEnd && matchOrderNumber && matchCustomer && matchPriority && matchPartNumber && matchPartName && matchStatus;
  });
};

// Delete order by ID (API call)
export const deleteOrder = async (orderId: number): Promise<boolean> => {
  const response = await authFetch(`/api/platform/orders/${orderId}`, {
    method: 'DELETE'
  });
  if (response.ok) {
    return true;
  } else {
    const data = await response.json();
    throw new Error(data.error || '删除失败');
  }
};

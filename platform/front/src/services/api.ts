import { authFetch } from '../components/shared';
import { Order, Customer, Material, Remnant, AdventRule } from '../types';

// 获取订单数据
export const fetchOrdersApi = async (): Promise<Order[]> => {
  const res = await authFetch('/api/platform/orders');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取客户数据
export const fetchCustomersApi = async (): Promise<Customer[]> => {
  const res = await authFetch('/api/platform/customers');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取物料数据
export const fetchMaterialsApi = async (): Promise<Material[]> => {
  const res = await authFetch('/api/platform/materials');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取余料数据
export const fetchRemnantsApi = async (): Promise<Remnant[]> => {
  const res = await authFetch('/api/platform/remnants');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取财务数据
export const fetchFinanceApi = async (): Promise<any[]> => {
  const res = await authFetch('/api/platform/finance/reconciliation');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取规则数据
export const fetchRulesApi = async (filters?: { name?: string }): Promise<AdventRule[]> => {
  const qs = filters ? new URLSearchParams(filters as Record<string, string>).toString() : '';
  const url = qs ? `/api/platform/advent-rules?${qs}` : '/api/platform/advent-rules';
  const res = await authFetch(url);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取工作看板数据（订单 + 规则）
export const fetchDashboardDataApi = async (): Promise<{ orders: Order[]; rules: AdventRule[] }> => {
  const [ordersRes, rulesRes] = await Promise.all([
    authFetch('/api/platform/orders'),
    authFetch('/api/platform/advent-rules')
  ]);

  const ordersData = await ordersRes.json();
  const rulesData = await rulesRes.json();

  return {
    orders: Array.isArray(ordersData) ? ordersData : [],
    rules: Array.isArray(rulesData) ? rulesData : []
  };
};

// 工作看板零件数据类型
export interface DashboardItem {
  order_id: number;
  order_number: string;
  customer_short_name: string;
  priority: string;
  item_id: number;
  part_name: string;
  part_number: string;
  quantity: number;
  status: 'pending' | 'processing' | 'completed' | 'delivered';
  start_date: string | null;
  due_date: string | null;
  drawing_data: string;
  processes: Array<{
    id: number;
    order_item_id: number;
    name: string;
    is_outsourced: boolean;
    outsourcing_fee: number;
    status: 'pending' | 'processing' | 'completed';
    sort_order: number;
  }>;
}

// 获取工作看板零件数据
export const fetchDashboardItemsApi = async (): Promise<DashboardItem[]> => {
  const res = await authFetch('/api/platform/dashboard/items');
  const data = await res.json();
  return Array.isArray(data) ? data : [];
};

// 获取库存数据（物料 + 余料）
export const fetchInventoryDataApi = async (): Promise<{ materials: Material[]; remnants: Remnant[] }> => {
  const [materialsRes, remnantsRes] = await Promise.all([
    authFetch('/api/platform/materials'),
    authFetch('/api/platform/remnants')
  ]);

  const materialsData = await materialsRes.json();
  const remnantsData = await remnantsRes.json();

  return {
    materials: Array.isArray(materialsData) ? materialsData : [],
    remnants: Array.isArray(remnantsData) ? remnantsData : []
  };
};

// 创建订单
export const createOrderApi = async (order: Partial<Order>): Promise<void> => {
  const response = await authFetch('/api/platform/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

// 更新订单
export const updateOrderApi = async (id: number, order: Partial<Order>): Promise<void> => {
  const response = await authFetch(`/api/platform/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(order)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

// 删除订单
export const deleteOrderApi = async (id: number): Promise<void> => {
  const response = await authFetch(`/api/platform/orders/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('删除订单失败');
  }
};

// 更新工序状态
export const updateProcessStatusApi = async (itemId: number, processId: number, status: string): Promise<void> => {
  const response = await authFetch(`/api/platform/order-items/${itemId}/processes/${processId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }
};

// 创建客户
export const createCustomerApi = async (customer: { name: string; short_name: string; contacts: { name: string; contact: string }[] }): Promise<void> => {
  const response = await authFetch('/api/platform/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || '创建失败');
  }
};

// 更新客户
export const updateCustomerApi = async (id: number, customer: { name: string; short_name: string; contacts: { name: string; contact: string }[] }): Promise<void> => {
  const response = await authFetch(`/api/platform/customers/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customer)
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || '更新失败');
  }
};

// 删除客户
export const deleteCustomerApi = async (id: number): Promise<void> => {
  const response = await authFetch(`/api/platform/customers/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('删除客户失败');
  }
};

// 创建规则
export const createRuleApi = async (rule: any): Promise<void> => {
  const response = await authFetch('/api/platform/advent-rules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
  if (!response.ok) {
    throw new Error('创建规则失败');
  }
};

// 更新规则
export const updateRuleApi = async (id: number, rule: any): Promise<void> => {
  const response = await authFetch(`/api/platform/advent-rules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
  if (!response.ok) {
    throw new Error('更新规则失败');
  }
};

// 删除规则
export const deleteRuleApi = async (id: number): Promise<void> => {
  const response = await authFetch(`/api/platform/advent-rules/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('删除规则失败');
  }
};
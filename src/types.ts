export interface Customer {
  id: number;
  name: string;
  contact?: string;
  created_at: string;
}

export interface OrderProcess {
  id: number;
  order_id: number;
  name: string;
  is_outsourced: boolean;
  outsourcing_fee: number;
  status: 'pending' | 'processing' | 'completed';
  sort_order: number;
}

export interface OrderItem {
  id: number;
  order_id: number;
  part_name: string;
  part_number?: string;
  quantity: number;
  scrap_quantity?: number;
  unit_price: number;
  total_price: number;
  status: 'pending' | 'processing' | 'completed' | 'delivered';
  drawing_data?: string;
  notes?: string;
  processes?: OrderProcess[];
  completion_date?: string;
  start_date?: string;
  due_date?: string;
  delivered_quantity?: number;
  tool_cost?: number;
  fixture_cost?: number;
  material_cost?: number;
  other_cost?: number;
  item_notes?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  customer_name?: string;
  order_number?: string;
  status: 'pending' | 'processing' | 'completed' | 'delivered';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  due_date: string;
  notes?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface Material {
  id: number;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
}

export interface Remnant {
  id: number;
  material_id: number;
  material_name?: string;
  dimensions: string;
  photo_data?: string;
  notes?: string;
  created_at: string;
}

export interface Reconciliation {
  month: string;
  total_amount: number;
  order_count: number;
  delivered_amount: number;
}

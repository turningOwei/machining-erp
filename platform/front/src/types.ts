export interface Contact {
  id?: number;
  corp_id?: number;
  name: string;
  contact: string;
}

export interface Customer {
  id?: number;
  corp_id?: number;
  name: string;
  short_name: string;
  contacts: Contact[];
  created_at?: string;
}

export interface OrderProcess {
  id?: number;
  corp_id?: number;
  order_item_id?: number;
  name: string;
  is_outsourced: boolean;
  outsourcing_fee: number;
  status: 'pending' | 'processing' | 'completed';
  sort_order?: number;
}

export interface OrderItem {
  id?: number;
  corp_id?: number;
  order_id?: number;
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
  id?: number;
  corp_id?: number;
  customer_id?: number;
  customer_name?: string;
  customer_short_name?: string;
  order_number?: string;
  order_name?: string;
  contact_id?: number;
  contact_name?: string;
  status: 'pending' | 'processing' | 'completed' | 'delivered';
  priority: 'low' | 'medium' | 'high';
  start_date?: string;
  due_date: string;
  total_amount?: number;
  notes?: string;
  created_at?: string;
  items?: OrderItem[];
}

export interface Material {
  id?: number;
  corp_id?: number;
  name: string;
  spec: string;
  quantity: number;
  unit: string;
}

export interface Remnant {
  id?: number;
  corp_id?: number;
  material_id?: number;
  material_name?: string;
  dimensions: string;
  photo_data?: string;
  notes?: string;
  created_at?: string;
}

export interface Reconciliation {
  month: string;
  total_amount: number;
  order_count: number;
  delivered_amount: number;
}

export interface AdventRule {
  id?: number;
  corp_id?: number;
  name: string;
  description?: string;
  formula: string;
  target_status: 'pending' | 'processing' | 'completed';
  scopeType: 'general' | 'specific';
  ruleType: 'warning' | 'imminent';
}

export interface User {
  id?: number;
  corp_id?: number;
  role_id?: number;
  role_type?: 'admin' | 'user';
  role?: Role;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  expired_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id?: number;
  corp_id?: number;
  name: string;
  account_type: 'admin' | 'user';
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Resource {
  id?: number;
  resource_type: string;
  resource_key: string;
  name: string;
  parent_id?: number;
  path?: string;
  icon?: string;
  sort_order?: number;
  page_resources?: PageResource[];
  platform_type?: string;
  status?: string;
  created_at?: string;
}

export interface PageResource {
  key: string;
  name: string;
  type: 'button' | 'link' | 'other';
}

export interface PrintTemplate {
  id?: number;
  corp_id?: number;
  name: string;
  menu_route?: string;
  button_key?: string;
  button_name?: string;
  preview?: string;
  created_at?: string;
  updated_at?: string;
}
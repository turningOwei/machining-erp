import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  CircleDollarSign,
  Plus,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  User,
  Users,
  Settings,
  Menu,
  X,
  TrendingUp,
  Sparkles,
  Download,
  Eye,
  Trash2,
  GripVertical,
  Settings2,
  Link as LinkIcon,
  RefreshCw,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Order, OrderItem, OrderProcess, Customer, Material, Remnant, Reconciliation } from './types';
import LoginPage from './LoginPage';
import OrderMonitorPanel from './components/OrderMonitorPanel';
import Orders from './pages/Orders';
import Dashboard from './pages/Dashboard';
import Overdue from './pages/Overdue';
import Warning from './pages/Warning';
import Imminent from './pages/Imminent';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Rules from './pages/Rules';

// Helper to format date to YYYY-MM-DD
const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-';
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // ISO string format
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  // Add timezone offset to get correct local date
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date for form input (returns empty string instead of '-')
const formatDateForInput = (date: string | null | undefined): string => {
  if (!date) return '';
  // Already in correct format
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  // ISO string format
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  // Add timezone offset to get correct local date
  d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper for authorized fetch
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('auth_token');
  const headers: HeadersInit = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
};

// --- AI Service ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

// --- Components ---
// ... (StatusBadge and PriorityBadge remain the same)

const PROCESS_OPTIONS = ['下料', '车削', '铣削', '磨削', '线切割', '电火花', '热处理', '表面处理', '送货'];

const PROCESS_COLORS: Record<string, string> = {
  '下料': 'bg-orange-100 text-orange-700 border-orange-200',
  '车削': 'bg-blue-100 text-blue-700 border-blue-200',
  '铣削': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '磨削': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '线切割': 'bg-purple-100 text-purple-700 border-purple-200',
  '电火花': 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  '热处理': 'bg-rose-100 text-rose-700 border-rose-200',
  '表面处理': 'bg-emerald-100 text-emerald-700 border-emerald-100',
  '送货': 'bg-zinc-100 text-zinc-700 border-zinc-200',
};

const ProcessStatusBadge = ({ status }: { status: 'pending' | 'processing' | 'completed' }) => {
  const styles = {
    pending: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    processing: 'bg-blue-50 text-blue-600 border-blue-100',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  const labels = {
    pending: '待加工',
    processing: '加工中',
    completed: '已完成',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

const StatusBadge = ({ status, onUpdate }: { status: Order['status'], onUpdate?: (newStatus: Order['status']) => void }) => {
  const styles = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    processing: 'bg-blue-100 text-blue-700 border-blue-200',
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    delivered: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  };
  const labels = {
    pending: '待加工',
    processing: '加工中',
    completed: '已完成',
    delivered: '已送货',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!onUpdate) return;
    e.stopPropagation();
    
    // Cycle logic: pending -> processing -> completed -> pending
    const cycle: Order['status'][] = ['pending', 'processing', 'completed'];
    const currentIndex = cycle.indexOf(status);
    const nextStatus = currentIndex === -1 ? 'pending' : cycle[(currentIndex + 1) % cycle.length];
    
    onUpdate(nextStatus);
  };

  return (
    <button 
      type="button"
      disabled={!onUpdate}
      onClick={handleClick}
      className={`px-3 py-1 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${onUpdate ? 'active:scale-95 hover:brightness-95' : 'cursor-default'} ${styles[status] || styles.pending}`}
    >
      {labels[status] || labels.pending}
    </button>
  );
};

const ProcessCell = ({ 
  processes, 
  onUpdate 
}: { 
  processes: any[], 
  onUpdate: (processes: any[]) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const addProcess = (name: string) => {
    if (!name.trim()) return;
    const newProcesses = [...processes, { name: name.trim(), is_outsourced: false, outsourcing_fee: 0, status: 'pending' }];
    onUpdate(newProcesses);
    setManualInput('');
  };

  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 text-left bg-zinc-50 border border-zinc-100 rounded-lg hover:bg-zinc-100 transition-colors flex items-center justify-between gap-1 min-w-[100px]"
      >
        <span className="truncate text-[10px] font-medium text-zinc-600">
          {processes.length > 0 ? processes.map(p => p.name).join('、') : '点击添加工序'}
        </span>
        <Plus className="w-3 h-3 text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-zinc-900/20 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white border border-zinc-200 rounded-3xl shadow-2xl p-8 min-w-[800px] max-w-[95vw] space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-900" />
                <h5 className="text-xl font-bold text-zinc-900 uppercase tracking-tight">工序流程管理</h5>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {PROCESS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => addProcess(opt)}
                  className={`px-3 py-1.5 rounded text-sm font-bold transition-all hover:scale-105 ${PROCESS_COLORS[opt] || 'bg-zinc-100 text-zinc-600'}`}
                >
                  + {opt}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-4 border-l border-zinc-200 pl-4">
                <input
                  type="text"
                  placeholder="手动录入工序..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProcess(manualInput);
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-sm outline-none focus:ring-2 focus:ring-zinc-900 w-48"
                />
                <button
                  type="button"
                  onClick={() => addProcess(manualInput)}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded text-sm font-bold hover:bg-zinc-800 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {processes.map((p, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className={`text-base font-bold px-3 py-1 rounded w-32 text-center ${PROCESS_COLORS[p.name] || 'bg-zinc-200 text-zinc-700'}`}>{p.name}</span>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded border border-zinc-200">
                    <input 
                      type="checkbox" 
                      checked={p.is_outsourced}
                      onChange={e => {
                        const newProcesses = [...processes];
                        newProcesses[idx] = { ...newProcesses[idx], is_outsourced: e.target.checked };
                        onUpdate(newProcesses);
                      }}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-700">是否外协</span>
                  </label>
                  {p.is_outsourced && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-400">¥</span>
                      <input 
                        type="number" 
                        placeholder="外协费用"
                        value={p.outsourcing_fee || ''}
                        onChange={e => {
                          const newProcesses = [...processes];
                          newProcesses[idx] = { ...newProcesses[idx], outsourcing_fee: parseFloat(e.target.value) };
                          onUpdate(newProcesses);
                        }}
                        className="w-24 px-2 py-1 bg-white border border-zinc-200 rounded text-sm outline-none font-medium"
                      />
                    </div>
                  )}
                  <div className="flex-1" />
                  <select
                    value={p.status || 'pending'}
                    onChange={e => {
                      const newProcesses = [...processes];
                      newProcesses[idx] = { ...newProcesses[idx], status: e.target.value as any };
                      onUpdate(newProcesses);
                    }}
                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                  >
                    <option value="pending">待加工</option>
                    <option value="processing">加工中</option>
                    <option value="completed">已完成</option>
                  </select>
                  <button 
                    type="button"
                    onClick={() => {
                      const newProcesses = [...processes];
                      newProcesses.splice(idx, 1);
                      onUpdate(newProcesses);
                    }}
                    className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {processes.length === 0 && (
                <div className="text-center py-12 text-sm text-zinc-400 italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  暂无工序，请从上方选择并添加?                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const PriorityBadge = ({ priority }: { priority: Order['priority'] }) => {
  const styles = {
    high: 'text-rose-600',
    medium: 'text-amber-600',
    low: 'text-zinc-500',
  };
  const labels = {
    high: '紧急',
    medium: '普通',
    low: '较低',
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wider ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

// --- Main App ---

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<{ username: string } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');

      if (token && userStr) {
        try {
          const res = await fetch('/api/platform/auth/status', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();

          if (data.authenticated) {
            setIsAuthenticated(true);
            setAuthUser(JSON.parse(userStr));
          } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        } catch (e) {
          // Network error, try to use stored credentials
          setIsAuthenticated(true);
          setAuthUser(JSON.parse(userStr));
        }
      }
      setAuthChecking(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (token: string, user: { username: string }) => {
    setIsAuthenticated(true);
    setAuthUser(user);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('auth_token');
    try {
      await fetch('/api/platform/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      // Ignore
    }
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setIsAuthenticated(false);
    setAuthUser(null);
  };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'finance' | 'overdue' | 'warning_orders' | 'imminent_orders' | 'advent_rules' | 'customers'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [adventRules, setAdventRules] = useState<any[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleFilters, setRuleFilters] = useState({ name: '' });
  const [ruleForm, setRuleForm] = useState({ 
    name: '', 
    description: '', 
    formula: '', 
    target_status: 'pending',
    scopeType: 'general',
    ruleType: 'imminent'
  });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [showOrderFilters, setShowOrderFilters] = useState(false);

  // Check for unique general rules
  useEffect(() => {
    if (showRuleModal && ruleForm.scopeType === 'general') {
      const isDuplicate = adventRules.some(rule => 
        rule.scopeType === 'general' && 
        rule.ruleType === ruleForm.ruleType && 
        rule.id !== editingRuleId
      );
      if (isDuplicate) {
        setRuleError(`系统中已存在通用或{ruleForm.ruleType === 'warning' ? '告警' : '临期'}规则`);
      } else {
        setRuleError(null);
      }
    } else {
      setRuleError(null);
    }
  }, [ruleForm.scopeType, ruleForm.ruleType, adventRules, showRuleModal, editingRuleId]);
  
  // Clear submit error when formula or modal changes
  useEffect(() => {
    setSubmitError(null);
  }, [ruleForm.formula, showRuleModal]);

  // Formula Preview State
  const [previewValues, setPreviewValues] = useState<{
    deliveryDate: string;
    orderDate: string;
    partStatus: 'pending' | 'processing' | 'completed';
  }>({
    deliveryDate: new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0], // +7 days
    orderDate: new Date().toISOString().split('T')[0],
    partStatus: 'pending'
  });

  const calculatePreviewResult = (formula: string, target_status: string = 'pending') => {
    if (!formula) return '无公式';
    try {
      // 1. Check status first
      if (previewValues.partStatus !== target_status) {
        return '不触发(状态不匹配)';
      }

      // 2. Replace variables with numerical values
      const d = (dateStr: string) => Math.floor(new Date(dateStr).getTime() / (86400000));
      const today = Math.floor(new Date().getTime() / (86400000));
      
      let processedFormula = formula
        .replace(/{交货日期}/g, d(previewValues.deliveryDate).toString())
        .replace(/{订单日期}/g, d(previewValues.orderDate).toString())
        .replace(/{当天}/g, today.toString());

      // 3. Safe evaluation
      const result = new Function(`return ${processedFormula}`)();
      return typeof result === 'boolean' ? (result ? '成立 (True)' : '不成立 (False)') : result;
    } catch (e) {
      return '计算错误 (公式不完整或语法有误)';
    }
  };


  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [overduePage, setOverduePage] = useState(1);
  const [overduePageSize, setOverduePageSize] = useState(10);
  const [overdueFilters, setOverdueFilters] = useState({
    dueDate: '',
    orderNumber: '',
    partNumber: '',
    customerName: '',
    priority: ''
  });
  const [warningPage, setWarningPage] = useState(1);
  const [warningPageSize, setWarningPageSize] = useState(10);
  const [warningFilters, setWarningFilters] = useState({
    dueDate: '',
    orderNumber: '',
    partNumber: '',
    customerName: '',
    priority: ''
  });
  const [imminentPage, setImminentPage] = useState(1);
  const [imminentPageSize, setImminentPageSize] = useState(10);
  const [imminentFilters, setImminentFilters] = useState({
    dueDate: '',
    orderNumber: '',
    partNumber: '',
    customerName: '',
    priority: ''
  });
  // 订单管理筛选状态
  const [orderFilters, setOrderFilters] = useState({
    dueDateStart: '',
    dueDateEnd: '',
    orderNumber: '',
    partNumber: '',
    customerName: '',
    priority: '',
    status: ''
  });
  const [appliedOrderFilters, setAppliedOrderFilters] = useState({
    dueDateStart: '',
    dueDateEnd: '',
    orderNumber: '',
    partNumber: '',
    customerName: '',
    priority: '',
    status: ''
  });
  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardPageSize, setDashboardPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState<string | null>(null);

  // Customer Management
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<{ name: string; contact: string }>({ name: '', contact: '' });
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  
  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    priority: 'medium',
    status: 'pending',
    items: [{ part_name: '', quantity: 1, unit_price: 0, processes: [] }]
  });

  // 订单管理面板展开/收起状态
  const [orderMgrExpanded, setOrderMgrExpanded] = useState<Set<number>>(new Set());
  const [allOrderMgrExpanded, setAllOrderMgrExpanded] = useState(true);
  const toggleOrderMgr = (orderId: number) => {
    setOrderMgrExpanded(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };
 
  const getOrderMaxDueDate = (order: Order) => {
    let max = order.due_date || '';
    if (order.items && order.items.length > 0) {
      const dates = order.items.map(i => i.due_date).filter(Boolean);
      if (dates.length > 0) {
        max = dates.sort().reverse()[0];
      }
    }
    return max;
  };

  const checkOrderAgainstRules = (order: Order, ruleType: 'warning' | 'imminent') => {
    // Only non-delivered orders can be warning/imminent
    if (order.status === 'delivered') return false;

    const rules = adventRules.filter(r => r.ruleType === ruleType);
    if (rules.length === 0) return false;

    const maxDueDate = getOrderMaxDueDate(order);
    const todayStr = new Date().toISOString().split('T')[0];
    
    // If it's already overdue, it should go to 'overdue' panel instead of warning/imminent
    if (maxDueDate && maxDueDate < todayStr) return false;

    const orderDate = order.start_date || (order.created_at ? order.created_at.split('T')[0] : '');

    // Helper to extract days since epoch
    const d = (dateStr: string) => Math.floor(new Date(dateStr).getTime() / 86400000);
    const today = Math.floor(new Date().getTime() / 86400000);

    return rules.some(rule => {
      // 1. Check scope
      if (rule.scopeType === 'specific') {
        // For specific rules, we might need a link table, 
        // but currently we check if the rule name matches order number or customer (simulated logic)
        // or just skip for now and only handle 'general'
        if (rule.name !== order.order_number && rule.name !== order.customer_name) return false;
      }

      // 2. Check formula
      try {
        let processedFormula = rule.formula
          .replace(/{交货日期}/g, d(maxDueDate).toString())
          .replace(/{订单日期}/g, d(orderDate).toString())
          .replace(/{当天}/g, today.toString());

        const result = new Function(`return ${processedFormula}`)();
        return !!result;
      } catch (e) {
        return false;
      }
    });
  };

  const getItemStatusFromProcesses = (processes: OrderProcess[]): OrderItem['status'] => {
    if (!processes || processes.length === 0) return 'pending';
    
    const statuses = processes.map(p => p.status || 'pending');
    
    // Rule: All completed -> completed
    if (statuses.every(s => s === 'completed')) return 'completed';
    
    // Rule: All pending -> pending
    if (statuses.every(s => s === 'pending')) return 'pending';
    
    // Everything else is processing
    return 'processing';
  };

  const getOrderStatusFromItems = (items: OrderItem[]): Order['status'] => {
    if (!items || items.length === 0) return 'pending';
    
    const statuses = items.map(i => i.status || 'pending');
    
    // Rule: All completed/delivered -> completed
    if (statuses.every(s => s === 'completed' || s === 'delivered')) {
      return 'completed';
    }
    
    // Rule: All pending -> pending
    if (statuses.every(s => s === 'pending')) {
      return 'pending';
    }
    
    // Everything else is processing
    return 'processing';
  };

  const updateProcessStatus = async (itemId: number, processId: number, status: string) => {
    try {
      const response = await authFetch(`/api/platform/order-items/${itemId}/processes/${processId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }
      
      // Only fetch after success to ensure sync
      fetchData();
    } catch (err) {
      console.error("Failed to update process status:", err);
      // Revert data on error
      fetchData();
    }
  };

  const handleProcessClick = (orderId: number, itemId: number, processId: number, currentStatus: string, processName: string) => {
    const nextStatus = currentStatus === 'pending' ? 'processing' : currentStatus === 'processing' ? 'completed' : 'pending';
    
    // Local optimistic update
    setOrders(prevOrders => prevOrders.map(o => {
      if (Number(o.id) !== Number(orderId)) return o;
      if (!o.items) return o;
      
      const updatedItems = o.items.map(i => {
        if (Number(i.id) !== Number(itemId)) return i;
        if (!i.processes) return i;
        
        const updatedProcesses = i.processes.map(prevP => 
          Number(prevP.id) === Number(processId) ? { ...prevP, status: nextStatus } : prevP
        );
        return {
          ...i,
          processes: updatedProcesses,
          status: getItemStatusFromProcesses(updatedProcesses)
        };
      });
      return {
        ...o,
        items: updatedItems,
        status: getOrderStatusFromItems(updatedItems)
      };
    }));

    updateProcessStatus(itemId, processId, nextStatus);
  };

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const generateAiDrawing = async () => {
    if (!aiPrompt) return;
    
    // Check for API key
    if (!(await window.aistudio.hasSelectedApiKey())) {
      await window.aistudio.openSelectKey();
      // Proceed after selection
    }

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: [{ parts: [{ text: `A technical engineering drawing of: ${aiPrompt}. Professional, clean, white background, blueprint style.` }] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const imageUrl = `data:image/png;base64,${part.inlineData.data}`;
          setGeneratedImage(imageUrl);
          break;
        }
      }
    } catch (error) {
      console.error("AI Generation failed", error);
      if (error instanceof Error && error.message.includes("Requested entity was not found")) {
        await window.aistudio.openSelectKey();
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const fetchAdventRules = async () => {
    try {
      const qs = new URLSearchParams(ruleFilters).toString();
      const response = await authFetch(`/api/platform/advent-rules?${qs}`);
      const data = await response.json();
      setAdventRules(data);
    } catch (err) {
      console.error("Failed to fetch advent rules:", err);
    }
  };

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  const handleRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    
    // 1. Formula validation
    if (!ruleForm.formula.trim()) {
      setValidationAlert("规则公式不能为空，请组合公式");
      return;
    }
    
    const previewResult = calculatePreviewResult(ruleForm.formula, ruleForm.target_status);
    if (typeof previewResult === 'string' && previewResult.includes('计算错误')) {
      setValidationAlert("当前公式存在语法错误或计算异常，请调整后再保存");
      return;
    }

    try {
      const method = editingRuleId ? 'PATCH' : 'POST';
      const url = editingRuleId ? `/api/platform/advent-rules/${editingRuleId}` : '/api/platform/advent-rules';
      
      const response = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleForm)
      });
      
      if (response.ok) {
        setShowRuleModal(false);
        fetchAdventRules();
      }
    } catch (err) {
      console.error("Failed to save rule:", err);
    }
  };

  const deleteRule = async (id: number) => {
    try {
      const response = await authFetch(`/api/platform/advent-rules/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setDeletingRuleId(null);
        fetchAdventRules();
      }
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchAdventRules();
  }, [ruleFilters.name]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [ordersRes, customersRes, materialsRes, remnantsRes, financeRes] = await Promise.all([
        authFetch('/api/platform/orders'),
        authFetch('/api/platform/customers'),
        authFetch('/api/platform/materials'),
        authFetch('/api/platform/remnants'),
        authFetch('/api/platform/finance/reconciliation')
      ]);
      
      const ordersData = await ordersRes.json();
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      const customersData = await customersRes.json();
      setCustomers(Array.isArray(customersData) ? customersData : []);
      const materialsData = await materialsRes.json();
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      const remnantsData = await remnantsRes.json();
      setRemnants(Array.isArray(remnantsData) ? remnantsData : []);
      const financeData = await financeRes.json();
      setReconciliation(Array.isArray(financeData) ? financeData : []);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const editOrder = (order: Order) => {
    // 订单日期优先从订单级别获取，如果为空则从第一个订单项获取
    const orderStartDate = order.start_date || (order.items && order.items.length > 0 ? order.items[0].start_date : null);
    const orderDueDate = order.due_date || (order.items && order.items.length > 0 ? order.items[0].due_date : null);

    setNewOrder({
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      priority: order.priority,
      start_date: formatDateForInput(orderStartDate),
      due_date: formatDateForInput(orderDueDate),
      notes: order.notes,
      items: (order.items || []).map(item => ({
        ...item,
        part_number: item.part_number || '',
        scrap_quantity: item.scrap_quantity || 0,
        delivered_quantity: item.delivered_quantity || 0,
        tool_cost: item.tool_cost || 0,
        fixture_cost: item.fixture_cost || 0,
        material_cost: item.material_cost || 0,
        other_cost: item.other_cost || 0,
        item_notes: item.item_notes || '',
        start_date: formatDateForInput(item.start_date || orderStartDate),
        due_date: formatDateForInput(item.due_date || orderDueDate),
        completion_date: formatDateForInput(item.completion_date),
        processes: (item.processes || []).map(p => ({ ...p }))
      }))
    });
    setShowOrderModal(true);
  };

  const resetAndOpenModal = () => {
    const today = new Date();
    const dateStr = today.getFullYear().toString() + 
                    (today.getMonth() + 1).toString().padStart(2, '0') + 
                    today.getDate().toString().padStart(2, '0');
    const prefix = `YHS-${dateStr}-`;
    
    const todayOrders = orders.filter(o => o.order_number?.startsWith(prefix));
    let nextSuffix = 1;
    if (todayOrders.length > 0) {
      const suffixes = todayOrders.map(o => {
        const parts = o.order_number!.split('-');
        const lastPart = parts[parts.length - 1];
        return parseInt(lastPart) || 0;
      });
      nextSuffix = Math.max(...suffixes) + 1;
    }
    const generatedOrderNumber = `${prefix}${nextSuffix.toString().padStart(3, '0')}`;

    setNewOrder({ 
      priority: 'medium', 
      status: 'pending',
      start_date: '',
      due_date: '',
      order_number: generatedOrderNumber,
      items: [{ part_name: '', quantity: 1, unit_price: 0, processes: [] }]
    });
    setShowOrderModal(true);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    // Validate order-level dates or item-level dates
    const errors: Record<string, string> = {};
    const hasOrderDate = newOrder.start_date || (newOrder.items && newOrder.items.some(item => item.start_date));
    const hasDueDate = newOrder.due_date || (newOrder.items && newOrder.items.some(item => item.due_date));
    
    if (!newOrder.customer_id) {
      errors.customer = "请选择客户";
    }
    
    if (!hasOrderDate) {
      errors.orderDate = "订单日期不能为空";
    }

    if (!hasDueDate) {
      errors.deliveryDate = "交货日期不能为空";
    }

    if (!newOrder.items || newOrder.items.length === 0) {
      errors.items = "请添加至少一个零件";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const method = newOrder.id ? "PATCH" : "POST";
      const url = newOrder.id ? `/api/platform/orders/${newOrder.id}` : "/api/platform/orders";
      
      const orderToSave = { ...newOrder };
      // Sync dates if missing at order level
      if (!orderToSave.start_date && orderToSave.items?.[0]?.start_date) {
        orderToSave.start_date = orderToSave.items[0].start_date;
      }
      if (!orderToSave.due_date && orderToSave.items?.[0]?.due_date) {
        orderToSave.due_date = orderToSave.items[0].due_date;
      }

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderToSave)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
      
      setShowOrderModal(false);
      setNewOrder({
        priority: 'medium',
        status: 'pending',
        start_date: '',
        due_date: '',
        items: [{ part_name: '', quantity: 1, unit_price: 0, processes: [] }]
      });
      fetchData();
    } catch (error) {
      console.error("Failed to save order", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Customer Management Functions
  const handleOpenCustomerModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setNewCustomer({ name: customer.name, contact: customer.contact || '' });
    } else {
      setEditingCustomer(null);
      setNewCustomer({ name: '', contact: '' });
    }
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('请输入客户名称');
      return;
    }

    try {
      if (editingCustomer) {
        const response = await authFetch(`/api/platform/customers/${editingCustomer.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer)
        });
        if (!response.ok) {
          throw new Error('更新失败');
        }
      } else {
        const response = await authFetch('/api/platform/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer)
        });
        if (!response.ok) {
          throw new Error('创建失败');
        }
      }
      setShowCustomerModal(false);
      setNewCustomer({ name: '', contact: '' });
      setEditingCustomer(null);
      fetchData();
    } catch (error) {
      console.error("Failed to save customer", error);
      alert('保存失败: ' + error);
    }
  };

  const handleDeleteCustomer = async (id: number) => {
    try {
      await authFetch(`/api/platform/customers/${id}`, { method: 'DELETE' });
      setDeletingCustomerId(null);
      fetchData();
    } catch (error) {
      console.error("Failed to delete customer", error);
    }
  };



  const updateItemStatus = async (itemId: number, status: any) => {
    try {
      await authFetch(`/api/platform/order-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      fetchData();
    } catch (error) {
      console.error("Failed to update item status", error);
    }
  };

  const navItems = [
    { id: 'dashboard', label: '工作看板', icon: LayoutDashboard },
    { id: 'orders', label: '订单管理', icon: ClipboardList },
    { id: 'overdue', label: '逾期订单', icon: AlertCircle },
    { id: 'warning_orders', label: '告警订单', icon: AlertTriangle },
    { id: 'imminent_orders', label: '临期订单', icon: Clock },
    { id: 'customers', label: '客户管理', icon: Users },
    { id: 'inventory', label: '仓库余料', icon: Package },
    { id: 'finance', label: '财务对账', icon: CircleDollarSign },
    { id: 'advent_rules', label: '规则管理', icon: Settings2 },
  ];

  // Show loading while checking auth
  if (authChecking) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900">
        <div className="text-white text-xl">加载中...</div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-bottom border-zinc-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-900 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">机加ERP</h1>
        </div>
        <button onClick={() => setIsSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{
              x: 0,
              width: isSidebarCollapsed ? 72 : 224
            }}
            exit={{ x: -300 }}
            transition={{ type: 'tween', duration: 0.15 }}
            className={`fixed inset-y-0 left-0 bg-zinc-900 text-zinc-400 z-50 md:relative md:flex flex-col transition-all duration-150 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
          >
            <div className={`p-4 flex items-center justify-between border-b border-white/5`}>
              <div className="flex items-center gap-3 text-white overflow-hidden">
                <div className="shrink-0 w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Settings className="w-6 h-6" />
                </div>
                {!isSidebarCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="font-bold text-xl tracking-tight whitespace-nowrap"
                  >
                    机加ERP
                  </motion.span>
                )}
              </div>
              <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
              
              {/* Collapse Toggle (Desktop) */}
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex absolute -right-3 top-12 w-6 h-6 bg-zinc-800 border border-zinc-700 rounded-full items-center justify-center text-white hover:bg-zinc-700 transition-colors z-50"
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-x-hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsSidebarOpen(false);
                  }}
                  title={isSidebarCollapsed ? item.label : ''}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${isSidebarCollapsed ? 'justify-center' : ''} ${activeTab === item.id ? 'bg-white text-zinc-900 font-medium' : 'hover:bg-white/5 hover:text-white'}`}
                >
                  <item.icon className="shrink-0 w-5 h-5" />
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </button>
              ))}
            </nav>

            <div className={`p-4 border-t border-white/5`}>
              <div className={`flex items-center gap-3 px-2 py-2 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
                <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                  {authUser?.username?.charAt(0).toUpperCase() || 'A'}
                </div>
                {!isSidebarCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-white truncate">{authUser?.username || 'Admin'}</p>
                    <p className="text-xs truncate opacity-50">管理员</p>
                  </motion.div>
                )}
                {!isSidebarCollapsed && (
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="退出登录"
                  >
                    <X className="w-4 h-4 text-white/50 hover:text-white" />
                  </button>
                )}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 bg-zinc-50 overflow-hidden flex flex-col !w-full !max-w-none !m-0 !p-0">
        <div className="!w-full h-full flex flex-col py-0 md:py-0 min-h-0 !max-w-none !m-0 !p-0">
          
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <Dashboard
              orders={orders}
              dashboardPage={dashboardPage}
              dashboardPageSize={dashboardPageSize}
              setDashboardPage={setDashboardPage}
              setDashboardPageSize={setDashboardPageSize}
              setActiveTab={setActiveTab}
              setOrderFilters={setOrderFilters}
              setAppliedOrderFilters={setAppliedOrderFilters}
              setCurrentPage={setCurrentPage}
              resetAndOpenModal={resetAndOpenModal}
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              fetchData={fetchData}
              getOrderMaxDueDate={getOrderMaxDueDate}
              checkOrderAgainstRules={checkOrderAgainstRules}
              formatDate={formatDate}
            />
          )}


          {activeTab === 'orders' && (
            <Orders
              orders={orders}
              orderFilters={orderFilters}
              setOrderFilters={setOrderFilters}
              appliedOrderFilters={appliedOrderFilters}
              setAppliedOrderFilters={setAppliedOrderFilters}
              showOrderFilters={showOrderFilters}
              setShowOrderFilters={setShowOrderFilters}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              pageSize={pageSize}
              setPageSize={setPageSize}
              orderMgrExpanded={orderMgrExpanded}
              setOrderMgrExpanded={setOrderMgrExpanded}
              allOrderMgrExpanded={allOrderMgrExpanded}
              setAllOrderMgrExpanded={setAllOrderMgrExpanded}
              resetAndOpenModal={resetAndOpenModal}
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
              toggleOrderMgr={toggleOrderMgr}
            />
          )}

          {/* Overdue Tab */}
          {activeTab === 'overdue' && (
            <Overdue
              orders={orders}
              overdueFilters={overdueFilters}
              setOverdueFilters={setOverdueFilters}
              overduePage={overduePage}
              setOverduePage={setOverduePage}
              overduePageSize={overduePageSize}
              setOverduePageSize={setOverduePageSize}
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
            />
          )}

          {/* Warning Orders Tab */}
          {activeTab === 'warning_orders' && (
            <Warning
              orders={orders}
              warningFilters={warningFilters}
              setWarningFilters={setWarningFilters}
              warningPage={warningPage}
              setWarningPage={setWarningPage}
              warningPageSize={warningPageSize}
              setWarningPageSize={setWarningPageSize}
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
              checkOrderAgainstRules={checkOrderAgainstRules}
            />
          )}

          {/* Imminent Orders Tab */}
          {activeTab === 'imminent_orders' && (
            <Imminent
              orders={orders}
              imminentFilters={imminentFilters}
              setImminentFilters={setImminentFilters}
              imminentPage={imminentPage}
              setImminentPage={setImminentPage}
              imminentPageSize={imminentPageSize}
              setImminentPageSize={setImminentPageSize}
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
              checkOrderAgainstRules={checkOrderAgainstRules}
            />
          )}

          {/* Customers Tab */}
          {activeTab === 'customers' && (
            <Customers
              customers={customers}
              setEditingCustomer={setEditingCustomer}
              setNewCustomer={setNewCustomer}
              setShowCustomerModal={setShowCustomerModal}
              setDeletingCustomerId={setDeletingCustomerId}
            />
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <Inventory
              materials={materials}
              remnants={remnants}
            />
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <Finance
              reconciliation={reconciliation}
            />
          )}

          {/* Rules Tab */}
          {activeTab === 'advent_rules' && (
            <Rules
              adventRules={adventRules}
              ruleFilters={ruleFilters}
              setRuleFilters={setRuleFilters}
              editingRuleId={editingRuleId}
              setEditingRuleId={setEditingRuleId}
              ruleForm={ruleForm}
              setRuleForm={setRuleForm}
              setShowRuleModal={setShowRuleModal}
              setDeletingRuleId={setDeletingRuleId}
            />
          )}

        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOrderModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-[95vw] bg-white rounded-3xl shadow-2xl transition-all duration-300"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold">{newOrder.id ? '修改订单' : '新建订单'}</h3>
                  {newOrder.id && <span className="text-xs text-zinc-500">正在编辑订单: {newOrder.order_number || newOrder.id}</span>}
                </div>
                <button onClick={() => setShowOrderModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="p-6 space-y-6">
                {/* Common Order Header */}
                <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
                  {/* Row 1: 客户选择、订单号、优先级 */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-3 relative" ref={customerDropdownRef}>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">选择客户 *</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="搜索并选择客户..."
                          value={customerSearch || (newOrder.customer_id ? customers.find(c => c.id === newOrder.customer_id)?.name || '' : '')}
                          onChange={e => {
                            setCustomerSearch(e.target.value);
                            setShowCustomerDropdown(true);
                          }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          className={`w-full px-4 py-2 bg-white border ${formErrors.customer ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none`}
                        />
                        {showCustomerDropdown && (
                          <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {customers
                              .filter(c => c.name.toLowerCase().includes((customerSearch || '').toLowerCase()))
                              .map(c => (
                                <div
                                  key={c.id}
                                  className="px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                                  onClick={() => {
                                    setNewOrder({
                                      ...newOrder,
                                      customer_id: c.id,
                                      customer_name: c.name
                                    });
                                    setCustomerSearch('');
                                    setShowCustomerDropdown(false);
                                    if (formErrors.customer) setFormErrors({ ...formErrors, customer: '' });
                                  }}
                                >
                                  {c.name}
                                </div>
                              ))}
                            {customers.filter(c => c.name.toLowerCase().includes((customerSearch || '').toLowerCase())).length === 0 && (
                              <div className="px-4 py-2 text-zinc-400 text-sm">未找到匹配的客户</div>
                            )}
                          </div>
                        )}
                      </div>
                      {formErrors.customer && (
                        <div className="mt-1 flex items-center gap-1.5 text-red-500 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.customer}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单号(可选)</label>
                      <input
                        type="text"
                        placeholder="自动生成"
                        value={newOrder.order_number || ''}
                        className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                        onChange={e => setNewOrder({...newOrder, order_number: e.target.value})}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">优先级</label>
                      <select
                        value={newOrder.priority || 'medium'}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
                        onChange={e => setNewOrder({...newOrder, priority: e.target.value as any})}
                      >
                        <option value="low">较低</option>
                        <option value="medium">普通</option>
                        <option value="high">紧急</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单日期 *</label>
                      <div className="relative flex items-center group cursor-pointer">
                        <Calendar className="absolute left-3 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                        <input
                          required
                          type="date"
                          value={newOrder.start_date || ''}
                          className={`w-full pl-10 pr-2 py-2 bg-white border ${formErrors.orderDate ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                          onChange={e => {
                            const newDate = e.target.value;
                            const updatedItems = (newOrder.items || []).map(item => ({
                              ...item,
                              start_date: newDate
                            }));
                            setNewOrder({
                              ...newOrder,
                              start_date: newDate,
                              items: updatedItems
                            });
                            if (formErrors.orderDate) setFormErrors({ ...formErrors, orderDate: '' });
                          }}
                        />
                      </div>
                      {formErrors.orderDate && (
                        <div className="mt-1 flex items-center gap-1.5 text-red-500 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.orderDate}
                        </div>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单备注</label>
                      <input
                        type="text"
                        placeholder="备注..."
                        value={newOrder.notes || ''}
                        onChange={e => setNewOrder({...newOrder, notes: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-inner">
                    <table className="min-w-[2100px] w-full text-left text-xs table-fixed border-collapse">
                      <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-12 text-center shadow-[inset_-1px_0_0_0_#e4e4e7]">#</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-[192px] sticky left-0 bg-zinc-50 border-b border-zinc-200 z-[15] shadow-[inset_-1px_0_0_0_#e4e4e7]">零件名称 *</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-[160px] sticky left-[192px] bg-zinc-50 border-b border-zinc-200 z-[15] shadow-[inset_-1px_0_0_0_#e4e4e7]">零件号(P/N)</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">数量</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">报废数量</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">单价 (¥)</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">总计 (¥)</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-32">订单日期</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-32">交货日期</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-32">完工日期</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">交货数量</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">刀具费用</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">工装费用</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">材料费用</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-24">其他费用</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-96">工序流程</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-32 text-right">外协共计 (¥)</th>
                           <th className="px-4 py-3 font-bold text-zinc-500 w-48">备注</th>
                           <th className="pl-4 pr-6 py-3 font-bold text-zinc-500 w-20 text-left sticky right-2 bg-zinc-50 border-l border-b border-zinc-200 z-10 shadow-[inset_1px_0_0_0_#e4e4e7]">操作</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {newOrder.items?.map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50/50">
                            <td className="px-4 py-2 font-mono text-zinc-400">{idx + 1}</td>
                            <td className="px-2 py-2 sticky left-0 bg-white z-[15] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
                              <input
                                type="text"
                                required
                                placeholder="输入零件号..."
                                value={item.part_name || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], part_name: e.target.value };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2 sticky left-[192px] bg-white z-[15] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
                              <input
                                type="text"
                                placeholder="P/N..."
                                value={item.part_number || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], part_number: e.target.value };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={item.quantity || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], quantity: parseInt(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className={`px-2 py-2 ${(item.scrap_quantity || 0) > 0 ? 'bg-white' : ''}`}>
                              <input
                                type="number"
                                value={item.scrap_quantity || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], scrap_quantity: parseInt(e.target.value) || 0 };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className={`w-full px-3 py-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all ${(item.scrap_quantity || 0) > 0 ? 'text-red-600 font-bold' : 'bg-transparent'}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.unit_price || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], unit_price: parseFloat(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-medium">
                                ¥{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-400 font-medium text-sm overflow-hidden whitespace-nowrap">
                                {formatDate(item.start_date)}
                              </div>
                            </td>
                            <td className="px-2 py-2 overflow-hidden">
                              <div className="space-y-1">
                                <div className="relative flex items-center group cursor-pointer">
                                  <Calendar className="absolute left-2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                                  <input 
                                    required
                                    type="date" 
                                    value={item.due_date || ''}
                                    onChange={e => {
                                      const items = [...newOrder.items!];
                                      items[idx] = { ...items[idx], due_date: e.target.value };
                                      setNewOrder({ ...newOrder, items });
                                      if (formErrors.deliveryDate) setFormErrors({ ...formErrors, deliveryDate: '' });
                                    }}
                                    className={`w-full pl-8 pr-2 py-1.5 bg-transparent border ${formErrors.deliveryDate && !item.due_date ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-zinc-200'} focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                                  />
                                </div>
                                {formErrors.deliveryDate && !item.due_date && (
                                  <div className="flex items-center gap-1 text-red-500 text-[9px] font-bold">
                                    <AlertCircle className="w-2.5 h-2.5" />
                                    交货日期不能为空
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 overflow-hidden">
                              <div className="relative flex items-center group cursor-pointer">
                                <Calendar className="absolute left-2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                                <input 
                                  type="date" 
                                  value={item.completion_date || ''}
                                  onChange={e => {
                                    const items = [...newOrder.items!];
                                    items[idx] = { ...items[idx], completion_date: e.target.value };
                                    setNewOrder({ ...newOrder, items });
                                  }}
                                  className="w-full pl-8 pr-2 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                                />
                              </div>
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                value={item.delivered_quantity || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], delivered_quantity: parseInt(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.tool_cost || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], tool_cost: parseFloat(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={item.fixture_cost || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], fixture_cost: parseFloat(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.material_cost || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], material_cost: parseFloat(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                step="0.01"
                                value={item.other_cost || ''}
                                onChange={e => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], other_cost: parseFloat(e.target.value) };
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <ProcessCell 
                                processes={item.processes || []} 
                                onUpdate={(processes) => {
                                  const items = [...newOrder.items!];
                                  items[idx] = { ...items[idx], processes };
                                  setNewOrder({ ...newOrder, items });
                                }}
                              />
                            </td>
                             <td className="px-2 py-2">
                               <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-bold text-right">
                                 ¥{(item.processes || []).reduce((sum, p) => sum + Number(p.outsourcing_fee || 0), 0).toFixed(2)}
                               </div>
                             </td>
                             <td className="px-2 py-2">
                                <input
                                  type="text"
                                  placeholder="添加备注..."
                                  value={item.item_notes || ''}
                                  onChange={e => {
                                    const items = [...newOrder.items!];
                                    items[idx] = { ...items[idx], item_notes: e.target.value };
                                    setNewOrder({ ...newOrder, items });
                                  }}
                                  className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all text-xs"
                                />
                             </td>
                              <td className="pl-4 pr-6 py-2 text-left sticky right-2 bg-white/90 backdrop-blur-sm border-b border-zinc-100 shadow-[inset_1px_0_0_0_#e4e4e7] z-10">
                              <button 
                                type="button"
                                onClick={() => {
                                  const items = [...newOrder.items!];
                                  items.splice(idx, 1);
                                  setNewOrder({ ...newOrder, items });
                                }}
                                className="p-1.5 text-zinc-300 hover:text-rose-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const items = [...(newOrder.items || [])];
                      items.push({ 
                        part_name: '', 
                        quantity: 1, 
                        unit_price: 0, 
                        processes: [],
                        start_date: newOrder.start_date || '' 
                      });
                      setNewOrder({ ...newOrder, items });
                    }}
                    className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 font-bold hover:border-zinc-400 hover:text-zinc-600 transition-all flex items-center justify-start gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    添加一行                  </button>
                </div>

                <div className="pt-6 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    disabled={isSaving}
                    className={`flex-[2] py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${
                      isSaving 
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                        : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-200'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                        正在保存...
                      </>
                    ) : (
                      newOrder.id ? '确认修改' : `确认保存订单 (${newOrder.items?.length || 0}个零件)`
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Drawing Modal */}
      <AnimatePresence>
        {showAiModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAiModal(false)}
              className="absolute inset-0 bg-zinc-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-zinc-900" />
                  <h3 className="text-xl font-bold">AI 图纸助手</h3>
                </div>
                <button onClick={() => setShowAiModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-500 uppercase">描述零件特征</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="例如：一个带4个孔的铝合金法兰盘，直径100mm..."
                      className="flex-1 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                    <button 
                      onClick={generateAiDrawing}
                      disabled={isGenerating || !aiPrompt}
                      className="bg-zinc-900 text-white px-6 py-3 rounded-2xl font-bold disabled:opacity-50 flex items-center gap-2"
                    >
                      {isGenerating ? '生成中...' : '生成图纸'}
                    </button>
                  </div>
                </div>

                <div className="aspect-square bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden relative">
                  {isGenerating ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-medium text-zinc-500">正在构思图纸细节...</p>
                    </div>
                  ) : generatedImage ? (
                    <img src={generatedImage} alt="AI Generated" className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-center space-y-2">
                      <ImageIcon className="w-12 h-12 text-zinc-200 mx-auto" />
                      <p className="text-sm text-zinc-400">输入描述并点击生成</p>
                    </div>
                  )}
                </div>

                {generatedImage && (
                  <button 
                    onClick={() => {
                      setNewOrder({ ...newOrder, drawing_data: generatedImage });
                      setShowAiModal(false);
                    }}
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-start gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    使用此图纸                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Drawing Viewer Modal */}
      <AnimatePresence>
        {showDrawingModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDrawingModal(null)}
              className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
                <h3 className="font-bold">图纸预览</h3>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-500">
                    <Download className="w-5 h-5" />
                  </button>
                  <button onClick={() => setShowDrawingModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-zinc-100 flex items-center justify-center min-h-[400px]">
                <img src={showDrawingModal} alt="Drawing" className="max-w-full max-h-[70vh] object-contain shadow-lg" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            onClick={() => setShowCustomerModal(false)}
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <h3 className="text-xl font-bold">{editingCustomer ? '修改客户' : '新建客户'}</h3>
              <button onClick={() => setShowCustomerModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">客户名称 *</label>
                <input
                  type="text"
                  required
                  placeholder="输入客户名称..."
                  value={newCustomer.name}
                  onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">联系方式</label>
                <input
                  type="text"
                  placeholder="输入联系方式..."
                  value={newCustomer.contact}
                  onChange={e => setNewCustomer(prev => ({ ...prev, contact: e.target.value }))}
                  className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(false)}
                  className="px-4 py-2 text-zinc-500 hover:text-zinc-700 transition-colors"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomer}
                  className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      <AnimatePresence>
        {deletingCustomerId && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingCustomerId(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 mb-2">确认删除</h3>
                <p className="text-zinc-500 text-sm mb-6">确定要删除这个客户吗？此操作不可撤销。</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeletingCustomerId(null)}
                    className="flex-1 px-4 py-2 border border-zinc-200 rounded-xl text-zinc-600 hover:bg-zinc-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => handleDeleteCustomer(deletingCustomerId)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Advent Rule Modal */}
      <AnimatePresence>
        {showRuleModal && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRuleModal(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden h-auto"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="text-xl font-bold">{editingRuleId ? '修改规则' : '新建规则'}</h3>
                <button onClick={() => setShowRuleModal(false)} className="p-2 hover:bg-zinc-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRuleSubmit} className="p-5 space-y-4 flex-1 flex flex-col min-h-0">
                {/* Top Row: 4 Columns */}
                <div className="grid grid-cols-4 gap-4 items-start">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="block text-xs font-bold text-zinc-400 uppercase">规则名称 *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="例如：标准交期提醒"
                      value={ruleForm.name}
                      onChange={e => setRuleForm({ ...ruleForm, name: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="block text-xs font-bold text-zinc-400 uppercase">规则说明</label>
                    <input 
                      type="text" 
                      placeholder="简短描述规则用途..."
                      value={ruleForm.description}
                      onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })}
                      className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-2xl focus:ring-2 focus:ring-zinc-900 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="block text-xs font-bold text-zinc-400 uppercase">规则类型</label>
                    <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
                      {[
                        { label: '告警', value: 'warning' },
                        { label: '临期', value: 'imminent' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRuleForm({ ...ruleForm, ruleType: opt.value as any })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            ruleForm.ruleType === opt.value 
                              ? 'bg-white text-zinc-900 shadow-sm' 
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    {ruleError && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1 animate-pulse">{ruleError}</p>
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <label className="block text-xs font-bold text-zinc-400 uppercase">适用范围</label>
                    <div className="flex bg-zinc-100 p-1 rounded-2xl border border-zinc-200">
                      {[
                        { label: '通用', value: 'general' },
                        { label: '特定', value: 'specific' }
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRuleForm({ ...ruleForm, scopeType: opt.value as any })}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            ruleForm.scopeType === opt.value 
                              ? 'bg-white text-zinc-900 shadow-sm' 
                              : 'text-zinc-400 hover:text-zinc-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Preview Effect Section */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5" />
                      预览效果
                    </span>
                    <div className="text-[10px] text-zinc-400 font-medium bg-zinc-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> 当天: {new Date().toISOString().split('T')[0]}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 ml-1">模拟交货日期</span>
                      <input 
                        type="date"
                        value={previewValues.deliveryDate}
                        onChange={e => setPreviewValues({ ...previewValues, deliveryDate: e.target.value })}
                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 ml-1">模拟订单日期</span>
                      <input 
                        type="date"
                        value={previewValues.orderDate}
                        onChange={e => setPreviewValues({ ...previewValues, orderDate: e.target.value })}
                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 ml-1">模拟零件状态</span>
                      <select 
                        value={previewValues.partStatus}
                        onChange={e => setPreviewValues({ ...previewValues, partStatus: e.target.value as any })}
                        className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium appearance-none"
                      >
                        <option value="pending">待加工</option>
                        <option value="processing">加工中</option>
                        <option value="completed">已完成</option>
                      </select>
                    </div>
                    <div className="bg-zinc-900 rounded-xl p-3 flex flex-col justify-center">
                      <span className="text-[10px] font-bold text-zinc-300 uppercase leading-none mb-1 text-center">计算结果</span>
                      <div className="text-lg font-mono font-bold text-white text-center truncate">
                        {calculatePreviewResult(ruleForm.formula, ruleForm.target_status)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-400 uppercase">自定义公式编辑器</label>
                  
                  {/* Formula Output */}
                  <div className="relative">
                    <textarea 
                      readOnly
                      value={ruleForm.formula}
                      placeholder="点击下方按钮组合公式..."
                      className="w-full flex-1 min-h-[60px] max-h-[120px] px-4 py-2 bg-zinc-100 border border-zinc-200 rounded-2xl font-mono text-lg text-zinc-700 resize-none outline-none transition-all pr-20"
                    />
                    <div className="absolute right-2 top-2 flex items-center gap-1.5">
                      <button 
                        type="button"
                        onClick={() => setRuleForm({ ...ruleForm, formula: ruleForm.formula.slice(0, -1) })}
                        className="p-1 px-2 bg-white text-zinc-500 rounded-lg shadow-sm border border-zinc-200 hover:bg-zinc-100 transition-colors flex items-center gap-1"
                        title="退格"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold">退格</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRuleForm({ ...ruleForm, formula: '' })}
                        className="p-1.5 bg-white text-rose-500 rounded-lg shadow-sm border border-zinc-200 hover:bg-rose-50 transition-colors"
                        title="清空"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Logic Combination Row */}
                  <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-2xl border border-zinc-100 shadow-inner">
                    <div className="bg-zinc-900 px-4 py-2 rounded-xl text-white font-bold shadow-sm shadow-zinc-200">
                      无                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest whitespace-nowrap">零件状态为</span>
                        <select 
                          value={ruleForm.target_status}
                          onChange={e => setRuleForm({ ...ruleForm, target_status: e.target.value as any })}
                          className="flex-1 bg-white border border-zinc-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium appearance-none shadow-sm cursor-pointer"
                        >
                          <option value="pending">待加工</option>
                          <option value="processing">加工中</option>
                          <option value="completed">已完成</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Editor Controls */}
                  <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-100 shadow-inner space-y-5 flex-1 flex flex-col min-h-0">
                    {/* Top Row: Variables and Numbers */}
                    <div className="grid grid-cols-2 gap-6 items-start flex-1 min-h-0">
                      {/* Left: Factors */}
                      <div className="space-y-2 flex flex-col h-full">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">变量因子</span>
                        <div className="flex flex-wrap gap-2 content-start flex-1">
                          {['交货日期', '订单日期', '当天'].map(factor => (
                            <button 
                              key={factor}
                              type="button"
                              onClick={() => setRuleForm({ ...ruleForm, formula: ruleForm.formula + `{${factor}}` })}
                              className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm flex-1 min-w-[80px]"
                            >
                              {factor}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Numbers */}
                      <div className="space-y-2 flex flex-col h-full">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">数字键盘</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-2xl border border-zinc-200/50 grid grid-cols-4 gap-2 flex-1">
                          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.'].map((btn) => (
                            <button 
                              key={btn}
                              type="button"
                              onClick={() => setRuleForm({ ...ruleForm, formula: ruleForm.formula + btn })}
                              className={`flex items-center justify-center rounded-lg font-bold transition-all text-sm h-full min-h-[36px] ${
                                btn === '.' ? 'bg-zinc-100 text-zinc-600' : 'text-zinc-600 hover:bg-zinc-900 hover:text-white'
                              }`}
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Arithmetic and Logic (Aligned) */}
                    <div className="grid grid-cols-2 gap-6 items-start flex-1 min-h-0">
                      {/* Left: Arithmetic */}
                      <div className="space-y-2 flex flex-col h-full">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">基础运算符号</span>
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          {['+', '-', '*', '/', '(', ')'].map((btn) => (
                            <button 
                              key={btn}
                              type="button"
                              onClick={() => setRuleForm({ ...ruleForm, formula: ruleForm.formula + btn })}
                              className="flex items-center justify-center rounded-xl font-bold bg-zinc-900 text-white border border-zinc-900 hover:bg-zinc-800 transition-all shadow-sm text-sm h-full min-h-[40px]"
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Right: Logic */}
                      <div className="space-y-2 flex flex-col h-full">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">数学逻辑判断</span>
                        <div className="grid grid-cols-3 gap-2 flex-1">
                          {['<', '<=', '>', '>=', '=', '!='].map((btn) => (
                            <button 
                              key={btn}
                              type="button"
                              onClick={() => setRuleForm({ ...ruleForm, formula: ruleForm.formula + btn })}
                              className="flex items-center justify-center rounded-xl font-bold bg-zinc-900 text-white border border-zinc-900 hover:bg-zinc-800 transition-all shadow-sm text-sm h-full min-h-[40px]"
                            >
                              {btn}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {ruleError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 mb-2"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-bold leading-tight">{ruleError}</span>
                  </motion.div>
                )}

                <div className="pt-2 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setShowRuleModal(false)}
                    className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    type="submit" 
                    disabled={!!ruleError}
                    className={`flex-[2] py-3 rounded-2xl font-bold transition-colors shadow-lg shadow-zinc-200 ${
                      ruleError 
                        ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed' 
                        : 'bg-zinc-900 text-white hover:bg-zinc-800'
                    }`}
                  >
                    {editingRuleId ? '保存修改' : '创建规则'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingRuleId && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingRuleId(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-8 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
                  <Trash2 className="w-8 h-8 text-rose-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">确认删除规则？</h3>
                  <p className="text-sm text-zinc-500">此操作无法撤销，规则将被永久移除。</p>
                </div>
                <div className="flex gap-3 w-full pt-4">
                  <button
                    onClick={() => setDeletingRuleId(null)}
                    className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => deleteRule(deletingRuleId)}
                    className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
                  >
                    确认删除
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Validation Alert Modal */}
      <AnimatePresence>
        {validationAlert && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setValidationAlert(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-zinc-200 p-8 overflow-hidden"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900">提示</h3>
                  <p className="text-sm text-zinc-500 font-medium leading-relaxed">{validationAlert}</p>
                </div>
                <button
                  onClick={() => setValidationAlert(null)}
                  className="w-full mt-4 px-6 py-3 bg-zinc-900 text-white rounded-2xl font-bold hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

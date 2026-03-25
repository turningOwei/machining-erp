import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  CircleDollarSign,
  Plus,
  Search,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
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
import Sidebar from './components/Sidebar';
import OrderMonitorPanel from './components/OrderMonitorPanel';
import ProcessCell from './components/ProcessCell';
import OrderModal from './components/OrderModal';
import AiDrawingModal from './components/AiDrawingModal';
import DrawingViewerModal from './components/DrawingViewerModal';
import CustomerModal from './components/CustomerModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ErrorModal from './components/ErrorModal';
import ValidationAlertModal from './components/ValidationAlertModal';
import RuleModal, { RuleForm } from './components/RuleModal';
import Orders from './pages/Orders';
import Dashboard from './pages/Dashboard';
import { createEmptyFilters, createOrderFilters } from './configs/filterConfigs';
import Overdue from './pages/Overdue';
import Warning from './pages/Warning';
import Imminent from './pages/Imminent';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Finance from './pages/Finance';
import Rules from './pages/Rules';
import { formatDate, formatDateForInput, authFetch } from './components/shared';
import { deleteOrder as deleteOrderApi } from './services/orderService';
import { NAV_ITEMS } from './constants/navigation';

// --- AI Service ---
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

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
          try {
            const user = JSON.parse(userStr);
            if (user && user.username) {
              setIsAuthenticated(true);
              setAuthUser(user);
            } else {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
            }
          } catch {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
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
  const [ruleForm, setRuleForm] = useState<RuleForm>({
    name: '',
    description: '',
    formula: '',
    target_status: 'pending',
    scopeType: 'general',
    ruleType: 'imminent'
  });
  const [editingRuleId, setEditingRuleId] = useState<number | null>(null);
  const [deletingRuleId, setDeletingRuleId] = useState<number | null>(null);
  const [showOrderFilters, setShowOrderFilters] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [overduePage, setOverduePage] = useState(1);
  const [overduePageSize, setOverduePageSize] = useState(10);
  const [overdueFilters, setOverdueFilters] = useState(createEmptyFilters);
  const [warningPage, setWarningPage] = useState(1);
  const [warningPageSize, setWarningPageSize] = useState(10);
  const [warningFilters, setWarningFilters] = useState(createEmptyFilters);
  const [imminentPage, setImminentPage] = useState(1);
  const [imminentPageSize, setImminentPageSize] = useState(10);
  const [imminentFilters, setImminentFilters] = useState(createEmptyFilters);
  // 订单管理筛选状态
  const [orderFilters, setOrderFilters] = useState(createOrderFilters);
  const [appliedOrderFilters, setAppliedOrderFilters] = useState(createOrderFilters);
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
  const [newCustomer, setNewCustomer] = useState<{ name: string; short_name: string; contacts: { name: string; contact: string }[] }>({ name: '', short_name: '', contacts: [] });
  const [deletingCustomerId, setDeletingCustomerId] = useState<number | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Error Modal
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorTitle, setErrorTitle] = useState('操作失败');
  const [errorMessage, setErrorMessage] = useState('');

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
          .replace(/{订单交期}/g, d(maxDueDate).toString())
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

  const [validationAlert, setValidationAlert] = useState<string | null>(null);

  const handleRuleSubmit = async () => {
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
      order_name: order.order_name,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_short_name: order.customer_short_name,
      contact_id: order.contact_id,
      contact_name: order.contact_name,
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

  const deleteOrder = async (orderId: number) => {
    try {
      await deleteOrderApi(orderId);
      setOrders(orders.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Failed to delete order:', error);
      alert(error instanceof Error ? error.message : '删除失败');
    }
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
      errors.deliveryDate = "订单交期不能为空";
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
        order_name: '',
        contact_id: undefined,
        contact_name: undefined,
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
      setNewCustomer({ name: customer.name, short_name: customer.short_name || '', contacts: customer.contacts || [] });
    } else {
      setEditingCustomer(null);
      setNewCustomer({ name: '', short_name: '', contacts: [] });
    }
    setShowCustomerModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('请输入客户名称');
      return;
    }
    if (!newCustomer.short_name.trim()) {
      alert('请输入客户简称');
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
          const data = await response.json();
          throw new Error(data.error || '更新失败');
        }
      } else {
        const response = await authFetch('/api/platform/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer)
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || '创建失败');
        }
      }
      setShowCustomerModal(false);
      setNewCustomer({ name: '', short_name: '', contacts: [] });
      setEditingCustomer(null);
      fetchData();
    } catch (error: any) {
      console.error("Failed to save customer", error);
      setErrorTitle('保存失败');
      setErrorMessage(error.message || '未知错误');
      setShowErrorModal(true);
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

  // Shared props for order-related components
  const baseOrderProps = {
    orders,
    editOrder,
    setShowDrawingModal,
    handleProcessClick,
    getOrderMaxDueDate,
  };

  const orderWithRulesProps = {
    ...baseOrderProps,
    checkOrderAgainstRules,
  };

  // Render active tab based on activeTab state
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            {...baseOrderProps}
            dashboardPage={dashboardPage}
            dashboardPageSize={dashboardPageSize}
            setDashboardPage={setDashboardPage}
            setDashboardPageSize={setDashboardPageSize}
            setActiveTab={setActiveTab}
            setOrderFilters={setOrderFilters}
            setAppliedOrderFilters={setAppliedOrderFilters}
            setCurrentPage={setCurrentPage}
            resetAndOpenModal={resetAndOpenModal}
            fetchData={fetchData}
            checkOrderAgainstRules={checkOrderAgainstRules}
            formatDate={formatDate}
          />
        );
      case 'orders':
        return (
          <Orders
            {...baseOrderProps}
            setOrders={setOrders}
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
            deleteOrder={deleteOrder}
            toggleOrderMgr={toggleOrderMgr}
          />
        );
      case 'overdue':
        return (
          <Overdue
            {...baseOrderProps}
            overdueFilters={overdueFilters}
            setOverdueFilters={setOverdueFilters}
            overduePage={overduePage}
            setOverduePage={setOverduePage}
            overduePageSize={overduePageSize}
            setOverduePageSize={setOverduePageSize}
          />
        );
      case 'warning_orders':
        return (
          <Warning
            {...orderWithRulesProps}
            warningFilters={warningFilters}
            setWarningFilters={setWarningFilters}
            warningPage={warningPage}
            setWarningPage={setWarningPage}
            warningPageSize={warningPageSize}
            setWarningPageSize={setWarningPageSize}
          />
        );
      case 'imminent_orders':
        return (
          <Imminent
            {...orderWithRulesProps}
            imminentFilters={imminentFilters}
            setImminentFilters={setImminentFilters}
            imminentPage={imminentPage}
            setImminentPage={setImminentPage}
            imminentPageSize={imminentPageSize}
            setImminentPageSize={setImminentPageSize}
          />
        );
      case 'customers':
        return (
          <Customers
            customers={customers}
            setEditingCustomer={setEditingCustomer}
            setNewCustomer={setNewCustomer}
            setShowCustomerModal={setShowCustomerModal}
            setDeletingCustomerId={setDeletingCustomerId}
          />
        );
      case 'inventory':
        return (
          <Inventory
            materials={materials}
            remnants={remnants}
          />
        );
      case 'finance':
        return (
          <Finance
            reconciliation={reconciliation}
          />
        );
      case 'advent_rules':
        return (
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
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      <Sidebar
        navItems={NAV_ITEMS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        authUser={authUser}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className="flex-1 bg-zinc-50 overflow-hidden flex flex-col !w-full !max-w-none !m-0 !p-0">
        <div className="!w-full h-full flex flex-col py-0 md:py-0 min-h-0 !max-w-none !m-0 !p-0">
          {renderActiveTab()}
        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <OrderModal
            show={showOrderModal}
            onClose={() => setShowOrderModal(false)}
            newOrder={newOrder}
            setNewOrder={setNewOrder}
            customers={customers}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            showCustomerDropdown={showCustomerDropdown}
            setShowCustomerDropdown={setShowCustomerDropdown}
            customerDropdownRef={customerDropdownRef}
            formErrors={formErrors}
            setFormErrors={setFormErrors}
            onSubmit={handleCreateOrder}
            isSaving={isSaving}
          />
        )}
      </AnimatePresence>

      {/* AI Drawing Modal */}
      <AiDrawingModal
        show={showAiModal}
        onClose={() => setShowAiModal(false)}
        aiPrompt={aiPrompt}
        setAiPrompt={setAiPrompt}
        isGenerating={isGenerating}
        generatedImage={generatedImage}
        onGenerate={generateAiDrawing}
        onUseImage={(imageData) => {
          setNewOrder({ ...newOrder, drawing_data: imageData });
          setShowAiModal(false);
        }}
      />

      {/* Drawing Viewer Modal */}
      <DrawingViewerModal
        show={showDrawingModal}
        onClose={() => setShowDrawingModal(null)}
      />

      {/* Customer Modal */}
      <CustomerModal
        show={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        editingCustomer={editingCustomer}
        newCustomer={newCustomer}
        setNewCustomer={setNewCustomer}
        onSave={handleSaveCustomer}
      />

      {/* Delete Customer Confirmation Modal */}
      <DeleteConfirmModal
        show={!!deletingCustomerId}
        onClose={() => setDeletingCustomerId(null)}
        onConfirm={() => handleDeleteCustomer(deletingCustomerId!)}
      />

      {/* Error Modal */}
      <ErrorModal
        show={showErrorModal}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setShowErrorModal(false)}
      />

      {/* Advent Rule Modal */}
      <RuleModal
        show={showRuleModal}
        onClose={() => setShowRuleModal(false)}
        editingRuleId={editingRuleId}
        ruleForm={ruleForm}
        setRuleForm={setRuleForm}
        adventRules={adventRules}
        onSubmit={handleRuleSubmit}
        onValidationError={(msg) => setValidationAlert(msg)}
      />

      {/* Delete Confirmation Modal for Rule */}
      <DeleteConfirmModal
        show={!!deletingRuleId}
        onClose={() => setDeletingRuleId(null)}
        onConfirm={() => deleteRule(deletingRuleId!)}
        title="确认删除规则？"
        message="此操作无法撤销，规则将被永久移除。"
      />

      {/* Validation Alert Modal */}
      <ValidationAlertModal
        show={validationAlert}
        onClose={() => setValidationAlert(null)}
      />
    </div>
  );
}

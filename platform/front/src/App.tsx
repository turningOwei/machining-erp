import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
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
import { Order, Customer, Material, Remnant } from './types';
import LoginPage from './LoginPage';
import Sidebar from './components/Sidebar';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import ErrorModal from './components/ErrorModal';
import ValidationAlertModal from './components/ValidationAlertModal';
import { createEmptyFilters, createOrderFilters } from './configs/filterConfigs';
import { formatDate, authFetch } from './components/shared';
import { NAV_ITEMS, NavItem } from './constants/navigation';
import { useOrders } from './hooks/useOrders';
import * as LucideIcons from 'lucide-react';
import {
  fetchOrdersApi,
  fetchCustomersApi,
  fetchDashboardDataApiNew,
  fetchInventoryDataApi,
  fetchFinanceApi,
  fetchRulesApi,
  deleteOrderApi,
  createRuleApi,
  updateRuleApi,
  deleteRuleApi
} from './services/api';

// 懒加载页面组件
const Orders = lazy(() => import('./pages/Orders'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Overdue = lazy(() => import('./pages/Overdue'));
const Warning = lazy(() => import('./pages/Warning'));
const Imminent = lazy(() => import('./pages/Imminent'));
const Customers = lazy(() => import('./pages/Customers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Finance = lazy(() => import('./pages/Finance'));
const Rules = lazy(() => import('./pages/Rules'));

// 生产相关页面
const ProductionDashboard = lazy(() => import('./pages/ProductionDashboard'));
const ProductionOrders = lazy(() => import('./pages/ProductionOrders'));
const ProductionOverdue = lazy(() => import('./pages/ProductionOverdue'));
const ProductionWarning = lazy(() => import('./pages/ProductionWarning'));
const ProductionImminent = lazy(() => import('./pages/ProductionImminent'));
const ProductionDelivery = lazy(() => import('./pages/ProductionDelivery'));
const Reconciliation = lazy(() => import('./pages/Reconciliation'));

// 管理相关页面
const UserManagement = lazy(() => import('./pages/UserManagement'));
const RoleManagement = lazy(() => import('./pages/RoleManagement'));
const ResourceManagement = lazy(() => import('./pages/ResourceManagement'));
const PrintTemplates = lazy(() => import('./pages/PrintTemplates'));

// 懒加载模态框组件
const OrderModal = lazy(() => import('./components/OrderModal'));
const AiDrawingModal = lazy(() => import('./components/AiDrawingModal'));
const DrawingViewerModal = lazy(() => import('./components/DrawingViewerModal'));
const CustomerModal = lazy(() => import('./components/CustomerModal'));
const RuleModal = lazy(() => import('./components/RuleModal'));
const UserSettingsModal = lazy(() => import('./components/UserSettingsModal'));

// 类型导入
type RuleForm = {
  name: string;
  description: string;
  formula: string;
  target_status: string;
  scopeType: string;
  ruleType: string;
};

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
  const [authUser, setAuthUser] = useState<{
    id?: number;
    username: string;
    name: string;
    role_name: string;
    corp_name: string;
    email?: string;
    expired_at?: string;
    resources?: { resource_key: string; name: string; icon: string; path: string }[];
  } | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  // 用户设置弹框
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [userSettingsType, setUserSettingsType] = useState<'password' | 'reset' | 'email' | null>(null);

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

  const handleLoginSuccess = (token: string, user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role_name: string;
    corp_name: string;
    expired_at?: string;
    resources?: { resource_key: string; name: string; icon: string; path: string }[];
  }) => {
    setIsAuthenticated(true);
    setAuthUser(user);
    localStorage.setItem('auth_user', JSON.stringify(user));
    fetchDashboardData();
    fetchCustomersData(); // 登录时加载客户数据
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'production_dashboard' | 'orders' | 'production_orders' | 'inventory' | 'finance' | 'overdue' | 'production_overdue' | 'warning_orders' | 'production_warning' | 'imminent_orders' | 'production_imminent' | 'advent_rules' | 'customers' | 'reconciliation' | 'print_template' | 'user_management' | 'role_management' | 'resource_management'>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [dashboardItems, setDashboardItems] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState<{
    pending_count: number;
    processing_count: number;
    completed_count: number;
    overdue_count: number;
    warning_count: number;
    near_due_count: number;
  }>({ pending_count: 0, processing_count: 0, completed_count: 0, overdue_count: 0, warning_count: 0, near_due_count: 0 });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [remnants, setRemnants] = useState<Remnant[]>([]);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [adventRules, setAdventRules] = useState<any[]>([]);
  const [printTemplates, setPrintTemplates] = useState<any[]>([]);
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
  const [orderTotal, setOrderTotal] = useState(0);
  const [overduePage, setOverduePage] = useState(1);
  const [overduePageSize, setOverduePageSize] = useState(10);
  const [overdueFilters, setOverdueFilters] = useState(createEmptyFilters);
  const [warningPage, setWarningPage] = useState(1);
  const [warningPageSize, setWarningPageSize] = useState(10);
  const [warningFilters, setWarningFilters] = useState(createEmptyFilters);
  const [imminentPage, setImminentPage] = useState(1);
  const [imminentPageSize, setImminentPageSize] = useState(10);
  const [imminentFilters, setImminentFilters] = useState(createEmptyFilters);
  // 送货管理筛选状态
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [deliveryPageSize, setDeliveryPageSize] = useState(10);
  const [deliveryFilters, setDeliveryFilters] = useState(createEmptyFilters);
  // 对账管理筛选状态
  const [reconciliationPage, setReconciliationPage] = useState(1);
  const [reconciliationPageSize, setReconciliationPageSize] = useState(10);
  const [reconciliationFilters, setReconciliationFilters] = useState(createEmptyFilters);
  // 订单管理筛选状态
  const [orderFilters, setOrderFilters] = useState(createOrderFilters);
  const [appliedOrderFilters, setAppliedOrderFilters] = useState(createOrderFilters);
  const [dashboardPage, setDashboardPage] = useState(1);
  const [dashboardPageSize, setDashboardPageSize] = useState(10);
  const [dashboardTotal, setDashboardTotal] = useState(0);
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
  const [validationAlert, setValidationAlert] = useState<string | null>(null);
  
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

  const handleRuleSubmit = async () => {
    try {
      if (editingRuleId) {
        await updateRuleApi(editingRuleId, ruleForm);
      } else {
        await createRuleApi(ruleForm);
      }
      setShowRuleModal(false);
      fetchRulesData();
    } catch (err) {
      console.error("Failed to save rule:", err);
    }
  };

  const deleteRule = async (id: number) => {
    try {
      await deleteRuleApi(id);
      setDeletingRuleId(null);
      fetchRulesData();
    } catch (err) {
      console.error("Failed to delete rule:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchRulesData();
  }, [ruleFilters.name]);

  // 获取工作看板数据（零件 + 订单 + 统计）
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const { items, stats, total } = await fetchDashboardDataApiNew(dashboardPage, dashboardPageSize);
      setDashboardItems(items);
      setDashboardStats(stats);
      setDashboardTotal(total);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 只获取订单数据（订单管理、逾期/告警/临期订单页面使用）
  const fetchOrdersData = async (dateType?: string, status?: string) => {
    try {
      // 订单管理使用后端分页，其他页面获取全部数据在客户端分页
      if (!dateType && !status) {
        const { data, total } = await fetchOrdersApi(undefined, currentPage, pageSize);
        setOrders(data);
        setOrderTotal(total);
      } else if (status) {
        // 送货管理按状态筛选
        const { data } = await fetchOrdersApi(undefined, 1, 1000, status);
        setOrders(data);
      } else {
        // 逾期/告警/临期订单获取全部数据
        const { data } = await fetchOrdersApi(dateType, 1, 1000);
        setOrders(data);
      }
    } catch (error) {
      console.error("Failed to fetch orders", error);
    }
  };

  // 使用 useOrders hook
  const {
    getOrderMaxDueDate,
    handleProcessClick,
    editOrder: editOrderFromHook,
    resetAndOpenModal: resetAndOpenModalFromHook
  } = useOrders(orders, setOrders, adventRules, fetchDashboardData);

  // Dashboard 专用的工序点击处理函数
  const handleDashboardProcessClick = useCallback(async (orderId: number, itemId: number, processId: number, currentStatus: string, name: string) => {
    const nextStatus = currentStatus === 'pending' ? 'processing' : currentStatus === 'processing' ? 'completed' : 'pending';

    // 更新 dashboardItems
    setDashboardItems(prevItems => prevItems.map(item => {
      if (item.item_id !== itemId) return item;
      if (!item.processes) return item;

      const newProcesses = item.processes.map(p =>
        p.id === processId ? { ...p, status: nextStatus } : p
      );

      // 计算新的零件状态
      const statuses = newProcesses.map(p => p.status || 'pending');
      let newItemStatus = 'pending';
      if (statuses.every(s => s === 'completed')) newItemStatus = 'completed';
      else if (!statuses.every(s => s === 'pending')) newItemStatus = 'processing';

      return {
        ...item,
        processes: newProcesses,
        status: newItemStatus
      };
    }));

    // 同时更新 orders（如果存在）
    setOrders(prevOrders => prevOrders.map(o => {
      if (Number(o.id) !== Number(orderId)) return o;
      if (!o.items) return o;

      const updatedItems = o.items.map(i => {
        if (Number(i.id) !== Number(itemId)) return i;
        if (!i.processes) return i;

        const newProcesses = i.processes.map(p =>
          Number(p.id) === Number(processId) ? { ...p, status: nextStatus } : p
        );

        const statuses = newProcesses.map(p => p.status || 'pending');
        let newItemStatus: 'pending' | 'processing' | 'completed' = 'pending';
        if (statuses.every(s => s === 'completed')) newItemStatus = 'completed';
        else if (!statuses.every(s => s === 'pending')) newItemStatus = 'processing';

        return { ...i, processes: newProcesses, status: newItemStatus };
      });

      const itemStatuses = updatedItems.map(i => i.status || 'pending');
      let newOrderStatus: 'pending' | 'processing' | 'completed' = 'pending';
      if (itemStatuses.every(s => s === 'completed' || s === 'delivered')) newOrderStatus = 'completed';
      else if (!itemStatuses.every(s => s === 'pending')) newOrderStatus = 'processing';

      return { ...o, items: updatedItems, status: newOrderStatus };
    }));

    // 调用 API 更新状态（不刷新数据）
    try {
      await authFetch(`/api/platform/order-items/${itemId}/processes/${processId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      console.error("Failed to update process status:", err);
    }
  }, [setDashboardItems, setOrders]);

  const editOrder = (order: Order) => {
    editOrderFromHook(order, setNewOrder, setShowOrderModal);
    // 设置客户搜索框显示当前客户名称
    setCustomerSearch(order.customer_short_name || '');
    setShowCustomerDropdown(false);
  };

  const resetAndOpenModal = () => {
    resetAndOpenModalFromHook(setNewOrder, setShowOrderModal);
  };

  // 获取客户数据
  const fetchCustomersData = async () => {
    try {
      const data = await fetchCustomersApi();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers", error);
    }
  };

  // 获取库存数据
  const fetchInventoryData = async () => {
    try {
      const { materials, remnants } = await fetchInventoryDataApi();
      setMaterials(materials);
      setRemnants(remnants);
    } catch (error) {
      console.error("Failed to fetch inventory data", error);
    }
  };

  // 获取财务数据
  const fetchFinanceData = async () => {
    try {
      const data = await fetchFinanceApi();
      setReconciliation(data);
    } catch (error) {
      console.error("Failed to fetch finance data", error);
    }
  };

  // 获取规则数据
  const fetchRulesData = async () => {
    try {
      const data = await fetchRulesApi(ruleFilters);
      setAdventRules(data);
    } catch (error) {
      console.error("Failed to fetch rules data", error);
    }
  };

  // 获取打印模板数据
  const fetchPrintTemplatesData = async () => {
    try {
      const res = await authFetch('/api/platform/print-templates');
      const result = await res.json();
      setPrintTemplates(result.data || []);
    } catch (error) {
      console.error("Failed to fetch print templates data", error);
    }
  };

  // 监听菜单切换，按需加载数据
  useEffect(() => {
    if (!isAuthenticated) return;

    // 先清空当前面板数据，避免显示旧数据
    switch (activeTab) {
      case 'dashboard':
        setDashboardItems([]);
        setDashboardStats({ pending_count: 0, processing_count: 0, completed_count: 0, overdue_count: 0, warning_count: 0, near_due_count: 0 });
        setDashboardPage(1);
        fetchDashboardData();
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_dashboard':
        setDashboardItems([]);
        setDashboardStats({ pending_count: 0, processing_count: 0, completed_count: 0, overdue_count: 0, warning_count: 0, near_due_count: 0 });
        setDashboardPage(1);
        fetchDashboardData();
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'orders':
        setOrders([]);
        setCurrentPage(1);
        fetchOrdersData();
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'overdue':
        setOrders([]);
        setOverduePage(1);
        fetchOrdersData('overdue');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'warning_orders':
        setOrders([]);
        setWarningPage(1);
        fetchOrdersData('warning');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'imminent_orders':
        setOrders([]);
        setImminentPage(1);
        fetchOrdersData('near_due');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_orders':
        setOrders([]);
        setCurrentPage(1);
        fetchOrdersData();
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_overdue':
        setOrders([]);
        setOverduePage(1);
        fetchOrdersData('overdue');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_warning':
        setOrders([]);
        setWarningPage(1);
        fetchOrdersData('warning');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_imminent':
        setOrders([]);
        setImminentPage(1);
        fetchOrdersData('near_due');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'production_delivery':
        setOrders([]);
        setDeliveryPage(1);
        fetchOrdersData(undefined, 'completed');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'reconciliation':
        setOrders([]);
        setReconciliationPage(1);
        fetchOrdersData(undefined, 'completed');
        if (customers.length === 0) fetchCustomersData();
        break;
      case 'customers':
        setCustomers([]);
        fetchCustomersData();
        break;
      case 'inventory':
        setMaterials([]);
        setRemnants([]);
        fetchInventoryData();
        break;
      case 'finance':
        setReconciliation([]);
        fetchFinanceData();
        break;
      case 'advent_rules':
        setAdventRules([]);
        fetchRulesData();
        break;
      case 'print_template':
        setPrintTemplates([]);
        fetchPrintTemplatesData();
        break;
    }
  }, [activeTab, isAuthenticated]);

  // 监听工作看板分页变化
  useEffect(() => {
    if (!isAuthenticated || activeTab !== 'dashboard') return;
    fetchDashboardData();
  }, [dashboardPage, dashboardPageSize]);

  // 监听订单管理分页变化
  useEffect(() => {
    if (!isAuthenticated || (activeTab !== 'orders' && activeTab !== 'production_orders')) return;
    fetchOrdersData();
  }, [currentPage, pageSize]);

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
      setOrders(Array.isArray(ordersData.data) ? ordersData.data : Array.isArray(ordersData) ? ordersData : []);
      if (ordersData.total) setOrderTotal(ordersData.total);
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

  // 带筛选条件的订单查询
  const fetchOrdersWithFilters = async (filters: typeof orderFilters, page?: number, pageSize?: number, dateType?: string) => {
    const params = new URLSearchParams();
    if (filters.dueDateStart) params.append('dueDateStart', filters.dueDateStart);
    if (filters.dueDateEnd) params.append('dueDateEnd', filters.dueDateEnd);
    if (filters.orderNumber) params.append('orderNumber', filters.orderNumber);
    if (filters.partNumber) params.append('partNumber', filters.partNumber);
    if (filters.partName) params.append('partName', filters.partName);
    if (filters.customerName) params.append('customerName', filters.customerName);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.status) params.append('status', filters.status);
    if (dateType) params.append('dateType', dateType);
    if (page) params.append('page', String(page));
    if (pageSize) params.append('pageSize', String(pageSize));

    const url = `/api/platform/orders${params.toString() ? '?' + params.toString() : ''}`;
    const res = await authFetch(url);
    const data = await res.json();
    setOrders(Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : []);
    if (data.total) setOrderTotal(data.total);
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

    // 验证每个零件的工序流程中必须有送货工序
    if (newOrder.items && newOrder.items.length > 0) {
      const itemsWithoutDelivery = newOrder.items.filter(item => {
        const processes = item.processes || [];
        const deliveryCount = processes.filter(p => p.name === '送货').length;
        return deliveryCount !== 1;
      });
      if (itemsWithoutDelivery.length > 0) {
        setValidationAlert(`有 ${itemsWithoutDelivery.length} 个零件缺少送货工序或送货工序重复，请检查工序流程`);
        return;
      }
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
    fetchData: fetchOrdersData,
  };

  const orderWithRulesProps = {
    ...baseOrderProps,
  };

  // Render active tab based on activeTab state
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            {...baseOrderProps}
            handleProcessClick={handleDashboardProcessClick}
            dashboardItems={dashboardItems}
            dashboardStats={dashboardStats}
            dashboardPage={dashboardPage}
            dashboardPageSize={dashboardPageSize}
            dashboardTotal={dashboardTotal}
            setDashboardPage={setDashboardPage}
            setDashboardPageSize={setDashboardPageSize}
            setActiveTab={setActiveTab}
            setOrderFilters={setOrderFilters}
            setAppliedOrderFilters={setAppliedOrderFilters}
            setCurrentPage={setCurrentPage}
            resetAndOpenModal={resetAndOpenModal}
            fetchData={fetchDashboardData}
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
            orderTotal={orderTotal}
            orderMgrExpanded={orderMgrExpanded}
            setOrderMgrExpanded={setOrderMgrExpanded}
            allOrderMgrExpanded={allOrderMgrExpanded}
            setAllOrderMgrExpanded={setAllOrderMgrExpanded}
            resetAndOpenModal={resetAndOpenModal}
            deleteOrder={deleteOrder}
            toggleOrderMgr={toggleOrderMgr}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
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
            fetchOrdersWithFilters={fetchOrdersWithFilters}
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
            fetchOrdersWithFilters={fetchOrdersWithFilters}
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
            fetchOrdersWithFilters={fetchOrdersWithFilters}
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
            fetchData={fetchCustomersData}
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
            fetchData={fetchRulesData}
          />
        );
      // 生产相关菜单 - 使用独立组件
      case 'production_dashboard':
        return (
          <ProductionDashboard
            {...baseOrderProps}
            handleProcessClick={handleDashboardProcessClick}
            dashboardItems={dashboardItems}
            dashboardStats={dashboardStats}
            dashboardPage={dashboardPage}
            dashboardPageSize={dashboardPageSize}
            dashboardTotal={dashboardTotal}
            setDashboardPage={setDashboardPage}
            setDashboardPageSize={setDashboardPageSize}
            setActiveTab={setActiveTab}
            setOrderFilters={setOrderFilters}
            setAppliedOrderFilters={setAppliedOrderFilters}
            setCurrentPage={setCurrentPage}
            resetAndOpenModal={resetAndOpenModal}
            fetchData={fetchDashboardData}
            formatDate={formatDate}
          />
        );
      case 'production_orders':
        return (
          <ProductionOrders
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
            orderTotal={orderTotal}
            orderMgrExpanded={orderMgrExpanded}
            setOrderMgrExpanded={setOrderMgrExpanded}
            allOrderMgrExpanded={allOrderMgrExpanded}
            setAllOrderMgrExpanded={setAllOrderMgrExpanded}
            resetAndOpenModal={resetAndOpenModal}
            deleteOrder={deleteOrder}
            toggleOrderMgr={toggleOrderMgr}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      case 'production_overdue':
        return (
          <ProductionOverdue
            {...baseOrderProps}
            overdueFilters={overdueFilters}
            setOverdueFilters={setOverdueFilters}
            overduePage={overduePage}
            setOverduePage={setOverduePage}
            overduePageSize={overduePageSize}
            setOverduePageSize={setOverduePageSize}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      case 'production_warning':
        return (
          <ProductionWarning
            {...orderWithRulesProps}
            warningFilters={warningFilters}
            setWarningFilters={setWarningFilters}
            warningPage={warningPage}
            setWarningPage={setWarningPage}
            warningPageSize={warningPageSize}
            setWarningPageSize={setWarningPageSize}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      case 'production_imminent':
        return (
          <ProductionImminent
            {...orderWithRulesProps}
            imminentFilters={imminentFilters}
            setImminentFilters={setImminentFilters}
            imminentPage={imminentPage}
            setImminentPage={setImminentPage}
            imminentPageSize={imminentPageSize}
            setImminentPageSize={setImminentPageSize}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      case 'production_delivery':
        return (
          <ProductionDelivery
            {...baseOrderProps}
            deliveryFilters={deliveryFilters}
            setDeliveryFilters={setDeliveryFilters}
            deliveryPage={deliveryPage}
            setDeliveryPage={setDeliveryPage}
            deliveryPageSize={deliveryPageSize}
            setDeliveryPageSize={setDeliveryPageSize}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      case 'reconciliation':
        return (
          <Reconciliation
            {...baseOrderProps}
            reconciliationFilters={reconciliationFilters}
            setReconciliationFilters={setReconciliationFilters}
            reconciliationPage={reconciliationPage}
            setReconciliationPage={setReconciliationPage}
            reconciliationPageSize={reconciliationPageSize}
            setReconciliationPageSize={setReconciliationPageSize}
            fetchOrdersWithFilters={fetchOrdersWithFilters}
          />
        );
      // 管理相关菜单
      case 'user_management':
        return <UserManagement />;
      case 'role_management':
        return <RoleManagement />;
      case 'resource_management':
        return <ResourceManagement />;
      case 'print_template':
        return <PrintTemplates printTemplates={printTemplates} setPrintTemplates={setPrintTemplates} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row overflow-hidden">
      <Sidebar
        navItems={authUser?.resources ? authUser.resources.map(r => ({
          id: r.resource_key,
          label: r.name,
          icon: (LucideIcons as Record<string, React.ComponentType<{ className?: string }>>)[r.icon] || LucideIcons.LayoutDashboard
        })) : NAV_ITEMS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        authUser={authUser}
        onLogout={handleLogout}
        onOpenSettings={(type) => {
          setUserSettingsType(type);
          setShowUserSettings(true);
        }}
      />

      {/* User Settings Modal */}
      <Suspense fallback={null}>
        <UserSettingsModal
          isOpen={showUserSettings}
          type={userSettingsType}
          onClose={() => {
            setShowUserSettings(false);
            setUserSettingsType(null);
          }}
          onLogout={handleLogout}
          userId={authUser?.id || 0}
          userEmail={authUser?.email || ''}
        />
      </Suspense>

      {/* Main Content */}
      <main className="flex-1 bg-zinc-50 overflow-hidden flex flex-col !w-full !max-w-none !m-0 !p-0">
        <div className="!w-full h-full flex flex-col py-0 md:py-0 min-h-0 !max-w-none !m-0 !p-0">
          <Suspense fallback={<div className="flex items-center justify-center h-full"><RefreshCw className="w-6 h-6 animate-spin text-zinc-400" /></div>}>
            {renderActiveTab()}
          </Suspense>
        </div>
      </main>

      {/* Order Modal */}
      <AnimatePresence>
        {showOrderModal && (
          <Suspense fallback={null}>
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
              hideCostFields={activeTab.startsWith('production_')}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* AI Drawing Modal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Drawing Viewer Modal */}
      <Suspense fallback={null}>
        <DrawingViewerModal
          show={showDrawingModal}
          onClose={() => setShowDrawingModal(null)}
        />
      </Suspense>

      {/* Customer Modal */}
      <Suspense fallback={null}>
        <CustomerModal
          show={showCustomerModal}
          onClose={() => setShowCustomerModal(false)}
          editingCustomer={editingCustomer}
          newCustomer={newCustomer}
          setNewCustomer={setNewCustomer}
          onSave={handleSaveCustomer}
        />
      </Suspense>

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
      <Suspense fallback={null}>
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
      </Suspense>

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
        title="工序流程验证"
      />
    </div>
  );
}

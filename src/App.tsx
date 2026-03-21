import React, { useState, useEffect } from 'react';
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
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { Order, OrderItem, OrderProcess, Customer, Material, Remnant, Reconciliation } from './types';

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

interface OrderMonitorPanelProps {
  title: string;
  icon: React.ElementType;
  orders: Order[];
  filters: any;
  setFilters: (filters: any) => void;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  themeColor: string; // e.g. 'rose', 'orange', 'amber'
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: any;
  getOrderMaxDueDate: (order: Order) => string;
}

const OrderMonitorPanel = ({
  title, icon: Icon, orders, filters, setFilters, page, setPage, pageSize, setPageSize, themeColor,
  editOrder, setShowDrawingModal, handleProcessClick, getOrderMaxDueDate
}: OrderMonitorPanelProps) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(true);

  // Sort orders by start_date ascending
  const sortedOrders = [...orders].sort((a, b) => {
    const dateA = a.start_date || '';
    const dateB = b.start_date || '';
    return dateA.localeCompare(dateB);
  });

  const filteredOrders = sortedOrders.filter(o => {
    const mDate = getOrderMaxDueDate(o);
    const matchDueDate = !filters.dueDate || mDate === filters.dueDate;
    const matchOrderNumber = !filters.orderNumber || String(o.order_number || o.id).toLowerCase().includes(filters.orderNumber.toLowerCase());
    const matchCustomer = !filters.customerName || o.customer_name.toLowerCase().includes(filters.customerName.toLowerCase());
    const matchPriority = !filters.priority || o.priority === filters.priority;
    const matchPartNumber = !filters.partNumber || (o.items || []).some(item => (item.part_number || '').toLowerCase().includes(filters.partNumber.toLowerCase()));
    return matchDueDate && matchOrderNumber && matchCustomer && matchPriority && matchPartNumber;
  });

  const displayOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  // Initialize expanded orders when displayOrders changes
  React.useEffect(() => {
    if (allExpanded) {
      setExpandedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  }, [filteredOrders.length, allExpanded]);

  const toggleOrder = (orderId: number) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const colors = {
    blue: { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', sep: 'border-blue-200', sepHex: '#93c5fd', pseudoSep: 'after:bg-blue-300', headText: 'text-blue-900', headBg: 'bg-blue-100', listBorder: 'border-l-blue-500', focus: 'focus:ring-blue-500', pageActive: 'bg-blue-600 text-white shadow-blue-100', pageBtn: 'hover:bg-blue-50' },
    rose: { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', sep: 'border-rose-300', sepHex: '#fb7185', pseudoSep: 'after:bg-rose-300', headText: 'text-rose-900', headBg: 'bg-rose-100', listBorder: 'border-l-rose-500', focus: 'focus:ring-rose-500', pageActive: 'bg-rose-600 text-white shadow-rose-100', pageBtn: 'hover:bg-rose-50' },
    orange: { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', sep: 'border-orange-300', sepHex: '#fb923c', pseudoSep: 'after:bg-orange-300', headText: 'text-orange-900', headBg: 'bg-orange-100', listBorder: 'border-l-orange-500', focus: 'focus:ring-orange-500', pageActive: 'bg-orange-600 text-white shadow-orange-100', pageBtn: 'hover:bg-orange-50' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sep: 'border-amber-300', sepHex: '#fbbf24', pseudoSep: 'after:bg-amber-300', headText: 'text-amber-900', headBg: 'bg-amber-100', listBorder: 'border-l-amber-500', focus: 'focus:ring-amber-500', pageActive: 'bg-amber-600 text-white shadow-amber-100', pageBtn: 'hover:bg-amber-50' }
  }[themeColor as 'blue' | 'rose' | 'orange' | 'amber'] || { text: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-100', sep: 'border-zinc-300', sepHex: '#a1a1aa', pseudoSep: 'after:bg-zinc-300', headText: 'text-zinc-900', headBg: 'bg-zinc-50', listBorder: 'border-l-zinc-500', focus: 'focus:ring-zinc-900', pageActive: 'bg-zinc-600 text-white shadow-zinc-100', pageBtn: 'hover:bg-zinc-50' };

  return (
    <div className="flex-1 !w-full flex flex-col min-h-0 space-y-8 animate-in fade-in duration-500 py-4 md:py-8 !max-w-none !m-0 !p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${colors.text} flex items-center gap-2`}>
            <Icon className="w-8 h-8" />
            {title}
            <span className="text-base font-normal text-zinc-500">检测到 {filteredOrders.length} 个符合筛选条件的订单</span>
          </h2>
        </div>
        <button
          onClick={() => {
            if (allExpanded) {
              setExpandedOrders(new Set());
              setAllExpanded(false);
            } else {
              setExpandedOrders(new Set(filteredOrders.map(o => o.id)));
              setAllExpanded(true);
            }
          }}
          className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-2"
        >
          {allExpanded ? <ChevronUp className="shrink-0 w-4 h-4" /> : <ChevronDown className="shrink-0 w-4 h-4" />}
          {allExpanded ? '全部收起' : '全部展开'}
        </button>
      </div>

      <div className="px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-white p-4 rounded-none border border-zinc-200 shadow-sm">
        {[
          { label: '交货日期', key: 'dueDate', type: 'date', placeholder: '' },
          { label: '订单号', key: 'orderNumber', type: 'text', placeholder: '搜索订单号...' },
          { label: '零件号', key: 'partNumber', type: 'text', placeholder: '搜索零件或客户...' },
          { label: '客户名称', key: 'customerName', type: 'text', placeholder: '搜索客户...' }
        ].map(f => (
          <div key={f.key} className="space-y-1.5">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{f.label}</label>
            <input 
              type={f.type}
              placeholder={f.placeholder}
              value={filters[f.key]}
              onChange={(e) => {
                setFilters({ ...filters, [f.key]: e.target.value });
                setPage(1);
              }}
              className={`w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${colors.focus}`}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">优先级</label>
          <select 
            value={filters.priority}
            onChange={(e) => {
              setFilters({ ...filters, priority: e.target.value });
              setPage(1);
            }}
            className={`w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${colors.focus} bg-white`}
          >
            <option value="">全部优先级</option>
            <option value="high">高优先级</option>
            <option value="medium">普通</option>
            <option value="low">较低</option>
          </select>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-none border-y border-l-0 border-zinc-200 overflow-auto shadow-none" style={{ '--sep-color': colors.sepHex } as React.CSSProperties}>
        <table className={`min-w-[2100px] w-full text-left text-sm table-fixed border-b ${colors.sep}`}>
          <thead className={`${colors.headBg} sticky top-0 z-20`}>
            <tr className="whitespace-nowrap">
              <th className={`pl-4 pr-6 py-4 font-semibold ${colors.headText} w-[192px] sticky left-0 ${colors.headBg} z-20 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] cursor-pointer hover:brightness-95`}
                  onClick={() => {
                    if (allExpanded) {
                      setExpandedOrders(new Set());
                      setAllExpanded(false);
                    } else {
                      setExpandedOrders(new Set(filteredOrders.map(o => o.id)));
                      setAllExpanded(true);
                    }
                  }}
                >
                  <div className="flex items-center gap-2">
                    {allExpanded ? <ChevronUp className="shrink-0 w-4 h-4" /> : <ChevronDown className="shrink-0 w-4 h-4" />}
                    零件名称
                  </div>
                </th>
              <th className={`px-6 py-4 font-bold ${colors.headText} w-[160px] sticky left-[192px] ${colors.headBg} z-20 text-sm text-center shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>零件号(P/N)</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>数量</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>报废数量</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>单价 (¥)</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>总计 (¥)</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>订单日期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.text} font-bold`}>交货日期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>完工日期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>交货数量</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>刀具费用</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工装费用</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>材料费用</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>其他费用</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-96 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工序流程</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>外协共计 (¥)</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>状态</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-64 font-bold text-sm shadow-[inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>备注</th>
              <th className={`pl-4 pr-6 py-4 font-bold ${colors.headText} w-20 text-sm text-left sticky right-2 ${colors.headBg} z-20 shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>操作</th>
              <th className={`w-2 sticky right-0 bg-white z-20 border-none`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              // Sort items by due_date ascending
              const sortedItems = [...(order.items || [])].sort((a, b) => {
                const dateA = a.due_date || order.due_date || '';
                const dateB = b.due_date || order.due_date || '';
                return dateA.localeCompare(dateB);
              });

              return (
              <React.Fragment key={order.id}>
                <tr
                  className={`${colors.bg} sticky top-[52px] z-[15] cursor-pointer hover:brightness-95 transition-all`}
                  onClick={() => toggleOrder(order.id)}
                >
                  <td className={`pl-4 pr-6 py-2 sticky left-0 ${colors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className={`shrink-0 w-4 h-4 ${colors.text}`} /> : <ChevronDown className={`shrink-0 w-4 h-4 ${colors.text}`} />}
                      <span className={`text-sm font-bold ${colors.headText} whitespace-nowrap`}>{order.order_number || order.id}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-2 sticky left-[192px] ${colors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-zinc-600 underline decoration-zinc-200 underline-offset-4 font-medium">{order.customer_name}</span>
                      <PriorityBadge priority={order.priority} />
                    </div>
                  </td>
                  <td colSpan={4} className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}></td>
                  <td className={`px-6 py-2 text-xs text-zinc-500 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    {order.start_date && (
                      <div className="flex items-center gap-1.5 opacity-80">
                        <span className="p-1 bg-zinc-100 rounded text-zinc-400">订</span>
                        {order.start_date}
                      </div>
                    )}
                  </td>
                  <td className={`px-6 py-2 text-xs font-bold ${colors.text} whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    <div className="flex items-center gap-1.5">
                      <Icon className="w-4 h-4" />
                      {getOrderMaxDueDate(order)}
                    </div>
                  </td>
                  <td colSpan={6} className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}></td>
                  <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    {(() => {
                      const allProcesses = (order.items || []).flatMap((item: any) => item.processes || []);
                      if (allProcesses.length === 0) return null;
                      return (
                        <div className="flex gap-1">
                          {allProcesses.map((p: any, idx: number) => {
                            const statusColors: Record<string, { border: string; bg: string }> = {
                              pending: { border: 'border-zinc-300', bg: 'bg-white' },
                              processing: { border: 'border-blue-400', bg: 'bg-white' },
                              completed: { border: 'border-emerald-400', bg: 'bg-emerald-400' }
                            };
                            const sc = statusColors[p.status] || statusColors.pending;
                            return (
                              <div
                                key={idx}
                                className={`w-3 h-5 rounded-sm border ${sc.border} ${sc.bg} relative overflow-hidden`}
                                title={`${p.name || '工序'}: ${p.status === 'pending' ? '待加工' : p.status === 'processing' ? '加工中' : '已完成'}`}
                              >
                                {p.status === 'processing' && (
                                  <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-400" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </td>
                  <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}></td>
                  <td className={`px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                    <StatusBadge status={order.status} />
                  </td>
                  <td className={`px-6 py-2 shadow-[inset_0_-1px_0_0_var(--sep-color)]`}>
                    {order.notes && (
                      <div className="flex items-center gap-2 text-zinc-500 max-w-xl overflow-hidden">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-xs truncate italic">{order.notes}</span>
                      </div>
                    )}
                  </td>
                  <td className={`pl-4 pr-6 py-2 sticky right-2 ${colors.bg} z-[3] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),-4px_0_8px_rgba(0,0,0,0.02)]`}>
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => editOrder(order)}
                        className="inline-flex items-center gap-1.5 text-zinc-900 font-bold hover:text-blue-600 transition-colors py-1.5 px-3 hover:bg-white rounded-lg whitespace-nowrap"
                      >
                        <Settings className="w-4 h-4" />
                        <span className="text-xs">修改</span>
                      </button>
                    </div>
                  </td>
                  <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                </tr>
                {isExpanded && sortedItems.map((item) => (
                  <tr key={item.id} className={`hover:${colors.bg}/10 transition-colors group`}>
                    <td className={`pl-4 pr-6 py-4 sticky left-0 bg-white z-[2] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-900 whitespace-nowrap">{item.part_name}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 sticky left-[192px] bg-white z-[2] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">{item.part_number || '-'}</span>
                    </td>
                    <td className={`px-6 py-4 text-zinc-900 font-medium whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      {item.quantity}
                    </td>
                    <td className={`px-6 py-4 font-medium whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] ${(item.scrap_quantity || 0) > 0 ? 'bg-white text-red-600' : 'text-zinc-900'}`}>
                      {item.scrap_quantity || '-'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-600 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      ¥{item.unit_price}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <div className="text-zinc-900 font-bold">
                        ¥{(item.quantity * item.unit_price).toFixed(2)}
                      </div>
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      {item.start_date || order.start_date || '-'}
                    </td>
                    <td className={`px-6 py-4 ${colors.text} font-bold whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] ${colors.bg}/20`}>
                      {item.due_date || order.due_date}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      {item.completion_date || '-'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      {item.delivered_quantity || '-'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      ¥{item.tool_cost || '0'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      ¥{item.fixture_cost || '0'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      ¥{item.material_cost || '0'}
                    </td>
                    <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      ¥{item.other_cost || '0'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      {item.processes && item.processes.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.processes.map((p) => (
                            <div
                              key={p.id}
                              className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors whitespace-nowrap ${PROCESS_COLORS[p.name] || 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                              onClick={() => handleProcessClick(order.id, item.id, p.id, p.status, p.name)}
                            >
                              <span className="text-[10px] font-bold">{p.name}</span>
                              <ProcessStatusBadge status={p.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <div className="text-zinc-500 font-bold text-right px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg whitespace-nowrap">
                        ¥{(item.processes || []).reduce((sum, p) => (sum + (p.outsourcing_fee || 0)), 0).toFixed(2)}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <StatusBadge status={item.status} />
                    </td>
                    <td className={`px-6 py-4 border-b ${colors.sep}`}>
                      <div className="text-xs text-zinc-500 truncate max-w-[200px]" title={item.notes}>
                        {item.notes || '-'}
                      </div>
                    </td>
                    <td className={`pl-4 pr-6 py-4 text-left sticky right-2 bg-white group-hover:bg-zinc-50 border-b ${colors.sep} z-[2] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),-4px_0_8px_rgba(0,0,0,0.02)]`}>
                      <div className="flex justify-start gap-2">
                        {item.drawing_data && (
                          <button 
                            onClick={() => setShowDrawingModal(item.drawing_data!)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                            title="查看图纸"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                  </tr>
                ))}
              </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 md:px-8 py-2 border-t border-zinc-100 flex-shrink-0">
        <div className="flex items-center gap-4 text-sm text-zinc-500">
          <span>共<span className="font-bold text-zinc-900">{filteredOrders.length}</span> 个订单</span>
          <select 
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
            className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1 outline-none focus:ring-2 focus:ring-zinc-900"
          >
            {[10, 20, 50, 100].map(size => (
              <option key={size} value={size}>每页 {size} 条</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button 
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            className="p-2 border border-zinc-200 rounded-none hover:bg-zinc-50 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.ceil(filteredOrders.length / pageSize) }, (_, i) => i + 1)
              .filter(p => p === 1 || p === Math.ceil(filteredOrders.length / pageSize) || Math.abs(p - page) <= 1)
              .map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-zinc-400">...</span>}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-none font-bold transition-all ${page === p ? colors.pageActive + ' shadow-lg' : colors.pageBtn + ' text-zinc-500'}`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))
            }
          </div>
          <button 
            disabled={page === Math.ceil(filteredOrders.length / pageSize) || filteredOrders.length === 0}
            onClick={() => setPage(page + 1)}
            className="p-2 border border-zinc-200 rounded-none hover:bg-zinc-50 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'inventory' | 'finance' | 'overdue' | 'warning_orders' | 'imminent_orders' | 'advent_rules'>('dashboard');
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
      const response = await fetch(`/api/order-items/${itemId}/processes/${processId}`, {
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
      const response = await fetch(`/api/advent-rules?${qs}`);
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
      const url = editingRuleId ? `/api/advent-rules/${editingRuleId}` : '/api/advent-rules';
      
      const response = await fetch(url, {
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
      const response = await fetch(`/api/advent-rules/${id}`, { method: 'DELETE' });
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
        fetch('/api/orders'),
        fetch('/api/customers'),
        fetch('/api/materials'),
        fetch('/api/remnants'),
        fetch('/api/finance/reconciliation')
      ]);
      
      setOrders(await ordersRes.json());
      setCustomers(await customersRes.json());
      setMaterials(await materialsRes.json());
      setRemnants(await remnantsRes.json());
      setReconciliation(await financeRes.json());
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const editOrder = (order: Order) => {
    setNewOrder({
      id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,
      priority: order.priority,
      start_date: order.start_date,
      due_date: order.due_date,
      notes: order.notes,
      items: order.items.map(item => ({
        ...item,
        start_date: item.start_date || order.start_date,
        due_date: item.due_date || order.due_date,
        processes: item.processes.map(p => ({ ...p }))
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
      const url = newOrder.id ? `/api/orders/${newOrder.id}` : "/api/orders";
      
      const orderToSave = { ...newOrder };
      // Sync dates if missing at order level
      if (!orderToSave.start_date && orderToSave.items?.[0]?.start_date) {
        orderToSave.start_date = orderToSave.items[0].start_date;
      }
      if (!orderToSave.due_date && orderToSave.items?.[0]?.due_date) {
        orderToSave.due_date = orderToSave.items[0].due_date;
      }

      const response = await fetch(url, {
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



  const updateItemStatus = async (itemId: number, status: any) => {
    try {
      await fetch(`/api/order-items/${itemId}`, {
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
    { id: 'inventory', label: '仓库余料', icon: Package },
    { id: 'finance', label: '财务对账', icon: CircleDollarSign },
    { id: 'advent_rules', label: '规则管理', icon: Settings2 },
  ];

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
                  老板
                </div>
                {!isSidebarCollapsed && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 overflow-hidden"
                  >
                    <p className="text-sm font-medium text-white truncate">王厂长</p>
                    <p className="text-xs truncate opacity-50">管理员</p>
                  </motion.div>
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
            <div className="flex-1 overflow-y-auto space-y-8 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">工作看板</h2>
                  <p className="text-zinc-500">今日共有 {orders.filter(o => o.status !== 'delivered').length} 个进行中的任务</p>
                </div>
                <button 
                  onClick={resetAndOpenModal}
                  className="bg-zinc-900 text-white px-6 py-3 rounded-none font-medium flex items-center justify-start gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
                >
                  <Plus className="w-5 h-5" />
                  新建订单
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 px-4 md:px-8">
                {[
                  { label: '待加工', count: orders.filter(o => o.status === 'pending').length, color: 'amber', icon: Clock, action: 'filter', filterStatus: 'pending' },
                  { label: '加工中', count: orders.filter(o => o.status === 'processing').length, color: 'blue', icon: TrendingUp, action: 'filter', filterStatus: 'processing' },
                  { label: '逾期订单', count: orders.filter(o => (getOrderMaxDueDate(o) || '') < new Date().toISOString().split('T')[0] && o.status !== 'delivered').length, color: 'rose', icon: AlertCircle, action: 'tab', tab: 'overdue' },
                  { label: '告警订单', count: orders.filter(o => checkOrderAgainstRules(o, 'warning')).length, color: 'orange', icon: AlertTriangle, action: 'tab', tab: 'warning_orders' },
                  { label: '临期订单', count: orders.filter(o => checkOrderAgainstRules(o, 'imminent')).length, color: 'yellow', icon: Clock, action: 'tab', tab: 'imminent_orders' },
                  { label: '已完成', count: orders.filter(o => o.status === 'completed').length, color: 'emerald', icon: CheckCircle2, action: 'filter', filterStatus: 'completed' },
                  { label: '本月营收', count: `¥${reconciliation[0]?.total_amount || 0}`, color: 'zinc', icon: CircleDollarSign, action: 'none' },
                ].map((stat, i) => {
                  const colorStyles: Record<string, { bg: string; text: string; hover: string }> = {
                    amber: { bg: 'bg-amber-50', text: 'text-amber-600', hover: 'hover:bg-amber-100' },
                    blue: { bg: 'bg-blue-50', text: 'text-blue-600', hover: 'hover:bg-blue-100' },
                    rose: { bg: 'bg-rose-50', text: 'text-rose-600', hover: 'hover:bg-rose-100' },
                    orange: { bg: 'bg-orange-50', text: 'text-orange-600', hover: 'hover:bg-orange-100' },
                    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', hover: 'hover:bg-yellow-100' },
                    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', hover: 'hover:bg-emerald-100' },
                    zinc: { bg: 'bg-zinc-50', text: 'text-zinc-600', hover: 'hover:bg-zinc-100' },
                  };
                  const style = colorStyles[stat.color] || colorStyles.zinc;
                  const isClickable = stat.action !== 'none';

                  const handleClick = () => {
                    if (stat.action === 'tab' && stat.tab) {
                      setActiveTab(stat.tab);
                    } else if (stat.action === 'filter' && stat.filterStatus) {
                      setOrderFilters(prev => ({ ...prev, status: stat.filterStatus as any }));
                      setAppliedOrderFilters(prev => ({ ...prev, status: stat.filterStatus as any }));
                      setActiveTab('orders');
                      setCurrentPage(1);
                    }
                  };

                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={isClickable ? handleClick : undefined}
                      className={`bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm ${isClickable ? 'cursor-pointer hover:shadow-md hover:border-zinc-300 transition-all' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center`}>
                          <stat.icon className={`w-5 h-5 ${style.text}`} />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                      <p className="text-2xl font-bold mt-1">{stat.count}</p>
                    </motion.div>
                  );
                })}
              </div>

              {/* Order List (Dashboard View) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    紧急待办(零件明细)
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={fetchData}
                      className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 transition-colors"
                      title="刷新数据"
                    >
                      <TrendingUp className="w-4 h-4 rotate-90" />
                    </button>
                    <button 
                      onClick={resetAndOpenModal}
                      className="bg-zinc-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-zinc-800 transition-all shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                      快速下单                    </button>
                  </div>
                </div>
                <div className="grid gap-3">
                  {(() => {
                    const allItems = orders
                      .flatMap(o => (o.items || []).map(item => ({ ...item, order: o })))
                      .filter(item => item.status !== 'delivered' && item.status !== 'completed')
                      .sort((a, b) => {
                        // 1. 优先级排序 (High > Medium > Low)
                        const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
                        const pA = priorityOrder[a.order.priority] ?? 1;
                        const pB = priorityOrder[b.order.priority] ?? 1;
                        if (pA !== pB) return pA - pB;

                        // 2. 交期排序 (从小到大)
                        const dateA = a.due_date || a.order.due_date || '9999-12-31';
                        const dateB = b.due_date || b.order.due_date || '9999-12-31';
                        if (dateA !== dateB) return dateA.localeCompare(dateB);

                        // 3. 状态排序 (待加工 > 加工中)
                        const statusOrder: Record<string, number> = { pending: 0, processing: 1 };
                        const sA = statusOrder[a.status] ?? 2;
                        const sB = statusOrder[b.status] ?? 2;
                        return sA - sB;
                      });
                    const paginatedItems = allItems.slice((dashboardPage - 1) * dashboardPageSize, dashboardPage * dashboardPageSize);
                    
                    if (paginatedItems.length > 0) {
                      return (
                        <>
                          {paginatedItems.map((item) => (
                            <motion.div 
                              layout
                              key={`${item.order.id}-${item.id}`}
                              className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-zinc-300 transition-colors shadow-sm"
                            >
                              <div className="flex items-start gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${item.status === 'processing' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-50 text-zinc-400'}`}>
                                  <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-bold">{item.part_name}</h4>
                                    <PriorityBadge priority={item.order.priority} />
                                    <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">订单: {item.order.order_number || item.order.id}</span>
                                  </div>
                                  <p className="text-sm text-zinc-500">{item.order.customer_name} · 数量: {item.quantity}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-zinc-400" />
                                    <span className="text-xs text-zinc-400">
                                      {(item.start_date || item.order.start_date) && `订单: ${item.start_date || item.order.start_date} · `}
                                      交期: {item.due_date || item.order.due_date}
                                    </span>
                                    {item.part_number && (
                                      <>
                                        <span className="text-zinc-300">|</span>
                                        <span className="text-xs text-zinc-500 font-mono">P/N: {item.part_number}</span>
                                      </>
                                    )}
                                  </div>
                                  
                                  {item.notes && (
                                    <div className="mt-2 flex items-start gap-1.5 bg-zinc-50 p-2 border border-zinc-100/50">
                                      <FileText className="w-3.5 h-3.5 text-zinc-400 mt-0.5 shrink-0" />
                                      <p className="text-[11px] text-zinc-500 italic leading-relaxed">{item.notes}</p>
                                    </div>
                                  )}
                                  
                                  {item.processes && item.processes.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {item.processes.map((p) => (
                                        <div 
                                          key={p.id} 
                                          className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors ${PROCESS_COLORS[p.name] || 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                                            onClick={() => handleProcessClick(item.order.id, item.id, p.id, p.status, p.name)}
                                        >
                                          <span className="text-[10px] font-bold">{p.name}</span>
                                          <ProcessStatusBadge status={p.status} />
                                          {p.is_outsourced && (
                                            <div className="flex items-center gap-0.5 text-[8px] bg-zinc-900 text-white px-1.5 rounded-full">
                                              <span>共</span>
                                              {p.outsourcing_fee > 0 && <span>¥{p.outsourcing_fee}</span>}
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <button 
                                  onClick={() => editOrder(item.order)}
                                  className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"
                                  title="修改订单"
                                >
                                  <Settings className="w-5 h-5" />
                                </button>
                                {item.drawing_data && (
                                  <button 
                                    onClick={() => setShowDrawingModal(item.drawing_data!)}
                                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                )}
                                <StatusBadge status={item.status} />
                                <button className="p-2 hover:bg-zinc-100 rounded-lg">
                                  <ChevronRight className="w-5 h-5" />
                                </button>
                              </div>
                            </motion.div>
                          ))}

                          {/* Dashboard Pagination */}
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 border-t border-zinc-100">
                            <div className="flex items-center gap-4 text-sm text-zinc-500">
                              <span>共<span className="font-bold text-zinc-900">{allItems.length}</span> 个待办零件</span>
                              <select 
                                value={dashboardPageSize}
                                onChange={(e) => {
                                  setDashboardPageSize(Number(e.target.value));
                                  setDashboardPage(1);
                                }}
                                className="bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1 outline-none focus:ring-2 focus:ring-zinc-900"
                              >
                                {[10, 20, 50, 100].map(size => (
                                  <option key={size} value={size}>每页 {size} 条</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                disabled={dashboardPage === 1}
                                onClick={() => setDashboardPage(prev => prev - 1)}
                                className="p-2 border border-zinc-200 rounded-none hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.ceil(allItems.length / dashboardPageSize) }, (_, i) => i + 1)
                                  .filter(p => p === 1 || p === Math.ceil(allItems.length / dashboardPageSize) || Math.abs(p - dashboardPage) <= 1)
                                  .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                      {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-zinc-400">...</span>}
                                      <button 
                                        onClick={() => setDashboardPage(p)}
                                        className={`w-10 h-10 rounded-none font-bold transition-all ${dashboardPage === p ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-200' : 'hover:bg-zinc-100 text-zinc-500'}`}
                                      >
                                        {p}
                                      </button>
                                    </React.Fragment>
                                  ))
                                }
                              </div>
                              <button 
                                disabled={dashboardPage === Math.ceil(allItems.length / dashboardPageSize) || allItems.length === 0}
                                onClick={() => setDashboardPage(prev => prev + 1)}
                                className="p-2 border border-zinc-200 rounded-none hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </>
                      );
                    }
                    return (
                      <div className="bg-zinc-50 border-2 border-dashed border-zinc-200 rounded-2xl py-12 flex flex-col items-center justify-center text-zinc-400">
                        <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">暂无待办零件</p>
                        <p className="text-[10px]">点击右上角“快速下单”开始</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="flex-1 !w-full flex flex-col min-h-0 space-y-6 py-4 md:py-8 animate-in fade-in duration-500 !max-w-none !m-0 !p-0">
              <div className="flex items-center justify-between px-4 md:px-8">
                <h2 className="text-2xl font-bold">订单管理</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setOrderFilters({
                        dueDateStart: '',
                        dueDateEnd: '',
                        orderNumber: '',
                        partNumber: '',
                        customerName: '',
                        priority: '',
                        status: ''
                      });
                      setAppliedOrderFilters({
                        dueDateStart: '',
                        dueDateEnd: '',
                        orderNumber: '',
                        partNumber: '',
                        customerName: '',
                        priority: '',
                        status: ''
                      });
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 border border-zinc-200 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-50 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    刷新
                  </button>
                  <button
                    onClick={() => resetAndOpenModal()}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    新建订单
                  </button>
                </div>
              </div>

              {/* 筛选条件区域 */}
              <div className="px-4 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 bg-white p-4 rounded-none border border-zinc-200 shadow-sm">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">交货日期(起)</label>
                  <input
                    type="date"
                    value={orderFilters.dueDateStart}
                    onChange={(e) => setOrderFilters({ ...orderFilters, dueDateStart: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">交货日期(止)</label>
                  <input
                    type="date"
                    value={orderFilters.dueDateEnd}
                    onChange={(e) => setOrderFilters({ ...orderFilters, dueDateEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">订单号</label>
                  <input
                    type="text"
                    placeholder="搜索订单号..."
                    value={orderFilters.orderNumber}
                    onChange={(e) => setOrderFilters({ ...orderFilters, orderNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">零件号</label>
                  <input
                    type="text"
                    placeholder="搜索零件号..."
                    value={orderFilters.partNumber}
                    onChange={(e) => setOrderFilters({ ...orderFilters, partNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">客户名称</label>
                  <input
                    type="text"
                    placeholder="搜索客户..."
                    value={orderFilters.customerName}
                    onChange={(e) => setOrderFilters({ ...orderFilters, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">优先级</label>
                  <select
                    value={orderFilters.priority}
                    onChange={(e) => setOrderFilters({ ...orderFilters, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">全部优先级</option>
                    <option value="high">高优先级</option>
                    <option value="medium">普通</option>
                    <option value="low">较低</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">订单状态</label>
                  <select
                    value={orderFilters.status}
                    onChange={(e) => setOrderFilters({ ...orderFilters, status: e.target.value })}
                    className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                  >
                    <option value="">全部状态</option>
                    <option value="pending">待加工</option>
                    <option value="processing">加工中</option>
                    <option value="completed">已完成</option>
                    <option value="delivered">已送货</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex items-end">
                  <button
                    onClick={() => {
                      setAppliedOrderFilters({ ...orderFilters });
                      setCurrentPage(1);
                    }}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    查询
                  </button>
                </div>
              </div>

              {(() => {
                const filteredOrders = orders.filter(o => {
                  const maxDueDate = getOrderMaxDueDate(o);
                  const matchDueDateStart = !appliedOrderFilters.dueDateStart || maxDueDate >= appliedOrderFilters.dueDateStart;
                  const matchDueDateEnd = !appliedOrderFilters.dueDateEnd || maxDueDate <= appliedOrderFilters.dueDateEnd;
                  const matchOrderNumber = !appliedOrderFilters.orderNumber || String(o.order_number || o.id).toLowerCase().includes(appliedOrderFilters.orderNumber.toLowerCase());
                  const matchCustomer = !appliedOrderFilters.customerName || o.customer_name.toLowerCase().includes(appliedOrderFilters.customerName.toLowerCase());
                  const matchPriority = !appliedOrderFilters.priority || o.priority === appliedOrderFilters.priority;
                  const matchPartNumber = !appliedOrderFilters.partNumber || (o.items || []).some(item => (item.part_number || '').toLowerCase().includes(appliedOrderFilters.partNumber.toLowerCase()));
                  const matchStatus = !appliedOrderFilters.status || o.status === appliedOrderFilters.status;
                  return matchDueDateStart && matchDueDateEnd && matchOrderNumber && matchCustomer && matchPriority && matchPartNumber && matchStatus;
                });

                // 使用 colors.blue 对象统一管理蓝色主题
                const blueColors = {
                  text: 'text-blue-600',
                  bg: 'bg-blue-50',
                  border: 'border-blue-200',
                  sep: 'border-blue-200',
                  sepHex: '#93c5fd',
                  headText: 'text-blue-900',
                  headBg: 'bg-blue-100'
                };

                return (
                  <>
                    <div className="flex-1 min-h-0 bg-white rounded-none border-y border-l-0 border-zinc-200 overflow-auto" style={{ '--sep-color': blueColors.sepHex } as React.CSSProperties}>
                      <table className={`min-w-[2100px] w-full text-left text-sm table-fixed border-b ${blueColors.sep}`}>
                        <thead className={`${blueColors.headBg} sticky top-0 z-20`}>
                          <tr className="whitespace-nowrap">
                            <th className={`pl-4 pr-6 py-4 font-semibold ${blueColors.headText} w-[192px] sticky left-0 ${blueColors.headBg} z-20 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] cursor-pointer hover:brightness-95`}
                              onClick={() => {
                                 if (allOrderMgrExpanded) {
                                   setOrderMgrExpanded(new Set());
                                   setAllOrderMgrExpanded(false);
                                 } else {
                                   setOrderMgrExpanded(new Set(filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map(o => o.id)));
                                   setAllOrderMgrExpanded(true);
                                 }
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {allOrderMgrExpanded ? <ChevronUp className="shrink-0 w-4 h-4" /> : <ChevronDown className="shrink-0 w-4 h-4" />}
                                零件名称
                              </div>
                            </th>
                            <th className={`px-6 py-4 font-bold ${blueColors.headText} w-[160px] sticky left-[192px] ${blueColors.headBg} z-20 text-sm text-center shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>零件号(P/N)</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>数量</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>报废数量</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>单价 (¥)</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>总计 (¥)</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>订单日期</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] font-bold`}>交货日期</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>完工日期</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>交货数量</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>刀具费用</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工装费用</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>材料费用</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>其他费用</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-96 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工序流程</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>外协共计 (¥)</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>状态</th>
                            <th className={`px-6 py-4 font-semibold ${blueColors.headText} ${blueColors.headBg} w-64 font-bold text-sm shadow-[inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>备注</th>
                            <th className={`pl-4 pr-6 py-4 font-bold ${blueColors.headText} w-20 text-sm text-left sticky right-2 ${blueColors.headBg} z-20 shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>操作</th>
                            <th className={`w-2 sticky right-0 bg-white z-20 border-none`}></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((order) => {
                      const isExpanded = orderMgrExpanded.has(order.id);
                      return (
                      <React.Fragment key={order.id}>
                        <tr className={`${blueColors.bg} sticky top-[52px] z-[15] cursor-pointer hover:brightness-95 transition-all`}
                          onClick={() => toggleOrderMgr(order.id)}
                        >
                          {/* Order Info - Sticky Left columns matched with item rows */}
                          <td className={`pl-4 pr-6 py-2 sticky left-0 ${blueColors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                            <div className="flex items-center gap-2">
                              {isExpanded ? <ChevronUp className={`shrink-0 w-4 h-4 ${blueColors.text}`} /> : <ChevronDown className={`shrink-0 w-4 h-4 ${blueColors.text}`} />}
                              <span className={`text-sm font-bold ${blueColors.headText} whitespace-nowrap`}>{order.order_number || order.id}</span>
                            </div>
                          </td>
                          <td className={`px-6 py-2 sticky left-[192px] ${blueColors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]`}>
                            <div className="flex items-center justify-start gap-2 whitespace-nowrap">
                              <span className={`${blueColors.text} underline decoration-blue-200 underline-offset-4 font-medium`}>{order.customer_name}</span>
                              <PriorityBadge priority={order.priority} />
                            </div>
                          </td>
                          <td colSpan={4} className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]"></td>

                          {/* Start Date - Aligns with column 7 */}
                          <td className="px-6 py-2 text-xs text-zinc-500 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]">
                            {order.start_date && (
                              <div className="flex items-center gap-1.5 opacity-80">
                                <span className="p-1 bg-zinc-100 rounded text-zinc-400">订</span>
                                {order.start_date}
                              </div>
                            )}
                          </td>

                          {/* Due Date - Aligns with column 8 */}
                          <td className="px-6 py-2 text-xs font-bold text-zinc-600 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]">
                            <div className="flex items-center gap-1.5 text-zinc-900">
                              <span className="p-1 bg-zinc-900 text-white rounded text-[8px]">终</span>
                                 {getOrderMaxDueDate(order)}
                            </div>
                          </td>

                          {/* Empty spacer for columns 9-14 */}
                          <td colSpan={6} className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]"></td>

                          {/* Process Progress - Column 15 */}
                          <td className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]">
                            {(() => {
                              const allProcesses = (order.items || []).flatMap(item => item.processes || []);
                              if (allProcesses.length === 0) return null;
                              return (
                                <div className="flex gap-1">
                                  {allProcesses.map((p, idx) => {
                                    const statusColors = {
                                      pending: { border: 'border-zinc-300', bg: 'bg-white', fill: '' },
                                      processing: { border: 'border-blue-400', bg: 'bg-white', fill: 'bg-gradient-to-r from-blue-400 to-transparent' },
                                      completed: { border: 'border-emerald-400', bg: 'bg-emerald-400', fill: '' }
                                    };
                                    const colors = statusColors[p.status] || statusColors.pending;
                                    return (
                                      <div
                                        key={idx}
                                        className={`w-3 h-5 rounded-sm border ${colors.border} ${colors.bg} relative overflow-hidden`}
                                        title={`${p.name || '工序'}: ${p.status === 'pending' ? '待加工' : p.status === 'processing' ? '加工中' : '已完成'}`}
                                      >
                                        {p.status === 'processing' && (
                                          <div className="absolute inset-y-0 left-0 w-1/2 bg-blue-400" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Empty spacer for 外协共计 - Column 16 */}
                          <td className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]"></td>

                          {/* Status - Aligns with column 15 (was 16) */}
                           <td className="px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color)]">
                             <StatusBadge status={order.status} />
                           </td>
                           <td className="px-6 py-2 shadow-[inset_0_-1px_0_0_var(--sep-color)]">
                              {order.notes && (
                                <div className="flex items-center gap-2 text-zinc-500 max-w-xl overflow-hidden">
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-xs truncate italic">{order.notes}</span>
                                </div>
                              )}
                           </td>

                          {/* Actions - Sticky Right */}
                           <td className={`pl-4 pr-6 py-2 sticky right-2 ${blueColors.bg} z-[3] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),-4px_0_8px_rgba(37,99,235,0.02)]`}>
                            <div className="flex items-center justify-center">
                              <button
                                onClick={() => editOrder(order)}
                                className={`inline-flex items-center gap-1.5 ${blueColors.text} font-bold hover:text-blue-700 transition-colors py-1.5 px-3 hover:bg-blue-50 rounded-lg whitespace-nowrap`}
                              >
                                <Settings className="w-4 h-4" />
                                <span className="text-xs">修改</span>
                              </button>
                            </div>
                          </td>
                          <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                        </tr>
                        {isExpanded && (order.items || []).map((item) => (
                          <tr key={item.id} className="hover:bg-zinc-50 transition-colors group">
                             <td className={`pl-4 pr-6 py-4 sticky left-0 bg-white group-hover:bg-zinc-50 z-[2] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-900 whitespace-nowrap">{item.part_name}</span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 sticky left-[192px] bg-white group-hover:bg-zinc-50 z-[2] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                              <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">{item.part_number || '-'}</span>
                            </td>
                            <td className={`px-6 py-4 text-zinc-900 font-medium whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.quantity}</td>
                            <td className={`px-6 py-4 font-medium whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] ${(item.scrap_quantity || 0) > 0 ? 'bg-white text-red-600' : 'text-zinc-900'}`}>
                              {item.scrap_quantity || '-'}
                            </td>
                            <td className={`px-6 py-4 text-zinc-600 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.unit_price}</td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                              <div className="text-zinc-900 font-bold">
                                ¥{(item.quantity * item.unit_price).toFixed(2)}
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.start_date || order.start_date || '-'}</td>
                            <td className={`px-6 py-4 text-zinc-500 font-medium whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.due_date || order.due_date}</td>
                            <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.completion_date || '-'}</td>
                            <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.delivered_quantity || '-'}</td>
                            <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.tool_cost || '0'}</td>
                            <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.fixture_cost || '0'}</td>
                            <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.material_cost || '0'}</td>
                            <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.other_cost || '0'}</td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                              {/* Process Flow Visualization */}
                              {item.processes && item.processes.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {item.processes.map((p) => (
                                    <div
                                      key={p.id}
                                      className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors whitespace-nowrap ${PROCESS_COLORS[p.name] || 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                                      onClick={() => handleProcessClick(order.id, item.id, p.id, p.status, p.name)}
                                    >
                                      <span className="text-[10px] font-bold">{p.name}</span>
                                      <ProcessStatusBadge status={p.status} />
                                      {p.is_outsourced && (
                                        <div className="flex items-center gap-0.5 text-[8px] bg-zinc-900 text-white px-1.5 rounded-full">
                                          <span>共</span>
                                          {p.outsourcing_fee > 0 && <span>¥{p.outsourcing_fee}</span>}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                              <div className="text-zinc-500 font-bold text-right px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg whitespace-nowrap">
                                ¥{(item.processes || []).reduce((sum, p) => (sum + (p.outsourcing_fee || 0)), 0).toFixed(2)}
                              </div>
                            </td>
                             <td className={`px-6 py-4 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                               <StatusBadge status={item.status} />
                             </td>
                             <td className={`px-6 py-4 border-b ${blueColors.sep}`}>
                                <div className="text-xs text-zinc-500 truncate max-w-[200px]" title={item.notes}>
                                  {item.notes || '-'}
                                </div>
                             </td>
                             <td className={`pl-4 pr-6 py-4 text-left sticky right-2 bg-white group-hover:bg-zinc-50 border-b ${blueColors.sep} z-[2] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color)]`}>
                              <div className="flex justify-start gap-2">
                                {item.drawing_data && (
                                  <button
                                    onClick={() => setShowDrawingModal(item.drawing_data!)}
                                    className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-colors"
                                    title="查看图纸"
                                  >
                                    <Eye className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 md:px-8 py-2 border-t border-zinc-100 flex-shrink-0">
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>共<span className="font-bold text-zinc-900">{filteredOrders.length}</span> 个订单</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-zinc-900"
                  >
                    {[10, 20, 50, 100].map(size => (
                      <option key={size} value={size}>每页 {size} 条</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                    className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(filteredOrders.length / pageSize) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(filteredOrders.length / pageSize) || Math.abs(p - currentPage) <= 1)
                      .map((p, i, arr) => (
                        <React.Fragment key={p}>
                          {i > 0 && arr[i-1] !== p - 1 && <span className="px-2 text-zinc-400">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-10 h-10 rounded-xl font-bold transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'hover:bg-zinc-100 text-zinc-500'}`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))
                    }
                  </div>
                  <button
                    disabled={currentPage === Math.ceil(filteredOrders.length / pageSize) || filteredOrders.length === 0}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                    className="p-2 border border-zinc-200 rounded-xl hover:bg-zinc-50 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          );
        })()}
            </div>
          )}

          {/* Overdue Tab */}
          {activeTab === 'overdue' && (
            <OrderMonitorPanel
              title="逾期订单管理"
              icon={AlertCircle}
              orders={orders.filter(o => {
                const maxDueDate = getOrderMaxDueDate(o);
                return (maxDueDate || '') < new Date().toISOString().split('T')[0] && o.status !== 'delivered';
              })}
              filters={overdueFilters}
              setFilters={setOverdueFilters}
              page={overduePage}
              setPage={setOverduePage}
              pageSize={overduePageSize}
              setPageSize={setOverduePageSize}
              themeColor="rose"
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
            />
          )}

          {/* Warning Orders Tab */}
          {activeTab === 'warning_orders' && (
            <OrderMonitorPanel
              title="告警订单管理"
              icon={AlertTriangle}
              orders={orders.filter(o => checkOrderAgainstRules(o, 'warning'))}
              filters={warningFilters}
              setFilters={setWarningFilters}
              page={warningPage}
              setPage={setWarningPage}
              pageSize={warningPageSize}
              setPageSize={setWarningPageSize}
              themeColor="orange"
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
            />
          )}

          {/* Imminent Orders Tab */}
          {activeTab === 'imminent_orders' && (
            <OrderMonitorPanel
              title="临期订单管理"
              icon={Clock}
              orders={orders.filter(o => checkOrderAgainstRules(o, 'imminent'))}
              filters={imminentFilters}
              setFilters={setImminentFilters}
              page={imminentPage}
              setPage={setImminentPage}
              pageSize={imminentPageSize}
              setPageSize={setImminentPageSize}
              themeColor="amber"
              editOrder={editOrder}
              setShowDrawingModal={setShowDrawingModal}
              handleProcessClick={handleProcessClick}
              getOrderMaxDueDate={getOrderMaxDueDate}
            />
          )}

          {/* Inventory Tab */}
          {activeTab === 'inventory' && (
            <div className="flex-1 overflow-y-auto space-y-8 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
              <div className="flex items-center justify-between px-4 md:px-8">
                <h2 className="text-2xl font-bold">仓库与余料</h2>
                <button className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  入库材料
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Materials List */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-500 uppercase tracking-wider text-xs">常规材料库</h3>
                  <div className="bg-white rounded-2xl border border-zinc-200 divide-y divide-zinc-100">
                    {materials.map((m) => (
                      <div key={m.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold">{m.name}</p>
                          <p className="text-xs text-zinc-500">规格: {m.spec}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-bold">{m.quantity} {m.unit}</p>
                          <p className="text-[10px] text-zinc-400 uppercase">库存充足</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Remnants Grid */}
                <div className="space-y-4">
                  <h3 className="font-bold text-zinc-500 uppercase tracking-wider text-xs">余料回收 (可复用)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {remnants.map((r) => (
                      <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden group cursor-pointer">
                        <div className="aspect-square bg-zinc-100 flex items-center justify-center relative">
                          {r.photo_data ? (
                            <img src={r.photo_data} alt="余料" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-zinc-300" />
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Plus className="w-6 h-6" />
                          </div>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-bold truncate">{r.material_name}</p>
                          <p className="text-xs text-zinc-500">{r.dimensions}</p>
                        </div>
                      </div>
                    ))}
                    <button className="aspect-square border-2 border-dashed border-zinc-200 rounded-2xl flex flex-col items-center justify-start gap-2 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-all">
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-medium">新增余料</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <div className="flex-1 overflow-y-auto space-y-8 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
              <div className="flex items-center justify-between px-4 md:px-8">
                <h2 className="text-2xl font-bold">财务对账</h2>
                <button className="text-zinc-900 border border-zinc-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50">
                  导出 Excel
                </button>
              </div>

              <div className="grid gap-6">
                {reconciliation.map((item, i) => (
                  <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold">
                        {item.month.split('-')[1]}
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{item.month} 对账单</h3>
                        <p className="text-sm text-zinc-500">共 {item.order_count} 个订单</p>
                      </div>
                    </div>

                    <div className="flex gap-8">
                      <div>
                        <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">总金额</p>
                        <p className="text-xl font-bold">¥{item.total_amount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">已结算</p>
                        <p className="text-xl font-bold text-emerald-600">¥{item.delivered_amount}</p>
                      </div>
                      <div className="flex items-center">
                        <button className="bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'advent_rules' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-8 animate-in fade-in duration-500 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
                    <Settings2 className="w-8 h-8" />
                    规则管理
                  </h2>
                  <p className="text-zinc-500">管理交货日期提醒的计算规则</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input 
                      type="text" 
                      placeholder="搜索规则名称..."
                      value={ruleFilters.name}
                      onChange={(e) => setRuleFilters({ ...ruleFilters, name: e.target.value })}
                      className="pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 w-64"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setEditingRuleId(null);
                      setRuleForm({ 
                        name: '', 
                        description: '', 
                        formula: '', 
                        target_status: 'pending',
                        scopeType: 'specific',
                        ruleType: 'imminent'
                      });
                      setShowRuleModal(true);
                    }}
                    className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    新建规则
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-white rounded-none border-y border-zinc-200 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-zinc-500">规则名称</th>
                      <th className="px-6 py-4 font-semibold text-zinc-500">规则类型</th>
                      <th className="px-6 py-4 font-semibold text-zinc-500">适用范围</th>
                      <th className="px-6 py-4 font-semibold text-zinc-500">规则逻辑</th>
                      <th className="px-6 py-4 font-semibold text-zinc-500">规则说明</th>
                       <th className="px-6 py-4 font-semibold text-zinc-500 text-right">绑定订单</th>
                      <th className="px-6 py-4 font-semibold text-zinc-500 text-left">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {adventRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="font-bold text-zinc-900">{rule.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            rule.ruleType === 'warning' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100' 
                              : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                          }`}>
                            {rule.ruleType === 'warning' ? '告警' : '临期'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            rule.scopeType === 'general' 
                              ? 'bg-amber-50 text-amber-600 border-amber-100' 
                              : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                          }`}>
                            {rule.scopeType === 'general' ? '通用' : '特定'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2 py-1">
                            <div className="flex items-center gap-1">
                              <code className="bg-zinc-100 px-2 py-1 rounded text-xs font-mono text-zinc-600">
                                {rule.formula}
                              </code>
                              <span className="bg-zinc-900 text-white px-1.5 py-0.5 rounded text-[10px] font-bold ml-1">终</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">零件状态为</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                rule.target_status === 'pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                rule.target_status === 'processing' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}>
                                {rule.target_status === 'pending' ? '待加工' : rule.target_status === 'processing' ? '加工中' : '已完成'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-500">{rule.description || '-'}</td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 border border-zinc-200 text-zinc-600 rounded-lg font-bold text-xs hover:bg-zinc-100 transition-all shadow-sm"
                          >
                            <LinkIcon className="w-3.5 h-3.5" />
                            绑定
                          </button>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex justify-start gap-2">
                            <button 
                              onClick={() => {
                                setEditingRuleId(rule.id);
                                setRuleForm({ 
                                  name: rule.name, 
                                  description: rule.description || '', 
                                  formula: rule.formula,
                                  target_status: rule.target_status || 'pending',
                                  scopeType: rule.scopeType || 'specific',
                                  ruleType: rule.ruleType || 'imminent'
                                });
                                setShowRuleModal(true);
                              }}
                              className="p-2 hover:bg-white border hover:border-zinc-200 rounded-lg text-zinc-600 hover:text-zinc-900 transition-all font-bold text-xs flex items-center gap-1.5 shadow-sm"
                            >
                              <Settings className="w-3.5 h-3.5" />
                              修改
                            </button>
                            <button 
                              onClick={() => setDeletingRuleId(rule.id)}
                              className="p-2 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-zinc-400 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {adventRules.length === 0 && (
                      <tr>
                         <td colSpan={7} className="px-6 py-12 text-center text-zinc-400">
                          暂无规则，点击右上角新建
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">选择客户 *</label>
                      <select 
                        required
                        value={newOrder.customer_id || ''}
                        className={`w-full px-4 py-2 bg-white border ${formErrors.customer ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none`}
                        onChange={e => {
                          setNewOrder({...newOrder, customer_id: parseInt(e.target.value)});
                          if (formErrors.customer) setFormErrors({ ...formErrors, customer: '' });
                        }}
                      >
                        <option value="">请选择客户</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {formErrors.customer && (
                        <div className="mt-1 flex items-center gap-1.5 text-red-500 text-[10px] font-bold">
                          <AlertCircle className="w-3 h-3" />
                          {formErrors.customer}
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单号(可选)</label>
                      <input 
                        type="text" 
                        placeholder="自动生成"
                        value={newOrder.order_number || ''}
                        className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                        onChange={e => setNewOrder({...newOrder, order_number: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">优先级</label>
                      <select 
                        value={newOrder.priority || 'medium'}
                        className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                        onChange={e => setNewOrder({...newOrder, priority: e.target.value as any})}
                      >
                        <option value="low">较低</option>
                        <option value="medium">普通</option>
                        <option value="high">紧急</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单日期 *</label>
                      <div className="space-y-1">
                        <div className="relative flex items-center group cursor-pointer">
                          <Calendar className="absolute left-3 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                          <input 
                            required
                            type="date" 
                            value={newOrder.start_date || ''}
                            className={`w-full pl-10 pr-4 py-2 bg-white border ${formErrors.orderDate ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                            onChange={e => {
                              const newDate = e.target.value;
                              // Batch sync to all items
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
                    </div>
                  </div>
                  {/* Order Level Notes */}
                  <div className="mt-4 pt-4 border-t border-zinc-100">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单备注</label>
                    <textarea 
                      placeholder="输入订单相关的补充说明..."
                      value={newOrder.notes || ''}
                      onChange={e => setNewOrder({...newOrder, notes: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none min-h-[80px] text-sm resize-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-inner">
                    <table className="min-w-[2100px] w-full text-left text-xs table-fixed border-collapse">
                      <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                        <tr>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-12 text-center shadow-[inset_-1px_0_0_0_#e4e4e7]">#</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-[192px] sticky left-0 bg-zinc-50 border-b border-zinc-200 z-10 shadow-[inset_-1px_0_0_0_#e4e4e7]">零件名称 *</th>
                          <th className="px-4 py-3 font-bold text-zinc-500 w-[160px] sticky left-[192px] bg-zinc-50 border-b border-zinc-200 z-10 shadow-[inset_-1px_0_0_0_#e4e4e7]">零件号(P/N)</th>
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
                            <td className="px-2 py-2 sticky left-0 bg-white z-[2] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
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
                            <td className="px-2 py-2 sticky left-[192px] bg-white z-[2] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
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
                                {item.start_date || '-'}
                              </div>
                            </td>
                            <td className="px-2 py-2">
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
                            <td className="px-2 py-2">
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
                                 ¥{(item.processes || []).reduce((sum, p) => (sum + (p.outsourcing_fee || 0)), 0).toFixed(2)}
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

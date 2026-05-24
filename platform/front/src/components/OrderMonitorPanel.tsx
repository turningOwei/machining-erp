import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Settings, Eye, FileText, LucideIcon, Search, RefreshCw, Trash2, Plus, FileCheck } from 'lucide-react';
import { Order } from '../types';
import { formatDate, PROCESS_COLORS, ProcessStatusBadge, StatusBadge, PriorityBadge } from './shared';
import Pagination from './Pagination';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'text' | 'date' | 'select';
  placeholder?: string;
  options?: { value: string; label: string }[];
  width?: string;
}

interface OrderMonitorPanelProps {
  title: string;
  icon: LucideIcon;
  orders: Order[];
  filters: any;
  setFilters: (filters: any) => void;
  filterConfigs?: FilterConfig[];
  localFilter?: (orders: Order[], filters: any, getOrderMaxDueDate: (order: Order) => string) => Order[];
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  total?: number;
  themeColor: string;
  editOrder: (order: Order) => void;
  deleteOrder?: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  showOrderName?: boolean;
  showContactName?: boolean;
  showOrderNotes?: boolean;
  showOutsourcingFee?: boolean;
  showTotalAmount?: boolean;
  onSearch?: () => void;
  // 分页切换回调（带筛选条件的服务端分页）
  onPageChangeWithFilters?: (page: number, pageSize?: number) => void;
  isSearching?: boolean;
  onNewOrder?: () => void;
  // 送货管理模式
  deliveryMode?: boolean;
  selectedOrderId?: number | null;
  onSelectOrder?: (orderId: number | null) => void;
  onPreviewDelivery?: () => void;
  onConfigDelivery?: () => void;
  // 对账管理模式（支持多选）
  reconciliationMode?: boolean;
  selectedOrderIds?: Set<number>;
  onPreviewReconciliation?: () => void;
  onConfigReconciliation?: () => void;
}

const OrderMonitorPanel: React.FC<OrderMonitorPanelProps> = ({
  title, icon: Icon, orders, filters, setFilters, filterConfigs, localFilter, page, setPage, pageSize, setPageSize, total, themeColor,
  editOrder, deleteOrder, setShowDrawingModal, handleProcessClick, getOrderMaxDueDate,
  showOrderName = false, showContactName = false, showOrderNotes = false, showOutsourcingFee = true, showTotalAmount = false,
  onSearch, onPageChangeWithFilters, isSearching = false, onNewOrder,
  deliveryMode = false, selectedOrderId, onSelectOrder, onPreviewDelivery, onConfigDelivery,
  reconciliationMode = false, selectedOrderIds, onPreviewReconciliation, onConfigReconciliation
}) => {
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // 如果提供了total，表示服务端分页，直接使用orders（后端已排序）
  // 否则使用客户端筛选和分页
  const displayOrders = total !== undefined
    ? orders
    : (() => {
        const filtered = localFilter
          ? localFilter(orders, filters, getOrderMaxDueDate)
          : orders.filter(o => {
              const mDate = getOrderMaxDueDate(o);
              const matchDueDateStart = !filters.dueDateStart || mDate >= filters.dueDateStart;
              const matchDueDateEnd = !filters.dueDateEnd || mDate <= filters.dueDateEnd;
              const matchOrderNumber = !filters.orderNumber || String(o.order_number || o.id).toLowerCase().includes(filters.orderNumber.toLowerCase());
              const matchCustomer = !filters.customerName || (o.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
              const matchPriority = !filters.priority || o.priority === filters.priority;
              const matchPartNumber = !filters.partNumber || (o.items || []).some(item => (item.part_number || '').toLowerCase().includes(filters.partNumber.toLowerCase()));
              const matchPartName = !filters.partName || (o.items || []).some(item => (item.part_name || '').toLowerCase().includes(filters.partName.toLowerCase()));
              return matchDueDateStart && matchDueDateEnd && matchOrderNumber && matchCustomer && matchPriority && matchPartNumber && matchPartName;
            });
        return filtered.slice((page - 1) * pageSize, page * pageSize);
      })();

  const totalCount = total !== undefined ? total : (localFilter
    ? localFilter(orders, filters, getOrderMaxDueDate).length
    : orders.filter(o => {
        const mDate = getOrderMaxDueDate(o);
        const matchDueDateStart = !filters.dueDateStart || mDate >= filters.dueDateStart;
        const matchDueDateEnd = !filters.dueDateEnd || mDate <= filters.dueDateEnd;
        const matchOrderNumber = !filters.orderNumber || String(o.order_number || o.id).toLowerCase().includes(filters.orderNumber.toLowerCase());
        const matchCustomer = !filters.customerName || (o.customer_name || '').toLowerCase().includes(filters.customerName.toLowerCase());
        const matchPriority = !filters.priority || o.priority === filters.priority;
        const matchPartNumber = !filters.partNumber || (o.items || []).some(item => (item.part_number || '').toLowerCase().includes(filters.partNumber.toLowerCase()));
        const matchPartName = !filters.partName || (o.items || []).some(item => (item.part_name || '').toLowerCase().includes(filters.partName.toLowerCase()));
        return matchDueDateStart && matchDueDateEnd && matchOrderNumber && matchCustomer && matchPriority && matchPartNumber && matchPartName;
      }).length);

  React.useEffect(() => {
    if (allExpanded) {
      setExpandedOrders(new Set(displayOrders.map(o => o.id)));
    }
  }, [displayOrders.length, allExpanded]);

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
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', sep: 'border-amber-300', sepHex: '#fbbf24', pseudoSep: 'after:bg-amber-300', headText: 'text-amber-900', headBg: 'bg-amber-100', listBorder: 'border-l-amber-500', focus: 'focus:ring-amber-500', pageActive: 'bg-amber-600 text-white shadow-amber-100', pageBtn: 'hover:bg-amber-50' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', sep: 'border-emerald-200', sepHex: '#6ee7b7', pseudoSep: 'after:bg-emerald-300', headText: 'text-emerald-900', headBg: 'bg-emerald-100', listBorder: 'border-l-emerald-500', focus: 'focus:ring-emerald-500', pageActive: 'bg-emerald-600 text-white shadow-emerald-100', pageBtn: 'hover:bg-emerald-50' }
  }[themeColor as 'blue' | 'rose' | 'orange' | 'amber' | 'emerald'] || { text: 'text-zinc-600', bg: 'bg-zinc-50', border: 'border-zinc-100', sep: 'border-zinc-300', sepHex: '#a1a1aa', pseudoSep: 'after:bg-zinc-300', headText: 'text-zinc-900', headBg: 'bg-zinc-50', listBorder: 'border-l-zinc-500', focus: 'focus:ring-zinc-900', pageActive: 'bg-zinc-600 text-white shadow-zinc-100', pageBtn: 'hover:bg-zinc-50' };

  return (
    <div className="flex-1 !w-full flex flex-col min-h-0 animate-in fade-in duration-500 !max-w-none !m-0 !p-0 relative">
      {/* 加载遮罩 */}
      {isSearching && (
        <div className="absolute inset-0 bg-white/80 z-50 flex items-center justify-center backdrop-blur-sm">
          <div className="flex items-center gap-3 text-zinc-600 bg-white px-6 py-3 rounded-xl shadow-lg border border-zinc-200">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span className="font-medium">数据加载中...</span>
          </div>
        </div>
      )}
      {/* Desktop Header */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className={`text-3xl font-bold tracking-tight ${colors.text} flex items-center gap-2`}>
            <Icon className="w-8 h-8" />
            {title}
            <span className="text-base font-normal text-zinc-500">检测到 {totalCount} 个符合筛选条件的订单</span>
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (allExpanded) {
                setExpandedOrders(new Set());
                setAllExpanded(false);
              } else {
                setExpandedOrders(new Set(displayOrders.map(o => o.id)));
                setAllExpanded(true);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors flex items-center gap-2"
          >
            {allExpanded ? <ChevronUp className="shrink-0 w-4 h-4" /> : <ChevronDown className="shrink-0 w-4 h-4" />}
            {allExpanded ? '全部收起' : '全部展开'}
          </button>
        </div>
      </div>

      {/* Mobile filter toggle */}
      <div className="md:hidden px-4 py-3 bg-white border border-zinc-200 flex items-center justify-between">
        <span className={`text-lg font-bold ${colors.text} flex items-center gap-2`}>
          <Icon className="w-5 h-5" />
          {title}
        </span>
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900">
          {showFilters ? '收起' : '展开'}
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Filters */}
      <div className={`${showFilters ? 'flex' : 'hidden'} md:flex px-4 md:px-8 flex-wrap gap-4 bg-white p-4 rounded-none border border-zinc-200 shadow-sm`}>
        {deliveryMode && onPreviewDelivery && (
          <div className="flex items-center gap-3">
            <button
              id="btn-preview-delivery-note"
              onClick={onPreviewDelivery}
              disabled={!selectedOrderId}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                selectedOrderId
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              预览送货单
            </button>
            {onConfigDelivery && (
              <button
                id="btn-config-delivery-note"
                onClick={onConfigDelivery}
                disabled={!selectedOrderId}
                className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                  selectedOrderId
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                }`}
              >
                <Settings className="w-4 h-4" />
                配置送货单
              </button>
            )}
          </div>
        )}
        {reconciliationMode && onPreviewReconciliation && (
          <div className="flex items-center gap-3">
            <button
              id="btn-preview-reconciliation"
              onClick={onPreviewReconciliation}
              disabled={!selectedOrderIds || selectedOrderIds.size === 0}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
                selectedOrderIds && selectedOrderIds.size > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              预览对账单 {selectedOrderIds && selectedOrderIds.size > 0 && `(${selectedOrderIds.size})`}
            </button>
            {onConfigReconciliation && (
              <button
                id="btn-config-reconciliation"
                onClick={onConfigReconciliation}
                className="px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors bg-purple-600 text-white hover:bg-purple-700"
              >
                <Settings className="w-4 h-4" />
                配置对账单
              </button>
            )}
          </div>
        )}
        {(filterConfigs || [
          { label: '订单交期', key: 'dueDate', type: 'date' as const, placeholder: '' },
          { label: '订单号', key: 'orderNumber', type: 'text' as const, placeholder: '搜索订单号...' },
          { label: '零件号', key: 'partNumber', type: 'text' as const, placeholder: '搜索零件或客户...' },
          { label: '客户名称', key: 'customerName', type: 'text' as const, placeholder: '搜索客户...' }
        ]).map(f => (
          <div key={f.key} className={`space-y-1.5 ${f.width || 'min-w-[140px] flex-1'}`}>
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider ml-1">{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={filters[f.key] || ''}
                onChange={(e) => {
                  setFilters({ ...filters, [f.key]: e.target.value });
                  setPage(1);
                }}
                className={`w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${colors.focus} bg-white`}
              >
                <option value="">{f.placeholder || '全部'}</option>
                {f.options?.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={filters[f.key] || ''}
                onChange={(e) => {
                  setFilters({ ...filters, [f.key]: e.target.value });
                  setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onSearch) {
                    onSearch();
                  }
                }}
                className={`w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 ${colors.focus}`}
              />
            )}
          </div>
        ))}
        {!filterConfigs && (
          <div className="space-y-1.5 w-28">
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
        )}
        {onSearch && (
          <div className="space-y-1.5 flex items-end w-24">
            <button
              onClick={onSearch}
              disabled={isSearching}
              className={`w-full ${
                themeColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700' :
                themeColor === 'rose' ? 'bg-rose-600 hover:bg-rose-700' :
                themeColor === 'orange' ? 'bg-orange-600 hover:bg-orange-700' :
                themeColor === 'amber' ? 'bg-amber-600 hover:bg-amber-700' :
                'bg-zinc-600 hover:bg-zinc-700'
              } text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Search className="w-4 h-4" />
              查询
            </button>
          </div>
        )}
        {onNewOrder && (
          <div className="space-y-1.5 flex items-end w-28">
            <button
              onClick={onNewOrder}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建订单
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block flex-1 min-h-0 bg-white rounded-none border-y border-l-0 border-zinc-200 overflow-auto shadow-none" style={{ '--sep-color': colors.sepHex } as React.CSSProperties}>
        <table className={`w-full text-left text-sm table-fixed border-b ${colors.sep}`} style={{ minWidth: (deliveryMode || reconciliationMode) ? '1400px' : (showTotalAmount && showOutsourcingFee ? '2100px' : showTotalAmount || showOutsourcingFee ? '1972px' : '1364px') }}>
          <thead className={`${colors.headBg} sticky top-0 z-20`}>
            <tr className="whitespace-nowrap">
              {(deliveryMode || reconciliationMode) && (
                <th className={`px-4 py-4 w-12 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></th>
              )}
              <th className={`pl-4 pr-6 py-4 font-semibold ${colors.headText} w-[192px] sticky left-0 ${colors.headBg} z-20 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] cursor-pointer hover:brightness-95`}
                  onClick={() => {
                    if (allExpanded) {
                      setExpandedOrders(new Set());
                      setAllExpanded(false);
                    } else {
                      setExpandedOrders(new Set(displayOrders.map(o => o.id)));
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
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-72 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>数量</th>
              {showTotalAmount && (
                <>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>单价 (¥)</th>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>总计 (¥)</th>
                </>
              )}
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>订单日期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.text} font-bold`}>订单交期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-96 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工序流程</th>
              {showOutsourcingFee && (
                <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>外协共计 (¥)</th>
              )}
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>状态</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>报废数量</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>交货数量</th>
              {showTotalAmount && (
                <>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>刀具费用</th>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>工装费用</th>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>材料费用</th>
                  <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-24 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>其他费用</th>
                </>
              )}
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-32 font-bold text-sm shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>完工日期</th>
              <th className={`px-6 py-4 font-semibold ${colors.headText} ${colors.headBg} w-64 font-bold text-sm shadow-[inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>备注</th>
              {!(deliveryMode || reconciliationMode) && (
                <th className={`pl-4 pr-6 py-4 font-bold ${colors.headText} w-20 text-sm text-left sticky right-2 ${colors.headBg} z-20 shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>操作</th>
              )}
              <th className={`w-2 sticky right-0 bg-white z-20 border-none`}></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {displayOrders.map((order) => {
              const isExpanded = expandedOrders.has(order.id);
              const sortedItems = [...(order.items || [])].sort((a, b) => {
                const dateA = a.due_date || order.due_date || '';
                const dateB = b.due_date || order.due_date || '';
                return dateA.localeCompare(dateB);
              });

              return (
                <React.Fragment key={order.id}>
                  <tr
                    className={`${colors.bg} border-b ${colors.sep} sticky top-[52px] z-[15] cursor-pointer hover:brightness-95 transition-colors`}
                    onClick={() => toggleOrder(order.id)}
                  >
                    {(deliveryMode || reconciliationMode) && (
                      <td className={`px-4 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.bg}`} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={deliveryMode ? selectedOrderId === order.id : (selectedOrderIds?.has(order.id || 0) || false)}
                          onChange={() => {}}
                          onClick={(e) => { e.stopPropagation(); onSelectOrder?.(order.id); }}
                          className={`w-4 h-4 focus:ring-2 rounded cursor-pointer ${deliveryMode ? 'text-emerald-600 focus:ring-emerald-500' : 'text-blue-600 focus:ring-blue-500'}`}
                        />
                      </td>
                    )}
                    <td className={`pl-4 pr-6 py-2 sticky left-0 ${colors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className={`shrink-0 w-4 h-4 ${colors.text}`} /> : <ChevronDown className={`shrink-0 w-4 h-4 ${colors.text}`} />}
                        <span className={`text-xs font-bold ${colors.headText} whitespace-nowrap`}>{order.order_number || order.id}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-2 sticky left-[192px] ${colors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>
                      <div className="flex items-center gap-2 whitespace-nowrap">
                        <span className={`${colors.text} underline decoration-zinc-200 underline-offset-4 font-medium`}>{order.customer_short_name}</span>
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </td>
                    <td colSpan={showTotalAmount ? 3 : 1} className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.bg}`}>
                      <div className="flex items-center gap-4 text-sm text-zinc-600">
                        {showContactName && <span className="text-zinc-400 text-xs inline-block min-w-[4em]">{order.contact_name || '\u3000\u3000\u3000\u3000'}</span>}
                        {showOrderName && order.order_name && <span className="text-xs font-bold text-zinc-700">{order.order_name}</span>}
                        {showTotalAmount && order.total_amount > 0 && <span className="text-xs font-bold text-zinc-700">¥{order.total_amount.toLocaleString()}</span>}
                      </div>
                    </td>
                    <td className={`px-6 py-2 text-xs text-zinc-500 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.bg}`}>
                      {order.start_date && (
                        <div className="flex items-center gap-1.5 opacity-80">
                          <span className="p-1 bg-zinc-100 rounded text-zinc-400">订</span>
                          {formatDate(order.start_date)}
                        </div>
                      )}
                    </td>
                    <td className={`px-6 py-2 text-xs font-bold text-zinc-600 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.bg}`}>
                      <div className="flex items-center gap-1.5 text-zinc-900">
                        <span className="p-1 bg-zinc-900 text-white rounded text-[8px]">终</span>
                        {formatDate(getOrderMaxDueDate(order))}
                      </div>
                    </td>
                    <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)] ${colors.bg}`}>
                      {(() => {
                        const items = order.items || [];
                        if (items.length === 0) return <span className="text-xs text-zinc-400">无零件</span>;

                        // 检查是否有任何工序
                        const hasProcesses = items.some((item: any) => item.processes && item.processes.length > 0);
                        if (!hasProcesses) {
                          return <span className="text-xs text-zinc-400">无工序</span>;
                        }

                        return (
                          <div className="flex flex-col gap-1 w-full">
                            {/* 每个零件一行进度条 */}
                            {items.map((item: any, itemIdx: number) => {
                              const processes = item.processes || [];
                              if (processes.length === 0) return null;

                              return (
                                <div key={itemIdx} className="flex items-center gap-2 min-h-[8px]">
                                  <div className="flex h-1.5 gap-0.5 flex-1">
                                    {processes.map((p: any, pIdx: number) => {
                                      let bgColor = 'bg-zinc-300'; // 待加工 - 灰色
                                      if (p.status === 'processing') {
                                        bgColor = 'bg-blue-400'; // 加工中 - 蓝色
                                      } else if (p.status === 'completed') {
                                        bgColor = 'bg-emerald-500'; // 已完成 - 绿色
                                      }
                                      return (
                                        <div
                                          key={pIdx}
                                          className={`flex-1 h-full ${bgColor} rounded-sm`}
                                          title={`${item.part_name} - ${p.name}: ${p.status === 'pending' ? '待加工' : p.status === 'processing' ? '加工中' : '已完成'}`}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </td>
                    {showOutsourcingFee && (
                      <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                    )}
                    <td className={`px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td className={`px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                    <td className={`px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                    {showTotalAmount && (
                      <>
                        <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                        <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                        <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                        <td className={`px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                      </>
                    )}
                    <td className={`px-6 py-2 text-xs text-zinc-500 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]`}></td>
                    <td className={`px-6 py-2 shadow-[inset_0_1px_0_0_var(--sep-color)]`}>
                      {order.notes && (
                        <div className="flex items-center gap-2 text-zinc-500 max-w-xl overflow-hidden">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs truncate italic">{order.notes}</span>
                        </div>
                      )}
                    </td>
                    {!(deliveryMode || reconciliationMode) && (
                      <td className={`pl-4 pr-6 py-2 sticky right-2 ${colors.bg} z-[3] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color),-4px_0_8px_rgba(0,0,0,0.02)]`}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => editOrder(order)}
                            className={`p-2 ${colors.text} hover:text-blue-700 transition-colors hover:bg-white rounded-lg`}
                            title="修改订单"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          {deleteOrder && (
                            <button
                              onClick={() => deleteOrder(order)}
                              className="p-2 text-zinc-400 hover:text-red-600 transition-colors hover:bg-red-50 rounded-lg"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                  </tr>
                  {isExpanded && sortedItems.map((item) => (
                    <tr key={item.id} className={`hover:${colors.bg}/10 transition-colors group`}>
                      {(deliveryMode || reconciliationMode) && (
                        <td className={`px-4 py-4 border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={deliveryMode ? selectedOrderId === order.id : (selectedOrderIds?.has(order.id || 0) || false)}
                            onChange={() => {}}
                            onClick={(e) => { e.stopPropagation(); onSelectOrder?.(order.id); }}
                            className={`w-4 h-4 focus:ring-2 rounded cursor-pointer ${deliveryMode ? 'text-emerald-600 focus:ring-emerald-500' : 'text-blue-600 focus:ring-blue-500'}`}
                          />
                        </td>
                      )}
                      <td className={`pl-4 pr-6 py-4 sticky left-0 bg-white z-[2] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-zinc-900 whitespace-nowrap">{item.part_name}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 sticky left-[192px] bg-white z-[2] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                        <span className="text-xs text-zinc-500 font-mono break-words">{item.part_number || '-'}</span>
                      </td>
                      <td className={`px-6 py-4 text-zinc-900 font-medium whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] w-72`}>{item.quantity}</td>
                      {showTotalAmount && (
                        <>
                          <td className={`px-6 py-4 text-zinc-600 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] w-24`}>¥{item.unit_price}</td>
                          <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] w-32`}>
                            <div className="text-zinc-900 font-bold">¥{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}</div>
                          </td>
                        </>
                      )}
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{formatDate(item.start_date || order.start_date) || '-'}</td>
                      <td className={`px-6 py-4 ${colors.text} font-bold whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] ${colors.bg}/20`}>{formatDate(item.due_date || order.due_date)}</td>
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
                      {showOutsourcingFee && (
                        <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                          <div className="text-zinc-500 font-bold text-right px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg whitespace-nowrap">
                            ¥{(item.processes || []).reduce((sum, p) => sum + Number(p.outsourcing_fee || 0), 0).toFixed(2)}
                          </div>
                        </td>
                      )}
                      <td className={`px-6 py-4 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                        <StatusBadge status={item.status} />
                      </td>
                      <td className={`px-6 py-4 font-medium whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)] ${(item.scrap_quantity || 0) > 0 ? 'bg-white text-red-600' : 'text-zinc-900'}`}>{item.scrap_quantity || '-'}</td>
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.delivered_quantity || '-'}</td>
                      {showTotalAmount && (
                        <>
                          <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.tool_cost || '0'}</td>
                          <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.fixture_cost || '0'}</td>
                          <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.material_cost || '0'}</td>
                          <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.other_cost || '0'}</td>
                        </>
                      )}
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${colors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{formatDate(item.completion_date) || '-'}</td>
                      <td className={`px-6 py-4 border-b ${colors.sep}`}>
                        <div className="text-xs text-zinc-500 truncate max-w-[200px]" title={item.notes}>{item.notes || '-'}</div>
                      </td>
                      {!(deliveryMode || reconciliationMode) && (
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
                      )}
                      <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 min-h-0 overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          {displayOrders.map((order) => {
            const isExpanded = expandedOrders.has(order.id);
            const sortedItems = [...(order.items || [])].sort((a, b) => {
              const dateA = a.due_date || order.due_date || '';
              const dateB = b.due_date || order.due_date || '';
              return dateA.localeCompare(dateB);
            });

            return (
              <div key={order.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className={`${colors.bg} p-4 flex items-center justify-between cursor-pointer`} onClick={() => toggleOrder(order.id)}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className={`w-5 h-5 ${colors.text}`} /> : <ChevronDown className={`w-5 h-5 ${colors.text}`} />}
                    <span className={`font-bold ${colors.headText}`}>{order.order_number || order.id}</span>
                    <PriorityBadge priority={order.priority} />
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="p-4 border-b border-zinc-100 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">客户</span><span className="font-medium">{order.customer_short_name}</span></div>
                  {showOrderName && order.order_name && <div className="flex justify-between"><span className="text-zinc-500">订单名称</span><span className="font-medium">{order.order_name}</span></div>}
                  {showContactName && <div className="flex justify-between"><span className="text-zinc-500">联系人</span><span className="font-medium text-xs">{order.contact_name || '-'}</span></div>}
                  <div className="flex justify-between"><span className="text-zinc-500">订单日期</span><span>{formatDate(order.start_date) || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">订单交期</span><span className={`font-bold ${colors.text}`}>{formatDate(getOrderMaxDueDate(order))}</span></div>
                  {showOrderNotes && order.notes && <div className="pt-2 text-zinc-500 text-xs italic">备注: {order.notes}</div>}
                </div>
                {isExpanded && sortedItems.map((item, idx) => (
                  <div key={item.id || idx} className="border-t border-zinc-100 p-4 bg-zinc-50">
                    <div className="font-medium text-zinc-900 mb-2">{item.part_name || `零件 ${idx + 1}`}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-zinc-500">零件号</span><span>{item.part_number || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">数量</span><span>{item.quantity}</span></div>
                      {showTotalAmount && <div className="flex justify-between"><span className="text-zinc-500">单价</span><span>¥{item.unit_price}</span></div>}
                      <div className="flex justify-between"><span className="text-zinc-500">订单交期</span><span>{formatDate(item.due_date || order.due_date)}</span></div>
                    </div>
                    {item.processes && item.processes.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.processes.map((p) => (
                          <div key={p.id} className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer text-xs ${PROCESS_COLORS[p.name] || 'bg-zinc-50 border-zinc-100'}`} onClick={() => handleProcessClick(order.id, item.id, p.id, p.status, p.name)}>
                            <span className="font-bold">{p.name}</span>
                            <ProcessStatusBadge status={p.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      <Pagination
        total={totalCount}
        page={page}
        pageSize={pageSize}
        onPageChange={(newPage) => {
          setPage(newPage);
          // 如果有分页回调，触发查询
          if (onPageChangeWithFilters) {
            onPageChangeWithFilters(newPage);
          }
        }}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setPage(1);
          // 如果有分页回调，触发查询
          if (onPageChangeWithFilters) {
            onPageChangeWithFilters(1, newSize);
          }
        }}
        activeColor={themeColor}
      />
    </div>
  );
};

export default OrderMonitorPanel;

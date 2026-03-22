import React from 'react';
import {
  Plus,
  Search,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Settings,
  Eye,
  FileText,
  ClipboardList
} from 'lucide-react';
import { Order } from '../types';
import { StatusBadge, PriorityBadge, ProcessStatusBadge, PROCESS_COLORS, formatDate } from '../components/shared';
import Pagination from '../components/Pagination';
import { fetchOrders, filterOrdersLocal, OrderFilters } from '../services/orderService';

interface OrdersProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  orderFilters: OrderFilters;
  setOrderFilters: (filters: OrderFilters) => void;
  appliedOrderFilters: OrderFilters;
  setAppliedOrderFilters: (filters: OrderFilters) => void;
  showOrderFilters: boolean;
  setShowOrderFilters: (show: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  orderMgrExpanded: Set<number>;
  setOrderMgrExpanded: (set: Set<number>) => void;
  allOrderMgrExpanded: boolean;
  setAllOrderMgrExpanded: (expanded: boolean) => void;
  resetAndOpenModal: () => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  toggleOrderMgr: (orderId: number) => void;
}

const Orders: React.FC<OrdersProps> = ({
  orders,
  setOrders,
  orderFilters,
  setOrderFilters,
  appliedOrderFilters,
  setAppliedOrderFilters,
  showOrderFilters,
  setShowOrderFilters,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  orderMgrExpanded,
  setOrderMgrExpanded,
  allOrderMgrExpanded,
  setAllOrderMgrExpanded,
  resetAndOpenModal,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate,
  toggleOrderMgr
}) => {
  const [isSearching, setIsSearching] = React.useState(false);

  // Debug: log when component renders and what filters are applied
  console.log('Orders component render:', {
    ordersCount: orders.length,
    appliedOrderFilters,
    orderFilters
  });

  // Handle search with API call
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      setAppliedOrderFilters({ ...orderFilters });
      setCurrentPage(1);
      const data = await fetchOrders(orderFilters);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 本地实时过滤（使用当前输入的 orderFilters）
  const filteredOrders = filterOrdersLocal(orders, orderFilters, getOrderMaxDueDate);

  // Blue theme colors
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
    <div className="flex-1 !w-full flex flex-col min-h-0 animate-in fade-in duration-500 !max-w-none !m-0 !p-0">
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-blue-600 flex items-center gap-2">
            <ClipboardList className="w-8 h-8" />
            订单管理
            <span className="text-base font-normal text-zinc-500">检测到 {filteredOrders.length} 个符合筛选条件的订单</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => resetAndOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            新建订单
          </button>
        </div>
      </div>

      {/* Filter Section */}
      {/* Mobile filter toggle */}
      <div className="md:hidden px-4 py-3 bg-white border border-zinc-200 flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-700">筛选条件</span>
        <button onClick={() => setShowOrderFilters(!showOrderFilters)} className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900">
          {showOrderFilters ? '收起' : '展开'}
          {showOrderFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      <div className={`${showOrderFilters ? 'grid' : 'hidden'} md:grid px-4 md:px-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-4 bg-white p-4 rounded-none border border-zinc-200 shadow-sm`}>
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
            onClick={handleSearch}
            disabled={isSearching}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                查询中...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                查询
              </>
            )}
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block flex-1 min-h-0 bg-white rounded-none border-y border-l-0 border-zinc-200 overflow-auto" style={{ '--sep-color': blueColors.sepHex } as React.CSSProperties}>
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
                  <tr className={`${blueColors.bg} border-b ${blueColors.sep} sticky top-[52px] z-[15] cursor-pointer hover:brightness-95 transition-colors`}
                    onClick={() => toggleOrderMgr(order.id)}
                  >
                    {/* Order Info */}
                    <td className={`pl-4 pr-6 py-2 sticky left-0 ${blueColors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronUp className={`shrink-0 w-4 h-4 ${blueColors.text}`} /> : <ChevronDown className={`shrink-0 w-4 h-4 ${blueColors.text}`} />}
                        <span className={`text-sm font-bold ${blueColors.headText} whitespace-nowrap`}>{order.order_number || order.id}</span>
                      </div>
                    </td>
                    <td className={`px-6 py-2 sticky left-[192px] ${blueColors.bg} z-[3] shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
                      <div className="flex items-center justify-start gap-2 whitespace-nowrap">
                        <span className={`${blueColors.text} underline decoration-blue-200 underline-offset-4 font-medium`}>{order.customer_name}</span>
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </td>
                    <td colSpan={4} className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]"></td>

                    {/* Start Date */}
                    <td className="px-6 py-2 text-xs text-zinc-500 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                      {order.start_date && (
                        <div className="flex items-center gap-1.5 opacity-80">
                          <span className="p-1 bg-zinc-100 rounded text-zinc-400">订</span>
                          {formatDate(order.start_date)}
                        </div>
                      )}
                    </td>

                    {/* Due Date */}
                    <td className="px-6 py-2 text-xs font-bold text-zinc-600 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                      <div className="flex items-center gap-1.5 text-zinc-900">
                        <span className="p-1 bg-zinc-900 text-white rounded text-[8px]">终</span>
                        {formatDate(getOrderMaxDueDate(order))}
                      </div>
                    </td>

                    <td colSpan={6} className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]"></td>

                    {/* Process Progress */}
                    <td className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                      {(() => {
                        const allProcesses = (order.items || []).flatMap(item => item.processes || []);
                        if (allProcesses.length === 0) return null;
                        return (
                          <div className="flex gap-1">
                            {allProcesses.map((p, idx) => {
                              const statusColors: Record<string, { border: string; bg: string }> = {
                                pending: { border: 'border-zinc-300', bg: 'bg-white' },
                                processing: { border: 'border-blue-400', bg: 'bg-white' },
                                completed: { border: 'border-emerald-400', bg: 'bg-emerald-400' }
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

                    <td className="px-6 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]"></td>

                    {/* Status */}
                    <td className="px-6 py-2 whitespace-nowrap shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-6 py-2">
                      {order.notes && (
                        <div className="flex items-center gap-2 text-zinc-500 max-w-xl overflow-hidden">
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span className="text-xs truncate italic">{order.notes}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className={`pl-4 pr-6 py-2 sticky right-2 ${blueColors.bg} z-[3] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),-4px_0_8px_rgba(37,99,235,0.02)]`}>
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

                  {/* Item Rows */}
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
                          ¥{(Number(item.quantity || 0) * Number(item.unit_price || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{formatDate(item.start_date || order.start_date) || '-'}</td>
                      <td className={`px-6 py-4 text-zinc-500 font-medium whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{formatDate(item.due_date || order.due_date)}</td>
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap text-[10px] border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{formatDate(item.completion_date) || '-'}</td>
                      <td className={`px-6 py-4 text-zinc-500 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>{item.delivered_quantity || '-'}</td>
                      <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.tool_cost || '0'}</td>
                      <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.fixture_cost || '0'}</td>
                      <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.material_cost || '0'}</td>
                      <td className={`px-6 py-4 text-zinc-500 font-mono text-xs whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>¥{item.other_cost || '0'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap border-b ${blueColors.sep} shadow-[inset_-1px_0_0_0_var(--sep-color)]`}>
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
                          ¥{(item.processes || []).reduce((sum, p) => sum + Number(p.outsourcing_fee || 0), 0).toFixed(2)}
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

      {/* Mobile Card View */}
      <div className="md:hidden flex-1 min-h-0 overflow-auto">
        <div className="flex flex-col gap-4 p-4">
          {filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((order) => {
            const isExpanded = orderMgrExpanded.has(order.id);
            const sortedItems = [...(order.items || [])].sort((a, b) => {
              const dateA = a.due_date || order.due_date || '';
              const dateB = b.due_date || order.due_date || '';
              return dateA.localeCompare(dateB);
            });

            return (
              <div key={order.id} className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
                <div className={`${blueColors.bg} p-4 flex items-center justify-between cursor-pointer`} onClick={() => toggleOrderMgr(order.id)}>
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronUp className={`w-5 h-5 ${blueColors.text}`} /> : <ChevronDown className={`w-5 h-5 ${blueColors.text}`} />}
                    <span className={`font-bold ${blueColors.headText}`}>{order.order_number || order.id}</span>
                    <PriorityBadge priority={order.priority} />
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="p-4 border-b border-zinc-100 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-zinc-500">客户</span><span className="font-medium">{order.customer_name}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">订单日期</span><span>{formatDate(order.start_date) || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-zinc-500">交货日期</span><span className={`font-bold ${blueColors.text}`}>{formatDate(getOrderMaxDueDate(order))}</span></div>
                  {order.notes && <div className="pt-2 text-zinc-500 text-xs italic">备注: {order.notes}</div>}
                </div>
                {isExpanded && sortedItems.map((item, idx) => (
                  <div key={item.id || idx} className="border-t border-zinc-100 p-4 bg-zinc-50">
                    <div className="font-medium text-zinc-900 mb-2">{item.part_name || `零件 ${idx + 1}`}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-zinc-500">零件号</span><span>{item.part_number || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">数量</span><span>{item.quantity}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">单价</span><span>¥{item.unit_price}</span></div>
                      <div className="flex justify-between"><span className="text-zinc-500">交货日期</span><span>{formatDate(item.due_date || order.due_date)}</span></div>
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
        total={filteredOrders.length}
        page={currentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  );
};

export default Orders;

import React from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Clock,
  TrendingUp,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Eye,
  FileText,
  ClipboardList,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Order } from '../types';
import { StatusBadge, PriorityBadge, ProcessStatusBadge, PROCESS_COLORS } from '../components/shared';
import { DashboardItem } from '../services/api';

interface DashboardProps {
  orders: Order[];
  dashboardItems: DashboardItem[];
  dashboardStats: {
    pending_count: number;
    processing_count: number;
    completed_count: number;
    overdue_count: number;
    warning_count: number;
    near_due_count: number;
    pending_order_count?: number;
    processing_order_count?: number;
    completed_order_count?: number;
  };
  dashboardPage: number;
  dashboardPageSize: number;
  dashboardTotal: number;
  setDashboardPage: (page: number) => void;
  setDashboardPageSize: (size: number) => void;
  setActiveTab: (tab: string) => void;
  setOrderFilters: (filters: any) => void;
  setAppliedOrderFilters: (filters: any) => void;
  setCurrentPage: (page: number) => void;
  resetAndOpenModal: () => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  fetchData: () => void;
  formatDate: (date: string | null | undefined) => string;
  hideCostFields?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({
  orders,
  dashboardItems,
  dashboardStats,
  dashboardPage,
  dashboardPageSize,
  dashboardTotal,
  setDashboardPage,
  setDashboardPageSize,
  setActiveTab,
  setOrderFilters,
  setAppliedOrderFilters,
  setCurrentPage,
  resetAndOpenModal,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  fetchData,
  formatDate,
  hideCostFields = false
}) => {
  return (
    <div className="flex-1 overflow-y-auto space-y-8 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">工作看板</h2>
          <p className="text-zinc-500">今日共有 {orders.filter(o => o.status !== 'delivered').length} 个进行中的任务</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-500">
            <span className="font-medium text-zinc-700">排序：</span>
            订单日期<span className="text-emerald-500">↑</span> → 零件交期<span className="text-emerald-500">↑</span> → 零件状态<span className="text-emerald-500">↑</span>
          </div>
          <button
            onClick={resetAndOpenModal}
            className="bg-zinc-900 text-white px-6 py-3 rounded-none font-medium flex items-center justify-start gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
          >
            <Plus className="w-5 h-5" />
            新建订单
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 px-4 md:px-8">
        {[
          { label: '待加工', count: dashboardStats.pending_count, orderCount: dashboardStats.pending_order_count ?? 0, color: 'amber', icon: Clock, action: 'filter', filterStatus: 'pending' },
          { label: '加工中', count: dashboardStats.processing_count, orderCount: dashboardStats.processing_order_count ?? 0, color: 'blue', icon: TrendingUp, action: 'filter', filterStatus: 'processing' },
          { label: '逾期订单', count: dashboardStats.overdue_count, color: 'rose', icon: AlertCircle, action: 'tab', tab: 'overdue' },
          { label: '告警订单', count: dashboardStats.warning_count, color: 'orange', icon: AlertTriangle, action: 'tab', tab: 'warning_orders' },
          { label: '临期订单', count: dashboardStats.near_due_count, color: 'yellow', icon: Clock, action: 'tab', tab: 'imminent_orders' },
          { label: '已完成', count: dashboardStats.completed_count, orderCount: dashboardStats.completed_order_count ?? 0, color: 'emerald', icon: CheckCircle2, action: 'filter', filterStatus: 'completed' },
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
          const showOrderCount = 'orderCount' in stat;

          const handleClick = () => {
            if (stat.action === 'tab' && stat.tab) {
              // 生产菜单跳转到对应的生产菜单
              const targetTab = hideCostFields
                ? stat.tab.replace('overdue', 'production_overdue')
                    .replace('warning_orders', 'production_warning')
                    .replace('imminent_orders', 'production_imminent')
                : stat.tab;
              setActiveTab(targetTab);
            } else if (stat.action === 'filter' && stat.filterStatus) {
              setOrderFilters(prev => ({ ...prev, status: stat.filterStatus as any }));
              setAppliedOrderFilters(prev => ({ ...prev, status: stat.filterStatus as any }));
              // 生产菜单跳转到生产订单管理
              setActiveTab(hideCostFields ? 'production_orders' : 'orders');
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
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${style.bg} flex items-center justify-center shrink-0`}>
                  <stat.icon className={`w-5 h-5 ${style.text}`} />
                </div>
                {showOrderCount ? (
                  <div className="flex flex-col leading-tight">
                    <span className="text-base font-bold">{stat.count}</span>
                    <span className="text-xs font-medium text-zinc-400">零件</span>
                  </div>
                ) : (
                  <div className="flex flex-col leading-tight">
                    <span className="text-base font-bold">{stat.count}</span>
                    <span className="text-xs font-medium text-zinc-400">订单</span>
                  </div>
                )}
              </div>
              {showOrderCount && (
                <p className="text-xs font-medium text-zinc-400 ml-13">
                  订单 {stat.orderCount} 个
                </p>
              )}
              <p className="text-sm font-medium text-zinc-500 mt-1">{stat.label}</p>
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
              快速下单
            </button>
          </div>
        </div>
        <div className="grid gap-3">
          {(() => {
            // API已返回分页数据，无需再次slice
            const totalPages = Math.ceil(dashboardTotal / dashboardPageSize);

            if (dashboardItems.length > 0) {
              return (
                <>
                  {dashboardItems.map((item) => (
                    <motion.div
                      layout
                      key={`${item.order_id}-${item.item_id}`}
                      className="bg-white p-4 rounded-xl border border-zinc-200 flex flex-col sm:flex-row sm:items-start gap-2 hover:border-zinc-300 transition-colors shadow-sm"
                    >
                      <div className="flex items-start gap-4 w-[420px] shrink-0">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${item.status === 'processing' ? 'bg-blue-50 text-blue-600' : 'bg-zinc-50 text-zinc-400'}`}>
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold">{item.part_name}</h4>
                            <PriorityBadge priority={item.priority as any} />
                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">订单: {item.order_number || item.order_id}</span>
                            <span className="text-xs text-zinc-500">{item.customer_short_name}</span>
                            <span className="text-xs text-zinc-400">数量: {item.quantity}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Clock className="w-3 h-3 text-zinc-400" />
                            <span className="text-xs text-zinc-400">
                              {item.start_date && `订单: ${formatDate(item.start_date)} · `}
                              交期: {formatDate(item.due_date)}
                            </span>
                            {item.part_number && (
                              <>
                                <span className="text-zinc-300">|</span>
                                <span className="text-xs text-zinc-500 font-mono">P/N: {item.part_number}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 工序节点列 */}
                      <div className="flex flex-wrap gap-2 w-[600px] shrink-0 min-h-[40px]">
                        {item.processes && item.processes.length > 0 && item.processes.map((p) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1 border rounded px-2 py-1 cursor-pointer transition-colors ${PROCESS_COLORS[p.name] || 'bg-zinc-50 border-zinc-100 hover:bg-zinc-100'}`}
                            onClick={() => handleProcessClick(item.order_id, item.item_id, p.id, p.status, p.name)}
                          >
                            <span className="text-[10px] font-bold">{p.name}</span>
                            <ProcessStatusBadge status={p.status} />
                            {p.is_outsourced && !hideCostFields && (
                              <div className="flex items-center gap-0.5 text-[8px] bg-zinc-900 text-white px-1.5 rounded-full">
                                <span>共</span>
                                {p.outsourcing_fee > 0 && <span>¥{p.outsourcing_fee}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            const order = orders.find(o => o.id === item.order_id);
                            if (order) editOrder(order);
                          }}
                          className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"
                          title="修改订单"
                        >
                          <Settings className="w-5 h-5" />
                        </button>
                        {item.drawing_data && (
                          <button
                            onClick={() => setShowDrawingModal(item.drawing_data)}
                            className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        )}
                        <StatusBadge status={item.status} />
                      </div>
                    </motion.div>
                  ))}

                  {/* Dashboard Pagination */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2 pt-4 border-t border-zinc-100">
                    <div className="flex items-center gap-4 text-sm text-zinc-500">
                      <span>共<span className="font-bold text-zinc-900">{dashboardTotal}</span> 个待办零件</span>
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
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - dashboardPage) <= 1)
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
                        disabled={dashboardPage === totalPages || dashboardTotal === 0}
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
                <p className="text-[10px]">点击右上角"快速下单"开始</p>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

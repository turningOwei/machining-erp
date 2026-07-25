import React, { useEffect } from 'react';
import { ClipboardList } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { OrderFilters, filterOrdersLocal } from '../services/orderService';
import { orderFilterConfigs } from '../configs/filterConfigs';

interface OrdersProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  orderFilters: OrderFilters;
  setOrderFilters: (filters: OrderFilters) => void;
  appliedOrderFilters?: OrderFilters;
  setAppliedOrderFilters?: (filters: OrderFilters) => void;
  showOrderFilters?: boolean;
  setShowOrderFilters?: (show: boolean) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  orderTotal: number;
  orderMgrExpanded?: Set<number>;
  setOrderMgrExpanded?: (set: Set<number>) => void;
  allOrderMgrExpanded?: boolean;
  setAllOrderMgrExpanded?: (expanded: boolean) => void;
  resetAndOpenModal: () => void;
  editOrder: (order: Order) => void;
  deleteOrder: (orderId: number) => void;
  toggleOrderMgr?: (orderId: number) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  fetchData: () => void;
  fetchOrdersWithFilters: (filters: OrderFilters, page?: number, pageSize?: number) => Promise<void>;
  hideCostFields?: boolean;
}

const Orders: React.FC<OrdersProps> = ({
  orders,
  setOrders,
  orderFilters,
  setOrderFilters,
  currentPage,
  setCurrentPage,
  pageSize,
  setPageSize,
  orderTotal,
  resetAndOpenModal,
  editOrder,
  deleteOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate,
  fetchData,
  fetchOrdersWithFilters,
  hideCostFields = false
}) => {
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);

  // 组件挂载时检查是否有筛选条件（如从Dashboard点击卡片跳转）
  useEffect(() => {
    const hasFilters = orderFilters.status || orderFilters.orderNumber || orderFilters.customerName || orderFilters.partNumber || orderFilters.partName || orderFilters.priority || orderFilters.dueDateStart || orderFilters.dueDateEnd;
    if (hasFilters) {
      fetchOrdersWithFilters(orderFilters, currentPage, pageSize);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 只在挂载时执行一次

  // Handle search with API call
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      setCurrentPage(1);
      await fetchOrdersWithFilters(orderFilters, 1, pageSize);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 分页切换时带筛选条件查询
  const handlePageChangeWithFilters = async (newPage: number, newPageSize?: number) => {
    setIsSearching(true);
    try {
      if (newPage !== currentPage) {
        setCurrentPage(newPage);
      }
      await fetchOrdersWithFilters(orderFilters, newPage, newPageSize || pageSize);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle delete click
  const handleDeleteClick = (order: Order) => {
    setDeletingOrder(order);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="flex-1 !w-full flex flex-col min-h-0">
      {/* Shared Panel */}
      <OrderMonitorPanel
        title="订单管理"
        icon={ClipboardList}
        orders={orders}
        filters={orderFilters}
        setFilters={setOrderFilters}
        filterConfigs={orderFilterConfigs}
        localFilter={(orders, filters, getMaxDueDate) => filterOrdersLocal(orders, filters as OrderFilters, getMaxDueDate)}
        page={currentPage}
        setPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        total={orderTotal}
        themeColor="blue"
        editOrder={editOrder}
        deleteOrder={handleDeleteClick}
        setShowDrawingModal={setShowDrawingModal}
        handleProcessClick={handleProcessClick}
        getOrderMaxDueDate={getOrderMaxDueDate}
        showOrderName={true}
        showContactName={true}
        showOrderNotes={true}
        showOutsourcingFee={!hideCostFields}
        showTotalAmount={!hideCostFields}
        onSearch={handleSearch}
        onPageChangeWithFilters={handlePageChangeWithFilters}
        isSearching={isSearching}
        onNewOrder={resetAndOpenModal}
      />

      {/* Delete Confirm Modal */}
      <DeleteConfirmModal
        show={showDeleteConfirm}
        title="确认删除订单"
        message={`确定要删除订单 ${deletingOrder?.order_number || deletingOrder?.id} 吗？此操作不可撤销。`}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingOrder(null);
        }}
        onConfirm={() => {
          if (deletingOrder && deletingOrder.id) {
            deleteOrder(deletingOrder.id);
          }
          setShowDeleteConfirm(false);
          setDeletingOrder(null);
        }}
      />
    </div>
  );
};

export default Orders;

import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel, { FilterConfig } from '../components/OrderMonitorPanel';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { OrderFilters, filterOrdersLocal } from '../services/orderService';

interface OrdersProps {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  orderFilters: OrderFilters;
  setOrderFilters: (filters: OrderFilters) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  resetAndOpenModal: () => void;
  editOrder: (order: Order) => void;
  deleteOrder: (orderId: number) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
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
  resetAndOpenModal,
  editOrder,
  deleteOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate
}) => {
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [deletingOrder, setDeletingOrder] = React.useState<Order | null>(null);

  // Handle search with API call
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      setCurrentPage(1);
      // API search would go here if needed
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

  // Filter configs for Orders page
  const filterConfigs: FilterConfig[] = [
    { key: 'dueDateStart', label: '交货日期(起)', type: 'date' },
    { key: 'dueDateEnd', label: '交货日期(止)', type: 'date' },
    { key: 'orderNumber', label: '订单号', type: 'text', placeholder: '搜索订单号...' },
    { key: 'partNumber', label: '零件号', type: 'text', placeholder: '搜索零件号...' },
    { key: 'customerName', label: '客户名称', type: 'text', placeholder: '搜索客户...' },
    {
      key: 'priority',
      label: '优先级',
      type: 'select',
      placeholder: '全部优先级',
      options: [
        { value: 'high', label: '高优先级' },
        { value: 'medium', label: '普通' },
        { value: 'low', label: '较低' }
      ]
    },
    {
      key: 'status',
      label: '订单状态',
      type: 'select',
      placeholder: '全部状态',
      options: [
        { value: 'pending', label: '待加工' },
        { value: 'processing', label: '加工中' },
        { value: 'completed', label: '已完成' },
        { value: 'delivered', label: '已送货' }
      ]
    }
  ];

  return (
    <div className="flex-1 !w-full flex flex-col min-h-0">
      {/* Header with New Order button */}
      <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8 mb-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => resetAndOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
          >
            <Plus className="w-4 h-4" />
            新建订单
          </button>
        </div>
      </div>

      {/* Shared Panel */}
      <OrderMonitorPanel
        title="订单管理"
        icon={ClipboardList}
        orders={orders}
        filters={orderFilters}
        setFilters={setOrderFilters}
        filterConfigs={filterConfigs}
        localFilter={(orders, filters, getMaxDueDate) => filterOrdersLocal(orders, filters as OrderFilters, getMaxDueDate)}
        page={currentPage}
        setPage={setCurrentPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        themeColor="blue"
        editOrder={editOrder}
        deleteOrder={handleDeleteClick}
        setShowDrawingModal={setShowDrawingModal}
        handleProcessClick={handleProcessClick}
        getOrderMaxDueDate={getOrderMaxDueDate}
        showOrderName={true}
        showContactName={true}
        showOrderNotes={true}
        showOutsourcingFee={true}
        onSearch={handleSearch}
        isSearching={isSearching}
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
          if (deletingOrder) {
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
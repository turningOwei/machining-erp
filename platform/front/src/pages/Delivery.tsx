import React from 'react';
import { Truck, FileCheck } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';
import { simpleFilterConfigs } from '../configs/filterConfigs';

interface DeliveryProps {
  orders: Order[];
  deliveryFilters: any;
  setDeliveryFilters: (filters: any) => void;
  deliveryPage: number;
  setDeliveryPage: (page: number) => void;
  deliveryPageSize: number;
  setDeliveryPageSize: (size: number) => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  fetchData: () => void;
  fetchOrdersWithFilters: (filters: any, page?: number, pageSize?: number, dateType?: string) => Promise<void>;
  hideCostFields?: boolean;
}

const Delivery: React.FC<DeliveryProps> = ({
  orders,
  deliveryFilters,
  setDeliveryFilters,
  deliveryPage,
  setDeliveryPage,
  deliveryPageSize,
  setDeliveryPageSize,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate,
  fetchData,
  fetchOrdersWithFilters,
  hideCostFields = false
}) => {
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      const filtersWithStatus = { ...deliveryFilters, status: 'completed' };
      await fetchOrdersWithFilters(filtersWithStatus, deliveryPage, deliveryPageSize);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOrder = (orderId: number | null) => {
    setSelectedOrderId(prev => prev === orderId ? null : orderId);
  };

  const handlePreviewDelivery = () => {
    if (!selectedOrderId) return;
    const selectedOrder = orders.find(o => o.id === selectedOrderId);
    if (selectedOrder) {
      alert(`预览送货单：${selectedOrder.order_number}`);
      // TODO: 打开送货单预览弹窗
    }
  };

  // 后端已通过 status='completed' 筛选
  const completedOrders = orders;

  return (
    <OrderMonitorPanel
      title="送货管理"
      icon={Truck}
      orders={completedOrders}
      filters={deliveryFilters}
      setFilters={setDeliveryFilters}
      filterConfigs={simpleFilterConfigs}
      page={deliveryPage}
      setPage={setDeliveryPage}
      pageSize={deliveryPageSize}
      setPageSize={setDeliveryPageSize}
      total={completedOrders.length}
      themeColor="emerald"
      editOrder={editOrder}
      setShowDrawingModal={setShowDrawingModal}
      handleProcessClick={handleProcessClick}
      getOrderMaxDueDate={getOrderMaxDueDate}
      showOrderName={true}
      showContactName={true}
      showOutsourcingFee={!hideCostFields}
      showTotalAmount={!hideCostFields}
      onSearch={handleSearch}
      isSearching={isSearching}
      deliveryMode={true}
      selectedOrderId={selectedOrderId}
      onSelectOrder={handleSelectOrder}
      onPreviewDelivery={handlePreviewDelivery}
    />
  );
};

export default Delivery;
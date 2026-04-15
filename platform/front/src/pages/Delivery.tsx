import React from 'react';
import { Truck, FileCheck } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';
import DeliveryPreviewModal from '../components/DeliveryPreviewModal';
import { simpleFilterConfigs } from '../configs/filterConfigs';
import { authFetch } from '../components/shared';

interface PrintTemplate {
  id: number;
  name: string;
  template: string;
  excel_filename?: string;
}

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
  console.log('Delivery component loaded, orders:', orders?.length);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedOrderId, setSelectedOrderId] = React.useState<number | null>(null);
  const [showPreviewModal, setShowPreviewModal] = React.useState(false);
  const [previewOrder, setPreviewOrder] = React.useState<Order | null>(null);
  const [previewTemplate, setPreviewTemplate] = React.useState<PrintTemplate | null>(null);

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

  const handlePreviewDelivery = async () => {
    if (!selectedOrderId) return;
    const order = orders.find(o => o.id === selectedOrderId);
    if (!order) return;

    // 查询绑定的模板
    try {
      const res = await authFetch('/api/platform/print-templates/by-button?menu_route=production_delivery&button_key=btn-preview-delivery-note');
      const result = await res.json();

      if (result.data) {
        setPreviewOrder(order);
        setPreviewTemplate(result.data);
        setShowPreviewModal(true);
      } else {
        alert(result.error || '未找到绑定的送货单模板，请先在打印模板管理中绑定');
      }
    } catch (err) {
      alert('查询模板失败');
    }
  };

  // 后端已通过 status='completed' 筛选
  const completedOrders = orders;

  return (
    <>
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

      {/* 送货单预览弹窗 */}
      {showPreviewModal && previewOrder && previewTemplate && (
        <DeliveryPreviewModal
          order={previewOrder}
          template={previewTemplate}
          onClose={() => setShowPreviewModal(false)}
        />
      )}
    </>
  );
};

export default Delivery;
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';

interface WarningProps {
  orders: Order[];
  warningFilters: any;
  setWarningFilters: (filters: any) => void;
  warningPage: number;
  setWarningPage: (page: number) => void;
  warningPageSize: number;
  setWarningPageSize: (size: number) => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  checkOrderAgainstRules: (order: Order, type: 'warning' | 'imminent') => boolean;
}

const Warning: React.FC<WarningProps> = ({
  orders,
  warningFilters,
  setWarningFilters,
  warningPage,
  setWarningPage,
  warningPageSize,
  setWarningPageSize,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate,
  checkOrderAgainstRules
}) => {
  const warningOrders = orders.filter(o => checkOrderAgainstRules(o, 'warning'));

  return (
    <OrderMonitorPanel
      title="告警订单"
      icon={AlertTriangle}
      orders={warningOrders}
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
  );
};

export default Warning;

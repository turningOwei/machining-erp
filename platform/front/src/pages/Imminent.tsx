import React from 'react';
import { Clock } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';

interface ImminentProps {
  orders: Order[];
  imminentFilters: any;
  setImminentFilters: (filters: any) => void;
  imminentPage: number;
  setImminentPage: (page: number) => void;
  imminentPageSize: number;
  setImminentPageSize: (size: number) => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
  checkOrderAgainstRules: (order: Order, type: 'warning' | 'imminent') => boolean;
}

const Imminent: React.FC<ImminentProps> = ({
  orders,
  imminentFilters,
  setImminentFilters,
  imminentPage,
  setImminentPage,
  imminentPageSize,
  setImminentPageSize,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate,
  checkOrderAgainstRules
}) => {
  const imminentOrders = orders.filter(o => checkOrderAgainstRules(o, 'imminent'));

  return (
    <OrderMonitorPanel
      title="临期订单"
      icon={Clock}
      orders={imminentOrders}
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
  );
};

export default Imminent;

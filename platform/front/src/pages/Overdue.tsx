import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';

interface OverdueProps {
  orders: Order[];
  overdueFilters: any;
  setOverdueFilters: (filters: any) => void;
  overduePage: number;
  setOverduePage: (page: number) => void;
  overduePageSize: number;
  setOverduePageSize: (size: number) => void;
  editOrder: (order: Order) => void;
  setShowDrawingModal: (data: string) => void;
  handleProcessClick: (orderId: number, itemId: number, processId: number, status: string, name: string) => void;
  getOrderMaxDueDate: (order: Order) => string;
}

const Overdue: React.FC<OverdueProps> = ({
  orders,
  overdueFilters,
  setOverdueFilters,
  overduePage,
  setOverduePage,
  overduePageSize,
  setOverduePageSize,
  editOrder,
  setShowDrawingModal,
  handleProcessClick,
  getOrderMaxDueDate
}) => {
  const overdueOrders = orders.filter(o => {
    const maxDueDate = getOrderMaxDueDate(o);
    return (maxDueDate || '') < new Date().toISOString().split('T')[0] && o.status !== 'delivered';
  });

  return (
    <OrderMonitorPanel
      title="逾期订单"
      icon={AlertCircle}
      orders={overdueOrders}
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
  );
};

export default Overdue;

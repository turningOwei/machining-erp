import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';
import { simpleFilterConfigs } from '../configs/filterConfigs';

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
  fetchData: (dateType?: string) => void;
  fetchOrdersWithFilters: (filters: any, page?: number, pageSize?: number, dateType?: string) => Promise<void>;
  hideCostFields?: boolean;
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
  getOrderMaxDueDate,
  fetchData,
  fetchOrdersWithFilters,
  hideCostFields = false
}) => {
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      await fetchOrdersWithFilters(overdueFilters, overduePage, overduePageSize, 'overdue');
    } finally {
      setIsSearching(false);
    }
  };

  const overdueOrders = orders; // 后端已通过 dateType='overdue' 筛选

  return (
    <OrderMonitorPanel
      title="逾期订单"
      icon={AlertCircle}
      orders={overdueOrders}
      filters={overdueFilters}
      setFilters={setOverdueFilters}
      filterConfigs={simpleFilterConfigs}
      page={overduePage}
      setPage={setOverduePage}
      pageSize={overduePageSize}
      setPageSize={setOverduePageSize}
      themeColor="rose"
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
    />
  );
};

export default Overdue;

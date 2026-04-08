import React from 'react';
import { Clock } from 'lucide-react';
import { Order } from '../types';
import OrderMonitorPanel from '../components/OrderMonitorPanel';
import { simpleFilterConfigs } from '../configs/filterConfigs';

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
  fetchData: (dateType?: string) => void;
  fetchOrdersWithFilters: (filters: any, page?: number, pageSize?: number, dateType?: string) => Promise<void>;
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
  fetchData,
  fetchOrdersWithFilters
}) => {
  const [isSearching, setIsSearching] = React.useState(false);

  const handleSearch = async () => {
    setIsSearching(true);
    try {
      await fetchOrdersWithFilters(imminentFilters, imminentPage, imminentPageSize, 'near_due');
    } finally {
      setIsSearching(false);
    }
  };

  const imminentOrders = orders; // 后端已通过 dateType='near_due' 筛选

  return (
    <OrderMonitorPanel
      title="临期订单"
      icon={Clock}
      orders={imminentOrders}
      filters={imminentFilters}
      setFilters={setImminentFilters}
      filterConfigs={simpleFilterConfigs}
      page={imminentPage}
      setPage={setImminentPage}
      pageSize={imminentPageSize}
      setPageSize={setImminentPageSize}
      themeColor="amber"
      editOrder={editOrder}
      setShowDrawingModal={setShowDrawingModal}
      handleProcessClick={handleProcessClick}
      getOrderMaxDueDate={getOrderMaxDueDate}
      showOrderName={true}
      showContactName={true}
      showTotalAmount={true}
      onSearch={handleSearch}
      isSearching={isSearching}
    />
  );
};

export default Imminent;

import React, { useCallback } from 'react';
import { Order, OrderItem, OrderProcess, AdventRule } from '../types';
import { formatDateForInput, authFetch } from '../components/shared';
import { fetchNextOrderNumberApi } from '../services/api';

export function useOrders(
  orders: Order[],
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>,
  adventRules: AdventRule[],
  fetchData: () => void
) {
  // 获取订单最大交期
  const getOrderMaxDueDate = useCallback((order: Order): string => {
    let max = order.due_date || '';
    if (order.items && order.items.length > 0) {
      const dates = order.items.map(i => i.due_date).filter(Boolean);
      if (dates.length > 0) {
        max = dates.sort().reverse()[0];
      }
    }
    return max;
  }, []);

  // 检查订单是否符合规则
  const checkOrderAgainstRules = useCallback((order: Order, ruleType: 'warning' | 'imminent'): boolean => {
    if (order.status === 'delivered') return false;

    const rules = adventRules.filter(r => r.ruleType === ruleType);
    if (rules.length === 0) return false;

    const maxDueDate = getOrderMaxDueDate(order);
    const todayStr = new Date().toISOString().split('T')[0];

    if (maxDueDate && maxDueDate < todayStr) return false;

    const orderDate = order.start_date || (order.created_at ? order.created_at.split('T')[0] : '');

    const d = (dateStr: string) => Math.floor(new Date(dateStr).getTime() / 86400000);
    const today = Math.floor(new Date().getTime() / 86400000);

    return rules.some(rule => {
      if (rule.scopeType === 'specific') {
        if (rule.name !== order.order_number && rule.name !== order.customer_name) return false;
      }

      try {
        let processedFormula = rule.formula
          .replace(/{订单交期}/g, d(maxDueDate).toString())
          .replace(/{订单日期}/g, d(orderDate).toString())
          .replace(/{当天}/g, today.toString());

        const result = new Function(`return ${processedFormula}`)();
        return !!result;
      } catch (e) {
        return false;
      }
    });
  }, [adventRules, getOrderMaxDueDate]);

  // 从工序获取零件状态
  const getItemStatusFromProcesses = useCallback((processes: OrderProcess[]): OrderItem['status'] => {
    if (!processes || processes.length === 0) return 'pending';

    const statuses = processes.map(p => p.status || 'pending');

    if (statuses.every(s => s === 'completed')) return 'completed';
    if (statuses.every(s => s === 'pending')) return 'pending';

    return 'processing';
  }, []);

  // 从零件获取订单状态
  const getOrderStatusFromItems = useCallback((items: OrderItem[]): Order['status'] => {
    if (!items || items.length === 0) return 'pending';

    const statuses = items.map(i => i.status || 'pending');

    if (statuses.every(s => s === 'completed' || s === 'delivered')) {
      return 'completed';
    }

    if (statuses.every(s => s === 'pending')) {
      return 'pending';
    }

    return 'processing';
  }, []);

  // 更新工序状态
  const updateProcessStatus = useCallback(async (itemId: number, processId: number, status: string) => {
    try {
      const response = await authFetch(`/api/platform/order-items/${itemId}/processes/${processId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      fetchData();
    } catch (err) {
      console.error("Failed to update process status:", err);
      fetchData();
    }
  }, [fetchData]);

  // 处理工序点击
  const handleProcessClick = useCallback((orderId: number, itemId: number, processId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'pending' ? 'processing' : currentStatus === 'processing' ? 'completed' : 'pending';

    // 本地乐观更新
    setOrders(prevOrders => {
      return prevOrders.map(o => {
        if (Number(o.id) !== Number(orderId)) return o;
        if (!o.items) return o;

        const updatedItems = o.items.map(i => {
          if (Number(i.id) !== Number(itemId)) return i;
          if (!i.processes) return i;

          const newProcesses = i.processes.map(prevP =>
            Number(prevP.id) === Number(processId) ? { ...prevP, status: nextStatus } : prevP
          );
          const newItemStatus = getItemStatusFromProcesses(newProcesses);
          // 根据零件状态更新完工日期
          const today = new Date().toISOString().split('T')[0];
          const completionDate = newItemStatus === 'completed' ? today : '';
          return {
            ...i,
            processes: newProcesses,
            status: newItemStatus,
            completion_date: completionDate
          };
        });
        return {
          ...o,
          items: updatedItems,
          status: getOrderStatusFromItems(updatedItems)
        };
      });
    });

    updateProcessStatus(itemId, processId, nextStatus);
  }, [setOrders, updateProcessStatus, getItemStatusFromProcesses, getOrderStatusFromItems]);

  // 编辑订单
  const editOrder = useCallback((order: Order, setNewOrder: (order: Partial<Order>) => void, setShowOrderModal: (show: boolean) => void) => {
    const orderStartDate = order.start_date || (order.items && order.items.length > 0 ? order.items[0].start_date : null);
    const orderDueDate = order.due_date || (order.items && order.items.length > 0 ? order.items[0].due_date : null);

    setNewOrder({
      id: order.id,
      order_number: order.order_number,
      order_name: order.order_name,
      customer_id: order.customer_id,
      customer_name: order.customer_name,
      customer_short_name: order.customer_short_name,
      contact_name: order.contact_name,
      priority: order.priority,
      start_date: formatDateForInput(orderStartDate),
      due_date: formatDateForInput(orderDueDate),
      total_amount: order.total_amount,
      notes: order.notes,
      items: (order.items || []).map(item => ({
        ...item,
        id: item.id,
        order_id: item.order_id,
        part_number: item.part_number || '',
        scrap_quantity: item.scrap_quantity || 0,
        delivered_quantity: item.delivered_quantity || 0,
        tool_cost: item.tool_cost || 0,
        fixture_cost: item.fixture_cost || 0,
        material_cost: item.material_cost || 0,
        other_cost: item.other_cost || 0,
        item_notes: item.item_notes || '',
        start_date: formatDateForInput(item.start_date || orderStartDate),
        due_date: formatDateForInput(item.due_date || orderDueDate),
        completion_date: formatDateForInput(item.completion_date),
        processes: (item.processes || []).map(p => ({
          id: p.id,
          order_item_id: p.order_item_id,
          name: p.name,
          is_outsourced: p.is_outsourced,
          outsourcing_fee: p.outsourcing_fee,
          status: p.status,
          sort_order: p.sort_order
        }))
      }))
    });
    setShowOrderModal(true);
  }, []);

  // 重置并打开新建订单弹框
  const resetAndOpenModal = useCallback(async (
    setNewOrder: (order: Partial<Order>) => void,
    setShowOrderModal: (show: boolean) => void
  ) => {
    const generatedOrderNumber = await fetchNextOrderNumberApi();

    setNewOrder({
      priority: 'medium',
      status: 'pending',
      start_date: '',
      due_date: '',
      order_number: generatedOrderNumber,
      items: [{ part_name: '', quantity: 1, unit_price: 0, processes: [] }]
    } as Partial<Order>);
    setShowOrderModal(true);
  }, []);

  return {
    getOrderMaxDueDate,
    checkOrderAgainstRules,
    getItemStatusFromProcesses,
    getOrderStatusFromItems,
    handleProcessClick,
    editOrder,
    resetAndOpenModal
  };
}

import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { Order, Customer, OrderItem } from '../types';
import ProcessCell from './ProcessCell';
import { formatDate } from './shared';

interface FormErrors {
  customer?: string;
  orderDate?: string;
  deliveryDate?: string;
}

interface OrderModalProps {
  show: boolean;
  onClose: () => void;
  newOrder: Partial<Order>;
  setNewOrder: (order: Partial<Order>) => void;
  customers: Customer[];
  customerSearch: string;
  setCustomerSearch: (search: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (show: boolean) => void;
  customerDropdownRef: React.RefObject<HTMLDivElement>;
  formErrors: FormErrors;
  setFormErrors: (errors: FormErrors) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSaving: boolean;
}

const OrderModal: React.FC<OrderModalProps> = ({
  show,
  onClose,
  newOrder,
  setNewOrder,
  customers,
  customerSearch,
  setCustomerSearch,
  showCustomerDropdown,
  setShowCustomerDropdown,
  customerDropdownRef,
  formErrors,
  setFormErrors,
  onSubmit,
  isSaving
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-[95vw] bg-white rounded-3xl shadow-2xl transition-all duration-300"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold">{newOrder.id ? '修改订单' : '新建订单'}</h3>
            {newOrder.id && <span className="text-xs text-zinc-500">正在编辑订单: {newOrder.order_number || newOrder.id}</span>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 pt-2 space-y-2">
          {/* Common Order Header */}
          <div className="bg-zinc-50 px-2.5 py-2 rounded-2xl border border-zinc-100 flex items-end gap-3">
            <div className="grid grid-cols-4 md:grid-cols-[100px_80px_80px_160px_140px_200px_140px] gap-3 flex-1">
              <div className="relative" ref={customerDropdownRef}>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">选择客户 *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索客户..."
                    value={customerSearch || (newOrder.customer_id ? customers.find(c => c.id === newOrder.customer_id)?.short_name || customers.find(c => c.id === newOrder.customer_id)?.name || '' : '')}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className={`w-full px-3 py-1.5 bg-white border ${formErrors.customer ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm h-[34px]`}
                  />
                  {showCustomerDropdown && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {customers
                        .filter(c => {
                          const searchLower = (customerSearch || '').toLowerCase();
                          return c.short_name && c.short_name.toLowerCase().includes(searchLower);
                        })
                        .map(c => (
                          <div
                            key={c.id}
                            className="px-3 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                            onClick={() => {
                              setNewOrder({
                                ...newOrder,
                                customer_id: c.id,
                                customer_name: c.name,
                                customer_short_name: c.short_name,
                                contact_id: undefined,
                                contact_name: undefined
                              });
                              setCustomerSearch('');
                              setShowCustomerDropdown(false);
                              if (formErrors.customer) setFormErrors({ ...formErrors, customer: '' });
                            }}
                          >
                            {c.short_name || c.name}
                          </div>
                        ))}
                      {customers.filter(c => {
                        const searchLower = (customerSearch || '').toLowerCase();
                        return c.short_name && c.short_name.toLowerCase().includes(searchLower);
                      }).length === 0 && (
                        <div className="px-3 py-2 text-zinc-400 text-sm">未找到匹配的客户</div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.customer && (
                  <div className="mt-1 flex items-center gap-1 text-red-500 text-[10px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.customer}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">联系人</label>
                <select
                  value={newOrder.contact_id || ''}
                  onChange={e => {
                    const contactId = e.target.value ? parseInt(e.target.value) : undefined;
                    const customer = customers.find(c => c.id === newOrder.customer_id);
                    const contact = customer?.contacts?.find(ct => ct.id === contactId);
                    setNewOrder({
                      ...newOrder,
                      contact_id: contactId,
                      contact_name: contact ? contact.name : undefined
                    });
                  }}
                  disabled={!newOrder.customer_id}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm disabled:bg-zinc-100 disabled:text-zinc-400 h-[34px]"
                >
                  <option value="">选择</option>
                  {customers.find(c => c.id === newOrder.customer_id)?.contacts?.map(ct => (
                    <option key={ct.id} value={ct.id}>{ct.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">优先级</label>
                <select
                  value={newOrder.priority || 'medium'}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm h-[34px]"
                  onChange={e => setNewOrder({ ...newOrder, priority: e.target.value as any })}
                >
                  <option value="low">较低</option>
                  <option value="medium">普通</option>
                  <option value="high">紧急</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">订单号</label>
                <input
                  type="text"
                  placeholder="自动生成"
                  value={newOrder.order_number || ''}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm h-[34px]"
                  onChange={e => setNewOrder({ ...newOrder, order_number: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">订单日期 *</label>
                <div className="relative flex items-center group cursor-pointer">
                  <Calendar className="absolute left-2.5 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                  <input
                    required
                    type="date"
                    value={newOrder.start_date || ''}
                    className={`w-full pl-8 pr-2 py-1.5 bg-white border ${formErrors.orderDate ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none transition-all cursor-pointer text-sm h-[34px] [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                    onChange={e => {
                      const newDate = e.target.value;
                      const updatedItems = (newOrder.items || []).map(item => ({
                        ...item,
                        start_date: newDate
                      }));
                      setNewOrder({
                        ...newOrder,
                        start_date: newDate,
                        items: updatedItems
                      });
                      if (formErrors.orderDate) setFormErrors({ ...formErrors, orderDate: '' });
                    }}
                  />
                </div>
                {formErrors.orderDate && (
                  <div className="mt-1 flex items-center gap-1 text-red-500 text-[10px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.orderDate}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">订单名称</label>
                <input
                  type="text"
                  placeholder="订单名称..."
                  value={newOrder.order_name || ''}
                  onChange={e => setNewOrder({ ...newOrder, order_name: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm h-[34px]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-0.5">订单备注</label>
                <input
                  type="text"
                  placeholder="备注..."
                  value={newOrder.notes || ''}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg focus:ring-2 focus:ring-zinc-900 outline-none text-sm h-[34px]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const items = [...(newOrder.items || [])];
                items.push({
                  part_name: '',
                  quantity: 1,
                  unit_price: 0,
                  processes: [],
                  start_date: newOrder.start_date || ''
                });
                setNewOrder({ ...newOrder, items });
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap h-[34px]"
            >
              <Plus className="w-4 h-4" />
              添加一行
            </button>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto overflow-y-auto h-[480px] border border-zinc-200 rounded-2xl bg-white shadow-inner" style={{ '--sep-color': '#d4d4d8' } as React.CSSProperties}>
              <table className="min-w-[2400px] w-full text-left text-xs table-fixed border-collapse border-b border-zinc-200">
                <thead className="bg-zinc-50 sticky top-0 z-30">
                  <tr>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-12 text-center sticky left-0 top-0 bg-zinc-50 z-[35] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">#</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-[192px] sticky left-[48px] top-0 bg-zinc-50 z-[35] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">零件名称 *</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-[160px] sticky left-[240px] top-0 bg-zinc-50 z-[35] shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">零件号(P/N)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">单价 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">总计 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">订单日期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">订单交期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-96 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">工序流程</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32 text-right sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">外协共计 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">交货数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">刀具费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">工装费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">材料费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">其他费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">报废数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32 sticky top-0 bg-zinc-50 shadow-[inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">完工日期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-48 sticky top-0 bg-zinc-50 shadow-[inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">备注</th>
                    <th className="pl-4 pr-4 py-3 font-bold text-zinc-500 w-20 text-left sticky right-0 top-0 bg-zinc-50 z-[35] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color),inset_0_-1px_0_0_var(--sep-color),inset_0_1px_0_0_var(--sep-color)]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {newOrder.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2 font-mono text-zinc-400 sticky left-0 bg-white z-[25] shadow-[inset_-1px_0_0_0_var(--sep-color)]">{idx + 1}</td>
                      <td className="px-2 py-2 sticky left-[48px] bg-white z-[25] shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="text"
                          required
                          placeholder="输入零件号..."
                          value={item.part_name || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], part_name: e.target.value };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 sticky left-[240px] bg-white z-[15] shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="text"
                          placeholder="P/N..."
                          value={item.part_number || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], part_number: e.target.value };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          value={item.quantity || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], quantity: parseInt(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], unit_price: parseFloat(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-medium">
                          ¥{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-400 font-medium text-sm overflow-hidden whitespace-nowrap">
                          {formatDate(item.start_date)}
                        </div>
                      </td>
                      <td className="px-2 py-2 overflow-hidden shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <div className="space-y-1">
                          <div className="relative flex items-center group cursor-pointer">
                            <Calendar className="absolute left-2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                            <input
                              required
                              type="date"
                              value={item.due_date || ''}
                              onChange={e => {
                                const items = [...newOrder.items!];
                                items[idx] = { ...items[idx], due_date: e.target.value };
                                setNewOrder({ ...newOrder, items });
                                if (formErrors.deliveryDate) setFormErrors({ ...formErrors, deliveryDate: '' });
                              }}
                              className={`w-full pl-8 pr-2 py-1.5 bg-transparent border ${formErrors.deliveryDate && !item.due_date ? 'border-red-500 bg-red-50' : 'border-transparent hover:border-zinc-200'} focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                            />
                          </div>
                          {formErrors.deliveryDate && !item.due_date && (
                            <div className="flex items-center gap-1 text-red-500 text-[9px] font-bold">
                              <AlertCircle className="w-2.5 h-2.5" />
                              订单交期不能为空
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <ProcessCell
                          processes={item.processes || []}
                          onUpdate={(processes) => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], processes };
                            setNewOrder({ ...newOrder, items });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-bold text-right">
                          ¥{(item.processes || []).reduce((sum, p) => sum + Number(p.outsourcing_fee || 0), 0).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          value={item.delivered_quantity || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], delivered_quantity: parseInt(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.tool_cost || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], tool_cost: parseFloat(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.fixture_cost || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], fixture_cost: parseFloat(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.material_cost || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], material_cost: parseFloat(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className="px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <input
                          type="number"
                          step="0.01"
                          value={item.other_cost || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], other_cost: parseFloat(e.target.value) };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all"
                        />
                      </td>
                      <td className={`px-2 py-2 shadow-[inset_-1px_0_0_0_var(--sep-color)] ${(item.scrap_quantity || 0) > 0 ? 'bg-white' : ''}`}>
                        <input
                          type="number"
                          value={item.scrap_quantity || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], scrap_quantity: parseInt(e.target.value) || 0 };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className={`w-full px-3 py-1.5 border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all ${(item.scrap_quantity || 0) > 0 ? 'text-red-600 font-bold' : 'bg-transparent'}`}
                        />
                      </td>
                      <td className="px-2 py-2 overflow-hidden shadow-[inset_-1px_0_0_0_var(--sep-color)]">
                        <div className="relative flex items-center group cursor-pointer">
                          <Calendar className="absolute left-2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                          <input
                            type="date"
                            value={item.completion_date || ''}
                            onChange={e => {
                              const items = [...newOrder.items!];
                              items[idx] = { ...items[idx], completion_date: e.target.value };
                              setNewOrder({ ...newOrder, items });
                            }}
                            className="w-full pl-8 pr-2 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          />
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          placeholder="添加备注..."
                          value={item.item_notes || ''}
                          onChange={e => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], item_notes: e.target.value };
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="w-full px-3 py-1.5 bg-transparent border border-transparent hover:border-zinc-200 focus:border-zinc-900 focus:bg-white rounded-lg outline-none transition-all text-xs"
                        />
                      </td>
                      <td className="pl-4 pr-4 py-2 text-left sticky right-0 bg-white z-[25] shadow-[inset_1px_0_0_0_var(--sep-color),inset_-1px_0_0_0_var(--sep-color)]">
                        <button
                          type="button"
                          onClick={() => {
                            const items = [...newOrder.items!];
                            items.splice(idx, 1);
                            setNewOrder({ ...newOrder, items });
                          }}
                          className="p-1.5 text-zinc-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-zinc-200 text-zinc-600 rounded-2xl font-bold hover:bg-zinc-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-[2] py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 ${isSaving
                ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                : 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-200'
                }`}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                  正在保存...
                </>
              ) : (
                newOrder.id ? '确认修改' : `确认保存订单 (${newOrder.items?.length || 0}个零件)`
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default OrderModal;

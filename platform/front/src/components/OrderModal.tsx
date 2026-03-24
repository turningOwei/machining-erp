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

        <form onSubmit={onSubmit} className="p-6 space-y-6">
          {/* Common Order Header */}
          <div className="space-y-4 bg-zinc-50 p-4 rounded-2xl border border-zinc-100">
            {/* Row 1: 客户选择、订单号、优先级 */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-3 relative" ref={customerDropdownRef}>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">选择客户 *</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="搜索并选择客户..."
                    value={customerSearch || (newOrder.customer_id ? customers.find(c => c.id === newOrder.customer_id)?.short_name || customers.find(c => c.id === newOrder.customer_id)?.name || '' : '')}
                    onChange={e => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className={`w-full px-4 py-2 bg-white border ${formErrors.customer ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none`}
                  />
                  {showCustomerDropdown && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-zinc-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {customers
                        .filter(c => {
                          const searchLower = (customerSearch || '').toLowerCase();
                          return c.short_name && c.short_name.toLowerCase().includes(searchLower);
                        })
                        .map(c => (
                          <div
                            key={c.id}
                            className="px-4 py-2 hover:bg-zinc-100 cursor-pointer text-sm"
                            onClick={() => {
                              setNewOrder({
                                ...newOrder,
                                customer_id: c.id,
                                customer_name: c.name,
                                customer_short_name: c.short_name
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
                        <div className="px-4 py-2 text-zinc-400 text-sm">未找到匹配的客户</div>
                      )}
                    </div>
                  )}
                </div>
                {formErrors.customer && (
                  <div className="mt-1 flex items-center gap-1.5 text-red-500 text-[10px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.customer}
                  </div>
                )}
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单号(可选)</label>
                <input
                  type="text"
                  placeholder="自动生成"
                  value={newOrder.order_number || ''}
                  className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
                  onChange={e => setNewOrder({ ...newOrder, order_number: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">优先级</label>
                <select
                  value={newOrder.priority || 'medium'}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
                  onChange={e => setNewOrder({ ...newOrder, priority: e.target.value as any })}
                >
                  <option value="low">较低</option>
                  <option value="medium">普通</option>
                  <option value="high">紧急</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单日期 *</label>
                <div className="relative flex items-center group cursor-pointer">
                  <Calendar className="absolute left-3 w-4 h-4 text-zinc-400 group-focus-within:text-zinc-900 pointer-events-none transition-colors z-10" />
                  <input
                    required
                    type="date"
                    value={newOrder.start_date || ''}
                    className={`w-full pl-10 pr-2 py-2 bg-white border ${formErrors.orderDate ? 'border-red-500 ring-1 ring-red-500' : 'border-zinc-200'} rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none transition-all cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
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
                  <div className="mt-1 flex items-center gap-1.5 text-red-500 text-[10px] font-bold">
                    <AlertCircle className="w-3 h-3" />
                    {formErrors.orderDate}
                  </div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">订单备注</label>
                <input
                  type="text"
                  placeholder="备注..."
                  value={newOrder.notes || ''}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-inner">
              <table className="min-w-[2100px] w-full text-left text-xs table-fixed border-collapse">
                <thead className="bg-zinc-50 border-b border-zinc-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-12 text-center shadow-[inset_-1px_0_0_0_#e4e4e7]">#</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-[192px] sticky left-0 bg-zinc-50 border-b border-zinc-200 z-[15] shadow-[inset_-1px_0_0_0_#e4e4e7]">零件名称 *</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-[160px] sticky left-[192px] bg-zinc-50 border-b border-zinc-200 z-[15] shadow-[inset_-1px_0_0_0_#e4e4e7]">零件号(P/N)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">报废数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">单价 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">总计 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32">订单日期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32">交货日期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32">完工日期</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">交货数量</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">刀具费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">工装费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">材料费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-24">其他费用</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-96">工序流程</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-32 text-right">外协共计 (¥)</th>
                    <th className="px-4 py-3 font-bold text-zinc-500 w-48">备注</th>
                    <th className="pl-4 pr-6 py-3 font-bold text-zinc-500 w-20 text-left sticky right-2 bg-zinc-50 border-l border-b border-zinc-200 z-10 shadow-[inset_1px_0_0_0_#e4e4e7]">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {newOrder.items?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50/50">
                      <td className="px-4 py-2 font-mono text-zinc-400">{idx + 1}</td>
                      <td className="px-2 py-2 sticky left-0 bg-white z-[15] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
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
                      <td className="px-2 py-2 sticky left-[192px] bg-white z-[15] border-b border-zinc-200 shadow-[inset_-1px_0_0_0_#e4e4e7]">
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
                      <td className="px-2 py-2">
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
                      <td className={`px-2 py-2 ${(item.scrap_quantity || 0) > 0 ? 'bg-white' : ''}`}>
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
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-medium">
                          ¥{((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-400 font-medium text-sm overflow-hidden whitespace-nowrap">
                          {formatDate(item.start_date)}
                        </div>
                      </td>
                      <td className="px-2 py-2 overflow-hidden">
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
                              交货日期不能为空
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 overflow-hidden">
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
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2">
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
                      <td className="px-2 py-2">
                        <ProcessCell
                          processes={item.processes || []}
                          onUpdate={(processes) => {
                            const items = [...newOrder.items!];
                            items[idx] = { ...items[idx], processes };
                            setNewOrder({ ...newOrder, items });
                          }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="w-full px-3 py-1.5 bg-zinc-50 border border-zinc-100 rounded-lg text-zinc-500 font-bold text-right">
                          ¥{(item.processes || []).reduce((sum, p) => sum + Number(p.outsourcing_fee || 0), 0).toFixed(2)}
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
                      <td className="pl-4 pr-6 py-2 text-left sticky right-2 bg-white/90 backdrop-blur-sm border-b border-zinc-100 shadow-[inset_1px_0_0_0_#e4e4e7] z-10">
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
                      <td className="w-2 sticky right-0 bg-white z-10 !border-0"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              className="w-full py-3 border-2 border-dashed border-zinc-200 rounded-2xl text-zinc-400 font-bold hover:border-zinc-400 hover:text-zinc-600 transition-all flex items-center justify-start gap-2"
            >
              <Plus className="w-5 h-5" />
              添加一行
            </button>
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

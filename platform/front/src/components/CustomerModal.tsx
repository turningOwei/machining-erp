import React from 'react';
import { X } from 'lucide-react';
import { Customer } from '../types';

interface CustomerModalProps {
  show: boolean;
  onClose: () => void;
  editingCustomer: Customer | null;
  newCustomer: { name: string; contact: string };
  setNewCustomer: (customer: { name: string; contact: string }) => void;
  onSave: () => void;
}

const CustomerModal: React.FC<CustomerModalProps> = ({
  show,
  onClose,
  editingCustomer,
  newCustomer,
  setNewCustomer,
  onSave
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
          <h3 className="text-xl font-bold">{editingCustomer ? '修改客户' : '新建客户'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-zinc-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">客户名称 *</label>
            <input
              type="text"
              required
              placeholder="输入客户名称..."
              value={newCustomer.name}
              onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">联系方式</label>
            <input
              type="text"
              placeholder="输入联系方式..."
              value={newCustomer.contact}
              onChange={e => setNewCustomer({ ...newCustomer, contact: e.target.value })}
              className="w-full px-4 py-2 bg-white border border-zinc-200 rounded-xl focus:ring-2 focus:ring-zinc-900 outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-medium hover:bg-zinc-800 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerModal;

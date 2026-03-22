import React from 'react';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { Customer } from '../types';

interface CustomersProps {
  customers: Customer[];
  setEditingCustomer: (customer: Customer | null) => void;
  setNewCustomer: (customer: { name: string; contact: string }) => void;
  setShowCustomerModal: (show: boolean) => void;
  setDeletingCustomerId: (id: number | null) => void;
}

const Customers: React.FC<CustomersProps> = ({
  customers,
  setEditingCustomer,
  setNewCustomer,
  setShowCustomerModal,
  setDeletingCustomerId
}) => {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-8 animate-in fade-in duration-500 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <Users className="w-8 h-8" />
            客户管理
          </h2>
          <p className="text-zinc-500">管理客户信息，修改客户名称不会影响历史订单</p>
        </div>
        <button
          onClick={() => {
            setEditingCustomer(null);
            setNewCustomer({ name: '', contact: '' });
            setShowCustomerModal(true);
          }}
          className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建客户
        </button>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-none border-y border-zinc-200 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-4 font-semibold text-zinc-500">客户名称</th>
              <th className="px-6 py-4 font-semibold text-zinc-500">联系方式</th>
              <th className="px-6 py-4 font-semibold text-zinc-500">创建时间</th>
              <th className="px-6 py-4 font-semibold text-zinc-500 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {customers.map((customer) => (
              <tr key={customer.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <span className="font-bold text-zinc-900">{customer.name}</span>
                </td>
                <td className="px-6 py-4 text-zinc-500">{customer.contact || '-'}</td>
                <td className="px-6 py-4 text-zinc-500 text-sm">
                  {customer.created_at ? new Date(customer.created_at).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingCustomer(customer);
                        setNewCustomer({ name: customer.name, contact: customer.contact || '' });
                        setShowCustomerModal(true);
                      }}
                      className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4 text-zinc-500" />
                    </button>
                    <button
                      onClick={() => setDeletingCustomerId(customer.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-zinc-400">
                  暂无客户数据，点击"新建客户"添加
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Customers;

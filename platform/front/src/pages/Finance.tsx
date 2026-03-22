import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Reconciliation } from '../types';

interface FinanceProps {
  reconciliation: Reconciliation[];
}

const Finance: React.FC<FinanceProps> = ({ reconciliation }) => {
  return (
    <div className="flex-1 overflow-y-auto space-y-8 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
      <div className="flex items-center justify-between px-4 md:px-8">
        <h2 className="text-2xl font-bold">财务对账</h2>
        <button className="text-zinc-900 border border-zinc-200 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-50">
          导出 Excel
        </button>
      </div>

      <div className="grid gap-6">
        {reconciliation.map((item, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-white font-bold">
                {item.month.split('-')[1]}
              </div>
              <div>
                <h3 className="font-bold text-lg">{item.month} 对账单</h3>
                <p className="text-sm text-zinc-500">共 {item.order_count} 个订单</p>
              </div>
            </div>

            <div className="flex gap-8">
              <div>
                <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">总金额</p>
                <p className="text-xl font-bold">¥{item.total_amount}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-400 uppercase font-bold tracking-widest">已结算</p>
                <p className="text-xl font-bold text-emerald-600">¥{item.delivered_amount}</p>
              </div>
              <div className="flex items-center">
                <button className="bg-zinc-100 p-2 rounded-lg hover:bg-zinc-200 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Finance;

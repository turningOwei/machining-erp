import React from 'react';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, PackageCheck, ReceiptText } from 'lucide-react';
import { authFetch } from '../components/shared';
import { createOrderFilters } from '../configs/filterConfigs';

interface MonthlyOutputItem {
  month: string;
  output_amount: number;
  order_count: number;
  item_count: number;
  part_quantity: number;
  zero_price_part_quantity: number;
}

interface MonthlyOutputData {
  year: number;
  total: number;
  order_count: number;
  item_count: number;
  part_quantity: number;
  zero_price_part_quantity: number;
  months: MonthlyOutputItem[];
}

const emptyData = (year: number): MonthlyOutputData => ({
  year,
  total: 0,
  order_count: 0,
  item_count: 0,
  part_quantity: 0,
  zero_price_part_quantity: 0,
  months: Array.from({ length: 12 }, (_, index) => ({
    month: `${year}-${String(index + 1).padStart(2, '0')}`,
    output_amount: 0,
    order_count: 0,
    item_count: 0,
    part_quantity: 0,
    zero_price_part_quantity: 0,
  })),
});

const formatCurrency = (value: number) => {
  return `¥${Number(value || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

interface MonthlyOutputProps {
  setActiveTab: (tab: string) => void;
  setOrderFilters: (filters: ReturnType<typeof createOrderFilters>) => void;
  setAppliedOrderFilters: (filters: ReturnType<typeof createOrderFilters>) => void;
  setCurrentPage: (page: number) => void;
  skipNextOrdersLoadRef: React.MutableRefObject<boolean>;
  fetchOrdersWithFilters: (filters: ReturnType<typeof createOrderFilters>, page?: number, pageSize?: number) => Promise<void>;
}

const MonthlyOutput: React.FC<MonthlyOutputProps> = ({
  setActiveTab,
  setOrderFilters,
  setAppliedOrderFilters,
  setCurrentPage,
  skipNextOrdersLoadRef,
  fetchOrdersWithFilters,
}) => {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState(currentYear);
  const [data, setData] = React.useState<MonthlyOutputData>(() => emptyData(currentYear));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const fetchMonthlyOutput = React.useCallback(async (targetYear: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch(`/api/platform/stats/monthly-output?year=${targetYear}`);
      const result = await res.json();
      const payload = result.data || result;
      setData({
        ...emptyData(targetYear),
        ...payload,
        months: payload.months && payload.months.length === 12 ? payload.months : emptyData(targetYear).months,
      });
    } catch (err) {
      setError('产值统计加载失败');
      setData(emptyData(targetYear));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchMonthlyOutput(year);
  }, [year, fetchMonthlyOutput]);

  const maxAmount = Math.max(...data.months.map(item => item.output_amount), 1);
  const average = data.total / 12;
  const bestMonth = data.months.reduce((best, item) => (
    item.output_amount > best.output_amount ? item : best
  ), data.months[0]);

  const handleZeroPriceClick = async () => {
    const filters = {
      ...createOrderFilters(),
      zeroPrice: 'true',
      completionDateStart: `${year}-01-01`,
      completionDateEnd: `${year}-12-31`,
    };
    setOrderFilters(filters);
    setAppliedOrderFilters(filters);
    setCurrentPage(1);
    skipNextOrdersLoadRef.current = true;
    await fetchOrdersWithFilters(filters, 1, 10);
    setActiveTab('orders');
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-6 py-4 md:py-8 !w-full !max-w-none !m-0 !p-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-4 md:px-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">产值统计</h2>
          <p className="text-zinc-500 mt-1">按零件完工日期汇总每月产值</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(prev => prev - 1)}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            disabled={loading}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-28 px-4 py-2 border border-zinc-200 rounded-lg bg-white flex items-center justify-center gap-2 font-bold">
            <Calendar className="w-4 h-4 text-zinc-400" />
            {year}
          </div>
          <button
            onClick={() => setYear(prev => prev + 1)}
            className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"
            disabled={loading}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 md:mx-8 px-4 py-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-4 px-4 md:px-8">
        <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-sm flex-[2_1_320px] min-w-[260px]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">年度产值</p>
            <BarChart3 className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-3">{formatCurrency(data.total)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex-[1_1_180px] min-w-[160px] max-w-[240px]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">月均产值</p>
            <ReceiptText className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-xl font-bold mt-3">{formatCurrency(average)}</p>
        </div>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex-[1_1_150px] min-w-[140px] max-w-[200px]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">零件数</p>
            <PackageCheck className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-xl font-bold mt-3">{data.part_quantity}</p>
        </div>
        <button
          type="button"
          onClick={handleZeroPriceClick}
          className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm text-left hover:border-rose-300 hover:shadow-md transition-all flex-[1_1_170px] min-w-[160px] max-w-[220px]"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">价格为0零件信息</p>
            <ReceiptText className="w-5 h-5 text-rose-500" />
          </div>
          <p className="text-xl font-bold mt-3 text-rose-600">{data.zero_price_part_quantity}</p>
        </button>
        <div className="bg-white border border-zinc-200 rounded-lg p-4 shadow-sm flex-[1_1_150px] min-w-[140px] max-w-[200px]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500 font-medium">最高月份</p>
            <Calendar className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-xl font-bold mt-3">{bestMonth?.month || '-'}</p>
        </div>
      </div>

      <div className="px-4 md:px-8">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold">月度产值趋势</h3>
            {loading && <span className="text-sm text-zinc-400">加载中...</span>}
          </div>
          <div className="h-80 flex items-end gap-2 border-b border-zinc-200 pb-3">
            {data.months.map(item => {
              const height = Math.max(4, Math.round((item.output_amount / maxAmount) * 100));
              return (
                <div key={item.month} className="flex-1 min-w-0 h-full flex flex-col justify-end gap-2 group">
                  <div className="text-[10px] text-zinc-500 text-center truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {formatCurrency(item.output_amount)}
                  </div>
                  <div className="h-64 flex items-end">
                    <div
                      className="w-full bg-blue-500 hover:bg-blue-600 rounded-t transition-all"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <div className="text-xs text-zinc-500 text-center">{Number(item.month.slice(5))}月</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8">
        <div className="bg-white border border-zinc-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">月份</th>
                <th className="text-right px-4 py-3 font-medium">产值</th>
                <th className="text-right px-4 py-3 font-medium">订单数</th>
                <th className="text-right px-4 py-3 font-medium">零件信息</th>
                <th className="text-right px-4 py-3 font-medium">零件数</th>
              </tr>
            </thead>
            <tbody>
              {data.months.map(item => (
                <tr key={item.month} className="border-t border-zinc-100">
                  <td className="px-4 py-3 font-medium">{item.month}</td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.output_amount)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{item.order_count}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{item.item_count}</td>
                  <td className="px-4 py-3 text-right text-zinc-600">{item.part_quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MonthlyOutput;

import React from 'react';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, PackageCheck, PieChart, ReceiptText, X } from 'lucide-react';
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

interface CustomerMonthlyOutputItem {
  customer_name: string;
  output_amount: number;
  order_count: number;
  item_count: number;
  part_quantity: number;
}

interface CustomerMonthlyOutputData {
  month: string;
  date_type: DateType;
  total: number;
  items: CustomerMonthlyOutputItem[];
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

type DateType = 'order_date' | 'completion_date';
type DetailChartType = 'bar' | 'pie';

const chartColors = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5'];

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
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const [year, setYear] = React.useState(currentYear);
  const [dateType, setDateType] = React.useState<DateType>('order_date');
  const [data, setData] = React.useState<MonthlyOutputData>(() => emptyData(currentYear));
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [selectedMonth, setSelectedMonth] = React.useState<MonthlyOutputItem | null>(null);
  const [customerData, setCustomerData] = React.useState<CustomerMonthlyOutputData | null>(null);
  const [customerLoading, setCustomerLoading] = React.useState(false);
  const [customerError, setCustomerError] = React.useState('');
  const [detailChartType, setDetailChartType] = React.useState<DetailChartType>('bar');

  const fetchMonthlyOutput = React.useCallback(async (targetYear: number, targetDateType: DateType) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        year: String(targetYear),
        dateType: targetDateType,
      });
      const res = await authFetch(`/api/platform/stats/monthly-output?${params.toString()}`);
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
    fetchMonthlyOutput(year, dateType);
  }, [year, dateType, fetchMonthlyOutput]);

  const maxAmount = Math.max(...data.months.map(item => item.output_amount), 1);
  const averageMonthCount = year === currentYear ? currentMonth : 12;
  const average = data.total / averageMonthCount;
  const bestMonth = data.months.reduce((best, item) => (
    item.output_amount > best.output_amount ? item : best
  ), data.months[0]);
  const maxCustomerAmount = Math.max(...(customerData?.items || []).map(item => item.output_amount), 1);
  const pieGradient = React.useMemo(() => {
    const items = customerData?.items || [];
    if (!customerData?.total || items.length === 0) return '#e4e4e7 0deg 360deg';
    let currentDegree = 0;
    return items.map((item, index) => {
      const startDegree = currentDegree;
      currentDegree += (item.output_amount / customerData.total) * 360;
      return `${chartColors[index % chartColors.length]} ${startDegree}deg ${currentDegree}deg`;
    }).join(', ');
  }, [customerData]);

  const fetchCustomerMonthlyOutput = async (monthItem: MonthlyOutputItem) => {
    if (monthItem.output_amount <= 0) return;
    setSelectedMonth(monthItem);
    setCustomerData(null);
    setCustomerError('');
    setCustomerLoading(true);
    setDetailChartType('bar');
    try {
      const params = new URLSearchParams({
        month: monthItem.month,
        dateType,
      });
      const res = await authFetch(`/api/platform/stats/monthly-output/customers?${params.toString()}`);
      const result = await res.json();
      if (!res.ok || result.error) {
        throw new Error(result.error || '客户产值统计加载失败');
      }
      setCustomerData(result.data || result);
    } catch (err) {
      setCustomerError(err instanceof Error ? err.message : '客户产值统计加载失败');
    } finally {
      setCustomerLoading(false);
    }
  };

  const handleZeroPriceClick = async () => {
    const dateFilters = dateType === 'order_date'
      ? {
          startDateStart: `${year}-01-01`,
          startDateEnd: `${year}-12-31`,
        }
      : {
          completionDateStart: `${year}-01-01`,
          completionDateEnd: `${year}-12-31`,
        };
    const filters = {
      ...createOrderFilters(),
      zeroPrice: 'true',
      ...dateFilters,
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
          <p className="text-zinc-500 mt-1">按{dateType === 'order_date' ? '订单日期' : '零件完工日期'}汇总每月产值</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateType}
            onChange={(event) => setDateType(event.target.value as DateType)}
            className="px-3 py-2 border border-zinc-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          >
            <option value="order_date">订单日期</option>
            <option value="completion_date">完工日期</option>
          </select>
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
          <p className="text-xs text-zinc-400 mt-1">按 {averageMonthCount} 个月计算</p>
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
                    <button
                      type="button"
                      onClick={() => fetchCustomerMonthlyOutput(item)}
                      disabled={item.output_amount <= 0 || loading}
                      className={`w-full rounded-t transition-all ${
                        item.output_amount > 0
                          ? 'bg-blue-500 hover:bg-blue-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                          : 'bg-zinc-200 cursor-default'
                      }`}
                      style={{ height: `${height}%` }}
                      title={item.output_amount > 0 ? `查看${item.month}客户产值统计` : '暂无产值'}
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

      {selectedMonth && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold">{selectedMonth.month} 客户产值统计</h3>
                <p className="text-sm text-zinc-500 mt-1">
                  按{dateType === 'order_date' ? '订单日期' : '完工日期'}统计，总产值 {formatCurrency(customerData?.total || selectedMonth.output_amount)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border border-zinc-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDetailChartType('bar')}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${detailChartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    柱状图
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailChartType('pie')}
                    className={`px-3 py-2 text-sm font-medium flex items-center gap-1 ${detailChartType === 'pie' ? 'bg-blue-600 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                  >
                    <PieChart className="w-4 h-4" />
                    饼状图
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMonth(null)}
                  className="p-2 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto">
              {customerLoading && (
                <div className="h-80 flex items-center justify-center text-zinc-500">客户产值统计加载中...</div>
              )}
              {customerError && (
                <div className="px-4 py-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-sm">{customerError}</div>
              )}
              {!customerLoading && !customerError && customerData && (
                <div className="space-y-6">
                  {detailChartType === 'bar' ? (
                    <div className="space-y-3">
                      {customerData.items.map((item, index) => {
                        const width = maxCustomerAmount > 0 ? (Number(item.output_amount || 0) / maxCustomerAmount) * 100 : 0;
                        const percent = customerData.total > 0 ? (item.output_amount / customerData.total) * 100 : 0;
                        return (
                          <div key={item.customer_name} className="grid grid-cols-[160px_1fr_120px] gap-3 items-center">
                            <div className="text-sm font-medium text-zinc-700 truncate" title={item.customer_name}>{item.customer_name}</div>
                            <div className="relative h-8">
                              <svg className="block h-8 w-full overflow-visible" viewBox="0 0 100 32" preserveAspectRatio="none" aria-label={`${item.customer_name} 产值占最大客户 ${width.toFixed(1)}%`}>
                                <rect x="0" y="0" width="100" height="32" fill="#f4f4f5" />
                                <rect
                                  x="0"
                                  y="0"
                                  width={width}
                                  height="32"
                                  fill={chartColors[index % chartColors.length]}
                                />
                              </svg>
                              <span className={`absolute inset-y-0 right-2 flex items-center text-xs font-bold ${width >= 92 ? 'text-white' : 'text-zinc-600'}`}>
                                {percent.toFixed(1)}%
                              </span>
                            </div>
                            <div className="text-right text-sm font-bold">{formatCurrency(item.output_amount)}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-center">
                      <div className="mx-auto w-64 h-64 rounded-full border border-zinc-100 shadow-inner" style={{ background: `conic-gradient(${pieGradient})` }} />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customerData.items.map((item, index) => {
                          const percent = customerData.total > 0 ? (item.output_amount / customerData.total) * 100 : 0;
                          return (
                            <div key={item.customer_name} className="flex items-center gap-3 p-3 border border-zinc-100 rounded-lg">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: chartColors[index % chartColors.length] }} />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-medium truncate" title={item.customer_name}>{item.customer_name}</div>
                                <div className="text-xs text-zinc-500">{percent.toFixed(1)}% · {formatCurrency(item.output_amount)}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-zinc-50 text-zinc-500">
                        <tr>
                          <th className="text-left px-4 py-3 font-medium">客户</th>
                          <th className="text-right px-4 py-3 font-medium">产值</th>
                          <th className="text-right px-4 py-3 font-medium">占比</th>
                          <th className="text-right px-4 py-3 font-medium">订单数</th>
                          <th className="text-right px-4 py-3 font-medium">零件信息</th>
                          <th className="text-right px-4 py-3 font-medium">零件数</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customerData.items.map(item => (
                          <tr key={item.customer_name} className="border-t border-zinc-100">
                            <td className="px-4 py-3 font-medium">{item.customer_name}</td>
                            <td className="px-4 py-3 text-right font-bold">{formatCurrency(item.output_amount)}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{customerData.total > 0 ? `${((item.output_amount / customerData.total) * 100).toFixed(1)}%` : '-'}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{item.order_count}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{item.item_count}</td>
                            <td className="px-4 py-3 text-right text-zinc-600">{item.part_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyOutput;

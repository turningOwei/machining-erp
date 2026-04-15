import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, Info, Plus, Edit3 } from 'lucide-react';
import { Order, OrderItem } from '../types';
import { authFetch } from './shared';
import UniverSheet from './UniverSheet';
import pako from 'pako';

interface PrintTemplate {
  id: number;
  name: string;
  template: string; // gzip压缩的Univer workbook数据（base64编码）
  excel_filename?: string;
}

interface DeliveryPreviewModalProps {
  order: Order;
  template: PrintTemplate;
  onClose: () => void;
}

// 订单字段列表
const orderFields = [
  { key: 'order_number', label: '订单编号' },
  { key: 'customer_name', label: '客户名称' },
  { key: 'customer_short_name', label: '客户简称' },
  { key: 'contact_name', label: '联系人' },
  { key: 'start_date', label: '订单日期' },
  { key: 'due_date', label: '交货日期' },
  { key: 'total_amount', label: '订单总额' },
  { key: 'notes', label: '备注' },
  { key: 'priority', label: '优先级' },
];

// 零件字段列表（带#前缀表示列表变量）
const itemFields = [
  { key: 'part_name', label: '零件名称', isList: true },
  { key: 'part_number', label: '零件号', isList: true },
  { key: 'quantity', label: '数量', isList: true },
  { key: 'unit_price', label: '单价', isList: true },
  { key: 'total_price', label: '总计', isList: true },
  { key: 'completion_date', label: '完工日期', isList: true },
  { key: 'delivered_quantity', label: '交货数量', isList: true },
  { key: 'scrap_quantity', label: '报废数量', isList: true },
  { key: 'notes', label: '零件备注', isList: true },
];

const DeliveryPreviewModal: React.FC<DeliveryPreviewModalProps> = ({
  order,
  template,
  onClose
}) => {
  const [showItemRowTip, setShowItemRowTip] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const univerRef = useRef<any>(null);
  const [sheetData, setSheetData] = useState<any>(null);

  // 加载模板数据
  useEffect(() => {
    if (!template.template) return;

    try {
      let workbookData: any;
      const templateStr = template.template;

      // 检查数据格式
      if (templateStr.startsWith('UNIVER:')) {
        // 新格式：gzip压缩的Univer workbook数据
        const base64 = templateStr.substring(7);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decompressed = pako.inflate(bytes, { to: 'string' });
        workbookData = JSON.parse(decompressed);
      } else if (templateStr.startsWith('GZIP:')) {
        // 旧格式：gzip压缩数据
        const base64 = templateStr.substring(5);
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const decompressed = pako.inflate(bytes, { to: 'string' });
        workbookData = JSON.parse(decompressed);
      } else {
        // 直接JSON或其他格式
        workbookData = JSON.parse(templateStr);
      }

      setSheetData(workbookData);
      console.log('Template loaded successfully');
    } catch (err) {
      console.error('Parse template failed:', err);
    }
  }, [template.template]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1000);
  };

  // 插入字段到选中单元格
  const insertField = (field: { key: string; label: string; isList?: boolean }) => {
    if (!univerRef.current || !selectedCell) return;

    const placeholder = field.isList ? `{{#${field.key}}}` : `{{${field.key}}}`;

    univerRef.current.setCellValue(selectedCell.row, selectedCell.col, placeholder);

    if (field.isList) {
      setShowItemRowTip(true);
    }

    setShowFieldPicker(false);
    setSelectedCell(null);
  };

  // 打开字段填充弹框
  const handleOpenFieldPicker = () => {
    if (!univerRef.current || !univerRef.current.isReady()) {
      alert('模板正在加载，请稍候');
      return;
    }
    const selection = univerRef.current.getSelection();
    if (!selection) {
      alert('请先在模板中点击选择一个单元格');
      return;
    }
    setSelectedCell({ row: selection.startRow || 0, col: selection.startCol || 0 });
    setShowFieldPicker(true);
  };

  // 保存模板
  const handleSaveTemplate = async () => {
    if (!univerRef.current) return;

    const workbookData = univerRef.current.getRawData();
    if (!workbookData) {
      showToast('获取模板数据失败', 'error');
      return;
    }

    try {
      // gzip 压缩 workbook JSON
      const workbookJson = JSON.stringify(workbookData);
      const compressed = pako.gzip(workbookJson);

      // 转为 base64，使用 UNIVER: 前缀
      const base64 = btoa(String.fromCharCode(...compressed));
      const compressedData = 'UNIVER:' + base64;

      // 保存到数据库
      const res = await authFetch(`/api/platform/print-templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: compressedData })
      });

      const result = await res.json();
      if (res.ok) {
        showToast('保存成功', 'success');
      } else {
        showToast(result.error || '保存失败', 'error');
      }
    } catch (err) {
      console.error('Save template error:', err);
      showToast('保存失败', 'error');
    }
  };

  // 下载Excel
  const handleDownloadExcel = async () => {
    try {
      const res = await authFetch(`/api/platform/print-templates/${template.id}/download-excel`);
      if (!res.ok) {
        alert('下载失败');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = template.excel_filename || '送货单.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('下载失败');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] overflow-hidden flex flex-col relative">
        {/* 头部 */}
        <div className="p-4 border-b border-zinc-200 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-zinc-900">送货单预览 - {template.name}</h3>
            <span className="text-sm text-zinc-500">订单号: {order.order_number}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenFieldPicker}
              className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              字段填充
            </button>
            <button
              onClick={handleSaveTemplate}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors"
            >
              保存模板
            </button>
            <button
              onClick={handleDownloadExcel}
              className="bg-zinc-100 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              下载原始Excel
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-zinc-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex overflow-hidden" style={{ position: 'relative' }}>
          {/* 左边：UniverSheet模板 */}
          <div className="flex-1 overflow-hidden" style={{ position: 'relative', minHeight: 0 }}>
            {sheetData ? (
              <UniverSheet
                ref={univerRef}
                data={sheetData}
                height="100%"
                editable={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-400">
                模板数据加载中...
              </div>
            )}
          </div>

          {/* 右边：字段面板 */}
          <div className="w-72 border-l border-zinc-200 bg-zinc-50 overflow-y-auto">
            <div className="p-4">
              {/* 提示 */}
              <div className="mb-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
                <Info className="w-4 h-4 inline mr-1" />
                先点击模板单元格，再点击右上角"字段填充"按钮
              </div>

              {/* 零件模板行提示 */}
              {showItemRowTip && (
                <div className="mb-4 p-3 bg-amber-50 rounded-xl text-sm text-amber-700 animate-in fade-in">
                  <strong>提示：</strong>零件字段以 <code className="bg-amber-100 px-1 rounded">{"{{#字段名}}"}</code> 格式标记。
                  包含零件字段的行将作为"零件模板行"，预览时会根据零件数量自动复制多行。
                </div>
              )}

              {/* 订单字段 */}
              <div className="mb-4">
                <h4 className="text-sm font-bold text-zinc-700 mb-2">订单字段</h4>
                <div className="space-y-1">
                  {orderFields.map(field => (
                    <button
                      key={field.key}
                      onClick={() => {
                        if (!univerRef.current || !univerRef.current.isReady()) {
                          alert('模板正在加载，请稍候');
                          return;
                        }
                        const selection = univerRef.current.getSelection();
                        if (!selection) {
                          alert('请先在模板中点击选择一个单元格');
                          return;
                        }
                        setSelectedCell({ row: selection.startRow || 0, col: selection.startCol || 0 });
                        insertField(field);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-left"
                    >
                      <Plus className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm text-zinc-700">{field.label}</span>
                      <code className="text-xs text-zinc-400 ml-auto">{"{{" + field.key + "}}"}</code>
                    </button>
                  ))}
                </div>
              </div>

              {/* 零件字段 */}
              <div>
                <h4 className="text-sm font-bold text-zinc-700 mb-2">
                  零件字段
                  <span className="text-xs text-amber-600 ml-2">(列表变量)</span>
                </h4>
                <div className="space-y-1">
                  {itemFields.map(field => (
                    <button
                      key={field.key}
                      onClick={() => {
                        if (!univerRef.current || !univerRef.current.isReady()) {
                          alert('模板正在加载，请稍候');
                          return;
                        }
                        const selection = univerRef.current.getSelection();
                        if (!selection) {
                          alert('请先在模板中点击选择一个单元格');
                          return;
                        }
                        setSelectedCell({ row: selection.startRow || 0, col: selection.startCol || 0 });
                        insertField(field);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 hover:border-amber-300 transition-colors text-left"
                    >
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span className="text-sm text-zinc-700">{field.label}</span>
                      <code className="text-xs text-amber-500 ml-auto">{"{{#" + field.key + "}}"}</code>
                    </button>
                  ))}
                </div>
              </div>

              {/* 零件数据预览 */}
              <div className="mt-6 pt-4 border-t border-zinc-200">
                <h4 className="text-sm font-bold text-zinc-700 mb-2">当前订单零件 ({order.items?.length || 0})</h4>
                <div className="space-y-2">
                  {(order.items || []).slice(0, 5).map((item, idx) => (
                    <div key={idx} className="p-2 bg-white rounded-lg border border-zinc-200 text-xs">
                      <div className="font-medium text-zinc-900">{item.part_name}</div>
                      <div className="text-zinc-500 mt-1">
                        数量: {item.quantity} | 单价: ¥{item.unit_price}
                      </div>
                    </div>
                  ))}
                  {(order.items?.length || 0) > 5 && (
                    <div className="text-xs text-zinc-400 text-center">
                      还有 {(order.items?.length || 0) - 5} 个零件...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 字段选择弹窗 */}
        {showFieldPicker && selectedCell && (
          <div className="fixed inset-0 bg-black/30 z-[110] flex items-center justify-center">
            <div className="bg-white rounded-xl shadow-xl w-[600px] overflow-hidden">
              <div className="p-4 border-b border-zinc-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-zinc-900">选择字段插入</h4>
                  <p className="text-sm text-zinc-500">单元格: 第{selectedCell.row + 1}行 第{selectedCell.col + 1}列</p>
                </div>
                <button
                  onClick={() => setShowFieldPicker(false)}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-4">
                {/* 第一列：订单字段 */}
                <div>
                  <div className="mb-3 text-xs font-bold text-zinc-500 uppercase">订单字段</div>
                  <div className="space-y-1">
                    {orderFields.map(field => (
                      <button
                        key={field.key}
                        onClick={() => insertField(field)}
                        className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-sm text-left transition-colors"
                      >
                        {field.label} <code className="text-zinc-400 text-xs ml-2">{"{{" + field.key + "}}"}</code>
                      </button>
                    ))}
                  </div>
                </div>
                {/* 第二列：零件字段 */}
                <div>
                  <div className="mb-3 text-xs font-bold text-amber-500 uppercase">零件字段 (列表)</div>
                  <div className="space-y-1">
                    {itemFields.map(field => (
                      <button
                        key={field.key}
                        onClick={() => insertField(field)}
                        className="w-full px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 text-sm text-left transition-colors"
                      >
                        {field.label} <code className="text-amber-400 text-xs ml-2">{"{{#" + field.key + "}}"}</code>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toast提示 */}
      {toast && (
        <div
          className={`fixed inset-0 z-[200] flex items-center justify-center bg-black/30 animate-in fade-in duration-200`}
        >
          <div
            className={`px-8 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-in zoom-in duration-300 ${
              toast.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {toast.type === 'success' ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="font-medium text-lg">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryPreviewModal;
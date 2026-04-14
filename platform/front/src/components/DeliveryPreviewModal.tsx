import React, { useEffect, useState, useRef } from 'react';
import { X, Printer, Download, Info, Plus, Edit3 } from 'lucide-react';
import { Order, OrderItem } from '../types';
import { authFetch } from './shared';
import LuckyExcel from 'luckyexcel';
import pako from 'pako';

interface PrintTemplate {
  id: number;
  name: string;
  template: string;
  excel_filename?: string;
  excel_data?: string;
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
  const [isReady, setIsReady] = useState(false);
  const [showItemRowTip, setShowItemRowTip] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [showFieldPicker, setShowFieldPicker] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 1000);
  };

  // 初始化Luckysheet
  useEffect(() => {
    if (!template.template) return;

    const initLuckysheet = async () => {
      const luckysheet = (window as any).luckysheet;
      if (!luckysheet) {
        alert('Luckysheet未加载，请刷新页面重试');
        return;
      }

      // 解析模板数据
      let data: any[];
      try {
        if (template.template.startsWith('GZIP:')) {
          const base64 = template.template.substring(5);
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          const decompressed = pako.inflate(bytes, { to: 'string' });
          data = JSON.parse(decompressed);
        } else {
          data = JSON.parse(template.template);
        }
      } catch (err) {
        console.error('解析模板数据失败:', err);
        return;
      }

      // 清除锁定状态，确保可以编辑
      data = data.map((sheet: any) => {
        // 打印原始数据检查只读标记
        console.log('原始sheet数据:', {
          isLocked: sheet.isLocked,
          lock: sheet.lock,
          configLock: sheet.config?.lock,
          configIsLocked: sheet.config?.isLocked,
          hasCelldata: !!sheet.celldata,
          celldataCount: sheet.celldata?.length
        });

        sheet.isLocked = false;
        if (sheet.config) {
          sheet.config.isLocked = false;
          sheet.config.lock = false;
        } else {
          sheet.config = { isLocked: false, lock: false };
        }
        if (sheet.celldata) {
          sheet.celldata.forEach((cell: any) => {
            // 检查单元格是否有只读标记
            if (cell.is_locked || cell.locked) {
              console.log('发现只读单元格:', cell);
            }
            delete cell.is_locked;
            delete cell.locked;
          });
        }

        // 清除可能存在的其他只读属性
        delete sheet.lock;
        delete sheet.sheetPassword;
        delete sheet.protect;

        return sheet;
      });

      // 销毁之前的实例
      try {
        luckysheet.destroy();
      } catch {}

      await new Promise(resolve => setTimeout(resolve, 100));

      // 初始化Luckysheet
      luckysheet.create({
        container: 'delivery-preview-container',
        lang: 'zh',
        showtoolbar: true,
        showinfobar: false,
        showsheetbar: false,
        showstatisticBar: false,
        sheetFormulaBar: true,
        enableAddRow: false,
        enableAddBackTop: false,
        userInfo: false,
        showConfigWindowResize: false,
        enableContextMenu: true,
        allowEdit: true,
        hook: {
          cellEditBefore: function(_range: any) {
            return true;
          },
          cellMousedown: function(cell: any, pos: any) {
            if (pos) {
              setSelectedCell({ row: pos.r, col: pos.c });
            }
          },
          // 添加双击事件处理
          cellDblclick: function(cell: any, pos: any) {
            if (pos) {
              // 手动触发编辑模式
              luckysheet.editCell && luckysheet.editCell(pos.r, pos.c);
            }
            return true;
          }
        },
        data: Array.isArray(data) ? [data[0]] : [data]
      });

      // 初始化后添加额外的双击监听和解锁
      setTimeout(() => {
        const container = document.getElementById('delivery-preview-container');
        if (container) {
          // 检查容器内是否有阻止编辑的元素
          console.log('容器检查:', {
            containerHeight: container.clientHeight,
            containerWidth: container.clientWidth,
            childrenCount: container.children.length,
            firstChild: container.children[0]?.className
          });

          // 尝试找到实际的单元格容器并检查
          const cellContainer = container.querySelector('.luckysheet-cell-main');
          if (cellContainer) {
            console.log('单元格容器:', {
              pointerEvents: (cellContainer as HTMLElement).style.pointerEvents,
              userSelect: (cellContainer as HTMLElement).style.userSelect
            });
          }

          container.addEventListener('dblclick', (e) => {
            console.log('双击事件触发:', e.target);
            try {
              // 获取当前选中的单元格范围
              const range = luckysheet.getRange();
              if (range && range.length > 0) {
                const row = range[0].row[0];
                const col = range[0].column[0];
                console.log('当前选中单元格:', row, col);

                // 尝试多种API进入编辑模式
                // 方式1: 直接设置编辑状态
                if (luckysheet.setRangeShow) {
                  luckysheet.setRangeShow(range[0]);
                }

                // 方式2: 通过全局方法
                if ((window as any).luckysheetEditCell) {
                  (window as any).luckysheetEditCell(row, col);
                }

                // 方式3: 模拟键盘事件
                const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter' });
                container.dispatchEvent(event);
              }
            } catch (err) {
              console.log('进入编辑模式失败:', err);
            }
          });
        }

        // 尝试取消保护模式
        try {
          if (luckysheet.protect) {
            luckysheet.protect(false);
          }
          // 打印当前保护状态
          console.log('Luckysheet保护状态:', luckysheet.isProtectionEnabled ? luckysheet.isProtectionEnabled() : '无此API');
        } catch {}
      }, 500);

      setIsReady(true);
    };

    initLuckysheet();
  }, [template.template]);

  // 插入字段到选中单元格
  const insertField = (field: { key: string; label: string; isList?: boolean }) => {
    const luckysheet = (window as any).luckysheet;
    if (!luckysheet || !selectedCell) return;

    const placeholder = field.isList ? `{{#${field.key}}}` : `{{${field.key}}}`;

    // 使用Luckysheet API设置单元格值
    luckysheet.setCellValue(selectedCell.row, selectedCell.col, placeholder);

    // 如果是列表字段，提示设置零件模板行
    if (field.isList) {
      setShowItemRowTip(true);
    }

    setShowFieldPicker(false);
    setSelectedCell(null);
  };

  // 打开字段填充弹框
  const handleOpenFieldPicker = () => {
    if (!isReady) {
      alert('模板正在加载，请稍候');
      return;
    }
    const luckysheet = (window as any).luckysheet;
    const selection = luckysheet?.getRange();
    if (!selection || selection.length === 0) {
      alert('请先在模板中点击选择一个单元格');
      return;
    }
    setSelectedCell({ row: selection[0].row[0], col: selection[0].column[0] });
    setShowFieldPicker(true);
  };

  // 格式化日期
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  };

  // 生成预览数据
  const generatePreviewData = () => {
    const luckysheet = (window as any).luckysheet;
    if (!luckysheet) return;

    // 获取当前sheet数据
    const currentData = luckysheet.getAllSheets();
    if (!currentData || currentData.length === 0) return;

    const sheet = currentData[0];
    const celldata = sheet.celldata || [];

    // 找到零件模板行（包含 {{#}} 占位符的行）
    let itemTemplateRow = -1;
    for (const cell of celldata) {
      if (cell.v && typeof cell.v === 'string' && cell.v.includes('{{#')) {
        itemTemplateRow = cell.r;
        break;
      }
    }

    // 复制sheet数据
    const newCelldata = [...celldata];

    // 如果找到零件模板行，需要复制多行
    if (itemTemplateRow >= 0 && order.items && order.items.length > 0) {
      // 找到模板行的所有单元格
      const templateCells = celldata.filter(c => c.r === itemTemplateRow);

      // 计算需要插入的行数（零件数量 - 1，因为模板行本身保留）
      const itemsCount = order.items.length;

      // 为每个零件复制模板行
      for (let i = 0; i < itemsCount; i++) {
        const item = order.items[i];
        const newRow = itemTemplateRow + i;

        // 复制模板行的单元格并替换变量
        for (const templateCell of templateCells) {
          const newCell = { ...templateCell, r: newRow };
          if (newCell.v && typeof newCell.v === 'string') {
            // 替换零件变量
            let value = newCell.v;
            value = value.replace('{{#part_name}}', item.part_name || '');
            value = value.replace('{{#part_number}}', item.part_number || '');
            value = value.replace('{{#quantity}}', String(item.quantity || 0));
            value = value.replace('{{#unit_price}}', String(item.unit_price || 0));
            value = value.replace('{{#total_price}}', String(item.total_price || 0));
            value = value.replace('{{#completion_date}}', formatDate(item.completion_date));
            value = value.replace('{{#delivered_quantity}}', String(item.delivered_quantity || 0));
            value = value.replace('{{#scrap_quantity}}', String(item.scrap_quantity || 0));
            value = value.replace('{{#notes}}', item.notes || '');
            newCell.v = value;
            newCell.m = value;
          }

          // 如果不是第一行（模板行本身），需要插入新的单元格
          if (i > 0) {
            // 先删除模板行位置的单元格（避免重复）
            const existingIdx = newCelldata.findIndex(c => c.r === newRow && c.c === newCell.c);
            if (existingIdx >= 0) {
              newCelldata.splice(existingIdx, 1);
            }
            // 然后在正确位置插入
            const insertIdx = newCelldata.findIndex(c => c.r > newRow);
            if (insertIdx >= 0) {
              newCelldata.splice(insertIdx, 0, newCell);
            } else {
              newCelldata.push(newCell);
            }
          } else {
            // 第一行，直接替换模板行中的单元格
            const existingIdx = newCelldata.findIndex(c => c.r === newRow && c.c === newCell.c);
            if (existingIdx >= 0) {
              newCelldata[existingIdx] = newCell;
            }
          }
        }
      }
    }

    // 替换订单级别的变量
    for (const cell of newCelldata) {
      if (cell.v && typeof cell.v === 'string') {
        let value = cell.v;
        // 替换订单变量（不包含#的）
        value = value.replace('{{order_number}}', order.order_number || '');
        value = value.replace('{{customer_name}}', order.customer_name || '');
        value = value.replace('{{customer_short_name}}', order.customer_short_name || '');
        value = value.replace('{{contact_name}}', order.contact_name || '');
        value = value.replace('{{start_date}}', formatDate(order.start_date));
        value = value.replace('{{due_date}}', formatDate(order.due_date));
        value = value.replace('{{total_amount}}', String(order.total_amount || 0));
        value = value.replace('{{notes}}', order.notes || '');
        value = value.replace('{{priority}}', order.priority || '');
        cell.v = value;
        cell.m = value;
      }
    }

    // 更新Luckysheet显示
    luckysheet.refresh();
  };

  // 保存模板
  const handleSaveTemplate = async () => {
    const luckysheet = (window as any).luckysheet;
    if (!luckysheet) return;

    const currentData = luckysheet.getAllSheets();
    if (!currentData) return;

    const templateJson = JSON.stringify(currentData);
    const compressed = pako.deflate(templateJson);
    const base64 = btoa(String.fromCharCode(...compressed));
    const compressedData = 'GZIP:' + base64;

    try {
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
      <div className="bg-white rounded-2xl shadow-xl w-[95vw] h-[90vh] overflow-hidden flex flex-col">
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
              onClick={generatePreviewData}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              填充数据预览
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
        <div className="flex-1 flex overflow-hidden">
          {/* 左边：Luckysheet模板 */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden"
          >
            <div id="delivery-preview-container" className="w-full h-full min-h-[500px]"></div>
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
                        if (!isReady) {
                          alert('模板正在加载，请稍候');
                          return;
                        }
                        // 获取当前选中的单元格
                        const luckysheet = (window as any).luckysheet;
                        const selection = luckysheet?.getRange();
                        if (!selection || selection.length === 0) {
                          alert('请先在模板中点击选择一个单元格');
                          return;
                        }
                        setSelectedCell({ row: selection[0].row[0], col: selection[0].column[0] });
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
                        if (!isReady) {
                          alert('模板正在加载，请稍候');
                          return;
                        }
                        const luckysheet = (window as any).luckysheet;
                        const selection = luckysheet?.getRange();
                        if (!selection || selection.length === 0) {
                          alert('请先在模板中点击选择一个单元格');
                          return;
                        }
                        setSelectedCell({ row: selection[0].row[0], col: selection[0].column[0] });
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
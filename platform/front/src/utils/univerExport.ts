import ExcelJS from 'exceljs';

// 动态导入，兼容 Node.js 和浏览器环境
let saveAs: ((blob: Blob, filename: string) => void) | null = null;
let fsModule: typeof import('fs') | null = null;

// 检测环境并加载对应的保存模块
async function initSaveModule() {
  if (typeof window !== 'undefined') {
    // 浏览器环境
    const fileSaver = await import('file-saver');
    saveAs = fileSaver.saveAs;
  } else {
    // Node.js 环境
    fsModule = await import('fs');
  }
}

/**
 * Univer 数据导出为 Excel 工具
 * Univer 样式格式 (IStyleData):
 * - ff: fontFamily 字体名称
 * - fs: fontSize 字体大小 (pt)
 * - it: italic 斜体 (0/1)
 * - bl: bold 粗体 (0/1)
 * - ul: underline 下划线 { s: 0/1 }
 * - st: strikethrough 删除线 { s: 0/1 }
 * - bg: background 背景色 { rgb: '#RRGGBB' }
 * - cl: foreground/color 字体颜色 { rgb: '#RRGGBB' }
 * - bd: border 边框 { t, r, b, l: { s: style, cl: { rgb } } }
 * - tr: textRotation 文字旋转 { a: angle, v: vertical }
 * - ht: horizontalAlignment 水平对齐 (left/center/right)
 * - vt: verticalAlignment 垂直对齐 (top/middle/bottom)
 * - tb: wrapStrategy 自动换行
 */

// 列索引转 Excel 列名 (0→A, 1→B, 26→AA...)
function createCellPos(n: number): string {
  const ordA = 'A'.charCodeAt(0);
  const ordZ = 'Z'.charCodeAt(0);
  const len = ordZ - ordA + 1;
  let s = '';
  while (n >= 0) {
    s = String.fromCharCode((n % len) + ordA) + s;
    n = Math.floor(n / len) - 1;
  }
  return s;
}

// 转换 Univer 颜色格式为 Excel ARGB
function convertColor(color: any): string | undefined {
  if (!color) return undefined;
  // Univer 颜色格式: { rgb: '#RRGGBB' } 或字符串 '#RRGGBB'
  let rgb = color.rgb || color;
  if (typeof rgb !== 'string') return undefined;
  rgb = rgb.replace('#', '').replace('rgb(', '').replace(')', '');
  // 处理 rgb(r, g, b) 格式
  if (rgb.includes(',')) {
    const parts = rgb.split(',').map(p => parseInt(p.trim()));
    if (parts.length === 3) {
      rgb = parts.map(p => p.toString(16).padStart(2, '0')).join('');
    }
  }
  if (!rgb || rgb.length < 6) return undefined;
  // 添加 Alpha 通道
  return 'FF' + rgb.toUpperCase();
}

// 转换 Univer 单元格样式为 ExcelJS 样式
function convertUniverStyle(styleData: any): any {
  if (!styleData) return {};

  const style: any = {};

  // 字体样式
  const font: any = {};

  // 字体名称 ff
  if (styleData.ff) {
    font.name = styleData.ff;
  }

  // 字体大小 fs (pt)
  if (styleData.fs) {
    font.size = styleData.fs;
  }

  // 粗体 bl (BooleanNumber: 0/1)
  if (styleData.bl === 1) {
    font.bold = true;
  }

  // 斜体 it (BooleanNumber: 0/1)
  if (styleData.it === 1) {
    font.italic = true;
  }

  // 下划线 ul { s: 0/1 }
  if (styleData.ul?.s === 1) {
    font.underline = true;
  }

  // 删除线 st { s: 0/1 }
  if (styleData.st?.s === 1) {
    font.strike = true;
  }

  // 字体颜色 cl { rgb: '#RRGGBB' }
  const fontColor = convertColor(styleData.cl);
  if (fontColor) {
    font.color = { argb: fontColor };
  }

  if (Object.keys(font).length > 0) {
    style.font = font;
  }

  // 背景色 bg { rgb: '#RRGGBB' }
  const bgColor = convertColor(styleData.bg);
  if (bgColor) {
    style.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor }
    };
  }

  // 对齐样式
  const alignment: any = {};

  // 水平对齐 ht (left/center/right/justify)
  if (styleData.ht) {
    alignment.horizontal = styleData.ht;
  }

  // 垂直对齐 vt (top/middle/bottom)
  if (styleData.vt) {
    alignment.vertical = styleData.vt;
  }

  // 文字旋转 tr { a: angle, v: vertical }
  if (styleData.tr) {
    if (styleData.tr.v === 1) {
      alignment.textRotation = 'vertical';
    } else if (styleData.tr.a) {
      alignment.textRotation = styleData.tr.a;
    }
  }

  // 自动换行 tb (WrapStrategy)
  if (styleData.tb) {
    alignment.wrapText = styleData.tb !== 0;
  }

  if (Object.keys(alignment).length > 0) {
    style.alignment = alignment;
  }

  // 边框 bd { t, r, b, l: { s: BorderStyleTypes, cl: { rgb } } }
  if (styleData.bd) {
    const border: Partial<ExcelJS.Borders> = {};
    const sides = ['t', 'r', 'b', 'l'] as const;
    const excelSides = ['top', 'right', 'bottom', 'left'] as const;

    sides.forEach((side, index) => {
      const sideData = styleData.bd[side];
      if (sideData) {
        const borderColor = convertColor(sideData.cl);
        border[excelSides[index]] = {
          style: convertBorderStyle(sideData.s),
          color: { argb: borderColor || 'FF000000' }
        };
      }
    });

    if (Object.keys(border).length > 0) {
      style.border = border;
    }
  }

  return style;
}

// 转换边框样式类型
function convertBorderStyle(styleType: number): ExcelJS.BorderStyle {
  const styleMap: Record<number, ExcelJS.BorderStyle> = {
    1: 'thin',
    2: 'hair',
    3: 'dotted',
    4: 'dashed',
    5: 'dashDot',
    6: 'dashDotDot',
    7: 'double',
    8: 'medium',
    9: 'mediumDashed',
    10: 'mediumDashDot',
    11: 'mediumDashDotDot',
    12: 'slantDashDot',
    13: 'thick'
  };
  return styleMap[styleType] || 'thin';
}

// 设置单元格样式和值
function setStyleAndValue(
  cellData: Record<string, Record<string, any>>,
  worksheet: ExcelJS.Worksheet,
  stylesArray?: any[],
  mergeData?: any[]
) {
  if (!cellData) return;

  // 遍历每个单元格
  for (const rowKey in cellData) {
    const row = parseInt(rowKey);
    const rowData = cellData[rowKey];

    for (const colKey in rowData) {
      const col = parseInt(colKey);
      const cell = rowData[colKey];

      if (!cell) continue;

      const excelCell = worksheet.getCell(row + 1, col + 1);

      // 设置值
      let value: any = '';
      if (cell.f) {
        // 公式
        value = { formula: cell.f, result: cell.v };
      } else if (cell.v !== undefined && cell.v !== null) {
        value = cell.v;
        // 处理富文本格式
        if (!cell.v && cell.ct?.s) {
          cell.ct.s.forEach((arr: any) => {
            value += arr.v;
          });
        }
      }

      excelCell.value = value;

      // 设置样式 - 单元格可能直接包含样式属性，也可能通过 s 引用 styles 数组
      let style: any = {};

      // 优先处理样式引用 ID（cell.s 指向 stylesArray[cell.s]）
      if (cell.s !== undefined && stylesArray && stylesArray[cell.s]) {
        style = convertUniverStyle(stylesArray[cell.s]);
      }

      // 如果单元格本身也有样式属性，合并处理
      const cellInlineStyle = convertUniverStyle(cell);
      if (cellInlineStyle) {
        // 合并内联样式，内联样式优先级更高
        style = { ...style, ...cellInlineStyle };
      }

      if (style.fill) excelCell.fill = style.fill;
      if (style.font) excelCell.font = style.font;
      if (style.alignment) excelCell.alignment = style.alignment;
      if (style.border) excelCell.border = style.border;

      // 处理合并单元格中的边框
      if (mergeData) {
        const merge = findMergeForCell(row, col, mergeData);
        if (merge) {
          // 合并单元格的边框需要特殊处理
        }
      }
    }
  }
}

// 查找单元格所属的合并区域
function findMergeForCell(row: number, col: number, mergeData: any[]): any | null {
  for (const merge of mergeData) {
    if (row >= merge.startRow && row <= merge.endRow &&
        col >= merge.startColumn && col <= merge.endColumn) {
      return merge;
    }
  }
  return null;
}

// 设置合并单元格
function setMerges(mergeData: any[], worksheet: ExcelJS.Worksheet) {
  if (!mergeData || !Array.isArray(mergeData)) return;

  mergeData.forEach((merge) => {
    try {
      // Univer 合并格式: { startRow, startColumn, endRow, endColumn }
      worksheet.mergeCells(
        merge.startRow + 1,
        merge.startColumn + 1,
        merge.endRow + 1,
        merge.endColumn + 1
      );
    } catch (e) {
      // 合并单元格可能失败（重复合并等），忽略错误
      console.warn('Merge cell failed:', e);
    }
  });
}

// 设置列宽
function setColumnWidths(columnData: any, worksheet: ExcelJS.Worksheet) {
  if (!columnData) return;

  for (const colKey in columnData) {
    const col = parseInt(colKey);
    const colInfo = columnData[colKey];
    if (colInfo?.w) {
      worksheet.getColumn(col + 1).width = colInfo.w / 8; // 转换为 Excel 宽度
    }
  }
}

// 设置行高
function setRowHeights(rowData: any, worksheet: ExcelJS.Worksheet) {
  if (!rowData) return;

  for (const rowKey in rowData) {
    const row = parseInt(rowKey);
    const rowInfo = rowData[rowKey];
    if (rowInfo?.h) {
      worksheet.getRow(row + 1).height = rowInfo.h;
    }
  }
}

/**
 * 导出 Univer Workbook 数据为 Excel 文件
 * @param snapshot Univer workbook snapshot 数据
 * @param filename 导出文件名
 */
export async function exportUniverToExcel(
  snapshot: any,
  filename: string = 'export.xlsx'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  // 获取工作表顺序
  const sheetOrder = snapshot.sheetOrder || [];
  const sheets = snapshot.sheets || {};

  // 遍历每个工作表
  for (const sheetId of sheetOrder) {
    const sheetData = sheets[sheetId];
    if (!sheetData) continue;

    const sheetName = sheetData.name || 'Sheet';
    const worksheet = workbook.addWorksheet(sheetName);

    // 获取单元格数据
    const cellData = sheetData.cellData || {};

    // 获取样式数组（如果有）
    const stylesArray = snapshot.styles || [];

    // 获取合并单元格数据
    // Univer 合并数据可能存储在 sheetData.mergeData 或 sheetData.config?.merge
    const mergeData = sheetData.mergeData || sheetData.config?.merge || [];

    // 获取行列尺寸数据
    const columnData = sheetData.columnData || sheetData.columns || {};
    const rowData = sheetData.rowData || sheetData.rows || {};

    // 设置单元格样式和值
    setStyleAndValue(cellData, worksheet, stylesArray, mergeData);

    // 设置合并单元格
    if (Array.isArray(mergeData)) {
      setMerges(mergeData, worksheet);
    } else if (typeof mergeData === 'object') {
      // 对象格式的合并数据转换为数组
      const merges: any[] = [];
      for (const key in mergeData) {
        merges.push(mergeData[key]);
      }
      setMerges(merges, worksheet);
    }

    // 设置列宽
    setColumnWidths(columnData, worksheet);

    // 设置行高
    setRowHeights(rowData, worksheet);
  }

  // 写入 buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // 初始化保存模块
  await initSaveModule();

  // 保存文件 - 根据环境选择不同的方式
  if (typeof window !== 'undefined' && saveAs) {
    // 浏览器环境 - 使用 FileSaver
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    saveAs(blob, filename);
  } else if (fsModule) {
    // Node.js 环境 - 直接写入文件
    fsModule.writeFileSync(filename, Buffer.from(buffer));
  } else {
    throw new Error('无法保存文件：未找到可用的保存模块');
  }
}

export default exportUniverToExcel;
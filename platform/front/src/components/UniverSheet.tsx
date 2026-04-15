import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core';
import sheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN';
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets';

// 导入Univer样式
import '@univerjs/preset-sheets-core/lib/index.css';

interface UniverSheetProps {
  data?: any;
  height?: string;
  editable?: boolean;
  onDataChange?: (data: any) => void;
}

const UniverSheet = forwardRef((props: UniverSheetProps, ref: React.Ref<any>) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const univerAPIRef = useRef<any>(null);
  const workbookRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dataRef = useRef<any>(props.data);

  useEffect(() => {
    dataRef.current = props.data;
  }, [props.data]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;

    try {
      // 使用预设包创建Univer - 自动处理编辑器配置
      const { univerAPI } = createUniver({
        locale: LocaleType.ZH_CN,
        locales: {
          [LocaleType.ZH_CN]: mergeLocales(sheetsCoreZhCN),
        },
        presets: [
          UniverSheetsCorePreset({
            container: containerRef.current,
          }),
        ],
      });

      univerAPIRef.current = univerAPI;

      // 创建工作簿
      const workbookData = dataRef.current || {
        id: 'workbook-01',
        sheetOrder: ['sheet-01'],
        sheets: {
          'sheet-01': {
            id: 'sheet-01',
            name: 'Sheet1',
            cellData: {},
            rowCount: 1000,
            columnCount: 26,
            defaultColumnWidth: 93,
            defaultRowHeight: 27,
          },
        },
        appVersion: '1.0.0',
      };

      workbookRef.current = univerAPI.createWorkbook(workbookData);
      setIsReady(true);

      console.log('UniverSheet initialized with preset');

    } catch (err) {
      console.error('Univer初始化错误:', err);
    }

    return () => {
      if (univerAPIRef.current) {
        try {
          univerAPIRef.current.dispose();
        } catch (e) {
          console.error('Dispose error:', e);
        }
      }
      univerAPIRef.current = null;
      workbookRef.current = null;
      setIsReady(false);
    };
  }, [mounted]);

  useImperativeHandle(ref, () => ({
    getData: () => workbookRef.current?.save?.() || null,
    getRawData: () => workbookRef.current?.save?.() || null,
    setCellValue: (row: number, col: number, value: string) => {
      // 使用 univerAPI 的方式设置单元格值
      const activeSheet = univerAPIRef.current?.getActiveWorkbook?.()?.getActiveSheet?.();
      if (activeSheet) {
        activeSheet.getRange(row, col).setValue(value);
      }
    },
    getSelection: () => {
      const activeSheet = univerAPIRef.current?.getActiveWorkbook?.()?.getActiveSheet?.();
      return activeSheet?.getSelection?.() || null;
    },
    isReady: () => isReady,
    getUniverAPI: () => univerAPIRef.current,
  }));

  if (!mounted) {
    return (
      <div style={{
        width: '100%', height: props.height || '100%', minHeight: '400px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#f5f5f5',
      }}>加载中...</div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: props.height || '100%',
        minHeight: '400px',
      }}
    />
  );
});

UniverSheet.displayName = 'UniverSheet';
export default UniverSheet;
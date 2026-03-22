import React, { useState } from 'react';
import { Plus, Settings, X, Trash2 } from 'lucide-react';
import { PROCESS_COLORS } from './shared';

const PROCESS_OPTIONS = ['下料', '车削', '铣削', '磨削', '线切割', '电火花', '热处理', '表面处理', '送货'];

interface Process {
  name: string;
  is_outsourced: boolean;
  outsourcing_fee: number;
  status: string;
}

interface ProcessCellProps {
  processes: Process[];
  onUpdate: (processes: Process[]) => void;
}

const ProcessCell: React.FC<ProcessCellProps> = ({ processes, onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [manualInput, setManualInput] = useState('');

  const addProcess = (name: string) => {
    if (!name.trim()) return;
    const newProcesses = [...processes, { name: name.trim(), is_outsourced: false, outsourcing_fee: 0, status: 'pending' }];
    onUpdate(newProcesses);
    setManualInput('');
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1.5 text-left bg-zinc-50 border border-zinc-100 rounded-lg hover:bg-zinc-100 transition-colors flex items-center justify-between gap-1 min-w-[100px]"
      >
        <span className="truncate text-[10px] font-medium text-zinc-600">
          {processes.length > 0 ? processes.map(p => p.name).join('、') : '点击添加工序'}
        </span>
        <Plus className="w-3 h-3 text-zinc-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[200] bg-zinc-900/20 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] bg-white border border-zinc-200 rounded-3xl shadow-2xl p-8 min-w-[800px] max-w-[95vw] space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-zinc-900" />
                <h5 className="text-xl font-bold text-zinc-900 uppercase tracking-tight">工序流程管理</h5>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-zinc-400" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {PROCESS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => addProcess(opt)}
                  className={`px-3 py-1.5 rounded text-sm font-bold transition-all hover:scale-105 ${PROCESS_COLORS[opt] || 'bg-zinc-100 text-zinc-600'}`}
                >
                  + {opt}
                </button>
              ))}
              <div className="flex items-center gap-2 ml-4 border-l border-zinc-200 pl-4">
                <input
                  type="text"
                  placeholder="手动录入工序..."
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addProcess(manualInput);
                    }
                  }}
                  className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded text-sm outline-none focus:ring-2 focus:ring-zinc-900 w-48"
                />
                <button
                  type="button"
                  onClick={() => addProcess(manualInput)}
                  className="px-3 py-1.5 bg-zinc-900 text-white rounded text-sm font-bold hover:bg-zinc-800 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
              {processes.map((p, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-zinc-50 p-3 rounded-lg border border-zinc-100">
                  <span className={`text-base font-bold px-3 py-1 rounded w-32 text-center ${PROCESS_COLORS[p.name] || 'bg-zinc-200 text-zinc-700'}`}>{p.name}</span>
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-2 py-1 rounded border border-zinc-200">
                    <input
                      type="checkbox"
                      checked={p.is_outsourced}
                      onChange={e => {
                        const newProcesses = [...processes];
                        newProcesses[idx] = { ...newProcesses[idx], is_outsourced: e.target.checked };
                        onUpdate(newProcesses);
                      }}
                      className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                    />
                    <span className="text-sm font-medium text-zinc-700">是否外协</span>
                  </label>
                  {p.is_outsourced && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-zinc-400">¥</span>
                      <input
                        type="number"
                        placeholder="外协费用"
                        value={p.outsourcing_fee || ''}
                        onChange={e => {
                          const newProcesses = [...processes];
                          newProcesses[idx] = { ...newProcesses[idx], outsourcing_fee: parseFloat(e.target.value) };
                          onUpdate(newProcesses);
                        }}
                        className="w-24 px-2 py-1 bg-white border border-zinc-200 rounded text-sm outline-none font-medium"
                      />
                    </div>
                  )}
                  <div className="flex-1" />
                  <select
                    value={p.status || 'pending'}
                    onChange={e => {
                      const newProcesses = [...processes];
                      newProcesses[idx] = { ...newProcesses[idx], status: e.target.value as any };
                      onUpdate(newProcesses);
                    }}
                    className="px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-sm outline-none font-medium"
                  >
                    <option value="pending">待加工</option>
                    <option value="processing">加工中</option>
                    <option value="completed">已完成</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const newProcesses = [...processes];
                      newProcesses.splice(idx, 1);
                      onUpdate(newProcesses);
                    }}
                    className="p-2 text-zinc-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              {processes.length === 0 && (
                <div className="text-center py-12 text-sm text-zinc-400 italic bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  暂无工序，请从上方选择并添加
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ProcessCell;

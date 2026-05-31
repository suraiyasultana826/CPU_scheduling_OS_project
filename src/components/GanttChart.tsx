import { motion } from 'motion/react';
import { GanttBlock, ProcessResult } from '../types';
import { Info } from 'lucide-react';

interface GanttChartProps {
  ganttChart: GanttBlock[];
  totalTime: number;
  tableData: ProcessResult[];
}

// Pre-defined color palette for processes based on PID to ensure visual stability and beauty
export const getProcessColorClass = (pid: number | string, isDark: boolean = true) => {
  if (pid === 'Idle') {
    return isDark 
      ? 'bg-slate-800/40 text-slate-500 border-dashed border-slate-700/60' 
      : 'bg-slate-100/50 text-slate-400 border-dashed border-slate-300';
  }
  
  const idNum = typeof pid === 'number' ? pid : parseInt(pid) || 1;
  const palettes = [
    { bg: 'bg-sky-500/20 border-sky-500/40 text-sky-400 dark:text-sky-300', lightBg: 'bg-sky-50 text-sky-700 border-sky-200' },
    { bg: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 dark:text-emerald-300', lightBg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { bg: 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400 dark:text-indigo-300', lightBg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { bg: 'bg-amber-500/20 border-amber-500/40 text-amber-400 dark:text-amber-300', lightBg: 'bg-amber-50 text-amber-700 border-amber-200' },
    { bg: 'bg-rose-500/20 border-rose-500/40 text-rose-400 dark:text-rose-300', lightBg: 'bg-rose-50 text-rose-700 border-rose-200' },
    { bg: 'bg-fuchsia-500/20 border-fuchsia-500/40 text-fuchsia-400 dark:text-fuchsia-300', lightBg: 'bg-fuchsia-55 text-fuchsia-700 border-fuchsia-200' },
    { bg: 'bg-violet-500/20 border-violet-500/40 text-violet-400 dark:text-violet-300', lightBg: 'bg-violet-50 text-violet-700 border-violet-200' },
    { bg: 'bg-teal-500/20 border-teal-500/40 text-teal-400 dark:text-teal-300', lightBg: 'bg-teal-50 text-teal-700 border-teal-200' },
  ];
  const item = palettes[(idNum - 1) % palettes.length];
  return isDark ? `${item.bg} border` : `${item.lightBg} border`;
};

export default function GanttChart({ ganttChart, totalTime, tableData }: GanttChartProps) {
  if (!ganttChart || ganttChart.length === 0 || totalTime === 0) {
    return null;
  }

  // Find process results to show metrics in hover tooltip
  const getMetrics = (pid: number | string) => {
    if (pid === 'Idle') return null;
    return tableData.find(t => t.pid === pid);
  };

  return (
    <div id="gantt-chart-section" className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Gantt Chart Execution Timeline
        </h3>
        <span className="text-xs font-mono px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          Total Duration: {totalTime} ms
        </span>
      </div>

      {/* Main Gantt Bar */}
      <div className="relative group/timeline">
        <div className="w-full flex h-14 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/50 p-[3px]">
          {ganttChart.map((block, index) => {
            const percentage = (block.duration / totalTime) * 100;
            const metrics = getMetrics(block.pid);
            
            return (
              <motion.div
                key={`${block.pid}-${block.startTime}-${index}`}
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: `${percentage}%`, opacity: 1 }}
                transition={{ duration: 0.6, delay: index * 0.05, ease: 'easeOut' }}
                className={`relative h-full flex flex-col items-center justify-center transition-all group cursor-help select-none overflow-hidden rounded-lg ${getProcessColorClass(block.pid, true)} ${
                  block.pid === 'Idle' ? 'dark:bg-slate-950/20' : ''
                }`}
              >
                {/* Process Label */}
                <div className="font-mono text-sm font-semibold truncate px-1">
                  {block.pid === 'Idle' ? (
                    <span className="opacity-50 italic text-xs">Idle</span>
                  ) : (
                    block.name
                  )}
                </div>
                
                {/* Small duration indicator */}
                <div className="text-[10px] font-mono opacity-60">
                  {block.duration}ms
                </div>

                {/* Elaborate Tooltip for process info */}
                {block.pid !== 'Idle' && metrics && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 w-64 bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-30 text-left text-xs space-y-2 text-slate-700 dark:text-slate-300">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-1.5 font-semibold text-slate-900 dark:text-white">
                      <span>{block.name} Execution Segment</span>
                      <span className="text-[10px] font-mono bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded">
                        PID: {block.pid}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                      <div>Segment Time:</div>
                      <div className="text-right text-slate-900 dark:text-white font-medium">{block.startTime} → {block.endTime}ms</div>
                      
                      <div>Segment Dur:</div>
                      <div className="text-right text-slate-900 dark:text-white font-medium">{block.duration}ms</div>
                      
                      <div className="border-t border-slate-100 dark:border-slate-800/40 mt-1 pt-1 opacity-80">Ref Arrival:</div>
                      <div className="border-t border-slate-100 dark:border-slate-800/40 mt-1 pt-1 text-right font-medium text-slate-900 dark:text-white">{metrics.arrivalTime}ms</div>
                      
                      <div>Waiting Time:</div>
                      <div className="text-right text-emerald-600 dark:text-emerald-400 font-medium">{metrics.waitTime}ms</div>

                      <div>Turnaround:</div>
                      <div className="text-right text-indigo-600 dark:text-indigo-400 font-medium">{metrics.turnaroundTime}ms</div>

                      <div>Res Time:</div>
                      <div className="text-right text-amber-600 dark:text-amber-400 font-medium">{metrics.responseTime}ms</div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Timestamps beneath the Gantt Bar */}
        <div className="relative pt-1 flex justify-between">
          {/* Start Point */}
          <div className="absolute left-0 -top-1">
            <span className="text-[11px] font-mono font-semibold text-slate-400 dark:text-slate-500">0</span>
          </div>

          {/* End Points of each block */}
          {ganttChart.map((block, index) => {
            const percentage = (block.endTime / totalTime) * 100;
            // Avoid drawing the end timestamp if it overlaps with others nearby
            const isLast = index === ganttChart.length - 1;
            
            return (
              <div
                key={`ts-${index}`}
                className="absolute"
                style={{ left: `${percentage}%`, transform: 'translateX(-50%)' }}
              >
                <div className="h-2 w-[1px] bg-slate-300 dark:bg-slate-700/80 mx-auto -mt-2"></div>
                <span className={`text-[10px] font-mono text-slate-500 dark:text-slate-400 ${isLast ? 'font-bold' : ''}`}>
                  {block.endTime}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/40">
       
        
      </div>
    </div>
  );
}

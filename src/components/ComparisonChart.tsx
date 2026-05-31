import { motion } from 'motion/react';
import { Process, SimulationResult } from '../types';
import { 
  solveFCFS, 
  solveSJFNonPreemptive, 
  solveSRTF, 
  solvePriorityNonPreemptive, 
  solvePriorityPreemptive, 
  solveRoundRobin 
} from '../algorithms';
import { Award, Zap, Clock, ShieldAlert } from 'lucide-react';

interface ComparisonChartProps {
  processes: Process[];
  quantum: number;
  lowerAsHigher: boolean;
}

export default function ComparisonChart({ processes, quantum, lowerAsHigher }: ComparisonChartProps) {
  if (processes.length === 0) return null;

  // Compute results for all algorithms on-the-fly for real-time comparison
  const results: SimulationResult[] = [
    solveFCFS(processes),
    solveSJFNonPreemptive(processes),
    solveSRTF(processes),
    solvePriorityNonPreemptive(processes, lowerAsHigher),
    solvePriorityPreemptive(processes, lowerAsHigher),
    solveRoundRobin(processes, quantum),
  ];

  // Find the best in each category (minimum is better for times, maximum for utilization)
  const validResults = results.filter(r => r.totalTime > 0);
  if (validResults.length === 0) return null;

  const minWT = Math.min(...validResults.map(r => r.avgWaitingTime));
  const minTAT = Math.min(...validResults.map(r => r.avgTurnaroundTime));
  const minRT = Math.min(...validResults.map(r => r.avgResponseTime));
  const maxUtil = Math.max(...validResults.map(r => r.cpuUtilization));

  // Find the overall "Winner" (the one with the lowest Average Waiting Time)
  const winner = [...validResults].sort((a, b) => a.avgWaitingTime - b.avgWaitingTime)[0];

  return (
    <div className="space-y-6">
      {/* Dynamic Recommendation Header */}
      <div className="p-4 rounded-xl bg-indigo-50/40 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 mt-0.5">
          <Award className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
            Optimal Algorithm Recommendation
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Based on your process configuration, <strong className="text-indigo-600 dark:text-indigo-400">{winner.algorithm}</strong> is the most efficient, achieving the lowest average waiting time of <strong className="font-mono text-emerald-600 dark:text-emerald-400">{winner.avgWaitingTime} ms</strong> and turnaround of <strong className="font-mono">{winner.avgTurnaroundTime} ms</strong>.
          </p>
        </div>
      </div>

      {/* Grid of relative comparisons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Waiting Time Comparison */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-emerald-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Avg. Waiting Time (ms)
            </h4>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => {
              const maxVal = Math.max(...results.map(x => x.avgWaitingTime)) || 1;
              const ratio = (r.avgWaitingTime / maxVal) * 100;
              const isBest = r.avgWaitingTime === minWT;

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] font-medium">
                      {r.algorithm.split(' (')[0]}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                      {r.avgWaitingTime} ms
                      {isBest && <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(ratio, 3)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className={`h-full rounded-full ${isBest ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500/70'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Turnaround Time Comparison */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Avg. Turnaround Time (ms)
            </h4>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => {
              const maxVal = Math.max(...results.map(x => x.avgTurnaroundTime)) || 1;
              const ratio = (r.avgTurnaroundTime / maxVal) * 100;
              const isBest = r.avgTurnaroundTime === minTAT;

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] font-medium">
                      {r.algorithm.split(' (')[0]}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                      {r.avgTurnaroundTime} ms
                      {isBest && <Zap className="w-3 h-3 text-indigo-500 fill-indigo-500" />}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(ratio, 3)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className={`h-full rounded-full ${isBest ? 'bg-indigo-500 dark:bg-indigo-400' : 'bg-slate-400 dark:bg-slate-500/70'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Response Time Comparison */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Avg. Response Time (ms)
            </h4>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => {
              const maxVal = Math.max(...results.map(x => x.avgResponseTime)) || 1;
              const ratio = (r.avgResponseTime / maxVal) * 100;
              const isBest = r.avgResponseTime === minRT;

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] font-medium">
                      {r.algorithm.split(' (')[0]}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                      {r.avgResponseTime} ms
                      {isBest && <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(ratio, 3)}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className={`h-full rounded-full ${isBest ? 'bg-amber-500 dark:bg-amber-400' : 'bg-slate-400 dark:bg-slate-500/70'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CPU Utilization Comparison */}
        <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
            <Clock className="w-4 h-4 text-sky-500" />
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              CPU Utilization (%)
            </h4>
          </div>
          <div className="space-y-3">
            {results.map((r, i) => {
              const ratio = r.cpuUtilization;
              const isBest = r.cpuUtilization === maxUtil;

              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 truncate max-w-[200px] font-medium">
                      {r.algorithm.split(' (')[0]}
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                      {r.cpuUtilization}%
                      {isBest && <Zap className="w-3 h-3 text-sky-500 fill-sky-500" />}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${ratio}%` }}
                      transition={{ duration: 0.8, delay: i * 0.05 }}
                      className={`h-full rounded-full ${isBest ? 'bg-sky-500 dark:bg-sky-400' : 'bg-slate-400 dark:bg-slate-500/70'}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

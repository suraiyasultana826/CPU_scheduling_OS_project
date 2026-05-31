import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Plus, Trash2, Moon, Sun, Download, RefreshCw, FileText, 
  LayoutGrid, AlertCircle, Sparkles, Cpu, Clipboard, Check, HelpCircle, 
  Settings2, Trophy, BarChart3, ListOrdered
} from 'lucide-react';
import { Process, SimulationResult } from './types';
import { 
  solveFCFS, 
  solveSJFNonPreemptive, 
  solveSRTF, 
  solvePriorityNonPreemptive, 
  solvePriorityPreemptive, 
  solveRoundRobin 
} from './algorithms';
import GanttChart, { getProcessColorClass } from './components/GanttChart';
import ComparisonChart from './components/ComparisonChart';
import InteractiveParticles from './components/InteractiveParticles';
import { downloadCSV, downloadTextReport, generateTextReport } from './utils/export';

// 4 standard teaching model processes to initialize with
const DEFAULT_PROCESSES: Process[] = [
  { id: 1, name: 'P1', arrivalTime: 0, burstTime: 8, priority: 3 },
  { id: 2, name: 'P2', arrivalTime: 1, burstTime: 4, priority: 1 },
  { id: 3, name: 'P3', arrivalTime: 2, burstTime: 9, priority: 4 },
  { id: 4, name: 'P4', arrivalTime: 3, burstTime: 5, priority: 2 },
];

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [algorithm, setAlgorithm] = useState<string>('SRTF');
  const [quantum, setQuantum] = useState<number>(3);
  const [lowerPriorityIsHigher, setLowerPriorityIsHigher] = useState<boolean>(true); // Ascending/Descending Priority
  const [processes, setProcesses] = useState<Process[]>(DEFAULT_PROCESSES);
  
  // UI and validation states
  const [copied, setCopied] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'simulation' | 'comparison'>('simulation');

  // Trigger dark mode body class on change
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Input validation
  const validateInputs = (procList: Process[]): string | null => {
    if (procList.length === 0) {
      return "Please add at least one process to run the calculator.";
    }
    for (let i = 0; i < procList.length; i++) {
      const p = procList[i];
      if (p.arrivalTime < 0 || isNaN(p.arrivalTime)) {
        return `Process ${p.name} has invalid arrival time. It must be 0 or positive.`;
      }
      if (p.burstTime <= 0 || isNaN(p.burstTime)) {
        return `Process ${p.name} has invalid burst time. It must be greater than 0.`;
      }
      if (p.priority !== undefined && (p.priority < 0 || isNaN(p.priority))) {
        return `Process ${p.name} priority must be a non-negative number.`;
      }
    }
    if (algorithm === 'RR' && (quantum <= 0 || isNaN(quantum))) {
      return "Time Quantum for Round Robin must be greater than 0.";
    }
    return null;
  };

  // Run validation in real-time
  useEffect(() => {
    setValidationError(validateInputs(processes));
  }, [processes, algorithm, quantum]);

  // Dynamic process id generator
  const getNextId = (): number => {
    if (processes.length === 0) return 1;
    return Math.max(...processes.map((p) => p.id)) + 1;
  };

  const addProcess = () => {
    const nextId = getNextId();
    const newProcess: Process = {
      id: nextId,
      name: `P${nextId}`,
      arrivalTime: 0,
      burstTime: 4,
      priority: 2,
    };
    setProcesses([...processes, newProcess]);
  };

  const removeProcess = (id: number) => {
    setProcesses(processes.filter((p) => p.id !== id));
  };

  const updateProcessField = (id: number, field: keyof Process, value: string | number) => {
    setProcesses(
      processes.map((p) => {
        if (p.id !== id) return p;
        
        let processedValue = value;
        if (field === 'burstTime' || field === 'arrivalTime' || field === 'priority') {
          processedValue = value === '' ? 0 : Number(value);
        }
        return { ...p, [field]: processedValue };
      })
    );
  };

  // Templates list for teaching and exploration
  const loadExampleTemplate = (type: 'balanced' | 'cpu_bound' | 'priority_heavy' | 'congested') => {
    let list: Process[] = [];
    switch (type) {
      case 'balanced':
        list = [
          { id: 1, name: 'P1', arrivalTime: 0, burstTime: 6, priority: 2 },
          { id: 2, name: 'P2', arrivalTime: 1, burstTime: 2, priority: 1 },
          { id: 3, name: 'P3', arrivalTime: 2, burstTime: 8, priority: 4 },
          { id: 4, name: 'P4', arrivalTime: 3, burstTime: 4, priority: 3 },
        ];
        break;
      case 'cpu_bound':
        list = [
          { id: 1, name: 'P1', arrivalTime: 0, burstTime: 14, priority: 1 },
          { id: 2, name: 'P2', arrivalTime: 3, burstTime: 18, priority: 3 },
          { id: 3, name: 'P3', arrivalTime: 5, burstTime: 3, priority: 2 },
        ];
        break;
      case 'priority_heavy':
        list = [
          { id: 1, name: 'P1', arrivalTime: 0, burstTime: 4, priority: 10 },
          { id: 2, name: 'P2', arrivalTime: 1, burstTime: 8, priority: 1 },
          { id: 3, name: 'P3', arrivalTime: 2, burstTime: 3, priority: 5 },
          { id: 4, name: 'P4', arrivalTime: 3, burstTime: 6, priority: 2 },
        ];
        break;
      case 'congested':
        list = [
          { id: 1, name: 'P1', arrivalTime: 0, burstTime: 3, priority: 1 },
          { id: 2, name: 'P2', arrivalTime: 0, burstTime: 3, priority: 2 },
          { id: 3, name: 'P3', arrivalTime: 0, burstTime: 3, priority: 3 },
          { id: 4, name: 'P4', arrivalTime: 0, burstTime: 3, priority: 4 },
        ];
        break;
    }
    setProcesses(list);
  };

  // Compute simulation results
  const executionResult = useMemo<SimulationResult | null>(() => {
    if (validationError || processes.length === 0) return null;

    try {
      switch (algorithm) {
        case 'FCFS':
          return solveFCFS(processes);
        case 'SJF':
          return solveSJFNonPreemptive(processes);
        case 'SRTF':
          return solveSRTF(processes);
        case 'PriorityNP':
          return solvePriorityNonPreemptive(processes, lowerPriorityIsHigher);
        case 'PriorityPre':
          return solvePriorityPreemptive(processes, lowerPriorityIsHigher);
        case 'RR':
          return solveRoundRobin(processes, quantum);
        default:
          return solveFCFS(processes);
      }
    } catch (e) {
      console.error("Scheduling error: ", e);
      return null;
    }
  }, [processes, algorithm, quantum, lowerPriorityIsHigher, validationError]);

  // Copy full readable simulation report to clipboard
  const handleCopyReport = () => {
    if (!executionResult) return;
    const reportText = generateTextReport(executionResult);
    navigator.clipboard.writeText(reportText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`min-h-screen text-slate-800 dark:text-slate-100 font-sans transition-all duration-300 relative overflow-x-hidden ${
      darkMode ? 'dark bg-[#0f172a]' : 'bg-slate-50'
    }`}>
      
      {/* Visual Canvas Particle System */}
      <InteractiveParticles darkMode={darkMode} />

      {/* Dynamic Glow Accents */}
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-sky-500/15 pointer-events-none blur-[140px] z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-500/10 pointer-events-none blur-[140px] z-0" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10 space-y-6">
        
        {/* Navigation & Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-tr from-sky-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2 font-display">
                CPU Scheduler 
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simulate, calculate, and compare CPU scheduling algorithms with interactive timelines.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Presets */}
            <div className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 p-1 rounded-lg">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 px-2">Presets:</span>
              <button 
                onClick={() => loadExampleTemplate('balanced')}
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-sky-500 dark:hover:text-sky-400 transition-all shadow-sm"
              >
                Balanced
              </button>
              <button 
                onClick={() => loadExampleTemplate('cpu_bound')}
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-sky-500 dark:hover:text-sky-400 transition-all shadow-sm"
              >
                CPU Bound
              </button>
              <button 
                onClick={() => loadExampleTemplate('priority_heavy')}
                className="text-[11px] font-medium px-2.5 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:text-sky-500 dark:hover:text-sky-400 transition-all shadow-sm"
              >
                Priority Heavy
              </button>
            </div>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-600 dark:text-slate-400"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>
          </div>
        </header>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT SIDEBAR: Process Configuration */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Algorithm Configuration Card */}
            <section className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4 relative">
              <div className="flex items-center gap-2 pb-3.5 border-b border-slate-200/60 dark:border-white/5 text-slate-900 dark:text-white">
                <Settings2 className="w-5 h-5 text-sky-500" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-500 dark:text-sky-400">Policy Config</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Select Scheduling Policy
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) => setAlgorithm(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-sky-500/50 outline-none text-sm transition-all font-sans font-semibold text-slate-900 dark:text-slate-100 shadow-inner"
                  >
                    <option value="FCFS">First Come First Served (FCFS)</option>
                    <option value="SJF">Shortest Job First (SJF - Non-Preemptive)</option>
                    <option value="SRTF">Shortest Remaining Time First (SRTF - Preemptive)</option>
                    <option value="PriorityNP">Priority (Non-Preemptive)</option>
                    <option value="PriorityPre">Priority (Preemptive)</option>
                    <option value="RR">Round Robin (RR)</option>
                  </select>
                </div>

                {/* Conditional Inputs */}
                <AnimatePresence mode="popLayout">
                  {algorithm === 'RR' && (
                    <motion.div
                      key="quantum-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200/50 dark:border-white/5 pt-3 space-y-1"
                    >
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        Time Quantum (ms)
                        <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" title="Maximum consecutive execution time allotted to each process." />
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantum === 0 ? '' : quantum}
                        onChange={(e) => setQuantum(e.target.value === '' ? 0 : Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl p-3 focus:ring-2 focus:ring-sky-500/50 outline-none text-sm font-mono text-sky-500 font-bold shadow-inner"
                        placeholder="Time slices e.g., 2, 3 or 4"
                      />
                    </motion.div>
                  )}

                  {(algorithm === 'PriorityNP' || algorithm === 'PriorityPre') && (
                    <motion.div
                      key="priority-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-200/50 dark:border-white/5 pt-3 space-y-2"
                    >
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Priority Order Convention
                      </label>
                      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                        <button
                          type="button"
                          onClick={() => setLowerPriorityIsHigher(true)}
                          className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${
                            lowerPriorityIsHigher 
                              ? 'bg-white dark:bg-slate-800 text-sky-500 shadow-sm border border-slate-200 dark:border-white/5' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          Lower Val = High Priority (Unix)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLowerPriorityIsHigher(false)}
                          className={`text-xs py-2 px-2.5 rounded-lg font-medium transition-all ${
                            !lowerPriorityIsHigher 
                              ? 'bg-white dark:bg-slate-800 text-sky-500 shadow-sm border border-slate-200 dark:border-white/5' 
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                          }`}
                        >
                          Higher Val = High Priority (Windows)
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* Dynamic Interactive Input Table */}
            <section className="p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/40 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3.5 border-b border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-sky-500" />
                  <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-500 dark:text-sky-400">Process List</h2>
                </div>
                <button
                  onClick={addProcess}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Row
                </button>
              </div>

              {/* Dynamic Scroll Table Area */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-semibold">
                      <th className="pb-2.5 pr-2 pl-1">Process</th>
                      <th className="pb-2.5 px-2">Arrival (ms)</th>
                      <th className="pb-2.5 px-2">Burst (ms)</th>
                      {(algorithm === 'PriorityNP' || algorithm === 'PriorityPre') && (
                        <th className="pb-2.5 px-2 text-center">Priority</th>
                      )}
                      <th className="pb-2.5 pl-2 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                    <AnimatePresence initial={false}>
                      {processes.map((proc, index) => (
                        <motion.tr
                          key={proc.id}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          className="hover:bg-slate-100/30 dark:hover:bg-white/5 transition-colors"
                        >
                          {/* Name Display */}
                          <td className="py-3 pr-2 pl-1 font-semibold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${getProcessColorClass(proc.id, true)}`} />
                            {proc.name}
                          </td>

                          {/* Arrival input */}
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              min="0"
                              value={proc.arrivalTime}
                              onChange={(e) => updateProcessField(proc.id, 'arrivalTime', e.target.value)}
                              className="w-18 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-sky-500/50 outline-none text-slate-900 dark:text-white text-xs shadow-inner"
                            />
                          </td>

                          {/* Burst input */}
                          <td className="py-3 px-2">
                            <input
                              type="number"
                              min="1"
                              value={proc.burstTime}
                              onChange={(e) => updateProcessField(proc.id, 'burstTime', e.target.value)}
                              className="w-18 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded px-2 py-1 text-center font-mono focus:ring-2 focus:ring-sky-500/50 outline-none text-slate-900 dark:text-white text-xs font-bold text-sky-600 dark:text-sky-400 shadow-inner"
                            />
                          </td>

                          {/* Priority input (only if selected) */}
                          {(algorithm === 'PriorityNP' || algorithm === 'PriorityPre') && (
                            <td className="py-3 px-2">
                              <input
                                type="number"
                                min="0"
                                value={proc.priority ?? 0}
                                onChange={(e) => updateProcessField(proc.id, 'priority', e.target.value)}
                                className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded px-2 py-1 mx-auto block text-center font-mono focus:ring-2 focus:ring-sky-500/50 outline-none text-slate-900 dark:text-white text-xs font-bold text-amber-500 shadow-inner"
                              />
                            </td>
                          )}

                          {/* Action Delete */}
                          <td className="py-3 pl-2 text-right">
                            <button
                              onClick={() => removeProcess(proc.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 transition-all outline-none"
                              title={`Remove ${proc.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Utility Clear Rows */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-200/60 dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setProcesses([])}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Clear All Processes
                </button>
                <button
                  type="button"
                  onClick={() => setProcesses(DEFAULT_PROCESSES)}
                  className="flex items-center gap-1 text-xs text-indigo-500 dark:text-indigo-400 font-semibold cursor-pointer hover:opacity-85 transition-opacity"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Restore Default Set
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT VIEW: Output Visualizations */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Nav Tabs for Simulation / Comparison */}
            <div className="flex bg-slate-100/80 dark:bg-slate-900/60 p-1 rounded-full border border-slate-200/60 dark:border-white/5 max-w-sm">
              <button
                onClick={() => setActiveTab('simulation')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'simulation'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-450 shadow-md font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Simulation
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-4 text-xs font-semibold rounded-full transition-all duration-200 cursor-pointer ${
                  activeTab === 'comparison'
                    ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-450 shadow-md font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Multi-Alg Comparison
              </button>
            </div>

            {/* ERROR WINDOW */}
            {validationError && (
              <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/10 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-400">Parameter Configuration Error</h4>
                  <p className="text-xs text-rose-700/85 dark:text-rose-400/80 mt-1 leading-relaxed">{validationError}</p>
                </div>
              </div>
            )}

            {!validationError && activeTab === 'simulation' && executionResult && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Stats Performance Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* stat 1 */}
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-center space-y-1 shadow-md dark:shadow-lg dark:backdrop-blur-md">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Waiting Time</p>
                    <p className="text-2xl font-black font-mono text-emerald-500 dark:text-emerald-400">{executionResult.avgWaitingTime} ms</p>
                  </div>
                  {/* stat 2 */}
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-center space-y-1 shadow-md dark:shadow-lg dark:backdrop-blur-md">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Turnaround</p>
                    <p className="text-2xl font-black font-mono text-indigo-500 dark:text-indigo-400">{executionResult.avgTurnaroundTime} ms</p>
                  </div>
                  {/* stat 3 */}
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-center space-y-1 shadow-md dark:shadow-lg dark:backdrop-blur-md">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Avg Response Time</p>
                    <p className="text-2xl font-black font-mono text-amber-500 dark:text-amber-400">{executionResult.avgResponseTime} ms</p>
                  </div>
                  {/* stat 4 */}
                  <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 text-center space-y-1 shadow-md dark:shadow-lg dark:backdrop-blur-md">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CPU Utilization</p>
                    <p className="text-2xl font-black font-mono text-sky-500 dark:text-sky-400">{executionResult.cpuUtilization}%</p>
                  </div>
                </div>

                {/* Animated Gantt Timeline */}
                <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-xl dark:backdrop-blur-md">
                  <GanttChart 
                    ganttChart={executionResult.ganttChart} 
                    totalTime={executionResult.totalTime} 
                    tableData={executionResult.tableData} 
                  />
                </div>

                {/* Performance Metrics Table */}
                <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-slate-200/60 dark:border-white/5">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-semibold uppercase tracking-widest text-sky-500 dark:text-sky-400">Diag Metrics</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Detailed numerical diagnostics computed for each active process thread.</p>
                    </div>

                    {/* Export / Copy Options */}
                    <div className="flex items-center gap-1.5 self-start">
                      <button
                        onClick={handleCopyReport}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-600 dark:text-slate-300"
                        title="Copy diagnostic text report to clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clipboard className="w-3.5 h-3.5" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => downloadTextReport(executionResult)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-600 dark:text-slate-300"
                        title="Download summary report (.txt)"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        Report
                      </button>
                      <button
                        onClick={() => downloadCSV(executionResult)}
                        className="flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-600 dark:text-slate-300"
                        title="Download CSV database records"
                      >
                        <Download className="w-3.5 h-3.5 text-sky-500" />
                        CSV
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-200 dark:border-slate-800/80 font-bold">
                          <th className="pb-3 text-left">Process</th>
                          <th className="pb-3 text-center">Arrival</th>
                          <th className="pb-3 text-center">Burst</th>
                          <th className="pb-3 text-center">Complete</th>
                          <th className="pb-3 text-center text-indigo-500 dark:text-indigo-400">Turnaround</th>
                          <th className="pb-3 text-center text-emerald-500 dark:text-emerald-400">Waiting</th>
                          <th className="pb-3 text-center text-amber-500 dark:text-amber-400">Response</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                        {executionResult.tableData.map((row) => (
                          <tr key={row.pid} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 font-medium">
                            <td className="py-3 text-left font-sans font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span className={`w-2.5 h-2.5 rounded-full ${getProcessColorClass(row.pid, true)}`} />
                              {row.name}
                            </td>
                            <td className="py-3 text-center text-slate-500 dark:text-slate-400">{row.arrivalTime}ms</td>
                            <td className="py-3 text-center text-slate-500 dark:text-slate-400">{row.burstTime}ms</td>
                            <td className="py-3 text-center text-slate-900 dark:text-white font-bold">{row.completionTime}ms</td>
                            <td className="py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">{row.turnaroundTime}ms</td>
                            <td className="py-3 text-center font-bold text-emerald-600 dark:text-emerald-400">{row.waitTime}ms</td>
                            <td className="py-3 text-center font-bold text-amber-600 dark:text-amber-400">{row.responseTime}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] font-sans text-slate-500 dark:text-slate-400 leading-relaxed font-normal">
                    <div>
                      💡 <strong>Turnaround Time (TAT)</strong>: The elapsed time from arrival to completion. <br />
                      <span className="font-mono text-[10px]">TAT = Completion Time - Arrival Time</span>
                    </div>
                    <div>
                      💡 <strong>Waiting Time (WT)</strong>: Total duration spent idling in the ready queue. <br />
                      <span className="font-mono text-[10px]">WT = Turnaround Time - Burst Time</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!validationError && activeTab === 'comparison' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                {/* Comparative Analytics Module */}
                <div className="p-6 rounded-2xl bg-white/70 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 shadow-md dark:shadow-xl dark:backdrop-blur-md space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold uppercase tracking-widest text-[#6366f1] dark:text-[#a5b4fc] flex items-center gap-1.5">
                      <Trophy className="w-5 h-5 text-indigo-500" /> Real-Time Algorithmic Efficiency Audit
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      We solve your exact processes across all scheduling variations concurrently. Inspect the live audit:
                    </p>
                  </div>
                  <ComparisonChart 
                    processes={processes} 
                    quantum={quantum} 
                    lowerAsHigher={lowerPriorityIsHigher} 
                  />
                </div>
              </motion.div>
            )}

            {processes.length === 0 && (
              <div className="py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-white/15 text-center flex flex-col items-center justify-center space-y-4 bg-white/20 dark:bg-slate-900/30 dark:backdrop-blur-md">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5">
                  <Cpu className="w-8 h-8 text-slate-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">No Processes Loaded</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    Enter customized process parameters or click below to quickly load standard example datasets.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => loadExampleTemplate('balanced')}
                    className="text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
                  >
                    Load Balanced Dataset
                  </button>
                  <button
                    onClick={addProcess}
                    className="text-xs font-semibold px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    Add Custom Row
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer Area */}
        
      </div>
    </div>
  );
}

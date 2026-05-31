export interface Process {
  id: number; // Process ID or number
  name: string; // Printable label e.g., "P1"
  arrivalTime: number;
  burstTime: number;
  priority?: number; // Lower number can mean higher or lower priority; we'll support both and display a toggle!
}

export interface GanttBlock {
  pid: number | string; // ID of the process, or "Idle"
  name: string; // Label of the process, or "Idle"
  startTime: number;
  endTime: number;
  duration: number;
}

export interface ProcessResult {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority?: number;
  completionTime: number;
  turnaroundTime: number; // Completion - Arrival
  waitTime: number; // Turnaround - Burst
  responseTime: number; // First execution time - Arrival
}

export interface SimulationResult {
  algorithm: string;
  tableData: ProcessResult[];
  ganttChart: GanttBlock[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  totalTime: number;
  cpuUtilization: number;
}

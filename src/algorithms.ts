import { Process, GanttBlock, ProcessResult, SimulationResult } from './types';

/**
 * Common metrics calculator helper
 */
function createSimulationResult(
  algorithm: string,
  processes: Process[],
  ganttChart: GanttBlock[],
  tableData: ProcessResult[],
  totalTime: number
): SimulationResult {
  const numProcesses = processes.length;
  if (numProcesses === 0) {
    return {
      algorithm,
      tableData: [],
      ganttChart: [],
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      avgResponseTime: 0,
      totalTime: 0,
      cpuUtilization: 0,
    };
  }

  // Calculate averages
  const sumWaitingTime = tableData.reduce((acc, p) => acc + p.waitTime, 0);
  const sumTurnaroundTime = tableData.reduce((acc, p) => acc + p.turnaroundTime, 0);
  const sumResponseTime = tableData.reduce((acc, p) => acc + p.responseTime, 0);

  // CPU utilization: Percentage of totalTime when CPU was NOT executing "Idle"
  const idleTime = ganttChart
    .filter((block) => block.pid === 'Idle')
    .reduce((acc, block) => acc + block.duration, 0);
  const activeTime = totalTime - idleTime;
  const cpuUtilization = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;

  return {
    algorithm,
    tableData,
    ganttChart,
    avgWaitingTime: parseFloat((sumWaitingTime / numProcesses).toFixed(3)),
    avgTurnaroundTime: parseFloat((sumTurnaroundTime / numProcesses).toFixed(3)),
    avgResponseTime: parseFloat((sumResponseTime / numProcesses).toFixed(3)),
    totalTime,
    cpuUtilization: parseFloat(cpuUtilization.toFixed(2)),
  };
}

/**
 * Merge consecutive Gantt blocks with the same PID
 */
function mergeGanttChart(blocks: GanttBlock[]): GanttBlock[] {
  if (blocks.length <= 1) return blocks;
  const merged: GanttBlock[] = [];
  let current = { ...blocks[0] };

  for (let i = 1; i < blocks.length; i++) {
    const next = blocks[i];
    if (current.pid === next.pid) {
      current.endTime = next.endTime;
      current.duration += next.duration;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

/**
 * FCFS (First-Come First-Served) Scheduling
 */
export function solveFCFS(processes: Process[]): SimulationResult {
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || a.id - b.id);
  const ganttChart: GanttBlock[] = [];
  const tableData: ProcessResult[] = [];
  let currentTime = 0;

  sorted.forEach((p) => {
    // If there is idle time before the process arrives
    if (currentTime < p.arrivalTime) {
      ganttChart.push({
        pid: 'Idle',
        name: 'Idle',
        startTime: currentTime,
        endTime: p.arrivalTime,
        duration: p.arrivalTime - currentTime,
      });
      currentTime = p.arrivalTime;
    }

    const startTime = currentTime;
    const responseTime = startTime - p.arrivalTime;
    currentTime += p.burstTime;
    const completionTime = currentTime;
    const turnaroundTime = completionTime - p.arrivalTime;
    const waitTime = turnaroundTime - p.burstTime;

    ganttChart.push({
      pid: p.id,
      name: p.name,
      startTime,
      endTime: completionTime,
      duration: p.burstTime,
    });

    tableData.push({
      pid: p.id,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    });
  });

  return createSimulationResult('First Come First Served (FCFS)', processes, ganttChart, tableData, currentTime);
}

/**
 * SJF (Shortest Job First) Non-Preemptive Scheduling
 */
export function solveSJFNonPreemptive(processes: Process[]): SimulationResult {
  const uncompleted = processes.map((p) => ({ ...p, isCompleted: false }));
  const ganttChart: GanttBlock[] = [];
  const tableData: ProcessResult[] = [];
  let currentTime = 0;
  let completedCount = 0;

  while (completedCount < processes.length) {
    // Find arrived processes that are not completed
    const readyProcesses = uncompleted.filter(
      (p) => p.arrivalTime <= currentTime && !p.isCompleted
    );

    if (readyProcesses.length === 0) {
      // Find the next arriving process
      const nextArrivals = uncompleted.filter((p) => !p.isCompleted);
      const nextTime = Math.min(...nextArrivals.map((p) => p.arrivalTime));

      ganttChart.push({
        pid: 'Idle',
        name: 'Idle',
        startTime: currentTime,
        endTime: nextTime,
        duration: nextTime - currentTime,
      });

      currentTime = nextTime;
      continue;
    }

    // Pick process with shortest burst time. Tie-breaker: Arrival time, then PID
    readyProcesses.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime || a.id - b.id);
    const chosen = readyProcesses[0];

    const startTime = currentTime;
    const responseTime = startTime - chosen.arrivalTime;
    currentTime += chosen.burstTime;
    const completionTime = currentTime;
    const turnaroundTime = completionTime - chosen.arrivalTime;
    const waitTime = turnaroundTime - chosen.burstTime;

    ganttChart.push({
      pid: chosen.id,
      name: chosen.name,
      startTime,
      endTime: completionTime,
      duration: chosen.burstTime,
    });

    tableData.push({
      pid: chosen.id,
      name: chosen.name,
      arrivalTime: chosen.arrivalTime,
      burstTime: chosen.burstTime,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    });

    const index = uncompleted.findIndex((p) => p.id === chosen.id);
    uncompleted[index].isCompleted = true;
    completedCount++;
  }

  return createSimulationResult('Shortest Job First (SJF, Non-Preemptive)', processes, ganttChart, tableData, currentTime);
}

/**
 * SRTF (Shortest Remaining Time First) Preemptive SJF Scheduling
 */
export function solveSRTF(processes: Process[]): SimulationResult {
  const pCount = processes.length;
  const remainingBurst = new Map<number, number>();
  const firstExecutionTime = new Map<number, number>();
  const completionTimes = new Map<number, number>();

  processes.forEach((p) => {
    remainingBurst.set(p.id, p.burstTime);
  });

  const ganttChartRaw: GanttBlock[] = [];
  let currentTime = 0;
  let completedCount = 0;
  let prevProcessId: number | string | null = null;
  let segmentStartTime = 0;

  while (completedCount < pCount) {
    // Collect all processes that have arrived and have remaining burst time
    const ready = processes.filter(
      (p) => p.arrivalTime <= currentTime && (remainingBurst.get(p.id) || 0) > 0
    );

    if (ready.length === 0) {
      // Find the next arrival
      const unarrived = processes.filter((p) => p.arrivalTime > currentTime);
      if (unarrived.length > 0) {
        const nextTime = Math.min(...unarrived.map((p) => p.arrivalTime));
        if (prevProcessId !== 'Idle') {
          if (prevProcessId !== null) {
            ganttChartRaw.push({
              pid: prevProcessId,
              name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
              startTime: segmentStartTime,
              endTime: currentTime,
              duration: currentTime - segmentStartTime,
            });
          }
          prevProcessId = 'Idle';
          segmentStartTime = currentTime;
        }
        currentTime = nextTime;
      } else {
        break;
      }
      continue;
    }

    // Pick process with shortest remaining burst time. Tie-breaker: Arrival time, then PID
    ready.sort((a, b) => {
      const remA = remainingBurst.get(a.id) || 0;
      const remB = remainingBurst.get(b.id) || 0;
      return remA - remB || a.arrivalTime - b.arrivalTime || a.id - b.id;
    });

    const chosen = ready[0];

    // Track response time (first time execution starts)
    if (!firstExecutionTime.has(chosen.id)) {
      firstExecutionTime.set(chosen.id, currentTime);
    }

    if (prevProcessId !== chosen.id) {
      if (prevProcessId !== null) {
        ganttChartRaw.push({
          pid: prevProcessId,
          name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
          startTime: segmentStartTime,
          endTime: currentTime,
          duration: currentTime - segmentStartTime,
        });
      }
      prevProcessId = chosen.id;
      segmentStartTime = currentTime;
    }

    // Increment time by 1 unit (preemptive step-by-step resolution)
    // To be precise and fast, we check if there are any other arrivals, otherwise we can run until next arrival or completion
    const nextArriving = processes
      .filter((p) => p.arrivalTime > currentTime)
      .map((p) => p.arrivalTime);
    const nextTimeBoundary = nextArriving.length > 0 ? Math.min(...nextArriving) : Infinity;

    const currentBurst = remainingBurst.get(chosen.id) || 0;
    const timeToNextArrival = nextTimeBoundary - currentTime;
    const timeStep = Math.min(currentBurst, timeToNextArrival, 1); // Standard safe tick

    remainingBurst.set(chosen.id, currentBurst - timeStep);
    currentTime += timeStep;

    if (remainingBurst.get(chosen.id) === 0) {
      completionTimes.set(chosen.id, currentTime);
      completedCount++;
    }
  }

  // Final segment
  if (prevProcessId !== null) {
    ganttChartRaw.push({
      pid: prevProcessId,
      name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
      startTime: segmentStartTime,
      endTime: currentTime,
      duration: currentTime - segmentStartTime,
    });
  }

  const ganttChart = mergeGanttChart(ganttChartRaw);

  const tableData: ProcessResult[] = processes.map((p) => {
    const completionTime = completionTimes.get(p.id) || 0;
    const turnaroundTime = completionTime - p.arrivalTime;
    const waitTime = turnaroundTime - p.burstTime;
    const responseTime = (firstExecutionTime.get(p.id) ?? p.arrivalTime) - p.arrivalTime;

    return {
      pid: p.id,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    };
  });

  return createSimulationResult('Shortest Remaining Time First (SRTF, Preemptive)', processes, ganttChart, tableData, currentTime);
}

/**
 * Priority Non-Preemptive Scheduling
 */
export function solvePriorityNonPreemptive(processes: Process[], lowerAsHigher: boolean): SimulationResult {
  const uncompleted = processes.map((p) => ({ ...p, isCompleted: false }));
  const ganttChart: GanttBlock[] = [];
  const tableData: ProcessResult[] = [];
  let currentTime = 0;
  let completedCount = 0;

  while (completedCount < processes.length) {
    const readyProcesses = uncompleted.filter(
      (p) => p.arrivalTime <= currentTime && !p.isCompleted
    );

    if (readyProcesses.length === 0) {
      const nextArrivals = uncompleted.filter((p) => !p.isCompleted);
      const nextTime = Math.min(...nextArrivals.map((p) => p.arrivalTime));

      ganttChart.push({
        pid: 'Idle',
        name: 'Idle',
        startTime: currentTime,
        endTime: nextTime,
        duration: nextTime - currentTime,
      });

      currentTime = nextTime;
      continue;
    }

    // Sort by priority.
    // If lowerAsHigher is true, lower priority numbers have higher priority (e.g. 1 is higher than 5).
    // Tie-breaker: Arrival time, then PID
    readyProcesses.sort((a, b) => {
      const priA = a.priority ?? 0;
      const priB = b.priority ?? 0;
      const priDiff = lowerAsHigher ? priA - priB : priB - priA;
      return priDiff || a.arrivalTime - b.arrivalTime || a.id - b.id;
    });

    const chosen = readyProcesses[0];

    const startTime = currentTime;
    const responseTime = startTime - chosen.arrivalTime;
    currentTime += chosen.burstTime;
    const completionTime = currentTime;
    const turnaroundTime = completionTime - chosen.arrivalTime;
    const waitTime = turnaroundTime - chosen.burstTime;

    ganttChart.push({
      pid: chosen.id,
      name: chosen.name,
      startTime,
      endTime: completionTime,
      duration: chosen.burstTime,
    });

    tableData.push({
      pid: chosen.id,
      name: chosen.name,
      arrivalTime: chosen.arrivalTime,
      burstTime: chosen.burstTime,
      priority: chosen.priority,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    });

    const index = uncompleted.findIndex((p) => p.id === chosen.id);
    uncompleted[index].isCompleted = true;
    completedCount++;
  }

  return createSimulationResult('Priority (Non-Preemptive)', processes, ganttChart, tableData, currentTime);
}

/**
 * Priority Preemptive Scheduling
 */
export function solvePriorityPreemptive(processes: Process[], lowerAsHigher: boolean): SimulationResult {
  const pCount = processes.length;
  const remainingBurst = new Map<number, number>();
  const firstExecutionTime = new Map<number, number>();
  const completionTimes = new Map<number, number>();

  processes.forEach((p) => {
    remainingBurst.set(p.id, p.burstTime);
  });

  const ganttChartRaw: GanttBlock[] = [];
  let currentTime = 0;
  let completedCount = 0;
  let prevProcessId: number | string | null = null;
  let segmentStartTime = 0;

  while (completedCount < pCount) {
    const ready = processes.filter(
      (p) => p.arrivalTime <= currentTime && (remainingBurst.get(p.id) || 0) > 0
    );

    if (ready.length === 0) {
      const unarrived = processes.filter((p) => p.arrivalTime > currentTime);
      if (unarrived.length > 0) {
        const nextTime = Math.min(...unarrived.map((p) => p.arrivalTime));
        if (prevProcessId !== 'Idle') {
          if (prevProcessId !== null) {
            ganttChartRaw.push({
              pid: prevProcessId,
              name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
              startTime: segmentStartTime,
              endTime: currentTime,
              duration: currentTime - segmentStartTime,
            });
          }
          prevProcessId = 'Idle';
          segmentStartTime = currentTime;
        }
        currentTime = nextTime;
      } else {
        break;
      }
      continue;
    }

    // Sort by priority. Tie-breaker: Arrival time, then PID
    ready.sort((a, b) => {
      const priA = a.priority ?? 0;
      const priB = b.priority ?? 0;
      const priDiff = lowerAsHigher ? priA - priB : priB - priA;
      return priDiff || a.arrivalTime - b.arrivalTime || a.id - b.id;
    });

    const chosen = ready[0];

    if (!firstExecutionTime.has(chosen.id)) {
      firstExecutionTime.set(chosen.id, currentTime);
    }

    if (prevProcessId !== chosen.id) {
      if (prevProcessId !== null) {
        ganttChartRaw.push({
          pid: prevProcessId,
          name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
          startTime: segmentStartTime,
          endTime: currentTime,
          duration: currentTime - segmentStartTime,
        });
      }
      prevProcessId = chosen.id;
      segmentStartTime = currentTime;
    }

    const nextArriving = processes
      .filter((p) => p.arrivalTime > currentTime)
      .map((p) => p.arrivalTime);
    const nextTimeBoundary = nextArriving.length > 0 ? Math.min(...nextArriving) : Infinity;

    const currentBurst = remainingBurst.get(chosen.id) || 0;
    const timeToNextArrival = nextTimeBoundary - currentTime;
    const timeStep = Math.min(currentBurst, timeToNextArrival, 1);

    remainingBurst.set(chosen.id, currentBurst - timeStep);
    currentTime += timeStep;

    if (remainingBurst.get(chosen.id) === 0) {
      completionTimes.set(chosen.id, currentTime);
      completedCount++;
    }
  }

  if (prevProcessId !== null) {
    ganttChartRaw.push({
      pid: prevProcessId,
      name: prevProcessId === 'Idle' ? 'Idle' : processes.find((p) => p.id === prevProcessId)!.name,
      startTime: segmentStartTime,
      endTime: currentTime,
      duration: currentTime - segmentStartTime,
    });
  }

  const ganttChart = mergeGanttChart(ganttChartRaw);

  const tableData: ProcessResult[] = processes.map((p) => {
    const completionTime = completionTimes.get(p.id) || 0;
    const turnaroundTime = completionTime - p.arrivalTime;
    const waitTime = turnaroundTime - p.burstTime;
    const responseTime = (firstExecutionTime.get(p.id) ?? p.arrivalTime) - p.arrivalTime;

    return {
      pid: p.id,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    };
  });

  return createSimulationResult('Priority (Preemptive)', processes, ganttChart, tableData, currentTime);
}

/**
 * Round Robin (RR) Scheduling
 */
export function solveRoundRobin(processes: Process[], quantum: number): SimulationResult {
  const pCount = processes.length;
  // Sort in order of arrival, then PID
  const sorted = [...processes].sort((a, b) => a.arrivalTime - b.arrivalTime || a.id - b.id);

  const remainingBurst = new Map<number, number>();
  const firstExecutionTime = new Map<number, number>();
  const completionTimes = new Map<number, number>();

  sorted.forEach((p) => {
    remainingBurst.set(p.id, p.burstTime);
  });

  const ganttChartRaw: GanttBlock[] = [];
  let currentTime = 0;
  let completedCount = 0;

  // Track is process in the queue
  const inQueue = new Set<number>();
  const queue: number[] = [];

  // Helper to push all arrived, uncompleted processes to the queue
  const pushArrived = () => {
    sorted.forEach((p) => {
      const rem = remainingBurst.get(p.id) || 0;
      if (p.arrivalTime <= currentTime && rem > 0 && !inQueue.has(p.id)) {
        queue.push(p.id);
        inQueue.add(p.id);
      }
    });
  };

  pushArrived();

  while (completedCount < pCount) {
    if (queue.length === 0) {
      // CPU is idle. Add an Idle block
      const unarrived = sorted.filter((p) => p.arrivalTime > currentTime);
      if (unarrived.length > 0) {
        const nextTime = Math.min(...unarrived.map((p) => p.arrivalTime));
        ganttChartRaw.push({
          pid: 'Idle',
          name: 'Idle',
          startTime: currentTime,
          endTime: nextTime,
          duration: nextTime - currentTime,
        });
        currentTime = nextTime;
        pushArrived();
      } else {
        break;
      }
      continue;
    }

    const currentPid = queue.shift()!;
    inQueue.delete(currentPid);

    const chosen = sorted.find((p) => p.id === currentPid)!;
    const currentBurst = remainingBurst.get(currentPid) || 0;

    // Record response time
    if (!firstExecutionTime.has(currentPid)) {
      firstExecutionTime.set(currentPid, currentTime);
    }

    const runTime = Math.min(currentBurst, quantum);

    ganttChartRaw.push({
      pid: currentPid,
      name: chosen.name,
      startTime: currentTime,
      endTime: currentTime + runTime,
      duration: runTime,
    });

    currentTime += runTime;
    remainingBurst.set(currentPid, currentBurst - runTime);

    // Push newly arrived processes FIRST (essential for standard RR)
    pushArrived();

    // If the process is not finished, put it back on the queue
    if ((remainingBurst.get(currentPid) || 0) > 0) {
      queue.push(currentPid);
      inQueue.add(currentPid);
    } else {
      completionTimes.set(currentPid, currentTime);
      completedCount++;
    }
  }

  const ganttChart = mergeGanttChart(ganttChartRaw);

  const tableData: ProcessResult[] = sorted.map((p) => {
    const completionTime = completionTimes.get(p.id) || 0;
    const turnaroundTime = completionTime - p.arrivalTime;
    const waitTime = turnaroundTime - p.burstTime;
    const responseTime = (firstExecutionTime.get(p.id) ?? p.arrivalTime) - p.arrivalTime;

    return {
      pid: p.id,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime,
      turnaroundTime,
      waitTime,
      responseTime,
    };
  });

  return createSimulationResult('Round Robin (RR)', processes, ganttChart, tableData, currentTime);
}

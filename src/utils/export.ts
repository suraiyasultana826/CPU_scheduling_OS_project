import { ProcessResult, SimulationResult } from '../types';

/**
 * Download simulation results as CSV
 */
export function downloadCSV(result: SimulationResult) {
  const headers = [
    'Process Name',
    'Arrival Time (ms)',
    'Burst Time (ms)',
    'Priority',
    'Completion Time (ms)',
    'Turnaround Time (ms)',
    'Waiting Time (ms)',
    'Response Time (ms)'
  ];

  const rows = result.tableData.map((row) => [
    row.name,
    row.arrivalTime,
    row.burstTime,
    row.priority !== undefined ? row.priority : 'N/A',
    row.completionTime,
    row.turnaroundTime,
    row.waitTime,
    row.responseTime
  ]);

  const summary = [
    [],
    ['Algorithm', result.algorithm],
    ['Total Time', `${result.totalTime} ms`],
    ['Avg Waiting Time', `${result.avgWaitingTime} ms`],
    ['Avg Turnaround Time', `${result.avgTurnaroundTime} ms`],
    ['Avg Response Time', `${result.avgResponseTime} ms`],
    ['CPU Utilization', `${result.cpuUtilization}%`],
  ];

  const csvContent = [
    headers.join(','),
    ...rows.map((r) => r.join(',')),
    ...summary.map((s) => s.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeAlgoName = result.algorithm.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('download', `cpu_schedule_${safeAlgoName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a beautifully aligned text report suitable for copy-pasting or text file export
 */
export function generateTextReport(result: SimulationResult): string {
  const border = '========================================================================';
  const subBorder = '------------------------------------------------------------------------';
  
  let report = '';
  report += `${border}\n`;
  report += `               CPU SCHEDULING SIMULATION REPORT\n`;
  report += `               Algorithm: ${result.algorithm}\n`;
  report += `${border}\n\n`;

  // General Metrics
  report += `Summary Metrics:\n`;
  report += `${subBorder}\n`;
  report += `Total Duration       : ${result.totalTime} ms\n`;
  report += `Avg Waiting Time     : ${result.avgWaitingTime} ms\n`;
  report += `Avg Turnaround Time  : ${result.avgTurnaroundTime} ms\n`;
  report += `Avg Response Time    : ${result.avgResponseTime} ms\n`;
  report += `CPU Utilization      : ${result.cpuUtilization}%\n`;
  report += `${subBorder}\n\n`;

  // Gantt Chart representation
  report += `Gantt Chart Timeline:\n`;
  report += `${subBorder}\n`;
  
  let timelineStr = '  ';
  let boundaryStr = '  0';
  
  result.ganttChart.forEach((block) => {
    const barLabel = block.pid === 'Idle' ? 'Idle' : block.name;
    const padSz = Math.max(barLabel.length + 4, block.duration.toString().length + 2, 7);
    timelineStr += `| ${barLabel.padEnd(padSz - 3)} `;
    boundaryStr += block.endTime.toString().padStart(padSz);
  });
  timelineStr += '|';
  
  report += `${timelineStr}\n`;
  report += `${boundaryStr}\n`;
  report += `${subBorder}\n\n`;

  // Table data
  report += `Individual Process Metrics:\n`;
  report += `${subBorder}\n`;
  report += ` ${'Name'.padEnd(8)} | ${'Arrival'.padEnd(7)} | ${'Burst'.padEnd(5)} | ${'Priority'.padEnd(8)} | ${'Complete'.padEnd(8)} | ${'Turnaround'.padEnd(10)} | ${'Waiting'.padEnd(7)} | ${'Response'.padEnd(8)}\n`;
  report += `${subBorder}\n`;

  result.tableData.forEach((row) => {
    const pName = row.name.padEnd(8);
    const arrival = row.arrivalTime.toString().padStart(7);
    const burst = row.burstTime.toString().padStart(5);
    const pri = (row.priority !== undefined ? row.priority : 'N/A').toString().padStart(8);
    const complete = row.completionTime.toString().padStart(8);
    const tat = row.turnaroundTime.toString().padStart(10);
    const wait = row.waitTime.toString().padStart(7);
    const resp = row.responseTime.toString().padStart(8);

    report += ` ${pName} | ${arrival} | ${burst} | ${pri} | ${complete} | ${tat} | ${wait} | ${resp}\n`;
  });
  
  report += `${subBorder}\n`;
  report += `Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
  
  return report;
}

/**
 * Downloads the text report as a .txt file
 */
export function downloadTextReport(result: SimulationResult) {
  const content = generateTextReport(result);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeAlgoName = result.algorithm.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('download', `cpu_schedule_report_${safeAlgoName}.txt`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

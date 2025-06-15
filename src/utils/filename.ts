export function getContractFileName(contractYear: string, providerName: string, runDate: string) {
  const safeProvider = providerName.replace(/\s+/g, '');
  return `${contractYear}_${safeProvider}_ScheduleA_${runDate}.docx`;
} 
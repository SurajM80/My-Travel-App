// Utility functions for date manipulation avoiding timezone issues

export const addDays = (dateStr: string, daysToAdd: number): string => {
  // 1. Parse manually to avoid local timezone interference
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // JS months are 0-11
  const day = parseInt(parts[2], 10);

  // 2. Create UTC Date
  const date = new Date(Date.UTC(year, month, day));
  
  // 3. Adjust days in UTC
  date.setUTCDate(date.getUTCDate() + daysToAdd);
  
  // 4. Return string in YYYY-MM-DD format
  return date.toISOString().split('T')[0];
};

export const getDaysArray = (start: string, end: string) => {
  const arr = [];
  
  // Parse start date
  const [sY, sM, sD] = start.split('-').map(Number);
  const dt = new Date(Date.UTC(sY, sM - 1, sD));
  
  // Parse end date
  const [eY, eM, eD] = end.split('-').map(Number);
  const endDt = new Date(Date.UTC(eY, eM - 1, eD));
  
  // Safety check
  if (isNaN(dt.getTime()) || isNaN(endDt.getTime())) return [];
  
  // Loop while dt is on or before endDt
  while (dt.getTime() <= endDt.getTime()) {
    arr.push(new Date(dt));
    // Increment using UTC to stay consistent
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return arr;
};

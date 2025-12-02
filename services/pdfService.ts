import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Trip, Expense, Activity } from "../types";

export const generateTripPDF = (trip: Trip, expenses: Expense[], activities: Activity[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // -- Helper to get Date Array (Same logic as TripItinerary) --
  const getDaysArray = (start: string, end: string) => {
    const arr = [];
    const [sY, sM, sD] = start.split('-').map(Number);
    const dt = new Date(Date.UTC(sY, sM - 1, sD));
    const [eY, eM, eD] = end.split('-').map(Number);
    const endDt = new Date(Date.UTC(eY, eM - 1, eD));
    
    if (isNaN(dt.getTime()) || isNaN(endDt.getTime())) return [];
    
    while (dt.getTime() <= endDt.getTime()) {
      arr.push(new Date(dt));
      dt.setUTCDate(dt.getUTCDate() + 1);
    }
    return arr;
  };

  // -- 1. Title Section --
  doc.setFontSize(22);
  doc.setTextColor(79, 70, 229); // Indigo-600
  doc.text(`Trip to ${trip.destination}`, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  const dateRange = `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`;
  doc.text(dateRange, 14, 28);

  // -- 2. Financial Summary --
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remaining = trip.budget - totalSpent;
  
  doc.setFillColor(249, 250, 251); // Gray-50
  doc.roundedRect(14, 35, pageWidth - 28, 25, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Budget", 24, 45);
  doc.text("Spent", 90, 45);
  doc.text("Remaining", 156, 45);

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`INR ${trip.budget.toLocaleString()}`, 24, 53);
  doc.text(`INR ${totalSpent.toLocaleString()}`, 90, 53);
  
  // Color remaining based on status
  if (remaining < 0) doc.setTextColor(220, 38, 38); // Red
  else doc.setTextColor(22, 163, 74); // Green
  doc.text(`INR ${remaining.toLocaleString()}`, 156, 53);
  doc.setTextColor(0); // Reset

  let currentY = 70;

  // -- 3. Itinerary Section --
  doc.setFontSize(16);
  doc.setTextColor(79, 70, 229);
  doc.text("Itinerary", 14, currentY);
  currentY += 10;

  const days = getDaysArray(trip.startDate, trip.endDate);

  days.forEach((dateObj, index) => {
    // Check if we need a new page
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    const dateStr = dateObj.toISOString().split('T')[0];
    const dayActivities = activities.filter(a => a.date === dateStr);
    
    // Day Header
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(55);
    doc.text(`Day ${index + 1}: ${dateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}`, 14, currentY);
    
    currentY += 7;

    // Activities
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(80);
    
    if (dayActivities.length === 0) {
      doc.text("- No activities planned", 20, currentY);
      currentY += 7;
    } else {
      dayActivities.forEach(act => {
        const checkMark = act.isCompleted ? "[x]" : "[ ]";
        const text = `${checkMark} ${act.description}`;
        doc.text(text, 20, currentY);
        currentY += 6;
      });
    }
    currentY += 5; // Spacing between days
  });

  currentY += 10;

  // -- 4. Expenses Section --
  // Check space for table header
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(79, 70, 229);
  doc.text("Expenses", 14, currentY);
  currentY += 5;

  const expenseData = expenses.map(e => [
    new Date(e.date).toLocaleDateString(),
    e.category,
    e.description,
    `INR ${e.amount.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Category', 'Description', 'Amount']],
    body: expenseData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      3: { halign: 'right' }
    }
  });

  // -- Save --
  doc.save(`${trip.destination.replace(/\s+/g, '_')}_Itinerary.pdf`);
};
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { TimeSlot, Day, TimetableCell } from '../types';

export const exportToPNG = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalStyle = element.style.cssText;
  element.style.boxShadow = 'none';
  element.style.border = 'none';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Error exporting PNG', error);
  } finally {
    element.style.cssText = originalStyle;
  }
};

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  const originalStyle = element.style.cssText;
  element.style.boxShadow = 'none';
  element.style.border = 'none';

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const imgWidth = canvas.width / 2;
    const imgHeight = canvas.height / 2;

    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth, imgHeight],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Error exporting PDF', error);
  } finally {
    element.style.cssText = originalStyle;
  }
};

export const exportToCSV = (
  slots: TimeSlot[],
  days: Day[],
  cells: Record<string, TimetableCell>,
  filename: string,
) => {
  const headers = ['Time Slot', ...days.map(d => d.name)];
  const rows = slots.map(slot => {
    const row = [`${slot.startTime} - ${slot.endTime}`];
    days.forEach(day => {
      const cell = cells[`${slot.id}-${day.id}`];
      if (cell && cell.subject) {
        row.push(`"${cell.subject} (${cell.teacher || 'No Teacher'}, ${cell.room || 'No Room'})"`);
      } else {
        row.push('""');
      }
    });
    return row.join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.click();
};

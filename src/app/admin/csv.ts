// Quote every cell so commas and line breaks in notes stay in one cell
const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

/** Download rows as a CSV that Excel and Google Sheets open with the right characters */
export function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Local yyyy-mm-dd (a UTC date would still be yesterday during a New Zealand morning)
export const today = () => new Date().toLocaleDateString("en-CA");

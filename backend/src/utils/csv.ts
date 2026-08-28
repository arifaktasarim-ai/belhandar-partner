// Basit CSV uretici - harici kutuphane gerektirmez.
// Excel'de Turkce karakterlerin dogru gorunmesi icin UTF-8 BOM eklenir.

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",;\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const headerLine = headers.map(escapeCsvCell).join(';');
  const dataLines = rows.map((row) => row.map(escapeCsvCell).join(';'));
  const BOM = '\uFEFF';
  return BOM + [headerLine, ...dataLines].join('\n');
}

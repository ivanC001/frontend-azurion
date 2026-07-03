import { Injectable } from '@angular/core';
import type ExcelJS from 'exceljs';

export type ExcelCellValue = string | number | boolean | Date | null | undefined;
export type ExcelColumnFormat = 'text' | 'number' | 'currency' | 'date' | 'datetime';

export interface ExcelReportColumn {
  readonly key: string;
  readonly label: string;
  readonly width?: number;
  readonly format?: ExcelColumnFormat;
}

export interface ExcelReportSheet {
  readonly name: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly columns: ExcelReportColumn[];
  readonly rows: Array<Record<string, ExcelCellValue>>;
  readonly totalKeys?: string[];
}

@Injectable({ providedIn: 'root' })
export class ExcelReportService {
  async exportWorkbook(fileName: string, sheets: ExcelReportSheet[]): Promise<void> {
    const ExcelJSModule = await import('exceljs');
    const workbook = new ExcelJSModule.Workbook();
    workbook.creator = 'Azurion';
    workbook.lastModifiedBy = 'Azurion';
    workbook.created = new Date();
    workbook.modified = new Date();

    for (const sheet of sheets) {
      this.addSheet(workbook, sheet);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.downloadBlob(blob, this.ensureXlsxName(fileName));
  }

  private addSheet(workbook: ExcelJS.Workbook, report: ExcelReportSheet): void {
    const worksheet = workbook.addWorksheet(this.safeSheetName(report.name), {
      views: [{ state: 'frozen', ySplit: 4 }],
    });
    const columnCount = Math.max(report.columns.length, 1);

    worksheet.mergeCells(1, 1, 1, columnCount);
    const titleCell = worksheet.getCell(1, 1);
    titleCell.value = report.title;
    titleCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 15 };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    titleCell.alignment = { vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells(2, 1, 2, columnCount);
    const subtitleCell = worksheet.getCell(2, 1);
    subtitleCell.value = report.subtitle || `Generado: ${this.formatDateTime(new Date())}`;
    subtitleCell.font = { color: { argb: 'FF475569' }, size: 10 };
    subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    subtitleCell.alignment = { vertical: 'middle' };

    worksheet.addRow([]);
    const headerRowIndex = 4;
    const headerRow = worksheet.getRow(headerRowIndex);
    headerRow.values = report.columns.map((column) => column.label);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = this.thinBorder('FFCCFBF1');
    });

    worksheet.columns = report.columns.map((column) => ({
      key: column.key,
      width: column.width ?? 18,
    }));

    for (const sourceRow of report.rows) {
      const row = worksheet.addRow(this.buildRowValues(report.columns, sourceRow));
      row.eachCell((cell, colNumber) => {
        const column = report.columns[colNumber - 1];
        this.applyBodyCellStyle(cell, column);
        if (
          column.key.toLowerCase().includes('estado') ||
          column.key.toLowerCase().includes('tipo')
        ) {
          this.applyStatusStyle(cell);
        }
      });
    }

    if (report.rows.length > 0 && report.totalKeys?.length) {
      this.addTotalsRow(worksheet, report);
    }

    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: report.columns.length },
    };
    worksheet.getRow(headerRowIndex).commit();
  }

  private buildRowValues(
    columns: ExcelReportColumn[],
    row: Record<string, ExcelCellValue>,
  ): ExcelCellValue[] {
    return columns.map((column) => this.normalizeValue(row[column.key], column.format));
  }

  private normalizeValue(value: ExcelCellValue, format?: ExcelColumnFormat): ExcelCellValue {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    if (format === 'currency' || format === 'number') {
      if (typeof value === 'number') {
        return value;
      }
      const parsed = Number(String(value).replace(/S\/|\s|,/g, ''));
      return Number.isFinite(parsed) ? parsed : String(value);
    }

    if (format === 'date' || format === 'datetime') {
      if (value instanceof Date) {
        return value;
      }
      const parsed = new Date(String(value));
      return Number.isNaN(parsed.getTime()) ? String(value) : parsed;
    }

    return value;
  }

  private applyBodyCellStyle(cell: ExcelJS.Cell, column: ExcelReportColumn): void {
    cell.border = this.thinBorder('FFE2E8F0');
    cell.alignment = {
      horizontal: column.format === 'number' || column.format === 'currency' ? 'right' : 'left',
      vertical: 'middle',
      wrapText: true,
    };

    if (column.format === 'currency') {
      cell.numFmt = '"S/ "#,##0.00';
    }
    if (column.format === 'number') {
      cell.numFmt = '#,##0.00';
    }
    if (column.format === 'date') {
      cell.numFmt = 'yyyy-mm-dd';
    }
    if (column.format === 'datetime') {
      cell.numFmt = 'yyyy-mm-dd hh:mm';
    }
  }

  private applyStatusStyle(cell: ExcelJS.Cell): void {
    const value = String(cell.value || '').toUpperCase();
    if (['ACEPTADO', 'OK', 'ENTRADA'].includes(value)) {
      cell.font = { bold: true, color: { argb: 'FF166534' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
      return;
    }
    if (['ERROR', 'RECHAZADO', 'CRITICO', 'SALIDA'].includes(value)) {
      cell.font = { bold: true, color: { argb: 'FF991B1B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
      return;
    }
    if (['BAJO', 'PENDIENTE', 'PROCESANDO', 'AJUSTE', 'TRASLADO'].includes(value)) {
      cell.font = { bold: true, color: { argb: 'FF92400E' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
    }
  }

  private addTotalsRow(worksheet: ExcelJS.Worksheet, report: ExcelReportSheet): void {
    const totalRow = worksheet.addRow([]);
    const totalRowNumber = totalRow.number;
    totalRow.getCell(1).value = 'Totales';
    totalRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      cell.border = this.thinBorder('FFBAE6FD');
    });

    for (const key of report.totalKeys ?? []) {
      const columnIndex = report.columns.findIndex((column) => column.key === key) + 1;
      if (columnIndex <= 0) {
        continue;
      }
      const column = report.columns[columnIndex - 1];
      const letter = worksheet.getColumn(columnIndex).letter;
      totalRow.getCell(columnIndex).value = {
        formula: `SUM(${letter}5:${letter}${totalRowNumber - 1})`,
      };
      this.applyBodyCellStyle(totalRow.getCell(columnIndex), column);
      totalRow.getCell(columnIndex).font = { bold: true, color: { argb: 'FF0F172A' } };
      totalRow.getCell(columnIndex).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0F2FE' },
      };
    }
  }

  private thinBorder(color: string): Partial<ExcelJS.Borders> {
    return {
      top: { style: 'thin', color: { argb: color } },
      right: { style: 'thin', color: { argb: color } },
      bottom: { style: 'thin', color: { argb: color } },
      left: { style: 'thin', color: { argb: color } },
    };
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  private safeSheetName(name: string): string {
    return name.replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Reporte';
  }

  private ensureXlsxName(fileName: string): string {
    return fileName.toLowerCase().endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  }

  private formatDateTime(date: Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  }
}

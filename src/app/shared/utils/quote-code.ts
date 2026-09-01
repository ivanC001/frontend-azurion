/** Codigo visible de una cotizacion, alineado con el backend (COT-%06d). */
export function quoteCode(id: number | string | null | undefined): string {
  return `COT-${String(id ?? 0).padStart(6, '0')}`;
}

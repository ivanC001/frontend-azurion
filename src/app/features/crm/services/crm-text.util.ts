/**
 * Convierte un codigo interno en una etiqueta legible.
 *
 * `NO_INTERESADO` -> `No Interesado`. Vivia como metodo del contenedor del CRM
 * pese a no depender de su estado; aqui la comparten los stores y las vistas.
 */
export function humanizeCode(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Importe sin decimales y con separador de miles local. */
export function formatCompactAmount(value: number): string {
  return new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 }).format(Number(value || 0));
}

/**
 * Variacion porcentual entre dos periodos, con signo.
 *
 * Sin periodo anterior no hay variacion que calcular: se informa +100% si hoy
 * hay algo y +0% si no, en lugar de dividir por cero.
 */
export function deltaLabel(current: number, previous: number, decimal = false): string {
  if (previous <= 0) {
    return current > 0 ? '+100%' : '+0%';
  }
  const value = ((current - previous) / previous) * 100;
  const rounded = decimal ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

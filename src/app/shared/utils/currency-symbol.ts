/**
 * Espejo del catalogo de simbolos del backend (CurrencyCatalog.java) para que
 * los montos se etiqueten igual en PDF, correo, WhatsApp y pantallas.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  PEN: 'S/',
  USD: 'US$',
  EUR: '€',
  MXN: 'MX$',
  COP: 'COL$',
  CLP: 'CLP$',
  ARS: 'AR$',
  BRL: 'R$',
  CAD: 'CA$',
  GBP: '£',
  JPY: '¥',
};

export function currencySymbol(code: string | null | undefined, fallback = 'PEN'): string {
  const normalized = (code || fallback).trim().toUpperCase();
  return CURRENCY_SYMBOLS[normalized] || normalized;
}

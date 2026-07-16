export function formatMoney(value: number, currency = 'S/'): string {
  const amount = new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
  return `${currency} ${amount}`;
}

export function formatCompactMoney(value: number, currency = 'S/'): string {
  const amount = new Intl.NumberFormat('es-PE', {
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
  return `${currency} ${amount}`;
}

export function contactInitials(value: string | null | undefined): string {
  const raw = String(value || 'Cliente').trim();
  const parts = raw.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : raw.slice(0, 2);
  return letters.toUpperCase();
}

export function humanizeCrm(value: string | null | undefined): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

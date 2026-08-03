export function isIdentifiedCustomer(
  documentType: string | null | undefined,
  documentNumber: string | null | undefined,
  customerName: string | null | undefined,
): boolean {
  const type = documentType?.trim() ?? '';
  const number = documentNumber?.trim() ?? '';
  const name = customerName?.trim() ?? '';

  if (!name) {
    return false;
  }

  return (type === '1' && /^\d{8}$/.test(number)) || (type === '6' && /^\d{11}$/.test(number));
}

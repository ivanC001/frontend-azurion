import type { Cotizacion, CrmOportunidad } from '../../../../data/admin-saas-api.service';
import type {
  CrmPaymentPlan,
  OpportunityChecklistItem,
  OpportunityDocumentRecord,
  OpportunityFinancialStatusTone,
  OpportunityFinancialSummary,
  OpportunityNegotiationRecord,
  OpportunityPaymentRecord,
  OpportunityRequirementRecord,
  OpportunityStatusTone,
} from '../../models';

const FINAL_AGREEMENT_STATES = new Set(['CLIENTE_CONFORME', 'GANADA']);
const SENT_QUOTE_STATES = new Set([
  'ENVIADA',
  'EN_SEGUIMIENTO',
  'ACEPTADA',
  'NEGOCIACION',
  'CONVERTIDA',
]);
const FINAL_QUOTE_STATES = new Set(['ACEPTADA', 'CONVERTIDA']);
const CLOSING_DOCUMENT_CATEGORIES = new Set(['PAGO', 'CONTRATO', 'LEGAL']);

export interface OpportunityFlowSnapshot {
  readonly opportunity: CrmOportunidad;
  readonly negotiations: readonly OpportunityNegotiationRecord[];
  readonly payments: readonly OpportunityPaymentRecord[];
  readonly documents?: readonly OpportunityDocumentRecord[];
  readonly quotes?: readonly Cotizacion[];
  readonly now?: Date;
}

export interface OpportunityRequirementSnapshot {
  readonly contactName: string;
  readonly estimatedAmount: number;
  readonly requirements: readonly OpportunityRequirementRecord[];
  readonly quotes: readonly Cotizacion[];
}

export interface NegotiationQuoteDecision {
  readonly label: string;
  readonly tone: 'accepted' | 'adjustment' | 'rejected' | 'waiting';
}

export interface OpportunityFlowViewState {
  readonly financialSummary: OpportunityFinancialSummary;
  readonly financialStatusLabel: string;
  readonly financialStatusTone: OpportunityFinancialStatusTone;
  readonly paymentPlan: CrmPaymentPlan;
  readonly hasFinalAgreement: boolean;
  readonly canCloseWon: boolean;
  readonly requiredPaymentRegistered: boolean;
  readonly saleClosureChecklist: readonly OpportunityChecklistItem[];
  readonly canCloseSale: boolean;
  readonly isSaleClosed: boolean;
}

export function isFinalAgreement(record: OpportunityNegotiationRecord): boolean {
  return (
    record.clienteConforme ||
    FINAL_AGREEMENT_STATES.has(normalizeStatus(record.estado)) ||
    record.resultado === 'ACEPTA'
  );
}

export function latestFinalAgreement(
  opportunityId: number,
  records: readonly OpportunityNegotiationRecord[],
): OpportunityNegotiationRecord | null {
  return (
    records
      .filter((record) => record.oportunidadId === opportunityId && isFinalAgreement(record))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null
  );
}

export function buildOpportunityFinancialSummary(
  opportunity: CrmOportunidad,
  agreement: OpportunityNegotiationRecord | null,
  records: readonly OpportunityPaymentRecord[],
  now = new Date(),
): OpportunityFinancialSummary {
  const agreedTotal = Number(agreement?.precioFinal || 0);
  const total = Math.max(
    0,
    Number(agreedTotal || opportunity.montoReal || opportunity.montoEstimado || 0),
  );
  const registeredPaid = paidPayments(records).reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.monto || 0)),
    0,
  );
  const paid = Math.min(total, registeredPaid);
  const pending = Math.max(0, total - paid);
  const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
  const closeTimestamp = Date.parse(opportunity.fechaCierreEstimada || '');
  const overdue = Number.isFinite(closeTimestamp) && pending > 0 && closeTimestamp < now.getTime();
  const status =
    pending <= 0 && total > 0 ? 'PAGADO' : paid > 0 ? 'PARCIAL' : overdue ? 'VENCIDO' : 'PENDIENTE';

  return { total, paid, pending, percent, status };
}

export function buildOpportunityPaymentPlan(
  opportunity: CrmOportunidad,
  agreement: OpportunityNegotiationRecord | null,
  records: readonly OpportunityPaymentRecord[],
  now = new Date(),
): CrmPaymentPlan {
  const opportunityPayments = records.filter((payment) => payment.oportunidadId === opportunity.id);
  const installmentPayments = opportunityPayments.filter((payment) => payment.tipo === 'CUOTA');
  const cuotas = Math.max(1, Number(agreement?.cuotas || 1), installmentPayments.length);
  const paymentMode = normalizeText(agreement?.formaPago);
  const isCredit =
    cuotas > 1 || installmentPayments.length > 0 || /CREDITO|CUOTA|FINAN/.test(paymentMode);
  const paid = paidPayments(opportunityPayments);
  const pending = pendingInstallments(opportunityPayments);
  const overdue = pending.filter(
    (payment) => payment.estado === 'VENCIDO' || isOverdue(payment.fecha, now),
  );
  const money = buildOpportunityFinancialSummary(opportunity, agreement, opportunityPayments, now);
  const paidAmount = paid.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.monto || 0)),
    0,
  );
  const scheduledAmount = pending.reduce(
    (sum, payment) => sum + Math.max(0, Number(payment.monto || 0)),
    0,
  );
  const requiredInitialAmount = isCredit
    ? Math.round((money.total / cuotas) * 100) / 100
    : money.total;
  const hasPaymentProof = paid.some(
    (payment) =>
      payment.estado === 'PAGADO' && Boolean(payment.archivoDataUrl || payment.archivoNombre),
  );
  const expectedPendingInstallments = isCredit ? Math.max(0, cuotas - 1) : 0;
  const remainingProgrammed =
    !isCredit ||
    (pending.length >= expectedPendingInstallments && scheduledAmount + 0.01 >= money.pending);

  return {
    isCredit,
    cuotas,
    paidPayments: paid,
    pendingInstallments: pending,
    overdueInstallments: overdue,
    paidAmount,
    pendingAmount: money.pending,
    scheduledAmount,
    requiredInitialAmount,
    firstPaymentDone: paidAmount + 0.01 >= requiredInitialAmount,
    hasPaymentProof,
    remainingProgrammed,
    paymentModeLabel: isCredit ? `Credito ${cuotas} cuota(s)` : 'Contado',
  };
}

export function buildOpportunityFlowViewState(
  snapshot: OpportunityFlowSnapshot,
  isSaleClosed: boolean,
): OpportunityFlowViewState {
  const agreement = latestFinalAgreement(snapshot.opportunity.id, snapshot.negotiations);
  const financialSummary = buildOpportunityFinancialSummary(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const paymentPlan = buildOpportunityPaymentPlan(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const saleClosureChecklist = buildSaleClosureChecklist(snapshot);

  return {
    financialSummary,
    financialStatusLabel: humanize(financialSummary.status),
    financialStatusTone: opportunityFinancialStatusTone(financialSummary.status),
    paymentPlan,
    hasFinalAgreement: Boolean(agreement),
    canCloseWon: canCloseWon(snapshot),
    requiredPaymentRegistered: isRequiredClosurePaymentRegistered(snapshot),
    saleClosureChecklist,
    canCloseSale: saleClosureChecklist.every((check) => check.done),
    isSaleClosed,
  };
}

export function canCloseWon(snapshot: OpportunityFlowSnapshot): boolean {
  const agreement = latestFinalAgreement(snapshot.opportunity.id, snapshot.negotiations);
  if (!agreement) {
    return false;
  }
  const money = buildOpportunityFinancialSummary(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const plan = buildOpportunityPaymentPlan(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  return plan.isCredit
    ? plan.firstPaymentDone && plan.hasPaymentProof && plan.remainingProgrammed
    : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
}

export function isRequiredClosurePaymentRegistered(snapshot: OpportunityFlowSnapshot): boolean {
  const agreement = latestFinalAgreement(snapshot.opportunity.id, snapshot.negotiations);
  const money = buildOpportunityFinancialSummary(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const plan = buildOpportunityPaymentPlan(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  return plan.isCredit
    ? plan.firstPaymentDone && plan.hasPaymentProof
    : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
}

export function buildSaleClosureChecklist(
  snapshot: OpportunityFlowSnapshot,
): OpportunityChecklistItem[] {
  const agreement = latestFinalAgreement(snapshot.opportunity.id, snapshot.negotiations);
  const quotes = (snapshot.quotes ?? []).filter(
    (quote) => Number(quote.crmOportunidadId) === Number(snapshot.opportunity.id),
  );
  const hasFinalQuote =
    quotes.some((quote) => FINAL_QUOTE_STATES.has(quoteStatusValue(quote))) ||
    (quotes.length > 0 && Boolean(agreement));
  const money = buildOpportunityFinancialSummary(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const plan = buildOpportunityPaymentPlan(
    snapshot.opportunity,
    agreement,
    snapshot.payments,
    snapshot.now,
  );
  const hasValidPayment = plan.isCredit
    ? plan.firstPaymentDone && plan.hasPaymentProof && plan.remainingProgrammed
    : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
  const documents = snapshot.documents ?? [];
  const hasAttachedDocument =
    documents.some(
      (document) =>
        document.oportunidadId === snapshot.opportunity.id &&
        CLOSING_DOCUMENT_CATEGORIES.has(document.categoria) &&
        Boolean(document.archivoDataUrl || document.archivoNombre),
    ) ||
    snapshot.payments.some(
      (payment) =>
        payment.oportunidadId === snapshot.opportunity.id &&
        payment.estado === 'PAGADO' &&
        Boolean(payment.archivoDataUrl || payment.archivoNombre),
    );

  return [
    { label: 'Acuerdo final aceptado por el cliente', done: Boolean(agreement) },
    { label: 'Cotizacion final aceptada y vinculada', done: hasFinalQuote },
    {
      label: plan.isCredit
        ? 'Primera cuota pagada y cuotas restantes programadas'
        : 'Pago completo conciliado sin saldo pendiente',
      done: hasValidPayment,
    },
    { label: 'Voucher, contrato o documento legal adjunto', done: hasAttachedDocument },
  ];
}

export function buildOpportunityRequirementChecklist(
  snapshot: OpportunityRequirementSnapshot,
): OpportunityChecklistItem[] {
  const hasContact = Boolean(snapshot.contactName) && snapshot.contactName !== 'Sin contacto';
  const hasNamedOffer = snapshot.requirements.some((requirement) =>
    Boolean(requirement.nombre.trim()),
  );
  const hasQuantity = snapshot.requirements.every(
    (requirement) => Number(requirement.cantidad || 0) > 0,
  );
  const hasValue =
    snapshot.requirements.every((requirement) => Number(requirement.precioUnitario || 0) > 0) ||
    Number(snapshot.estimatedAmount || 0) > 0;
  const hasSentQuote = snapshot.quotes.some((quote) =>
    SENT_QUOTE_STATES.has(quoteStatusValue(quote)),
  );

  return [
    { label: 'Cliente definido', done: hasContact },
    { label: 'Curso definido', done: hasNamedOffer },
    { label: 'Vacantes definidas', done: hasQuantity },
    { label: 'Valor estimado', done: hasValue },
    { label: 'Cotizacion creada', done: snapshot.quotes.length > 0 },
    { label: 'Cotizacion enviada', done: hasSentQuote },
  ];
}

export function opportunityFinancialStatusTone(
  status: OpportunityFinancialSummary['status'],
): OpportunityFinancialStatusTone {
  if (status === 'PAGADO') return 'paid';
  if (status === 'PARCIAL') return 'partial';
  if (status === 'VENCIDO') return 'overdue';
  return 'pending';
}

export function opportunityStatusTone(
  opportunity: CrmOportunidad,
  active: boolean,
): OpportunityStatusTone {
  if (opportunity.estado === 'GANADA' || opportunity.etapa === 'GANADO') return 'won';
  if (opportunity.estado === 'PERDIDA' || opportunity.etapa === 'PERDIDO') return 'lost';
  return active ? 'active' : 'neutral';
}

export function quoteStatusValue(quote: Cotizacion): string {
  return normalizeStatus(quote.estado || 'BORRADOR');
}

export function quoteStatusLabel(quote: Cotizacion): string {
  const labels: Record<string, string> = {
    BORRADOR: 'Borrador',
    ENVIADA: 'Enviada',
    EN_SEGUIMIENTO: 'En seguimiento',
    ACEPTADA: 'Aceptada',
    RECHAZADA: 'Rechazada',
    NEGOCIACION: 'Negociacion',
    VENCIDA: 'Vencida',
    CONVERTIDA: 'Convertida',
  };
  return labels[quoteStatusValue(quote)] ?? humanize(quote.estado);
}

export function quoteStatusTone(quote: Cotizacion): 'pending' | 'accepted' | 'rejected' {
  const status = quoteStatusValue(quote);
  if (['ACEPTADA', 'NEGOCIACION', 'CONVERTIDA'].includes(status)) return 'accepted';
  return status === 'RECHAZADA' ? 'rejected' : 'pending';
}

export function resolveNegotiationQuoteDecision(
  quote: Cotizacion,
  records: readonly OpportunityNegotiationRecord[],
): NegotiationQuoteDecision {
  const quoteCode = `COT-${String(quote.id).padStart(3, '0')}`.toUpperCase();
  const negotiation =
    records
      .filter(
        (record) =>
          Number(record.cotizacionId) === Number(quote.id) ||
          String(record.codigoCotizacion || '').toUpperCase() === quoteCode,
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;

  if (negotiation?.resultado === 'ACEPTA' || negotiation?.clienteConforme) {
    return { label: 'Cotizacion aceptada', tone: 'accepted' };
  }
  if (negotiation?.resultado === 'RECHAZA') {
    return { label: 'Cotizacion rechazada', tone: 'rejected' };
  }
  if (negotiation?.resultado === 'PENDIENTE') {
    return { label: 'Ajuste solicitado', tone: 'adjustment' };
  }

  const status = quoteStatusValue(quote);
  if (['ACEPTADA', 'CONVERTIDA'].includes(status)) {
    return { label: 'Cotizacion aceptada', tone: 'accepted' };
  }
  if (status === 'RECHAZADA') {
    return { label: 'Cotizacion rechazada', tone: 'rejected' };
  }
  if (status === 'NEGOCIACION') {
    return { label: 'Ajuste solicitado', tone: 'adjustment' };
  }
  if (
    status === 'BORRADOR' &&
    String(quote.observacion || '')
      .toLowerCase()
      .includes('ajuste comercial')
  ) {
    return { label: 'Ajuste pendiente de envio', tone: 'adjustment' };
  }
  return { label: 'Esperando respuesta', tone: 'waiting' };
}

function paidPayments(records: readonly OpportunityPaymentRecord[]): OpportunityPaymentRecord[] {
  return records.filter((payment) => ['PAGADO', 'PARCIAL'].includes(payment.estado));
}

function pendingInstallments(
  records: readonly OpportunityPaymentRecord[],
): OpportunityPaymentRecord[] {
  return records.filter(
    (payment) =>
      payment.tipo === 'CUOTA' && ['PENDIENTE', 'PARCIAL', 'VENCIDO'].includes(payment.estado),
  );
}

function isOverdue(value: string | null | undefined, now: Date): boolean {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) && timestamp < now.getTime();
}

function normalizeStatus(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toUpperCase();
}

function normalizeText(value: string | null | undefined): string {
  return normalizeStatus(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function humanize(value: string | null | undefined): string {
  return String(value || '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

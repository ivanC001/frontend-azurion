import type {
  CrmActividad,
  CrmCanalTokenConfig,
  CrmCurrencyConfig,
  CrmOportunidad,
  CrmProspecto,
} from '@features/crm/data/crm-api.types';
import type { CatalogOpportunityType } from './catalog-registration.model';
import type { CrmPaymentDraft, CrmPaymentRecord } from './payment.model';

export type CrmTab =
  | 'dashboard'
  | 'captacion'
  | 'seguimiento'
  | 'embudo'
  | 'oportunidades'
  | 'cotizaciones'
  | 'negociacion'
  | 'clientes'
  | 'seguimientoPagos'
  | 'catalogo'
  | 'administracion'
  | 'administracionGeneral'
  | 'administracionCanales'
  | 'administracionCorreo'
  | 'administracionMonedas'
  | 'administracionPromociones';
export type OpportunityDetailTab =
  | 'resumen'
  | 'actividades'
  | 'pipeline'
  | 'cotizaciones'
  | 'negociacion'
  | 'cierre'
  | 'pagos'
  | 'documentos'
  | 'historial';
export type DialogType =
  'prospecto' | 'oportunidad' | 'actividad' | 'cotizacion' | 'catalogo' | null;
export type CatalogStep = 'select' | 'form';
export type OpportunityView = 'ABIERTAS' | 'COTIZADAS' | 'NEGOCIACION' | 'GANADAS';
export type CrmIntegrationField =
  | 'nombre'
  | 'accessToken'
  | 'verifyToken'
  | 'webhookUrl'
  | 'appId'
  | 'appSecret'
  | 'phoneNumberId'
  | 'wabaId'
  | 'metadataJson';
export type CrmCurrencyField =
  'nombre' | 'simbolo' | 'tipoCambioBase' | 'margenConversionPorcentaje';
export const DEFAULT_CRM_INTEGRATIONS: readonly CrmCanalTokenConfig[] = [
  { canal: 'WEB', nombre: 'Landing web', activo: false },
  { canal: 'WHATSAPP', nombre: 'WhatsApp Business', activo: false },
  { canal: 'INSTAGRAM', nombre: 'Instagram', activo: false },
  { canal: 'FACEBOOK', nombre: 'Facebook Lead Ads', activo: false },
];
export const DEFAULT_CRM_CURRENCIES: readonly CrmCurrencyConfig[] = [
  {
    moneda: 'USD',
    nombre: 'Dólar americano',
    simbolo: '$',
    tipoCambioBase: 3.8,
    margenConversionPorcentaje: 0,
    tipoCambioVenta: 3.8,
    activo: false,
  },
  {
    moneda: 'EUR',
    nombre: 'Euro',
    simbolo: '€',
    tipoCambioBase: 4.1,
    margenConversionPorcentaje: 0,
    tipoCambioVenta: 4.1,
    activo: false,
  },
];
export const CRM_ACTIVE_PIPELINE_STAGES = new Set<string>([
  'INTERESADO',
  'COTIZADO',
  'NEGOCIACION',
]);
export const CRM_INITIAL_PAGE_SIZE = 100;
export type FollowUpFilter =
  | 'TODAS'
  | 'MIS'
  | 'PENDIENTES'
  | 'HOY'
  | 'VENCIDAS'
  | 'SIN_ACTIVIDAD'
  | 'LLAMADAS'
  | 'VISITAS'
  | 'CORREOS';
export type OpportunityType = CatalogOpportunityType;

export interface ProspectForm {
  id: number | null;
  tipoPersona: string;
  paisCodigo: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  razonSocial: string;
  nombreComercial: string;
  telefonoPaisCodigo: string;
  telefonoCodigoPais: string;
  telefono: string;
  correo: string;
  direccion: string;
  origen: string;
  canalIngreso: string;
  campania: string;
  landingUrl: string;
  mensaje: string;
  estado: string;
  responsableId: string;
  observacion: string;
  tipoInteres: OpportunityType;
  interesPrincipal: string;
  interesDetalle: string;
  presupuestoEstimado: number;
  fechaInteres: string;
  catalogoItemId: number | null;
  metadataJson: string;
}

export interface OpportunityForm {
  id: number | null;
  prospectoId: number | null;
  clienteId: number | null;
  tipoOportunidad: OpportunityType;
  titulo: string;
  descripcion: string;
  detallePrincipal: string;
  detalleSecundario: string;
  ubicacion: string;
  fechaObjetivo: string;
  cantidad: number;
  montoEstimado: number;
  probabilidad: number;
  etapa: string;
  fechaCierreEstimada: string;
  responsableId: string;
  catalogoItemId: number | null;
  proximaAccion: string;
  fechaProximaAccion: string;
}

export interface CrmLocalConfig {
  cierreEstimadoDias: number;
}

export interface CatalogoForm {
  id: number | null;
  tipoItem: OpportunityType;
  nombre: string;
  descripcion: string;
  precioReferencial: number;
  moneda: string;
  estado: string;
  metadataJson: string;
  publicEnabled: boolean;
  landingSlug: string;
  atributos: Record<string, string | number | null>;
}

export interface OpportunityMessageTemplate {
  id: string;
  channel: 'WHATSAPP' | 'CORREO' | 'AUDIO';
  title: string;
  body: string;
  audioName?: string | null;
  audioDataUrl?: string | null;
}

export interface OpportunityRequirementRecord {
  id: string;
  oportunidadId: number;
  catalogoItemId: number | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  observacion: string;
  createdAt: string;
}

export interface OpportunityRequirementForm {
  id: string | null;
  catalogoItemId: number | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  observacion: string;
}

export interface OpportunityNegotiationRecord {
  id: string | number;
  oportunidadId: number;
  cotizacionId?: number | null;
  codigoCotizacion?: string | null;
  estado?: string;
  precioOriginal?: number;
  precioFinal: number;
  descuento: number;
  promocion: string;
  formaPago: string;
  cuotas: number;
  fechaInicio: string;
  fechaEntrega: string;
  objecion: string;
  resultado: 'ACEPTA' | 'PENDIENTE' | 'RECHAZA';
  clienteConforme: boolean;
  procedePago: boolean;
  observacion: string;
  createdAt: string;
  usuarioNombre?: string | null;
}

export interface OpportunityNegotiationForm {
  id: string | null;
  cotizacionId: number | null;
  estado: string;
  precioOriginal: number;
  precioFinal: number;
  descuento: number;
  promocion: string;
  formaPago: string;
  cuotas: number;
  fechaInicio: string;
  fechaEntrega: string;
  objecion: string;
  resultado: 'ACEPTA' | 'PENDIENTE' | 'RECHAZA';
  clienteConforme: boolean;
  procedePago: boolean;
  observacion: string;
}

export type OpportunityPaymentRecord = CrmPaymentRecord;

export type OpportunityPaymentForm = CrmPaymentDraft;

export interface OpportunityDocumentRecord {
  id: string;
  oportunidadId: number;
  categoria: 'CONTRATO' | 'PROPUESTA' | 'PAGO' | 'LEGAL' | 'OTRO';
  nombre: string;
  descripcion: string;
  archivoNombre: string;
  archivoDataUrl: string;
  mimeType: string;
  createdAt: string;
}

export interface OpportunityDocumentForm {
  id: string | null;
  categoria: 'CONTRATO' | 'PROPUESTA' | 'PAGO' | 'LEGAL' | 'OTRO';
  nombre: string;
  descripcion: string;
  archivoNombre: string;
  archivoDataUrl: string;
  mimeType: string;
}

export interface OpportunityClosureRecord {
  id: string;
  oportunidadId: number;
  closedAt: string;
  closedBy: string;
}

export interface OpportunityHistoryEvent {
  id: string;
  title: string;
  detail: string;
  date: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate';
}

export interface CrmPageMeta {
  eyebrow: string;
  title: string;
  description: string;
}

export interface CrmSectionTab {
  tab: CrmTab;
  label: string;
  detail: string;
  icon: string;
  route: string;
  count: number;
}

export interface CrmExecutiveKpi {
  label: string;
  value: string;
  detail: string;
  trend: string;
  trendTone: 'up' | 'down';
  icon: string;
  tone: 'money' | 'deals' | 'contacts' | 'conversion';
}

export interface CrmExecutivePipelineRow {
  label: string;
  count: number;
  amount: string;
  color: string;
  percent: number;
}

export interface CrmExecutiveRevenueChart {
  labels: string[];
  guides: Array<{ label: string; y: number }>;
  realPoints: string;
  targetPoints: string;
  areaPoints: string;
}

export interface FollowUpStageCard {
  tab: CrmTab;
  label: string;
  detail: string;
  icon: string;
  count: number;
  tone: 'green' | 'blue' | 'violet' | 'orange' | 'amber' | 'emerald';
}

export interface FollowUpTableTab {
  value: FollowUpFilter;
  label: string;
  count: number;
}

export interface CommercialInboxCard {
  prospecto: CrmProspecto;
  oportunidad?: CrmOportunidad;
  hasActiveOpportunity: boolean;
  lastActivity?: CrmActividad;
  nextActivity?: CrmActividad;
  priority: 'overdue' | 'today' | 'upcoming' | 'done' | 'idle';
  priorityLabel: string;
  interestLabel: string;
  interestTone: 'hot' | 'warm' | 'cold';
  amount: number;
  stageProgress: number;
  qualification: FollowUpQualification;
}

export interface FollowUpQualification {
  score: number;
  temperatura: 'FRIO' | 'TIBIO' | 'CALIENTE';
  label: string;
  canConvert: boolean;
  missing: string[];
  status: 'CALIFICADO' | 'SEGUIR' | 'ESPERA' | 'PERDIDO' | 'CONVERTIDO';
}

export interface CrmStageMetricCard {
  label: string;
  value: string;
  detail: string;
  delta: string;
  danger?: boolean;
}

export interface CrmStagePanel {
  tab: CrmTab;
  index: number;
  title: string;
  detail: string;
  icon: string;
  tone: 'green' | 'violet' | 'amber' | 'teal' | 'blue';
  count: number;
  metrics: CrmStageMetricCard[];
  items: CrmOportunidad[];
  tableTitle: string;
  tableAction: string;
  emptyMessage: string;
}

export type StageValidationMode = 'STRICT' | 'WARNING' | 'FREE';
export type StageRequirementAction = 'activity' | 'quote' | 'lost' | 'detail' | null;

export interface PipelineStageOption {
  label: string;
  value: string;
  id: number | null;
  color: string;
  descripcion?: string | null;
  probabilidadDefault?: number | null;
  icono?: string | null;
  requiereValidacion?: boolean | null;
  modoValidacion?: string | null;
}

export interface PipelineChecklistItem {
  code: string;
  label: string;
  description: string;
  required: boolean;
  done: boolean;
  action: StageRequirementAction;
}

export interface StageMoveReview {
  opportunity: CrmOportunidad;
  target: PipelineStageOption;
  objective: string;
  mode: StageValidationMode;
  checklist: PipelineChecklistItem[];
  errors: string[];
  warnings: string[];
  canContinue: boolean;
}

export interface ActivityForm {
  id: number | null;
  prospectoId: number | null;
  oportunidadId: number | null;
  clienteId: number | null;
  tipoActividad: string;
  estadoActividad: 'PENDIENTE' | 'REALIZADA';
  resultadoContacto: string;
  nivelInteres: string;
  nuevoEstadoProspecto: string;
  asunto: string;
  descripcion: string;
  fechaProgramada: string;
  usuarioId: string;
  programarSiguiente: boolean;
  siguienteTipoActividad: string;
  siguienteFechaProgramada: string;
  siguienteAsunto: string;
  siguienteDescripcion: string;
}

export interface ActivityContext {
  type: 'PROSPECTO' | 'OPORTUNIDAD';
  title: string;
  subtitle: string;
  detail: string;
  icon: string;
}

export interface LossDialogState {
  type: 'PROSPECTO' | 'OPORTUNIDAD';
  prospecto?: CrmProspecto;
  oportunidad?: CrmOportunidad;
}

export interface QuoteLineForm {
  catalogoItemId: number | null;
  productoId: number | null;
  promocionId: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

export interface QuoteForm {
  oportunidadId: number | null;
  clienteId: number | null;
  sucursalId: number | null;
  moneda: string;
  fechaVencimiento: string;
  observacion: string;
  detalles: QuoteLineForm[];
}

export interface LegacyOpportunityRecords {
  requirements: OpportunityRequirementRecord[];
  payments: OpportunityPaymentRecord[];
  documents: OpportunityDocumentRecord[];
  closures: OpportunityClosureRecord[];
}

export interface PromotionForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoDescuento: 'MONTO' | 'PORCENTAJE';
  valor: number;
  fechaInicio: string;
  fechaFin: string;
}

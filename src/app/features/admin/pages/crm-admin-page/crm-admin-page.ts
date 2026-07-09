import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { AuthSessionService } from '@core/auth/auth-session.service';
import {
  AdminSaasApiService,
  Cliente,
  Cotizacion,
  CotizacionDetalle,
  CrmActividad,
  CrmCanalTokenConfig,
  CrmCatalogoItem,
  CrmDashboard,
  CrmEtapaPipeline,
  CrmNegociacion,
  CrmOportunidad,
  CrmProspecto,
  CreateCrmNegociacionRequest,
  PromocionCotizacion,
  Producto,
  Sucursal,
  UpdateCrmCanalTokenConfigRequest,
  UsuarioTenant,
} from '../../data/admin-saas-api.service';

type CrmTab =
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
  | 'administracion';
type OpportunityDetailTab =
  | 'resumen'
  | 'actividades'
  | 'pipeline'
  | 'cotizaciones'
  | 'negociacion'
  | 'cierre'
  | 'pagos'
  | 'documentos'
  | 'historial';
type DialogType = 'prospecto' | 'oportunidad' | 'actividad' | 'cotizacion' | 'etapa' | 'catalogo' | null;
type CatalogStep = 'select' | 'form';
type OpportunityView = 'ABIERTAS' | 'COTIZADAS' | 'NEGOCIACION' | 'GANADAS';
type CrmIntegrationField = 'nombre' | 'accessToken' | 'verifyToken' | 'webhookUrl' | 'appId' | 'phoneNumberId' | 'metadataJson';
const CRM_OPPORTUNITY_FLOW_STAGES = ['INTERESADO', 'COTIZADO', 'NEGOCIACION', 'GANADO', 'PERDIDO'] as const;
type FollowUpFilter =
  | 'TODAS'
  | 'MIS'
  | 'PENDIENTES'
  | 'HOY'
  | 'VENCIDAS'
  | 'SIN_ACTIVIDAD'
  | 'LLAMADAS'
  | 'VISITAS'
  | 'CORREOS';
type OpportunityType =
  | 'PRODUCTO'
  | 'SERVICIO'
  | 'VEHICULO'
  | 'INMUEBLE'
  | 'PROYECTO'
  | 'CURSO'
  | 'SEGURO'
  | 'SOFTWARE'
  | 'MARKETING'
  | 'CLINICA'
  | 'JURIDICO'
  | 'TURISMO'
  | 'MAQUINARIA'
  | 'FINANCIERO'
  | 'EDUCACION'
  | 'HOSPITALIDAD'
  | 'MANUFACTURA'
  | 'TELECOMUNICACION'
  | 'ENERGIA'
  | 'AGRICULTURA'
  | 'CONSULTORIA'
  | 'OTRO';

interface ProspectForm {
  id: number | null;
  tipoPersona: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombre: string;
  razonSocial: string;
  nombreComercial: string;
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

interface OpportunityForm {
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
}

interface CrmLocalConfig {
  cierreEstimadoDias: number;
}

interface CatalogoForm {
  id: number | null;
  tipoItem: OpportunityType;
  nombre: string;
  descripcion: string;
  precioReferencial: number;
  estado: string;
  metadataJson: string;
  publicEnabled: boolean;
  landingSlug: string;
  atributos: Record<string, string | number | null>;
}

interface CatalogField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'number' | 'date';
}

interface OpportunityViewOption {
  value: OpportunityView;
  label: string;
  detail: string;
  count: number;
}

interface OpportunitySummaryCard {
  label: string;
  value: string;
  delta: string;
  detail: string;
  icon: string;
  tone: 'blue' | 'violet' | 'green' | 'amber' | 'teal';
}

interface OpportunityMessageTemplate {
  id: string;
  channel: 'WHATSAPP' | 'CORREO' | 'AUDIO';
  title: string;
  body: string;
  audioName?: string | null;
  audioDataUrl?: string | null;
}

interface OpportunityMessageTemplateForm {
  id: string | null;
  channel: 'WHATSAPP' | 'CORREO' | 'AUDIO';
  title: string;
  body: string;
  audioName: string;
  audioDataUrl: string;
}

interface OpportunityRequirementRecord {
  id: string;
  oportunidadId: number;
  catalogoItemId: number | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  observacion: string;
  createdAt: string;
}

interface OpportunityRequirementForm {
  id: string | null;
  catalogoItemId: number | null;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  observacion: string;
}

interface OpportunityNegotiationRecord {
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

interface OpportunityNegotiationForm {
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

interface OpportunityPaymentRecord {
  id: string;
  oportunidadId: number;
  fecha: string;
  tipo: 'FACTURA' | 'BOLETA' | 'TICKET' | 'VOUCHER' | 'CUOTA' | 'OTRO';
  monto: number;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
  metodo: string;
  observacion: string;
  archivoNombre: string;
  archivoDataUrl: string;
  createdAt: string;
}

interface OpportunityPaymentForm {
  id: string | null;
  fecha: string;
  tipo: 'FACTURA' | 'BOLETA' | 'TICKET' | 'VOUCHER' | 'CUOTA' | 'OTRO';
  monto: number;
  estado: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
  metodo: string;
  observacion: string;
  archivoNombre: string;
  archivoDataUrl: string;
}

interface OpportunityDocumentRecord {
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

interface OpportunityDocumentForm {
  id: string | null;
  categoria: 'CONTRATO' | 'PROPUESTA' | 'PAGO' | 'LEGAL' | 'OTRO';
  nombre: string;
  descripcion: string;
  archivoNombre: string;
  archivoDataUrl: string;
  mimeType: string;
}

interface OpportunityClosureRecord {
  id: string;
  oportunidadId: number;
  closedAt: string;
  closedBy: string;
}

interface OpportunityHistoryEvent {
  id: string;
  title: string;
  detail: string;
  date: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate';
}

interface CrmDashboardMetricCard {
  label: string;
  value: number;
  detail: string;
  icon: string;
  tone: 'blue' | 'green' | 'violet' | 'amber' | 'teal' | 'slate';
  prefix?: string;
}

interface CrmPageMeta {
  eyebrow: string;
  title: string;
  description: string;
}

interface CrmSectionTab {
  tab: CrmTab;
  label: string;
  detail: string;
  icon: string;
  route: string;
  count: number;
}

interface CrmProcessCard {
  tab: CrmTab;
  label: string;
  detail: string;
  icon: string;
  count: number;
  amount: number;
  conversion: number;
  tone: 'blue' | 'green' | 'violet' | 'amber' | 'teal' | 'slate';
}

interface CrmLeadSourceSlice {
  code: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

interface CrmExecutiveKpi {
  label: string;
  value: string;
  detail: string;
  trend: string;
  trendTone: 'up' | 'down';
  icon: string;
  tone: 'money' | 'deals' | 'contacts' | 'conversion';
}

interface CrmExecutivePipelineRow {
  label: string;
  count: number;
  amount: string;
  color: string;
  percent: number;
}

interface CrmExecutiveRevenueChart {
  labels: string[];
  guides: Array<{ label: string; y: number }>;
  realPoints: string;
  targetPoints: string;
  areaPoints: string;
}

interface CrmConversionItem {
  label: string;
  converted: number;
  total: number;
  rate: number;
  detail: string;
}

interface CrmRecentEvent {
  title: string;
  subtitle: string;
  timestamp: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'violet';
}

interface CrmTaskCard {
  title: string;
  subtitle: string;
  dueAt: string;
  tone: 'high' | 'medium' | 'low';
  toneLabel: string;
}

interface FollowUpStatCard {
  label: string;
  value: number;
  detail: string;
  tone: 'blue' | 'red' | 'amber' | 'green';
}

interface FollowUpFilterOption {
  value: FollowUpFilter;
  label: string;
  icon: string;
  count: number;
}

interface FollowUpStageCard {
  tab: CrmTab;
  label: string;
  detail: string;
  icon: string;
  count: number;
  tone: 'green' | 'blue' | 'violet' | 'orange' | 'amber' | 'emerald';
}

interface FollowUpTableTab {
  value: FollowUpFilter;
  label: string;
  count: number;
}

interface CommercialInboxCard {
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

interface FollowUpQualification {
  score: number;
  temperatura: 'FRIO' | 'TIBIO' | 'CALIENTE';
  label: string;
  canConvert: boolean;
  missing: string[];
  status: 'CALIFICADO' | 'SEGUIR' | 'ESPERA' | 'PERDIDO' | 'CONVERTIDO';
}

interface FollowUpTimelineEvent {
  title: string;
  subtitle: string;
  date: string;
  icon: string;
  tone: 'blue' | 'green' | 'amber' | 'red' | 'slate';
}

interface ProspectMetricCard {
  label: string;
  value: string;
  delta: string;
  detail: string;
}

interface CrmStageMetricCard {
  label: string;
  value: string;
  detail: string;
  delta: string;
  danger?: boolean;
}

interface CrmStagePanel {
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

type StageValidationMode = 'STRICT' | 'WARNING' | 'FREE';
type StageRequirementAction = 'activity' | 'quote' | 'lost' | 'detail' | null;

interface PipelineStageOption {
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

interface PipelineChecklistItem {
  code: string;
  label: string;
  description: string;
  required: boolean;
  done: boolean;
  action: StageRequirementAction;
}

interface StageMoveReview {
  opportunity: CrmOportunidad;
  target: PipelineStageOption;
  objective: string;
  mode: StageValidationMode;
  checklist: PipelineChecklistItem[];
  errors: string[];
  warnings: string[];
  canContinue: boolean;
}

interface StageForm {
  codigo: string;
  nombre: string;
  orden: number;
  color: string;
  ganado: boolean;
  perdido: boolean;
}

interface ActivityForm {
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

interface ActivityContext {
  type: 'PROSPECTO' | 'OPORTUNIDAD';
  title: string;
  subtitle: string;
  detail: string;
  icon: string;
}

interface LossDialogState {
  type: 'PROSPECTO' | 'OPORTUNIDAD';
  prospecto?: CrmProspecto;
  oportunidad?: CrmOportunidad;
}

interface QuoteLineForm {
  catalogoItemId: number | null;
  productoId: number | null;
  promocionId: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
}

interface QuoteForm {
  oportunidadId: number | null;
  clienteId: number | null;
  sucursalId: number | null;
  fechaVencimiento: string;
  observacion: string;
  detalles: QuoteLineForm[];
}

interface PromotionForm {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipoDescuento: 'MONTO' | 'PORCENTAJE';
  valor: number;
  fechaInicio: string;
  fechaFin: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-admin-page',
  imports: [
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    RouterLink,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
  ],
  templateUrl: './crm-admin-page.html',
  styleUrl: './crm-admin-page.scss',
})
export class CrmAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly auth = inject(AuthSessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly prospectos = signal<CrmProspecto[]>([]);
  protected readonly oportunidades = signal<CrmOportunidad[]>([]);
  protected readonly actividades = signal<CrmActividad[]>([]);
  protected readonly etapas = signal<CrmEtapaPipeline[]>([]);
  protected readonly catalogoItems = signal<CrmCatalogoItem[]>([]);
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly usuarios = signal<UsuarioTenant[]>([]);
  protected readonly cotizaciones = signal<Cotizacion[]>([]);
  protected readonly promocionesCotizacion = signal<PromocionCotizacion[]>([]);
  protected readonly crmIntegraciones = signal<CrmCanalTokenConfig[]>([]);
  protected readonly dashboard = signal<CrmDashboard | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly integrationSaving = signal<string | null>(null);
  protected readonly activeTab = signal<CrmTab>('dashboard');
  protected readonly opportunityView = signal<OpportunityView>('ABIERTAS');
  protected readonly activeDialog = signal<DialogType>(null);
  protected readonly catalogDrawerOpen = signal(false);
  protected readonly catalogStep = signal<CatalogStep>('select');
  protected readonly query = signal('');
  protected readonly prospectEstadoFilter = signal('TODOS');
  protected readonly prospectOrigenFilter = signal('TODOS');
  protected readonly prospectCampaniaFilter = signal('TODOS');
  protected readonly prospectAsesorFilter = signal('TODOS');
  protected readonly prospectDateFrom = signal('');
  protected readonly prospectDateTo = signal('');
  protected readonly showProspectFilters = signal(false);
  protected readonly prospectDistributionDialogOpen = signal(false);
  protected readonly prospectDistributionSelectedSellerIds = signal<string[]>([]);
  protected readonly selectedProspectIds = signal<Set<number>>(new Set());
  protected readonly prospectPage = signal(0);
  protected readonly clientPage = signal(0);
  protected readonly opportunityStageFilter = signal<string | null>(null);
  protected readonly opportunityResponsibleFilter = signal<string | null>(null);
  protected readonly opportunityStatusFilter = signal<string | null>('ABIERTA');
  protected readonly showOpportunityFilters = signal(false);
  protected readonly showClientFilters = signal(false);
  protected readonly clientOutcomeFilter = signal('TODOS');
  protected readonly opportunityDetailOpen = signal(false);
  protected readonly stageMoveReview = signal<StageMoveReview | null>(null);
  protected readonly stageMoveComment = signal('');
  protected readonly followUpFilter = signal<FollowUpFilter>('TODAS');
  protected readonly followUpContactFilter = signal('TODOS');
  protected readonly followUpResponsibleFilter = signal('TODOS');
  protected readonly followUpOriginFilter = signal('TODOS');
  protected readonly followUpInterestFilter = signal('TODOS');
  protected readonly followUpDateFilter = signal('TODOS');
  protected readonly showFollowUpFilters = signal(false);
  protected readonly selectedFollowUpProspectId = signal<number | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly selectedOpportunity = signal<CrmOportunidad | null>(null);
  protected readonly opportunityDetailTab = signal<OpportunityDetailTab>('resumen');
  protected readonly opportunityMessageTemplates = signal<OpportunityMessageTemplate[]>(this.loadOpportunityMessageTemplates());
  protected readonly opportunityRequirementRecords = signal<OpportunityRequirementRecord[]>(this.loadOpportunityRecords<OpportunityRequirementRecord>(this.opportunityRequirementStorageKey()));
  protected readonly opportunityNegotiationRecords = signal<OpportunityNegotiationRecord[]>(this.loadOpportunityRecords<OpportunityNegotiationRecord>(this.opportunityNegotiationStorageKey()));
  protected readonly opportunityPaymentRecords = signal<OpportunityPaymentRecord[]>(this.loadOpportunityRecords<OpportunityPaymentRecord>(this.opportunityPaymentStorageKey()));
  protected readonly opportunityDocumentRecords = signal<OpportunityDocumentRecord[]>(this.loadOpportunityRecords<OpportunityDocumentRecord>(this.opportunityDocumentStorageKey()));
  protected readonly opportunityClosureRecords = signal<OpportunityClosureRecord[]>(this.loadOpportunityRecords<OpportunityClosureRecord>(this.opportunityClosureStorageKey()));
  protected readonly opportunityRequirementDialogOpen = signal(false);
  protected readonly opportunityNegotiationDialogOpen = signal(false);
  protected readonly opportunityPaymentDialogOpen = signal(false);
  protected readonly opportunityDocumentDialogOpen = signal(false);
  protected readonly activityContext = signal<ActivityContext | null>(null);
  protected readonly lossDialog = signal<LossDialogState | null>(null);
  protected readonly lossReason = signal('');
  protected readonly lossObservation = signal('');
  protected readonly actionId = signal<number | null>(null);
  protected readonly crmLocalConfig = signal<CrmLocalConfig>(this.loadCrmLocalConfig());
  protected readonly canManageCrmConfig = computed(() => this.hasCrmPermission('CRM_CONFIG_MANAGE', 'CRM_PIPELINE_MANAGE'));
  protected readonly canManageCrmCatalog = computed(() => this.hasCrmPermission('CRM_CATALOG_MANAGE', 'CRM_CONFIG_MANAGE'));
  protected readonly canMoveCrmOpportunities = computed(() => this.hasCrmPermission('CRM_OPPORTUNITIES_STAGE', 'CRM_PIPELINE_WRITE', 'CRM_OPPORTUNITY_MOVE_STAGE'));
  protected readonly canCloseCrmOpportunities = computed(() => this.hasCrmPermission('CRM_OPPORTUNITIES_CLOSE', 'CRM_CONVERT_SALE', 'CRM_OPPORTUNITY_MARK_WON', 'CRM_OPPORTUNITY_MARK_LOST'));
  protected readonly canCreateCrmQuotes = computed(() => this.hasCrmPermission('CRM_QUOTES_CREATE', 'CRM_CONVERT_SALE'));
  protected readonly canConvertCrmProspects = computed(() => this.hasCrmPermission('CRM_PROSPECTS_CONVERT', 'CRM_CONVERT_CLIENT'));
  protected readonly canAssignCrmProspects = computed(() => this.hasCrmPermission('CRM_ASSIGN', 'CRM_VIEW_ALL'));
  protected readonly dashboardNow = new Date();

  protected prospectForm: ProspectForm = this.emptyProspectForm();
  protected opportunityForm: OpportunityForm = this.emptyOpportunityForm();
  protected catalogoForm: CatalogoForm = this.emptyCatalogoForm();
  protected activityForm: ActivityForm = this.emptyActivityForm();
  protected quoteForm: QuoteForm = this.emptyQuoteForm();
  protected promotionForm: PromotionForm = this.emptyPromotionForm();
  protected stageForm: StageForm = this.emptyStageForm();
  protected messageTemplateForm: OpportunityMessageTemplateForm = this.emptyMessageTemplateForm();
  protected requirementForm: OpportunityRequirementForm = this.emptyOpportunityRequirementForm();
  protected negotiationForm: OpportunityNegotiationForm = this.emptyOpportunityNegotiationForm();
  protected paymentForm: OpportunityPaymentForm = this.emptyOpportunityPaymentForm();
  protected documentForm: OpportunityDocumentForm = this.emptyOpportunityDocumentForm();

  protected readonly tipoPersonaOptions = [
    { label: 'Persona natural', value: 'NATURAL' },
    { label: 'Empresa', value: 'JURIDICA' },
  ];

  protected readonly documentoOptions = [
    { label: 'DNI', value: '1' },
    { label: 'RUC', value: '6' },
  ];

  protected readonly origenOptions = ['WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'WEB', 'REFERIDO', 'LLAMADA', 'VISITA', 'OTRO'].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly prospectoEstadoOptions = ['NUEVO', 'CONTACTADO', 'EN_ESPERA', 'CALIFICADO', 'PERDIDO', 'CONVERTIDO'].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly canalIngresoOptions = [
    { label: 'Ingreso manual', value: 'MANUAL' },
    { label: 'Landing web', value: 'LANDING' },
    { label: 'Webhook', value: 'WEBHOOK' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Facebook', value: 'FACEBOOK' },
    { label: 'Importado', value: 'IMPORTADO' },
  ];

  protected readonly negotiationResultOptions = [
    { label: 'Acuerdo final / proceder a cierre', value: 'ACEPTA' },
    { label: 'No acepta / pide ajuste', value: 'PENDIENTE' },
    { label: 'Rechaza propuesta', value: 'RECHAZA' },
  ];

  protected readonly negotiationObjectionOptions = ['MEJOR_PRECIO', 'PROMOCION', 'PLAZO', 'FORMA_PAGO', 'CONDICIONES', 'OTRO'].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly negotiationPaymentOptions = [
    { label: 'Contado', value: 'Contado' },
    { label: 'Credito', value: 'Credito' },
  ];

  protected readonly paymentTypeOptions = ['FACTURA', 'BOLETA', 'TICKET', 'VOUCHER', 'CUOTA', 'OTRO'].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly paymentStatusOptions = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO'].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly documentCategoryOptions = [
    { label: 'Contrato', value: 'CONTRATO' },
    { label: 'Propuesta', value: 'PROPUESTA' },
    { label: 'Pago / voucher', value: 'PAGO' },
    { label: 'Documento legal', value: 'LEGAL' },
    { label: 'Otro', value: 'OTRO' },
  ];

  protected readonly opportunityTypeOptions: Array<{
    value: OpportunityType;
    label: string;
    icon: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    locationLabel: string;
    dateLabel: string;
    amountHint: string;
  }> = [
    {
      value: 'PRODUCTO',
      label: 'Producto',
      icon: 'pi pi-box',
      description: 'Venta de productos, repuestos, mercaderia o paquetes.',
      primaryLabel: 'Producto solicitado',
      secondaryLabel: 'Marca, modelo o especificacion',
      locationLabel: 'Sucursal o almacen',
      dateLabel: 'Fecha probable de compra',
      amountHint: 'Valor esperado de la venta',
    },
    {
      value: 'SERVICIO',
      label: 'Servicio',
      icon: 'pi pi-wrench',
      description: 'Mantenimiento, instalacion, asesoria o trabajo tecnico.',
      primaryLabel: 'Servicio solicitado',
      secondaryLabel: 'Alcance o problema a resolver',
      locationLabel: 'Lugar de atencion',
      dateLabel: 'Fecha tentativa del servicio',
      amountHint: 'Mano de obra y materiales estimados',
    },
    {
      value: 'VEHICULO',
      label: 'Vehiculo',
      icon: 'pi pi-car',
      description: 'Venta, separacion, financiamiento o prueba de manejo.',
      primaryLabel: 'Vehiculo de interes',
      secondaryLabel: 'Marca, modelo, anio o version',
      locationLabel: 'Sede o patio',
      dateLabel: 'Fecha de visita o test drive',
      amountHint: 'Precio, cuota inicial o valor financiado',
    },
    {
      value: 'INMUEBLE',
      label: 'Inmueble',
      icon: 'pi pi-building',
      description: 'Venta o alquiler de casa, departamento, terreno o local.',
      primaryLabel: 'Tipo de inmueble',
      secondaryLabel: 'Area, dormitorios o condiciones',
      locationLabel: 'Ubicacion del inmueble',
      dateLabel: 'Fecha de visita',
      amountHint: 'Precio de venta, alquiler o separacion',
    },
    {
      value: 'PROYECTO',
      label: 'Proyecto',
      icon: 'pi pi-sitemap',
      description: 'Implementacion, obra, software, eventos o consultoria.',
      primaryLabel: 'Nombre del proyecto',
      secondaryLabel: 'Alcance principal',
      locationLabel: 'Area, sede o cliente final',
      dateLabel: 'Fecha estimada de inicio',
      amountHint: 'Presupuesto estimado del proyecto',
    },
    {
      value: 'CURSO',
      label: 'Curso',
      icon: 'pi pi-graduation-cap',
      description: 'Inscripcion, matricula, capacitacion o programa academico.',
      primaryLabel: 'Curso o programa',
      secondaryLabel: 'Modalidad, horario o nivel',
      locationLabel: 'Sede o aula virtual',
      dateLabel: 'Fecha de inicio',
      amountHint: 'Matricula, mensualidad o paquete',
    },
    {
      value: 'SEGURO',
      label: 'Seguro',
      icon: 'pi pi-shield',
      description: 'Polizas, renovaciones, cotizaciones y evaluacion de riesgo.',
      primaryLabel: 'Seguro de interes',
      secondaryLabel: 'Cobertura, plan o riesgo',
      locationLabel: 'Ciudad o zona asegurada',
      dateLabel: 'Fecha deseada de inicio',
      amountHint: 'Prima, suma asegurada o presupuesto',
    },
    {
      value: 'SOFTWARE',
      label: 'Software',
      icon: 'pi pi-desktop',
      description: 'SaaS, licencias, implementaciones, soporte o desarrollo.',
      primaryLabel: 'Solucion o modulo requerido',
      secondaryLabel: 'Usuarios, integraciones o alcance',
      locationLabel: 'Empresa o area usuaria',
      dateLabel: 'Fecha esperada de implementacion',
      amountHint: 'Licencia, mensualidad o proyecto',
    },
    {
      value: 'MARKETING',
      label: 'Marketing',
      icon: 'pi pi-megaphone',
      description: 'Campanias, branding, ads, contenidos o gestion digital.',
      primaryLabel: 'Servicio de marketing',
      secondaryLabel: 'Objetivo, canal o audiencia',
      locationLabel: 'Mercado o zona objetivo',
      dateLabel: 'Inicio de campania',
      amountHint: 'Fee, pauta o presupuesto mensual',
    },
    {
      value: 'CLINICA',
      label: 'Clinica',
      icon: 'pi pi-heart',
      description: 'Citas, tratamientos, paquetes medicos o servicios de salud.',
      primaryLabel: 'Servicio o especialidad',
      secondaryLabel: 'Sintoma, tratamiento o paquete',
      locationLabel: 'Sede de atencion',
      dateLabel: 'Fecha deseada de cita',
      amountHint: 'Costo estimado de consulta o tratamiento',
    },
    {
      value: 'JURIDICO',
      label: 'Juridico',
      icon: 'pi pi-briefcase',
      description: 'Consultas legales, contratos, procesos y asesorias.',
      primaryLabel: 'Caso o servicio legal',
      secondaryLabel: 'Materia, urgencia o etapa',
      locationLabel: 'Jurisdiccion o sede',
      dateLabel: 'Fecha limite o audiencia',
      amountHint: 'Honorarios o presupuesto del caso',
    },
    {
      value: 'TURISMO',
      label: 'Turismo',
      icon: 'pi pi-map',
      description: 'Paquetes, reservas, tours, hospedaje o experiencias.',
      primaryLabel: 'Destino o paquete',
      secondaryLabel: 'Personas, noches o preferencias',
      locationLabel: 'Origen / destino',
      dateLabel: 'Fecha de viaje',
      amountHint: 'Presupuesto del viaje',
    },
    {
      value: 'MAQUINARIA',
      label: 'Maquinaria',
      icon: 'pi pi-cog',
      description: 'Venta, alquiler, repuestos o mantenimiento de equipos.',
      primaryLabel: 'Equipo o maquinaria',
      secondaryLabel: 'Marca, capacidad, horas o uso',
      locationLabel: 'Obra, planta o sede',
      dateLabel: 'Fecha requerida',
      amountHint: 'Venta, alquiler o servicio estimado',
    },
    {
      value: 'FINANCIERO',
      label: 'Financiero',
      icon: 'pi pi-wallet',
      description: 'Creditos, inversiones, factoring o productos financieros.',
      primaryLabel: 'Producto financiero',
      secondaryLabel: 'Monto, plazo o condiciones',
      locationLabel: 'Empresa, sede o region',
      dateLabel: 'Fecha objetivo',
      amountHint: 'Monto solicitado o inversion',
    },
    {
      value: 'CONSULTORIA',
      label: 'Consultoria',
      icon: 'pi pi-compass',
      description: 'Diagnosticos, asesorias, auditorias o mejora de procesos.',
      primaryLabel: 'Tema de consultoria',
      secondaryLabel: 'Problema, alcance o entregable',
      locationLabel: 'Area o sede del cliente',
      dateLabel: 'Inicio esperado',
      amountHint: 'Presupuesto de consultoria',
    },
    {
      value: 'EDUCACION',
      label: 'Educacion',
      icon: 'pi pi-book',
      description: 'Colegios, academias, capacitaciones y admisiones.',
      primaryLabel: 'Programa educativo',
      secondaryLabel: 'Nivel, modalidad o horario',
      locationLabel: 'Sede o campus',
      dateLabel: 'Fecha de inicio',
      amountHint: 'Matricula, pension o paquete',
    },
    {
      value: 'HOSPITALIDAD',
      label: 'Hospitalidad',
      icon: 'pi pi-building-columns',
      description: 'Hoteles, restaurantes, eventos y reservas.',
      primaryLabel: 'Servicio de hospitalidad',
      secondaryLabel: 'Personas, noches o evento',
      locationLabel: 'Sede o destino',
      dateLabel: 'Fecha de reserva',
      amountHint: 'Valor de reserva o evento',
    },
    {
      value: 'MANUFACTURA',
      label: 'Manufactura',
      icon: 'pi pi-warehouse',
      description: 'Pedidos industriales, produccion, insumos o distribucion.',
      primaryLabel: 'Pedido o producto industrial',
      secondaryLabel: 'Volumen, material o especificacion',
      locationLabel: 'Planta o destino',
      dateLabel: 'Fecha requerida',
      amountHint: 'Valor del pedido o contrato',
    },
    {
      value: 'TELECOMUNICACION',
      label: 'Telecom',
      icon: 'pi pi-wifi',
      description: 'Internet, telefonia, enlaces, equipos o soporte.',
      primaryLabel: 'Servicio telecom',
      secondaryLabel: 'Velocidad, cobertura o equipos',
      locationLabel: 'Direccion de instalacion',
      dateLabel: 'Fecha de instalacion',
      amountHint: 'Plan, instalacion o contrato',
    },
    {
      value: 'ENERGIA',
      label: 'Energia',
      icon: 'pi pi-bolt',
      description: 'Solar, electrico, mantenimiento o eficiencia energetica.',
      primaryLabel: 'Solucion energetica',
      secondaryLabel: 'Consumo, potencia o alcance',
      locationLabel: 'Ubicacion del proyecto',
      dateLabel: 'Fecha de instalacion',
      amountHint: 'Presupuesto energetico',
    },
    {
      value: 'AGRICULTURA',
      label: 'Agricultura',
      icon: 'pi pi-sun',
      description: 'Agro, insumos, maquinaria, riego o servicios de campo.',
      primaryLabel: 'Necesidad agricola',
      secondaryLabel: 'Cultivo, hectareas o temporada',
      locationLabel: 'Predio o zona',
      dateLabel: 'Fecha de campania',
      amountHint: 'Presupuesto agricola',
    },
    {
      value: 'OTRO',
      label: 'Otro',
      icon: 'pi pi-objects-column',
      description: 'Cualquier rubro comercial no clasificado todavia.',
      primaryLabel: 'Interes principal',
      secondaryLabel: 'Detalle del requerimiento',
      locationLabel: 'Lugar relacionado',
      dateLabel: 'Fecha objetivo',
      amountHint: 'Monto referencial',
    },
  ];

  protected readonly catalogTypeCards = this.opportunityTypeOptions;

  private readonly catalogFieldMap: Partial<Record<OpportunityType, CatalogField[]>> = {
    PRODUCTO: [
      { key: 'categoria', label: 'Categoria', placeholder: 'Repuesto, ropa, alimento...' },
      { key: 'marca', label: 'Marca', placeholder: 'Marca o fabricante' },
      { key: 'modelo', label: 'Modelo / presentacion', placeholder: 'Modelo, tamano o version' },
    ],
    SERVICIO: [
      { key: 'servicio', label: 'Servicio', placeholder: 'Instalacion, mantenimiento, asesoria...' },
      { key: 'duracion', label: 'Duracion estimada', placeholder: '2 horas, 3 dias, mensual' },
      { key: 'modalidad', label: 'Modalidad', placeholder: 'Presencial, remoto, a domicilio' },
    ],
    VEHICULO: [
      { key: 'marca', label: 'Marca', placeholder: 'Toyota, Hyundai, Nissan...' },
      { key: 'modelo', label: 'Modelo', placeholder: 'Hilux, Tucson, Sentra...' },
      { key: 'anio', label: 'Anio', placeholder: '2021', type: 'number' },
      { key: 'kilometraje', label: 'Kilometraje', placeholder: '45000', type: 'number' },
    ],
    INMUEBLE: [
      { key: 'ubicacion', label: 'Ubicacion', placeholder: 'Distrito, ciudad o direccion' },
      { key: 'operacion', label: 'Operacion', placeholder: 'Venta, alquiler, anticresis' },
      { key: 'area', label: 'Area', placeholder: '120 m2' },
      { key: 'dormitorios', label: 'Dormitorios', placeholder: '3', type: 'number' },
    ],
    PROYECTO: [
      { key: 'alcance', label: 'Alcance', placeholder: 'Implementacion, obra, evento...' },
      { key: 'duracion', label: 'Duracion', placeholder: '3 meses' },
      { key: 'fechaInicio', label: 'Inicio estimado', placeholder: '', type: 'date' },
    ],
    CURSO: [
      { key: 'duracion', label: 'Tiempo de estudio', placeholder: '3 meses, 40 horas...' },
      { key: 'modalidad', label: 'Modalidad', placeholder: 'Virtual, presencial, mixto' },
      { key: 'horario', label: 'Horario', placeholder: 'Sabatino, noche, flexible' },
      { key: 'fechaInicio', label: 'Fecha de inicio', placeholder: '', type: 'date' },
    ],
    SEGURO: [
      { key: 'tipoSeguro', label: 'Tipo de seguro', placeholder: 'Vehicular, salud, vida...' },
      { key: 'cobertura', label: 'Cobertura', placeholder: 'Todo riesgo, basico, premium' },
      { key: 'vigencia', label: 'Vigencia', placeholder: '1 anio, mensual' },
    ],
    SOFTWARE: [
      { key: 'solucion', label: 'Solucion / modulo', placeholder: 'CRM, POS, inventario...' },
      { key: 'usuarios', label: 'Usuarios', placeholder: '10', type: 'number' },
      { key: 'modalidad', label: 'Modalidad', placeholder: 'SaaS, licencia, desarrollo' },
    ],
    MARKETING: [
      { key: 'servicio', label: 'Servicio', placeholder: 'Ads, branding, contenidos...' },
      { key: 'canal', label: 'Canal', placeholder: 'Facebook, Google, TikTok...' },
      { key: 'duracion', label: 'Duracion', placeholder: 'Mensual, campania 30 dias' },
    ],
    CLINICA: [
      { key: 'especialidad', label: 'Especialidad', placeholder: 'Dental, dermatologia, cirugia...' },
      { key: 'tratamiento', label: 'Tratamiento', placeholder: 'Consulta, paquete, control...' },
      { key: 'sede', label: 'Sede', placeholder: 'Sede centro, norte...' },
    ],
    JURIDICO: [
      { key: 'materia', label: 'Materia legal', placeholder: 'Laboral, civil, tributario...' },
      { key: 'etapa', label: 'Etapa', placeholder: 'Consulta, demanda, contrato...' },
      { key: 'urgencia', label: 'Urgencia', placeholder: 'Normal, urgente, audiencia' },
    ],
    TURISMO: [
      { key: 'destino', label: 'Destino', placeholder: 'Cusco, Cancun, Europa...' },
      { key: 'personas', label: 'Personas', placeholder: '2', type: 'number' },
      { key: 'dias', label: 'Dias / noches', placeholder: '4 dias / 3 noches' },
      { key: 'fechaViaje', label: 'Fecha de viaje', placeholder: '', type: 'date' },
    ],
    MAQUINARIA: [
      { key: 'equipo', label: 'Equipo', placeholder: 'Excavadora, compresora...' },
      { key: 'marca', label: 'Marca', placeholder: 'CAT, Komatsu, Volvo...' },
      { key: 'modelo', label: 'Modelo', placeholder: 'Modelo o serie' },
      { key: 'horasUso', label: 'Horas de uso', placeholder: '1200', type: 'number' },
    ],
    FINANCIERO: [
      { key: 'productoFinanciero', label: 'Producto financiero', placeholder: 'Credito, factoring, leasing...' },
      { key: 'monto', label: 'Monto', placeholder: '50000', type: 'number' },
      { key: 'plazo', label: 'Plazo', placeholder: '12 meses' },
    ],
    CONSULTORIA: [
      { key: 'tema', label: 'Tema', placeholder: 'Procesos, auditoria, ventas...' },
      { key: 'alcance', label: 'Alcance', placeholder: 'Diagnostico, implementacion...' },
      { key: 'duracion', label: 'Duracion', placeholder: '4 semanas' },
    ],
    EDUCACION: [
      { key: 'programa', label: 'Programa', placeholder: 'Diplomado, carrera, taller...' },
      { key: 'nivel', label: 'Nivel', placeholder: 'Basico, intermedio, avanzado' },
      { key: 'modalidad', label: 'Modalidad', placeholder: 'Virtual, presencial, mixto' },
    ],
    HOSPITALIDAD: [
      { key: 'servicio', label: 'Servicio', placeholder: 'Habitacion, evento, restaurante...' },
      { key: 'personas', label: 'Personas', placeholder: '20', type: 'number' },
      { key: 'fechaReserva', label: 'Fecha de reserva', placeholder: '', type: 'date' },
    ],
    MANUFACTURA: [
      { key: 'material', label: 'Material', placeholder: 'Acero, plastico, tela...' },
      { key: 'volumen', label: 'Volumen', placeholder: '1000 unidades' },
      { key: 'fechaEntrega', label: 'Fecha de entrega', placeholder: '', type: 'date' },
    ],
    TELECOMUNICACION: [
      { key: 'servicio', label: 'Servicio', placeholder: 'Internet, fibra, enlace...' },
      { key: 'velocidad', label: 'Velocidad / plan', placeholder: '300 Mbps' },
      { key: 'direccionInstalacion', label: 'Direccion de instalacion', placeholder: 'Direccion o zona' },
    ],
    ENERGIA: [
      { key: 'solucion', label: 'Solucion', placeholder: 'Paneles solares, mantenimiento...' },
      { key: 'potencia', label: 'Potencia / consumo', placeholder: '5 kW, consumo mensual' },
      { key: 'ubicacion', label: 'Ubicacion', placeholder: 'Lugar del proyecto' },
    ],
    AGRICULTURA: [
      { key: 'cultivo', label: 'Cultivo', placeholder: 'Arroz, palta, cafe...' },
      { key: 'hectareas', label: 'Hectareas', placeholder: '10', type: 'number' },
      { key: 'temporada', label: 'Temporada', placeholder: 'Campania 2026' },
    ],
    OTRO: [
      { key: 'categoria', label: 'Categoria', placeholder: 'Tipo de oferta' },
      { key: 'detalle', label: 'Detalle clave', placeholder: 'Dato principal para vender' },
    ],
  };

  protected readonly etapaOptions = computed<PipelineStageOption[]>(() =>
    this.normalizedOpportunityStages().length
      ? this.normalizedOpportunityStages().map((item) => ({
          label: item.nombre,
          value: item.codigo,
          id: item.id,
          color: item.color,
          descripcion: item.descripcion,
          probabilidadDefault: item.probabilidadDefault,
          icono: item.icono,
          requiereValidacion: item.requiereValidacion,
          modoValidacion: item.modoValidacion,
        }))
      : CRM_OPPORTUNITY_FLOW_STAGES.map((value) => ({
          label: this.humanize(value),
          value,
          id: null,
          color: '#2563eb',
          descripcion: this.defaultStageObjective(value),
          probabilidadDefault: this.defaultStageProbability(value),
          icono: 'pi pi-briefcase',
          requiereValidacion: true,
          modoValidacion: this.defaultStageValidationMode(value),
        })),
  );

  protected readonly tipoActividadOptions = [
    { label: 'Llamada', value: 'LLAMADA', icon: 'pi pi-phone' },
    { label: 'Whatsapp', value: 'WHATSAPP', icon: 'pi pi-whatsapp' },
    { label: 'Correo', value: 'CORREO', icon: 'pi pi-envelope' },
    { label: 'Reunion', value: 'REUNION', icon: 'pi pi-calendar' },
    { label: 'Visita', value: 'VISITA', icon: 'pi pi-map-marker' },
    { label: 'Tarea', value: 'TAREA', icon: 'pi pi-check-square' },
    { label: 'Nota', value: 'NOTA', icon: 'pi pi-file-edit' },
  ];

  protected readonly promotionTypeOptions = [
    { label: 'Monto fijo', value: 'MONTO' },
    { label: 'Porcentaje', value: 'PORCENTAJE' },
  ];

  protected readonly actividadEstadoOptions = [
    { label: 'Programada / pendiente', value: 'PENDIENTE', icon: 'pi pi-clock' },
    { label: 'Realizada ahora', value: 'REALIZADA', icon: 'pi pi-circle-fill' },
  ];

  protected readonly activityResultOptions = [
    { label: 'Sin resultado aun', value: '', icon: 'pi pi-users' },
    { label: 'Contactado', value: 'CONTACTADO', icon: 'pi pi-check-circle' },
    { label: 'Interes medio confirmado', value: 'INTERESADO', icon: 'pi pi-star' },
    { label: 'Interes alto confirmado', value: 'MUY_INTERESADO', icon: 'pi pi-star-fill' },
    { label: 'Solicito propuesta', value: 'SOLICITA_PROPUESTA', icon: 'pi pi-file-edit' },
    { label: 'Solicito cotizacion', value: 'COTIZACION_SOLICITADA', icon: 'pi pi-file' },
    { label: 'Pidio reprogramar', value: 'REPROGRAMADO', icon: 'pi pi-calendar' },
    { label: 'Queda en espera', value: 'EN_ESPERA', icon: 'pi pi-clock' },
    { label: 'No respondio', value: 'SIN_RESPUESTA', icon: 'pi pi-ban' },
    { label: 'No interesado', value: 'NO_INTERESADO', icon: 'pi pi-times-circle' },
    { label: 'Perdido / descartar', value: 'PERDIDO', icon: 'pi pi-trash' },
  ];

  protected readonly activityInterestOptions = [
    { label: 'Bajo', value: 'BAJO', icon: 'pi pi-chart-bar' },
    { label: 'Medio', value: 'MEDIO', icon: 'pi pi-chart-line' },
    { label: 'Alto', value: 'ALTO', icon: 'pi pi-bolt' },
  ];

  protected readonly activityProspectStatusOptions = [
    { label: 'Mantener estado actual', value: '', icon: 'pi pi-flag' },
    { label: 'Contactado', value: 'CONTACTADO', icon: 'pi pi-phone' },
    { label: 'En espera', value: 'EN_ESPERA', icon: 'pi pi-clock' },
    { label: 'Calificado', value: 'CALIFICADO', icon: 'pi pi-check' },
    { label: 'Perdido', value: 'PERDIDO', icon: 'pi pi-times' },
  ];

  protected readonly prospectLossReasonOptions = [
    { label: 'No responde', value: 'NO_RESPONDE' },
    { label: 'Numero incorrecto', value: 'NUMERO_INCORRECTO' },
    { label: 'Sin interes', value: 'SIN_INTERES' },
    { label: 'No cumple requisitos', value: 'NO_CUMPLE_REQUISITOS' },
    { label: 'Fuera de mercado', value: 'FUERA_DE_MERCADO' },
    { label: 'Duplicado', value: 'DUPLICADO' },
    { label: 'Otro', value: 'OTRO' },
  ];

  protected readonly opportunityLossReasonOptions = [
    { label: 'Precio alto', value: 'PRECIO_ALTO' },
    { label: 'Competencia', value: 'COMPETENCIA' },
    { label: 'Sin presupuesto', value: 'SIN_PRESUPUESTO' },
    { label: 'Proyecto pausado', value: 'PROYECTO_PAUSADO' },
    { label: 'Proyecto cancelado', value: 'PROYECTO_CANCELADO' },
    { label: 'No aprobo internamente', value: 'NO_APROBO' },
    { label: 'Otra solucion', value: 'OTRA_SOLUCION' },
    { label: 'Otro', value: 'OTRO' },
  ];

  protected readonly opportunityTemperatureOptions = [
    { label: 'Frio', value: 'FRIO' },
    { label: 'Medio', value: 'MEDIO' },
    { label: 'Caliente', value: 'CALIENTE' },
  ];

  protected readonly metrics = computed(() => {
    const dashboard = this.dashboard();
    const oportunidadesAbiertas = this.oportunidades().filter((item) => this.isActiveOpportunity(item));
    return {
      prospectos: this.prospectos().length,
      leadsAutomaticos: dashboard?.leadsAutomaticos ?? this.prospectos().filter((item) => (item.canalIngreso || 'MANUAL') !== 'MANUAL').length,
      oportunidades: oportunidadesAbiertas.length,
      catalogo: this.catalogoItems().filter((item) => item.estado === 'ACTIVO').length,
      actividadesPendientes: this.actividades().filter((item) => item.estado === 'PENDIENTE').length,
      pipeline: dashboard?.montoPipeline ?? oportunidadesAbiertas.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
    };
  });

  protected readonly wonAmount = computed(() =>
    this.wonOpportunities().reduce(
      (sum, item) => sum + Number(item.montoReal ?? item.montoEstimado ?? 0),
      0,
    ),
  );

  protected readonly dashboardTargetAmount = computed(() => {
    const reference = Math.max(this.wonAmount(), this.metrics().pipeline * 0.75, 10000);
    return Math.ceil(reference / 5000) * 5000;
  });

  protected readonly dashboardTargetProgress = computed(() =>
    this.toRate(this.wonAmount(), this.dashboardTargetAmount()),
  );

  protected readonly dashboardMetrics = computed<CrmDashboardMetricCard[]>(() => [
    {
      label: 'Leads nuevos',
      value: this.automaticLeads().length,
      detail: 'Captados desde landing y canales conectados',
      icon: 'pi pi-megaphone',
      tone: 'violet',
    },
    {
      label: 'Prospectos',
      value: this.prospectos().length,
      detail: 'Contactos que ya estan dentro del CRM',
      icon: 'pi pi-users',
      tone: 'blue',
    },
    {
      label: 'Oportunidades',
      value: this.metrics().oportunidades,
      detail: 'Negocios abiertos en seguimiento comercial',
      icon: 'pi pi-briefcase',
      tone: 'green',
    },
    {
      label: 'Ventas ganadas',
      value: this.wonOpportunities().length,
      detail: 'Cierres exitosos del pipeline',
      icon: 'pi pi-check-circle',
      tone: 'teal',
    },
    {
      label: 'Monto ganado',
      value: this.wonAmount(),
      detail: 'Cierre acumulado en oportunidades ganadas',
      icon: 'pi pi-wallet',
      tone: 'amber',
      prefix: 'S/ ',
    },
    {
      label: 'Monto en pipeline',
      value: this.metrics().pipeline,
      detail: 'Valor activo en juego dentro del embudo',
      icon: 'pi pi-chart-line',
      tone: 'slate',
      prefix: 'S/ ',
    },
  ]);

  protected readonly pipelineColumns = computed(() =>
    this.etapaOptions().map((stage) => {
      const items = this.oportunidades().filter((item) => item.etapa === stage.value && !this.isSaleClosed(item));
      return {
        ...stage,
        items,
        total: items.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
      };
    }),
  );

  protected readonly pipelineBoardColumns = computed(() => {
    const query = this.query().trim().toLowerCase();
    const stageFilter = this.opportunityStageFilter();

    return this.pipelineColumns()
      .filter((column) => !stageFilter || column.value === stageFilter)
      .map((column) => {
        const items = column.items
          .filter((item) => this.matchesOpportunityQuery(item, query))
          .sort((a, b) => {
            const dateA = Date.parse(a.fechaCierreEstimada || '') || Number.MAX_SAFE_INTEGER;
            const dateB = Date.parse(b.fechaCierreEstimada || '') || Number.MAX_SAFE_INTEGER;
            return dateA - dateB;
          });

        return {
          ...column,
          items,
          total: items.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
        };
      });
  });

  protected readonly pipelineBoardTotal = computed(() =>
    this.pipelineBoardColumns().reduce((sum, column) => sum + column.total, 0),
  );

  protected readonly pipelineBoardCount = computed(() =>
    this.pipelineBoardColumns().reduce((sum, column) => sum + column.items.length, 0),
  );

  protected readonly pipelineRiskCount = computed(() =>
    this.pipelineBoardColumns().reduce(
      (sum, column) => sum + column.items.filter((item) => this.opportunityRiskBadges(item).length > 0).length,
      0,
    ),
  );

  protected readonly pipelineConversionRate = computed(() =>
    this.toRate(this.wonOpportunities().length, Math.max(this.pipelineBoardCount(), 1)),
  );

  protected readonly pipelineSummaryCards = computed(() => [
    {
      label: 'Total oportunidades',
      value: String(this.pipelineBoardCount()),
      detail: 'Activas en el pipeline',
      icon: 'pi pi-users',
      tone: 'violet',
    },
    {
      label: 'Valor total del pipeline',
      value: `S/ ${this.formatCompactAmount(this.pipelineBoardTotal())}`,
      detail: 'Valor estimado',
      icon: 'pi pi-dollar',
      tone: 'green',
    },
    {
      label: 'Tasa de conversion',
      value: `${this.pipelineConversionRate()}%`,
      detail: 'Promedio general',
      icon: 'pi pi-chart-line',
      tone: 'blue',
    },
    {
      label: 'Oportunidades ganadas',
      value: String(this.wonOpportunities().length),
      detail: 'Este mes',
      icon: 'pi pi-trophy',
      tone: 'emerald',
    },
    {
      label: 'En riesgo',
      value: String(this.pipelineRiskCount()),
      detail: 'Requieren atencion',
      icon: 'pi pi-exclamation-triangle',
      tone: 'amber',
    },
  ]);

  protected readonly executiveKpis = computed<CrmExecutiveKpi[]>(() => {
    const income = this.wonAmount() || this.metrics().pipeline;
    const target = this.dashboardTargetAmount();
    const conversion = this.pipelineConversionRate();
    const contacts = this.prospectos().length + this.clientes().length;
    const closedThisMonth = this.wonOpportunities().filter((item) =>
      this.isThisMonth(item.fechaGanada || item.fechaCierreReal || item.updatedAt || item.createdAt),
    ).length;

    return [
      {
        label: 'Ingresos',
        value: `S/ ${this.formatCompactAmount(income)}`,
        detail: `Meta: S/ ${this.formatCompactAmount(target)}`,
        trend: `+${this.dashboardTargetProgress()}% vs meta`,
        trendTone: 'up',
        icon: 'pi pi-dollar',
        tone: 'money',
      },
      {
        label: 'Deals activos',
        value: String(this.pipelineBoardCount()),
        detail: `${closedThisMonth} cerrados este mes`,
        trend: `+${Math.max(0, conversion)}% conversion`,
        trendTone: 'up',
        icon: 'pi pi-handshake',
        tone: 'deals',
      },
      {
        label: 'Contactos',
        value: this.formatCompactAmount(contacts),
        detail: `${this.automaticLeads().length} leads automaticos`,
        trend: `+${this.toRate(this.automaticLeads().length, Math.max(this.prospectos().length, 1))}% captacion`,
        trendTone: 'up',
        icon: 'pi pi-users',
        tone: 'contacts',
      },
      {
        label: 'Conversion',
        value: `${conversion}%`,
        detail: 'Pipeline -> Cerrado',
        trend: this.pipelineRiskCount() > 0 ? `-${this.pipelineRiskCount()} en riesgo` : '+0 en riesgo',
        trendTone: this.pipelineRiskCount() > 0 ? 'down' : 'up',
        icon: 'pi pi-bullseye',
        tone: 'conversion',
      },
    ];
  });

  protected readonly executivePipelineRows = computed<CrmExecutivePipelineRow[]>(() => {
    const rows = this.pipelineColumns();
    const maxCount = Math.max(...rows.map((item) => item.items.length), 1);
    return rows.map((item) => {
      const count = item.items.length;
      return {
        label: item.label,
        count,
        amount: `S/ ${this.formatCompactAmount(item.total)}`,
        color: item.color || this.stageColor(item.value),
        percent: count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0,
      };
    });
  });

  protected readonly executivePipelineTotalLabel = computed(() =>
    `S/ ${this.formatCompactAmount(this.pipelineColumns().reduce((sum, item) => sum + item.total, 0))}`,
  );

  protected readonly executiveRevenueChart = computed<CrmExecutiveRevenueChart>(() => {
    const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const year = this.dashboardNow.getFullYear();
    const monthly = new Array(12).fill(0) as number[];

    for (const item of this.wonOpportunities()) {
      const closedAt = this.toValidDate(item.fechaGanada || item.fechaCierreReal || item.updatedAt || item.createdAt);
      if (closedAt?.getFullYear() === year) {
        monthly[closedAt.getMonth()] += Number(item.montoReal ?? item.montoEstimado ?? 0);
      }
    }

    const cumulative = monthly.reduce<number[]>((items, value, index) => {
      items[index] = (items[index - 1] || 0) + value;
      return items;
    }, []);
    const target = this.dashboardTargetAmount();
    const targetCumulative = labels.map((_, index) => (target / 12) * (index + 1));
    const max = Math.max(...cumulative, ...targetCumulative, target, 1);
    const left = 72;
    const right = 944;
    const top = 28;
    const bottom = 244;
    const width = right - left;
    const height = bottom - top;
    const toPoint = (value: number, index: number) => {
      const x = left + (width / (labels.length - 1)) * index;
      const y = bottom - (Math.min(value, max) / max) * height;
      return `${Math.round(x)},${Math.round(y)}`;
    };
    const realPoints = cumulative.map(toPoint).join(' ');
    const targetPoints = targetCumulative.map(toPoint).join(' ');
    const areaPoints = `${realPoints} ${right},${bottom} ${left},${bottom}`;
    const guides = [1, 0.75, 0.5, 0.25, 0].map((ratio) => ({
      label: `S/ ${this.formatCompactAmount(max * ratio)}`,
      y: Math.round(bottom - ratio * height),
    }));

    return { labels, guides, realPoints, targetPoints, areaPoints };
  });

  protected readonly upcomingActivities = computed(() =>
    [...this.actividades()]
      .filter((item) => item.estado === 'PENDIENTE')
      .sort((a, b) => new Date(a.fechaProgramada).getTime() - new Date(b.fechaProgramada).getTime())
      .slice(0, 6),
  );

  protected readonly priorityProspects = computed(() =>
    this.prospectos()
      .filter((item) => ['NUEVO', 'CONTACTADO', 'EN_ESPERA', 'CALIFICADO'].includes(item.estado))
      .slice(0, 6),
  );

  protected readonly newProspects = computed(() =>
    this.prospectos().filter((item) => item.estado === 'NUEVO' && (!this.hasProspectActivity(item.id) || this.isAutomaticLead(item))),
  );

  protected readonly followUpProspects = computed(() =>
    this.prospectos().filter((item) =>
      !this.hasClosedSaleForProspect(item.id) &&
      (
        ['CONTACTADO', 'EN_ESPERA', 'CALIFICADO', 'PERDIDO'].includes(item.estado) ||
        (item.estado === 'NUEVO' && this.hasProspectActivity(item.id) && !this.isAutomaticLead(item))
      ),
    ),
  );

  protected readonly negotiationOpportunities = computed(() =>
    this.oportunidades().filter((item) => item.etapa === 'NEGOCIACION' && this.isActiveOpportunity(item)),
  );

  protected readonly wonOpportunities = computed(() =>
    this.oportunidades().filter((item) => item.estado === 'GANADA' || item.etapa === 'GANADO'),
  );

  protected readonly commercialJourney = computed(() => [
    {
      icon: 'pi pi-user-plus',
      label: 'Prospectos',
      detail: 'Prospectos y leads',
      count: this.captationProspectItems().length,
      tab: 'captacion' as CrmTab,
    },
    {
      icon: 'pi pi-comments',
      label: 'Seguimiento',
      detail: 'Llamadas y tareas',
      count: this.followUpProspects().length + this.metrics().actividadesPendientes,
      tab: 'seguimiento' as CrmTab,
    },
    {
      icon: 'pi pi-briefcase',
      label: 'Oportunidades',
      detail: 'Negocios completos',
      count: this.oportunidades().length,
      tab: 'oportunidades' as CrmTab,
    },
    {
      icon: 'pi pi-trophy',
      label: 'Clientes',
      detail: 'Postventa',
      count: this.clientsWonItems().length,
      tab: 'clientes' as CrmTab,
    },
    {
      icon: 'pi pi-credit-card',
      label: 'Seguimiento de pagos',
      detail: 'Cuotas y deuda',
      count: this.paymentFollowUpItems().length,
      tab: 'seguimientoPagos' as CrmTab,
    },
  ]);

  protected readonly sectionTabs = computed<CrmSectionTab[]>(() => {
    const items: CrmSectionTab[] = [
      {
        tab: 'captacion',
        label: 'Prospecto',
        detail: 'Entradas nuevas',
        icon: 'pi pi-user-plus',
        route: '/admin/crm/prospectos',
        count: this.captationProspectItems().length,
      },
      {
        tab: 'seguimiento',
        label: 'Seguimiento',
        detail: 'Tareas y contactos',
        icon: 'pi pi-comments',
        route: '/admin/crm/seguimiento',
        count: this.followUpProspects().length + this.metrics().actividadesPendientes,
      },
      {
        tab: 'embudo',
        label: 'Pipeline',
        detail: 'Vista Kanban',
        icon: 'pi pi-chart-line',
        route: '/admin/crm/pipeline',
        count: this.pipelineBoardCount(),
      },
      {
        tab: 'oportunidades',
        label: 'Oportunidades',
        detail: 'Activas y cierres',
        icon: 'pi pi-briefcase',
        route: '/admin/crm/oportunidades',
        count: this.oportunidades().length,
      },
      {
        tab: 'clientes',
        label: 'Clientes',
        detail: 'Postventa',
        icon: 'pi pi-trophy',
        route: '/admin/crm/clientes',
        count: this.clientsWonItems().length,
      },
      {
        tab: 'seguimientoPagos',
        label: 'Seguimiento de pagos',
        detail: 'Cuotas y deuda',
        icon: 'pi pi-credit-card',
        route: '/admin/crm/seguimiento-pagos',
        count: this.paymentFollowUpItems().length,
      },
    ];

    return items;
  });

  protected readonly pageMeta = computed<CrmPageMeta>(() => {
    const meta: Record<CrmTab, CrmPageMeta> = {
      dashboard: {
        eyebrow: 'Gestion comercial',
        title: 'Dashboard CRM',
        description: 'Indicadores, proceso comercial, pipeline y actividades para dirigir el equipo.',
      },
      captacion: {
        eyebrow: 'Captacion comercial',
        title: 'Prospectos y leads',
        description: 'Revisa entradas nuevas, leads automaticos y contactos que necesitan primera gestion.',
      },
      seguimiento: {
        eyebrow: 'Gestion comercial',
        title: 'Seguimiento',
        description: 'Organiza llamadas, tareas, proximos pasos y oportunidades que requieren accion.',
      },
      embudo: {
        eyebrow: 'Pipeline comercial',
        title: 'Pipeline',
        description: 'Mueve oportunidades por etapa y prioriza los negocios con mayor avance.',
      },
      oportunidades: {
        eyebrow: 'Cierre comercial',
        title: 'Oportunidades',
        description: 'Administra negocios abiertos antes de cotizar, negociar o cerrar.',
      },
      cotizaciones: {
        eyebrow: 'Propuestas comerciales',
        title: 'Cotizaciones',
        description: 'Revisa propuestas enviadas y mueve las que respondan hacia negociacion.',
      },
      negociacion: {
        eyebrow: 'Negociacion comercial',
        title: 'Negociacion',
        description: 'Gestiona precio, condiciones y cierre de oportunidades con alta intencion.',
      },
      clientes: {
        eyebrow: 'Conversion comercial',
        title: 'Clientes',
        description: 'Consulta ventas cerradas, productos comprados, pagos, deuda y documentos del expediente.',
      },
      seguimientoPagos: {
        eyebrow: 'Cobranza CRM',
        title: 'Seguimiento de pagos',
        description: 'Controla clientes con saldo pendiente, cuotas programadas y pagos vencidos.',
      },
      catalogo: {
        eyebrow: 'Catalogo CRM',
        title: 'Productos CRM',
        description: 'Registra productos, servicios o bienes que se captan desde landing y se venden desde CRM.',
      },
      administracion: {
        eyebrow: 'Administracion CRM',
        title: 'Panel administrativo',
        description: 'Configura etapas, roles, permisos y reglas de trabajo del CRM.',
      },
    };
    return meta[this.activeTab()];
  });

  protected readonly commercialProcess = computed<CrmProcessCard[]>(() => {
    const oportunidades = this.oportunidades().filter((item) => this.isActiveOpportunity(item));
    const cotizadas = oportunidades.filter((item) => item.etapa === 'COTIZADO' || item.estado === 'COTIZADA');
    const negociacion = oportunidades.filter((item) => item.etapa === 'NEGOCIACION');
    const captacionItems = [...new Map([...this.newProspects(), ...this.automaticLeads()].map((item) => [item.id, item])).values()];
    const seguimientoItems = this.followUpProspects();
    const captacionCount = captacionItems.length;
    const seguimientoCount = seguimientoItems.length;
    const ganadasCount = this.wonOpportunities().length;
    const clientesCerrados = this.clientsWonItems();

    return [
      {
        tab: 'captacion' as CrmTab,
        label: 'Captacion',
        detail: 'Leads nuevos',
        icon: 'pi pi-user-plus',
        count: captacionCount,
        amount: captacionItems.reduce((sum, item) => sum + Number(item.presupuestoEstimado || 0), 0),
        conversion: this.toRate(seguimientoCount, Math.max(captacionCount, 1)),
        tone: 'blue' as const,
      },
      {
        tab: 'seguimiento' as CrmTab,
        label: 'Seguimiento',
        detail: 'Contactados',
        icon: 'pi pi-phone',
        count: seguimientoCount,
        amount: seguimientoItems.reduce((sum, item) => sum + Number(item.presupuestoEstimado || 0), 0),
        conversion: this.toRate(oportunidades.length, Math.max(seguimientoCount, 1)),
        tone: 'green' as const,
      },
      {
        tab: 'oportunidades' as CrmTab,
        label: 'Oportunidades',
        detail: 'Activas',
        icon: 'pi pi-briefcase',
        count: oportunidades.length,
        amount: oportunidades.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
        conversion: this.toRate(cotizadas.length, Math.max(oportunidades.length, 1)),
        tone: 'violet' as const,
      },
      {
        tab: 'cotizaciones' as CrmTab,
        label: 'Cotizaciones',
        detail: 'Enviadas',
        icon: 'pi pi-file-edit',
        count: cotizadas.length,
        amount: cotizadas.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
        conversion: this.toRate(negociacion.length, Math.max(cotizadas.length, 1)),
        tone: 'amber' as const,
      },
      {
        tab: 'negociacion' as CrmTab,
        label: 'Negociacion',
        detail: 'En negociacion',
        icon: 'pi pi-handshake',
        count: negociacion.length,
        amount: negociacion.reduce((sum, item) => sum + Number(item.montoEstimado || 0), 0),
        conversion: this.toRate(ganadasCount, Math.max(negociacion.length, 1)),
        tone: 'slate' as const,
      },
      {
        tab: 'clientes' as CrmTab,
        label: 'Clientes',
        detail: 'Ventas cerradas',
        icon: 'pi pi-trophy',
        count: clientesCerrados.length,
        amount: this.sumOpportunityAmount(clientesCerrados, true),
        conversion: this.toRate(clientesCerrados.length, Math.max(this.oportunidades().length, 1)),
        tone: 'teal' as const,
      },
    ];
  });

  protected readonly stageSummary = computed(() =>
    {
      const columns = this.pipelineColumns();
      return columns.map((stage, index) => ({
        ...stage,
        index,
        percent: columns.length <= 1 ? 0 : Math.round((index / (columns.length - 1)) * 100),
      }));
    },
  );

  protected readonly funnelSummary = computed(() => {
    const stageColorMap = new Map(
      this.etapaOptions().map((item) => [item.value, item.color] as const),
    );
    const source = this.dashboard()?.embudo?.length
      ? this.dashboard()!.embudo.map((item, index) => ({
          code: item.etapa,
          label: this.stageName(item.etapa),
          quantity: item.cantidad,
          total: item.monto,
          color: stageColorMap.get(item.etapa) || this.stageColor(item.etapa),
          visualWidth: Math.max(34, 100 - index * 12),
        }))
      : this.stageSummary().map((item, index) => ({
          code: item.value,
          label: item.label,
          quantity: item.items.length,
          total: item.total,
          color: item.color,
          visualWidth: Math.max(34, 100 - index * 12),
        }));

    const maxQuantity = Math.max(...source.map((item) => item.quantity), 0);
    return source.map((item) => ({
      ...item,
      quantityPercent: maxQuantity > 0 ? Math.round((item.quantity / maxQuantity) * 100) : 0,
    }));
  });

  protected readonly pipelineBarSummary = computed(() => {
    const max = Math.max(...this.stageSummary().map((item) => item.total), 0);
    return this.stageSummary().map((item) => ({
      ...item,
      height: max > 0 ? Math.max(18, Math.round((item.total / max) * 100)) : 18,
    }));
  });

  protected readonly leadSourceSummary = computed<CrmLeadSourceSlice[]>(() => {
    const palette = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6'];
    const grouped = new Map<string, number>();

    for (const item of this.automaticLeads()) {
      const label = item.campania?.trim() || this.humanize(item.canalIngreso || item.origen || 'WEB');
      grouped.set(label, (grouped.get(label) || 0) + 1);
    }

    const total = Math.max([...grouped.values()].reduce((sum, value) => sum + value, 0), 0);
    return [...grouped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count], index) => ({
        code: label.toUpperCase().replace(/\s+/g, '_'),
        label,
        count,
        percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        color: palette[index % palette.length],
      }));
  });

  protected readonly leadDonutBackground = computed(() => {
    const slices = this.leadSourceSummary();
    if (!slices.length) {
      return 'conic-gradient(#cbd5e1 0 360deg)';
    }

    let offset = 0;
    const stops = slices.map((slice) => {
      const next = offset + (slice.percent * 3.6);
      const segment = `${slice.color} ${offset}deg ${next}deg`;
      offset = next;
      return segment;
    });

    if (offset < 360) {
      stops.push(`#e2e8f0 ${offset}deg 360deg`);
    }

    return `conic-gradient(${stops.join(', ')})`;
  });

  protected readonly conversionSummary = computed<CrmConversionItem[]>(() => {
    const leadBase = Math.max(this.automaticLeads().length, this.prospectos().length, 1);
    const prospectBase = Math.max(this.prospectos().length, 1);
    const opportunityBase = Math.max(this.oportunidades().length, 1);

    return [
      {
        label: 'Lead a prospecto',
        converted: this.prospectos().length,
        total: leadBase,
        rate: this.toRate(this.prospectos().length, leadBase),
        detail: `${this.prospectos().length} de ${leadBase} registros captados`,
      },
      {
        label: 'Prospecto a oportunidad',
        converted: this.oportunidades().length,
        total: prospectBase,
        rate: this.toRate(this.oportunidades().length, prospectBase),
        detail: `${this.oportunidades().length} de ${prospectBase} avanzaron al embudo`,
      },
      {
        label: 'Oportunidad a ganada',
        converted: this.wonOpportunities().length,
        total: opportunityBase,
        rate: this.toRate(this.wonOpportunities().length, opportunityBase),
        detail: `${this.wonOpportunities().length} de ${opportunityBase} cerraron venta`,
      },
    ];
  });

  protected readonly featuredOpportunities = computed(() =>
    [...this.oportunidades()]
      .sort((a, b) => Number(b.montoEstimado || 0) - Number(a.montoEstimado || 0))
      .slice(0, 5),
  );

  protected readonly pendingTasks = computed<CrmTaskCard[]>(() =>
    this.upcomingActivities().map((item) => {
      const tone = this.activityPriorityTone(item.fechaProgramada);
      return {
        title: item.asunto,
        subtitle: item.oportunidadTitulo || item.prospectoNombre || item.clienteNombre || 'Sin relacion',
        dueAt: item.fechaProgramada,
        tone,
        toneLabel: tone === 'high' ? 'Alta' : tone === 'medium' ? 'Media' : 'Baja',
      };
    }),
  );

  protected readonly recentEvents = computed<CrmRecentEvent[]>(() => {
    const prospectEvents = this.prospectos().map((item) => ({
      title: 'Nuevo prospecto captado',
      subtitle: `${item.nombre} • ${this.humanize(item.origen)}`,
      timestamp: item.updatedAt || item.createdAt || '',
      icon: 'pi pi-user-plus',
      tone: 'blue' as const,
    }));

    const opportunityEvents = this.oportunidades().map((item) => ({
      title: 'Oportunidad actualizada',
      subtitle: `${item.titulo} • ${this.stageName(item.etapa)}`,
      timestamp: item.fechaUltimaActualizacion || item.updatedAt || item.createdAt || '',
      icon: 'pi pi-briefcase',
      tone: 'green' as const,
    }));

    const activityEvents = this.actividades().map((item) => ({
      title: 'Actividad programada',
      subtitle: `${item.asunto} • ${this.humanize(item.tipoActividad)}`,
      timestamp: item.updatedAt || item.createdAt || item.fechaProgramada || '',
      icon: 'pi pi-calendar-plus',
      tone: 'violet' as const,
    }));

    return [...prospectEvents, ...opportunityEvents, ...activityEvents]
      .filter((item) => !!item.timestamp)
      .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
      .slice(0, 5);
  });

  protected readonly filteredNewProspects = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.newProspects().filter((item) =>
      !query ||
      `${item.nombre} ${item.numeroDocumento ?? ''} ${item.telefono ?? ''} ${item.correo ?? ''} ${item.tipoInteres ?? ''} ${item.interesPrincipal ?? ''} ${item.estado}`
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly automaticLeads = computed(() =>
    this.prospectos().filter((item) => this.isAutomaticLead(item)),
  );

  protected readonly incomingNewLeads = computed(() =>
    this.automaticLeads().filter((item) => item.estado === 'NUEVO'),
  );

  protected readonly filteredLeads = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.automaticLeads().filter((item) =>
      !query ||
      `${item.nombre} ${item.razonSocial ?? ''} ${item.correo ?? ''} ${item.telefono ?? ''} ${item.campania ?? ''} ${item.tipoInteres ?? ''} ${item.interesPrincipal ?? ''} ${item.mensaje ?? ''} ${item.estado}`
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly prospectSummaryCards = computed(() => {
    const leads = this.incomingNewLeads();
    const web = leads.filter((item) => ['WEB', 'LANDING', 'WEBHOOK'].includes(String(item.canalIngreso || item.origen).toUpperCase())).length;
    const whatsapp = leads.filter((item) => String(item.canalIngreso || item.origen).toUpperCase().includes('WHATSAPP')).length;
    const social = leads.filter((item) => ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN'].some((channel) => String(item.canalIngreso || item.origen).toUpperCase().includes(channel))).length;
    const campaigns = new Set(leads.map((item) => item.campania?.trim()).filter(Boolean)).size;
    return [
      { label: 'Leads nuevos', value: String(leads.length), icon: 'pi pi-megaphone', tone: 'blue' },
      { label: 'Web / landing', value: String(web), icon: 'pi pi-globe', tone: 'violet' },
      { label: 'WhatsApp', value: String(whatsapp), icon: 'pi pi-whatsapp', tone: 'green' },
      { label: 'Redes sociales', value: String(social), icon: 'pi pi-share-alt', tone: 'amber' },
      { label: 'Campanias activas', value: String(campaigns), icon: 'pi pi-filter', tone: 'rose' },
    ];
  });

  protected readonly prospectEstadoFilterOptions = computed(() => [
    { label: 'Estado', value: 'TODOS' },
    ...this.uniqueProspectValues('estado').map((value) => ({ label: this.humanize(value), value })),
  ]);

  protected readonly prospectOrigenFilterOptions = computed(() => [
    { label: 'Origen', value: 'TODOS' },
    ...this.uniqueProspectValues('origen').map((value) => ({ label: this.humanize(value), value })),
  ]);

  protected readonly prospectCampaniaFilterOptions = computed(() => [
    { label: 'Campania', value: 'TODOS' },
    ...this.uniqueProspectValues('campania').map((value) => ({ label: value, value })),
  ]);

  protected readonly prospectAsesorFilterOptions = computed(() => [
    { label: 'Asesor', value: 'TODOS' },
    ...[...new Set(this.incomingNewLeads().map((item) => item.responsableId).filter(Boolean))]
      .sort((a, b) => this.responsibleName(a).localeCompare(this.responsibleName(b)))
      .map((value) => ({ label: this.responsibleName(value), value })),
  ]);

  protected readonly crmSellerUsers = computed(() => {
    const sellerRoles = new Set(['CRM_VENDEDOR', 'VENDEDOR', 'ASESOR', 'CRM_CALLCENTER']);
    const activeUsers = this.usuarios().filter((user) => user.activo !== false);
    const sellers = activeUsers.filter((user) => user.roles?.some((role) => sellerRoles.has(String(role).toUpperCase())));
    return sellers.length ? sellers : activeUsers;
  });

  protected readonly selectedProspectCount = computed(() => this.selectedProspectIds().size);

  protected readonly distributionCandidateLeads = computed(() => {
    const selected = this.selectedProspectIds();
    const source = selected.size
      ? this.filteredProspectTable().filter((item) => selected.has(item.id))
      : this.filteredProspectTable();
    return source.filter((item) => item.estado === 'NUEVO' && !item.oportunidadId && !item.clienteId);
  });

  protected readonly prospectDistributionPreview = computed(() => {
    const leads = this.distributionCandidateLeads();
    const sellers = this.crmSellerUsers().filter((user) => this.prospectDistributionSelectedSellerIds().includes(String(user.id)));
    if (!leads.length || !sellers.length) {
      return [];
    }
    const loads = new Map(sellers.map((user) => [
      String(user.id),
      this.incomingNewLeads().filter((item) => String(item.responsableId) === String(user.id)).length,
    ]));
    const assigned = new Map(sellers.map((user) => [String(user.id), 0]));
    for (const lead of leads) {
      void lead;
      const next = [...loads.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? String(sellers[0].id);
      loads.set(next, (loads.get(next) ?? 0) + 1);
      assigned.set(next, (assigned.get(next) ?? 0) + 1);
    }
    return sellers.map((user) => ({
      id: String(user.id),
      name: user.nombres || user.username,
      current: this.incomingNewLeads().filter((item) => String(item.responsableId) === String(user.id)).length,
      assigned: assigned.get(String(user.id)) ?? 0,
    }));
  });

  protected readonly filteredProspectTable = computed(() => {
    const query = this.query().trim().toLowerCase();
    const estado = this.prospectEstadoFilter();
    const origen = this.prospectOrigenFilter();
    const campania = this.prospectCampaniaFilter();
    const asesor = this.prospectAsesorFilter();
    const dateFrom = this.prospectDateFrom();
    const dateTo = this.prospectDateTo();

    return [...this.incomingNewLeads()]
      .filter((item) =>
        !query ||
        `${item.nombre} ${item.razonSocial ?? ''} ${item.nombreComercial ?? ''} ${item.numeroDocumento ?? ''} ${item.telefono ?? ''} ${item.correo ?? ''} ${item.interesPrincipal ?? ''} ${item.tipoInteres ?? ''} ${item.origen ?? ''} ${item.canalIngreso ?? ''} ${item.campania ?? ''} ${item.estado ?? ''}`
          .toLowerCase()
          .includes(query),
      )
      .filter((item) => estado === 'TODOS' || item.estado === estado)
      .filter((item) => origen === 'TODOS' || item.origen === origen)
      .filter((item) => campania === 'TODOS' || (item.campania || 'Sin campania') === campania)
      .filter((item) => asesor === 'TODOS' || item.responsableId === asesor)
      .filter((item) => this.matchesProspectDateRange(item, dateFrom, dateTo))
      .sort((a, b) => Date.parse(b.createdAt || b.updatedAt || '') - Date.parse(a.createdAt || a.updatedAt || '') || b.id - a.id);
  });

  protected readonly prospectPageSize = 20;

  protected readonly pagedProspectTable = computed(() => {
    const page = Math.min(this.prospectPage(), Math.max(this.prospectTotalPages() - 1, 0));
    const start = page * this.prospectPageSize;
    return this.filteredProspectTable().slice(start, start + this.prospectPageSize);
  });

  protected readonly prospectTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProspectTable().length / this.prospectPageSize)),
  );

  protected readonly prospectPageRangeLabel = computed(() => {
    const total = this.filteredProspectTable().length;
    if (!total) {
      return '0 de 0';
    }
    const page = Math.min(this.prospectPage(), Math.max(this.prospectTotalPages() - 1, 0));
    const start = page * this.prospectPageSize + 1;
    const end = Math.min(start + this.prospectPageSize - 1, total);
    return `${start}-${end} de ${total}`;
  });

  protected readonly clientPageSize = 20;

  protected readonly pagedClientsDashboardItems = computed(() => {
    const page = Math.min(this.clientPage(), Math.max(this.clientTotalPages() - 1, 0));
    const start = page * this.clientPageSize;
    return this.clientsDashboardItems().slice(start, start + this.clientPageSize);
  });

  protected readonly clientTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.clientsDashboardItems().length / this.clientPageSize)),
  );

  protected readonly clientPageRangeLabel = computed(() => {
    const total = this.clientsDashboardItems().length;
    if (!total) {
      return '0 de 0';
    }
    const page = Math.min(this.clientPage(), Math.max(this.clientTotalPages() - 1, 0));
    const start = page * this.clientPageSize + 1;
    const end = Math.min(start + this.clientPageSize - 1, total);
    return `${start}-${end} de ${total}`;
  });

  protected readonly prospectMetricCards = computed<ProspectMetricCard[]>(() => {
    const prospects = this.prospectos();
    const newItems = this.newProspects();
    const today = newItems.filter((item) => this.isToday(item.createdAt || item.updatedAt)).length;
    const yesterday = newItems.filter((item) => this.isYesterday(item.createdAt || item.updatedAt)).length;
    const week = newItems.filter((item) => this.isWithinLastDays(item.createdAt || item.updatedAt, 7)).length;
    const previousWeek = newItems.filter((item) => this.isWithinRangeDays(item.createdAt || item.updatedAt, 8, 14)).length;
    const month = newItems.filter((item) => this.isCurrentMonth(item.createdAt || item.updatedAt)).length;
    const previousMonth = newItems.filter((item) => this.isPreviousMonth(item.createdAt || item.updatedAt)).length;
    const converted = prospects.filter((item) => item.estado === 'CONVERTIDO' || !!item.clienteId).length;
    const conversion = prospects.length ? Math.round((converted / prospects.length) * 1000) / 10 : 0;
    const previousBase = Math.max(prospects.length - today, 1);
    const previousConversion = Math.round((Math.max(converted - 1, 0) / previousBase) * 1000) / 10;

    return [
      {
        label: 'Nuevos hoy',
        value: String(today),
        delta: this.deltaLabel(today, yesterday),
        detail: 'vs ayer',
      },
      {
        label: 'Esta semana',
        value: String(week),
        delta: this.deltaLabel(week, previousWeek),
        detail: 'vs semana anterior',
      },
      {
        label: 'Este mes',
        value: String(month),
        delta: this.deltaLabel(month, previousMonth),
        detail: 'vs mes anterior',
      },
      {
        label: 'Tasa conversion',
        value: `${conversion}%`,
        delta: this.deltaLabel(conversion, previousConversion, true),
        detail: 'vs periodo anterior',
      },
    ];
  });

  protected readonly recentProspects = computed(() =>
    [...this.filteredNewProspects()]
      .sort((a, b) => Date.parse(b.createdAt || b.updatedAt || '') - Date.parse(a.createdAt || a.updatedAt || ''))
      .slice(0, 6),
  );

  protected readonly filteredCatalogo = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.catalogoItems().filter((item) =>
      !query ||
      `${item.nombre} ${item.tipoItem} ${item.descripcion ?? ''} ${item.estado} ${item.metadataJson ?? ''}`
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly filteredOportunidades = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.oportunidades().filter((item) =>
      this.matchesOpportunityQuery(item, query),
    );
  });

  protected readonly filteredQuotedOpportunities = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.oportunidades()
      .filter((item) => item.etapa === 'COTIZADO' && this.isActiveOpportunity(item))
      .filter((item) => this.matchesOpportunityQuery(item, query));
  });

  protected readonly quoteDashboardItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.cotizaciones()
      .filter((item) => !query || this.matchesQuoteQuery(item, query))
      .sort((a, b) => Date.parse(b.fechaEmision || '') - Date.parse(a.fechaEmision || '') || Number(b.id) - Number(a.id));
  });

  protected readonly quoteDashboardMetrics = computed(() => {
    const items = this.quoteDashboardItems();
    const pending = items.filter((item) => ['BORRADOR', 'ENVIADA', 'EN_SEGUIMIENTO'].includes(this.quoteStatusValue(item)));
    const accepted = items.filter((item) => this.quoteStatusValue(item) === 'ACEPTADA');
    const amount = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    return [
      { label: 'Cotizaciones', value: String(items.length), delta: this.deltaLabel(items.length, 0), detail: 'vs mes anterior' },
      { label: 'Valor total', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'vs mes anterior' },
      { label: 'Pendientes respuesta', value: String(pending.length), delta: 'En espera', detail: 'por responder' },
      { label: 'Aceptadas', value: String(accepted.length), delta: this.deltaLabel(accepted.length, 0), detail: 'vs mes anterior' },
    ];
  });

  protected readonly quoteStatusSummary = computed(() => {
    const items = this.quoteDashboardItems();
    const total = Math.max(items.length, 1);
    const summary = [
      { label: 'Pendientes', value: items.filter((item) => ['BORRADOR', 'ENVIADA', 'EN_SEGUIMIENTO'].includes(this.quoteStatusValue(item))).length, color: '#3b82f6', tone: 'pending' },
      { label: 'Aceptadas', value: items.filter((item) => this.quoteStatusValue(item) === 'ACEPTADA').length, color: '#10b981', tone: 'accepted' },
      { label: 'Rechazadas', value: items.filter((item) => this.quoteStatusValue(item) === 'RECHAZADA').length, color: '#ef4444', tone: 'rejected' },
    ];
    return summary.map((item) => ({
      ...item,
      percent: Math.round((item.value / total) * 100),
    }));
  });

  protected readonly quoteStatusRingBackground = computed(() => {
    const summary = this.quoteStatusSummary();
    const total = summary.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }
    let cursor = 0;
    const stops = summary
      .filter((item) => item.value > 0)
      .map((item) => {
        const start = cursor;
        cursor += (item.value / total) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      })
      .join(', ');
    return `conic-gradient(${stops})`;
  });

  protected readonly selectedOpportunityQuotes = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.cotizaciones()
      .filter((item) => Number(item.crmOportunidadId) === Number(opportunity.id))
      .sort((a, b) => Date.parse(b.fechaEmision || '') - Date.parse(a.fechaEmision || '') || Number(b.id) - Number(a.id));
  });

  protected readonly selectedOpportunityCurrentQuote = computed(() => this.selectedOpportunityQuotes()[0] ?? null);

  protected readonly selectedOpportunityRequirements = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    const saved = this.opportunityRequirementRows(opportunity);
    return saved.length ? saved : [this.defaultRequirementForOpportunity(opportunity)];
  });

  protected readonly selectedOpportunityNegotiations = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityNegotiationRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  protected negotiationRecordForQuote(quote: Cotizacion): OpportunityNegotiationRecord | null {
    const quoteCode = `COT-${String(quote.id).padStart(3, '0')}`.toUpperCase();
    return this.selectedOpportunityNegotiations()
      .filter((record) =>
        Number(record.cotizacionId) === Number(quote.id) ||
        String(record.codigoCotizacion || '').toUpperCase() === quoteCode,
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  }

  protected negotiationQuoteDecision(quote: Cotizacion): {
    label: string;
    tone: 'accepted' | 'adjustment' | 'rejected' | 'waiting';
  } {
    const negotiation = this.negotiationRecordForQuote(quote);
    if (negotiation?.resultado === 'ACEPTA' || negotiation?.clienteConforme) {
      return { label: 'Cotizacion aceptada', tone: 'accepted' };
    }
    if (negotiation?.resultado === 'RECHAZA') {
      return { label: 'Cotizacion rechazada', tone: 'rejected' };
    }
    if (negotiation?.resultado === 'PENDIENTE') {
      return { label: 'Ajuste solicitado', tone: 'adjustment' };
    }

    const status = this.quoteStatusValue(quote);
    if (['ACEPTADA', 'CONVERTIDA'].includes(status)) {
      return { label: 'Cotizacion aceptada', tone: 'accepted' };
    }
    if (status === 'RECHAZADA') {
      return { label: 'Cotizacion rechazada', tone: 'rejected' };
    }
    if (status === 'NEGOCIACION') {
      return { label: 'Ajuste solicitado', tone: 'adjustment' };
    }
    if (status === 'BORRADOR' && String(quote.observacion || '').toLowerCase().includes('ajuste comercial')) {
      return { label: 'Ajuste pendiente de envio', tone: 'adjustment' };
    }
    return { label: 'Esperando respuesta', tone: 'waiting' };
  }

  protected readonly selectedOpportunityPayments = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityPaymentRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.fecha || b.createdAt) - Date.parse(a.fecha || a.createdAt));
  });

  protected readonly selectedOpportunityDocuments = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityDocumentRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  protected readonly promotionOptions = computed(() =>
    this.promocionesCotizacion()
      .filter((item) => item.estado === 'ACTIVA')
      .map((item) => ({
        label: `${item.codigo} - ${item.nombre} (${item.tipoDescuento === 'PORCENTAJE' ? `${item.valor}%` : `S/ ${Number(item.valor || 0).toFixed(2)}`})`,
        value: item.id,
      })),
  );

  protected readonly filteredNegotiationOpportunities = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.negotiationOpportunities().filter((item) =>
      this.matchesOpportunityQuery(item, query),
    );
  });

  protected readonly negotiationDashboardItems = computed(() =>
    [...this.filteredNegotiationOpportunities()]
      .sort((a, b) => Number(b.probabilidad || 0) - Number(a.probabilidad || 0)),
  );

  protected readonly negotiationDashboardMetrics = computed(() => {
    const items = this.negotiationDashboardItems();
    const amount = this.sumOpportunityAmount(items);
    const average = this.averageProbability(items);
    const estimatedClosings = items.filter((item) => this.isThisMonth(item.fechaCierreEstimada)).length;
    return [
      { label: 'En negociacion', value: String(items.length), delta: this.deltaLabel(items.length, 0), detail: 'vs mes anterior' },
      { label: 'Valor en juego', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'vs mes anterior' },
      { label: 'Probabilidad promedio', value: `${average}%`, delta: this.deltaLabel(average, 0, true), detail: 'vs mes anterior' },
      { label: 'Cierres estimados', value: String(estimatedClosings), delta: 'Este mes', detail: 'estimados' },
    ];
  });

  protected readonly negotiationProbabilityBuckets = computed(() => {
    const items = this.negotiationDashboardItems();
    const buckets = [
      { label: '90% - 100%', min: 90, max: 100, color: '#10b981' },
      { label: '60% - 89%', min: 60, max: 89, color: '#10b981' },
      { label: '30% - 59%', min: 30, max: 59, color: '#f59e0b' },
      { label: '0% - 29%', min: 0, max: 29, color: '#ef4444' },
    ].map((bucket) => ({
      ...bucket,
      value: items.filter((item) => {
        const probability = this.opportunityProgress(item);
        return probability >= bucket.min && probability <= bucket.max;
      }).length,
    }));
    const max = Math.max(...buckets.map((bucket) => bucket.value), 1);
    return buckets.map((bucket) => ({
      ...bucket,
      height: bucket.value ? Math.max(18, Math.round((bucket.value / max) * 100)) : 5,
    }));
  });

  protected readonly clientsDashboardItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const outcome = this.clientOutcomeFilter();
    return this.clientsWonItems()
      .filter((item) =>
        outcome === 'TODOS'
        || (outcome === 'PAGADOS' && this.clientDebt(item) <= 0)
        || (outcome === 'CON_DEUDA' && this.clientDebt(item) > 0),
      )
      .filter((item) => this.matchesOpportunityQuery(item, query))
      .sort((a, b) => Date.parse(this.clientClosureDate(b)) - Date.parse(this.clientClosureDate(a)));
  });

  protected readonly clientsWonItems = computed(() => {
    const byId = new Map<number, CrmOportunidad>();
    for (const record of [...this.opportunityClosureRecords()].sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))) {
      const item = this.oportunidades().find((opportunity) => opportunity.id === record.oportunidadId);
      if (item && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }
    return Array.from(byId.values())
      .sort((a, b) => Date.parse(this.clientClosureDate(b)) - Date.parse(this.clientClosureDate(a)));
  });

  protected readonly paymentFollowUpCandidates = computed(() => {
    const byId = new Map<number, CrmOportunidad>();
    for (const item of this.clientsWonItems()) {
      byId.set(item.id, item);
    }
    for (const item of this.oportunidades()) {
      const convertedProspect = Boolean(this.prospectForOpportunity(item)?.clienteId);
      const isClientSale = this.isSaleClosed(item) ||
        item.estado === 'GANADA' ||
        item.etapa === 'GANADO' ||
        Boolean(item.clienteId) ||
        convertedProspect;
      if (isClientSale && this.opportunityPaymentRecords().some((payment) => payment.oportunidadId === item.id)) {
        byId.set(item.id, item);
      }
    }
    return Array.from(byId.values());
  });

  protected readonly clientsLostNegotiationItems = computed(() =>
    this.oportunidades()
      .filter((item) => (item.estado === 'PERDIDA' || item.etapa === 'PERDIDO') && this.hasNegotiationContext(item))
      .sort((a, b) => Date.parse(b.updatedAt || b.createdAt || '') - Date.parse(a.updatedAt || a.createdAt || '')),
  );

  protected readonly clientsDashboardMetrics = computed(() => {
    const items = this.clientsDashboardItems();
    const amount = this.sumOpportunityAmount(items, true);
    const paid = items.reduce((sum, item) => sum + this.opportunityFinancialSummary(item).paid, 0);
    const debt = items.reduce((sum, item) => sum + this.clientDebt(item), 0);
    const documents = items.reduce((sum, item) => sum + this.clientDocumentCount(item), 0);
    return [
      { label: 'Clientes cerrados', value: String(items.length), delta: this.deltaLabel(items.length, 0), detail: 'expedientes completos' },
      { label: 'Ventas cerradas', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'valor contratado' },
      { label: 'Monto cobrado', value: `S/ ${this.formatCompactAmount(paid)}`, delta: this.deltaLabel(paid, 0), detail: 'pagos conciliados' },
      { label: 'Cuentas por cobrar', value: `S/ ${this.formatCompactAmount(debt)}`, delta: String(documents), detail: 'documentos asociados' },
    ];
  });

  protected readonly clientsProductSummary = computed(() => {
    const items = this.clientsDashboardItems();
    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#14b8a6'];
    const grouped = new Map<string, { label: string; value: number; color: string }>();
    for (const item of items) {
      const catalogo = this.catalogoItems().find((catalog) => catalog.id === item.catalogoItemId);
      const label = catalogo?.nombre || this.opportunityTypeLabel(item.tipoOportunidad) || 'Sin producto';
      const current = grouped.get(label);
      if (current) {
        current.value += 1;
      } else {
        grouped.set(label, { label, value: 1, color: colors[grouped.size % colors.length] });
      }
    }
    const total = Math.max(items.length, 1);
    return Array.from(grouped.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
      .map((item) => ({ ...item, percent: Math.round((item.value / total) * 100) }));
  });

  protected readonly clientsProductRingBackground = computed(() => {
    const summary = this.clientsProductSummary();
    const total = summary.reduce((sum, item) => sum + item.value, 0);
    if (!total) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }
    let cursor = 0;
    const stops = summary
      .map((item) => {
        const start = cursor;
        cursor += (item.value / total) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      })
      .join(', ');
    return `conic-gradient(${stops})`;
  });

  protected readonly opportunityViewOptions = computed<OpportunityViewOption[]>(() => [
    {
      value: 'ABIERTAS',
      label: 'Activas',
      detail: 'En seguimiento comercial',
      count: this.oportunidades().filter((item) => this.isActiveOpportunity(item)).length,
    },
    {
      value: 'COTIZADAS',
      label: 'Cotizadas',
      detail: 'Propuestas enviadas',
      count: this.oportunidades().filter((item) => item.etapa === 'COTIZADO' && this.isActiveOpportunity(item)).length,
    },
    {
      value: 'NEGOCIACION',
      label: 'Negociacion',
      detail: 'Precio y cierre',
      count: this.negotiationOpportunities().length,
    },
    {
      value: 'GANADAS',
      label: 'Ganadas',
      detail: 'Cierres exitosos',
      count: this.wonOpportunities().length,
    },
  ]);

  protected readonly opportunitySummaryCards = computed<OpportunitySummaryCard[]>(() => {
    const all = this.oportunidades();
    const active = all.filter((item) => this.isActiveOpportunity(item));
    const won = all.filter((item) => item.estado === 'GANADA' || item.etapa === 'GANADO');
    const wonThisMonth = this.countThisMonth(won);
    const pipeline = this.sumOpportunityAmount(active);
    return [
      {
        label: 'Total oportunidades',
        value: String(all.length),
        delta: this.deltaLabel(all.length, 0),
        detail: 'vs mes anterior',
        icon: 'pi pi-briefcase',
        tone: 'blue',
      },
      {
        label: 'Valor total pipeline',
        value: `S/ ${this.formatCompactAmount(pipeline)}`,
        delta: this.deltaLabel(pipeline, 0),
        detail: 'vs mes anterior',
        icon: 'pi pi-wallet',
        tone: 'violet',
      },
      {
        label: 'Oportunidades activas',
        value: String(active.length),
        delta: `${this.toRate(active.length, Math.max(all.length, 1))}%`,
        detail: 'del total',
        icon: 'pi pi-money-bill',
        tone: 'green',
      },
      {
        label: 'Ganadas este mes',
        value: String(wonThisMonth),
        delta: this.deltaLabel(wonThisMonth, 0),
        detail: 'vs mes anterior',
        icon: 'pi pi-gift',
        tone: 'amber',
      },
      {
        label: 'Tasa de conversion',
        value: `${this.toRate(won.length, Math.max(all.length, 1))}%`,
        delta: this.deltaLabel(this.toRate(won.length, Math.max(all.length, 1)), 0, true),
        detail: 'vs mes anterior',
        icon: 'pi pi-check-square',
        tone: 'teal',
      },
    ];
  });

  protected readonly opportunityStageFilterOptions = computed(() => [
    { label: 'Etapa: Todas', value: null },
    ...this.etapaOptions().map((item) => ({ label: item.label, value: item.value })),
  ]);

  protected readonly opportunityResponsibleFilterOptions = computed(() => {
    const responsables = Array.from(new Set(this.oportunidades().map((item) => item.responsableId).filter(Boolean))).sort();
    return [
      { label: 'Responsable: Todos', value: null },
      ...responsables.map((value) => ({ label: this.responsibleName(value), value })),
    ];
  });

  protected readonly responsableOptions = computed(() => {
    const current = this.currentUserKey();
    const users = this.usuarios().map((user) => ({
      label: this.userDisplayName(user),
      value: String(user.id),
    }));
    const hasCurrent = users.some((item) => item.value === current);
    return hasCurrent || !current
      ? users
      : [{ label: this.auth.currentSession()?.nombres || this.auth.currentSession()?.username || current, value: current }, ...users];
  });

  protected readonly opportunityStatusFilterOptions = [
    { label: 'Estado: Todas', value: null },
    { label: 'Activas', value: 'ABIERTA' },
    { label: 'Ganadas', value: 'GANADA' },
    { label: 'Perdidas', value: 'PERDIDA' },
  ];

  protected readonly clientOutcomeFilterOptions = [
    { label: 'Clientes: Todos', value: 'TODOS' },
    { label: 'Pagados', value: 'PAGADOS' },
    { label: 'Con deuda', value: 'CON_DEUDA' },
  ];

  protected readonly visibleOpportunities = computed(() => {
    const query = this.query().trim().toLowerCase();
    const view = this.opportunityView();

    const items = this.oportunidades().filter((item) => {
      if (view === 'COTIZADAS') {
        return item.etapa === 'COTIZADO' && this.isActiveOpportunity(item);
      }
      if (view === 'NEGOCIACION') {
        return ['COTIZADO', 'NEGOCIACION'].includes(item.etapa) && this.isActiveOpportunity(item);
      }
      if (view === 'GANADAS') {
        return item.estado === 'GANADA' || item.etapa === 'GANADO';
      }
      return this.isActiveOpportunity(item);
    });

    return items.filter((item) => this.matchesOpportunityQuery(item, query));
  });

  protected readonly opportunityListItems = computed(() => {
    const stage = this.opportunityStageFilter();
    const responsable = this.opportunityResponsibleFilter();
    const status = this.opportunityStatusFilter();
    return this.visibleOpportunities()
      .filter((item) => !stage || item.etapa === stage)
      .filter((item) => !responsable || item.responsableId === responsable)
      .filter((item) => !status || (status === 'ABIERTA' ? this.isActiveOpportunity(item) : item.estado === status));
  });

  protected readonly selectedOpportunityActivities = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.actividades()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)));
  });

  protected readonly selectedOpportunityNextActivity = computed(() =>
    this.selectedOpportunityActivities()
      .filter((item) => item.estado === 'PENDIENTE')
      .sort((a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''))[0] ?? null,
  );

  protected readonly selectedOpportunityLastActivity = computed(() => this.selectedOpportunityActivities()[0] ?? null);

  protected readonly selectedOpportunityHistory = computed<OpportunityHistoryEvent[]>(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    const events: OpportunityHistoryEvent[] = [
      {
        id: `created-${opportunity.id}`,
        title: 'Oportunidad creada',
        detail: `${this.opportunityContactName(opportunity)} - ${this.quoteOfferName(opportunity)}`,
        date: opportunity.createdAt || new Date().toISOString(),
        icon: 'pi pi-briefcase',
        tone: 'blue',
      },
      ...this.selectedOpportunityActivities().map((activity) => ({
        id: `activity-${activity.id}`,
        title: activity.estado === 'REALIZADA' ? 'Actividad realizada' : 'Actividad programada',
        detail: `${this.humanize(activity.tipoActividad)} - ${activity.asunto || 'Sin asunto'}`,
        date: this.activityEffectiveDate(activity),
        icon: this.followUpActivityIcon(activity.tipoActividad),
        tone: activity.estado === 'REALIZADA' ? 'green' as const : 'amber' as const,
      })),
      ...this.selectedOpportunityQuotes().map((quote) => ({
        id: `quote-${quote.id}`,
        title: `Cotizacion ${this.quoteStatusLabel(quote)}`,
        detail: `COT-${String(quote.id).padStart(3, '0')} - S/ ${Number(quote.total || 0).toFixed(2)}`,
        date: quote.fechaEmision || new Date().toISOString(),
        icon: 'pi pi-file-edit',
        tone: 'violet' as const,
      })),
      ...this.selectedOpportunityNegotiations().map((record) => ({
        id: `negotiation-${record.id}`,
        title: `Negociacion ${this.humanize(record.resultado)}`,
        detail: `Precio final S/ ${Number(record.precioFinal || 0).toFixed(2)} - ${record.formaPago || 'Sin forma de pago'}`,
        date: record.createdAt,
        icon: 'pi pi-handshake',
        tone: record.resultado === 'ACEPTA' ? 'green' as const : record.resultado === 'RECHAZA' ? 'red' as const : 'amber' as const,
      })),
      ...this.selectedOpportunityPayments().map((payment) => ({
        id: `payment-${payment.id}`,
        title: `Pago ${this.humanize(payment.estado)}`,
        detail: `${this.humanize(payment.tipo)} - S/ ${Number(payment.monto || 0).toFixed(2)}`,
        date: payment.fecha || payment.createdAt,
        icon: 'pi pi-credit-card',
        tone: payment.estado === 'PAGADO' ? 'green' as const : payment.estado === 'VENCIDO' ? 'red' as const : 'amber' as const,
      })),
      ...this.selectedOpportunityDocuments().map((document) => ({
        id: `document-${document.id}`,
        title: 'Documento agregado',
        detail: `${this.documentCategoryLabel(document.categoria)} - ${document.nombre}`,
        date: document.createdAt,
        icon: 'pi pi-file',
        tone: 'slate' as const,
      })),
      ...this.opportunityClosureRecords()
        .filter((record) => record.oportunidadId === opportunity.id)
        .map((record) => ({
          id: `closure-${record.id}`,
          title: 'Venta cerrada',
          detail: `Documentacion validada por ${record.closedBy}`,
          date: record.closedAt,
          icon: 'pi pi-verified',
          tone: 'green' as const,
        })),
    ];
    return events
      .filter((item) => Boolean(item.date))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  });

  protected readonly opportunityDetailTabs = computed(() => {
    const opportunity = this.selectedOpportunity();
    const negotiationTabs = opportunity && this.hasNegotiationContext(opportunity)
      ? [{ tab: 'negociacion' as OpportunityDetailTab, label: 'Negociacion', icon: 'pi pi-handshake', count: this.selectedOpportunityNegotiations().length }]
      : [];
    const closureTabs = opportunity && (opportunity.estado === 'GANADA' || opportunity.etapa === 'GANADO')
      ? [{ tab: 'cierre' as OpportunityDetailTab, label: 'Cierre', icon: 'pi pi-verified', count: null }]
      : [];
    return [
      { tab: 'resumen' as OpportunityDetailTab, label: 'Resumen', icon: 'pi pi-table', count: null },
      { tab: 'actividades' as OpportunityDetailTab, label: 'Actividades', icon: 'pi pi-comments', count: this.selectedOpportunityActivities().length },
      { tab: 'cotizaciones' as OpportunityDetailTab, label: 'Cotizaciones', icon: 'pi pi-file-edit', count: this.selectedOpportunityQuotes().length },
      ...negotiationTabs,
      ...closureTabs,
      { tab: 'pagos' as OpportunityDetailTab, label: 'Pagos', icon: 'pi pi-credit-card', count: this.selectedOpportunityPayments().length },
      { tab: 'historial' as OpportunityDetailTab, label: 'Historial', icon: 'pi pi-history', count: this.selectedOpportunityHistory().length },
    ];
  });

  protected readonly opportunityStagePanel = computed<CrmStagePanel | null>(() => {
    const tab = this.activeTab();
    if (!this.isOpportunityTab(tab)) {
      return null;
    }

    const all = this.oportunidades();
    const active = all.filter((item) => this.isActiveOpportunity(item));
    const quoted = all.filter((item) => item.etapa === 'COTIZADO' && this.isActiveOpportunity(item));
    const negotiation = this.negotiationOpportunities();
    const won = this.wonOpportunities();
    const items = this.visibleOpportunities();
    const amount = this.sumOpportunityAmount(items);
    const totalAmount = this.sumOpportunityAmount(all);
    const wonAmount = this.sumOpportunityAmount(won, true);
    const risk = items.filter((item) => Number(item.probabilidad || 0) <= 30).length;
    const closeRate = this.toRate(won.length, Math.max(all.length, 1));
    const quotedToNegotiation = this.toRate(negotiation.length, Math.max(quoted.length, 1));
    const averageProbability = this.averageProbability(items);
    const wonThisMonth = this.countThisMonth(won);

    if (tab === 'cotizaciones') {
      return {
        tab,
        index: 4,
        title: 'Cotizaciones',
        detail: 'Propuestas enviadas',
        icon: 'pi pi-file-edit',
        tone: 'blue',
        count: quoted.length,
        items,
        tableTitle: 'Cotizaciones recientes',
        tableAction: 'Nueva cotizacion',
        emptyMessage: 'No hay cotizaciones en seguimiento.',
        metrics: [
          { label: 'Cotizaciones', value: String(quoted.length), delta: this.deltaLabel(quoted.length, 0), detail: 'vs mes anterior' },
          { label: 'Valor total', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'vs mes anterior' },
          { label: 'Pendientes respuesta', value: String(quoted.length), delta: 'En espera', detail: 'por responder' },
          { label: 'Tasa avance', value: `${quotedToNegotiation}%`, delta: this.deltaLabel(quotedToNegotiation, 0, true), detail: 'hacia negociacion' },
        ],
      };
    }

    if (tab === 'negociacion') {
      return {
        tab,
        index: 5,
        title: 'Negociacion',
        detail: 'Precio y cierre',
        icon: 'pi pi-handshake',
        tone: 'teal',
        count: negotiation.length,
        items,
        tableTitle: 'Negociaciones activas',
        tableAction: 'Nueva negociacion',
        emptyMessage: 'No hay oportunidades en negociacion.',
        metrics: [
          { label: 'En negociacion', value: String(negotiation.length), delta: this.deltaLabel(negotiation.length, 0), detail: 'vs mes anterior' },
          { label: 'Valor en juego', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'vs mes anterior' },
          { label: 'Interes promedio', value: this.opportunityTemperatureLabel(averageProbability), delta: this.deltaLabel(averageProbability, 0, true), detail: 'vs mes anterior' },
          { label: 'Cierres estimados', value: String(items.filter((item) => this.isThisMonth(item.fechaCierreEstimada)).length), delta: 'Este mes', detail: 'estimados' },
        ],
      };
    }

    if (tab === 'clientes') {
      const closedClients = this.clientsWonItems();
      const closedAmount = this.sumOpportunityAmount(closedClients, true);
      const closedThisMonth = closedClients.filter((item) => this.isThisMonth(this.clientClosureDate(item))).length;
      return {
        tab,
        index: 6,
        title: 'Clientes',
        detail: 'Ventas cerradas',
        icon: 'pi pi-trophy',
        tone: 'green',
        count: closedClients.length,
        items: closedClients,
        tableTitle: 'Clientes con venta cerrada',
        tableAction: 'Exportar clientes',
        emptyMessage: 'Todavia no hay ventas cerradas con documentacion validada.',
        metrics: [
          { label: 'Clientes cerrados', value: String(closedClients.length), delta: this.deltaLabel(closedClients.length, 0), detail: 'expedientes completos' },
          { label: 'Cerrados este mes', value: String(closedThisMonth), delta: this.deltaLabel(closedThisMonth, 0), detail: 'vs mes anterior' },
          { label: 'Valor total clientes', value: `S/ ${this.formatCompactAmount(closedAmount)}`, delta: this.deltaLabel(closedAmount, 0), detail: 'ventas cerradas' },
          { label: 'Documentos', value: String(closedClients.reduce((sum, item) => sum + this.clientDocumentCount(item), 0)), delta: '+0%', detail: 'expedientes' },
        ],
      };
    }

    return {
      tab,
      index: 3,
      title: 'Oportunidades',
      detail: 'Activas y cierres',
      icon: 'pi pi-briefcase',
      tone: 'amber',
      count: active.length,
      items,
      tableTitle: 'Oportunidades activas',
      tableAction: 'Nueva oportunidad',
      emptyMessage: 'Todavia no hay oportunidades activas.',
      metrics: [
        { label: 'Oportunidades', value: String(active.length), delta: this.deltaLabel(active.length, 0), detail: 'vs mes anterior' },
        { label: 'Valor total', value: `S/ ${this.formatCompactAmount(amount)}`, delta: this.deltaLabel(amount, 0), detail: 'vs mes anterior' },
        { label: 'Interes frio', value: String(risk), delta: risk ? 'Atencion requerida' : 'Sin riesgo critico', detail: 'requiere impulso comercial', danger: risk > 0 },
        { label: 'Tasa cierre', value: `${closeRate}%`, delta: this.deltaLabel(closeRate, 0, true), detail: 'vs mes anterior' },
      ],
    };
  });

  protected readonly opportunityPanelTitle = computed(() => {
    switch (this.opportunityView()) {
      case 'COTIZADAS':
        return 'Cotizaciones enviadas';
      case 'NEGOCIACION':
        return 'Negociaciones activas';
      case 'GANADAS':
        return 'Oportunidades ganadas';
      default:
        return 'Oportunidades activas';
    }
  });

  protected readonly opportunityPanelDescription = computed(() => {
    switch (this.opportunityView()) {
      case 'COTIZADAS':
        return 'Propuestas comerciales listas para respuesta del cliente o ajuste final.';
      case 'NEGOCIACION':
        return 'Casos donde el equipo comercial esta afinando precio, condiciones y cierre.';
      case 'GANADAS':
        return 'Negocios cerrados con exito para seguimiento de conversion y postventa.';
      default:
        return 'Vista unificada de negocios abiertos antes del cierre comercial.';
    }
  });

  protected readonly opportunityEmptyMessage = computed(() => {
    switch (this.opportunityView()) {
      case 'COTIZADAS':
        return 'No hay cotizaciones en seguimiento.';
      case 'NEGOCIACION':
        return 'No hay oportunidades en negociacion.';
      case 'GANADAS':
        return 'Todavia no hay oportunidades ganadas.';
      default:
        return 'Todavia no hay oportunidades activas.';
    }
  });

  protected readonly filteredActividades = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.actividades().filter((item) =>
      !query ||
      `${item.asunto} ${item.prospectoNombre ?? ''} ${item.oportunidadTitulo ?? ''} ${item.tipoActividad} ${item.estado}`
        .toLowerCase()
        .includes(query),
    );
  });

  protected readonly followUpStatCards = computed<FollowUpStatCard[]>(() => {
    const pending = this.actividades().filter((item) => item.estado === 'PENDIENTE');
    const completed = this.actividades().filter((item) => item.estado === 'REALIZADA');
    return [
      {
        label: 'Pendientes hoy',
        value: pending.filter((item) => this.isToday(item.fechaProgramada)).length,
        detail: 'Acciones que vencen durante el dia',
        tone: 'blue',
      },
      {
        label: 'Vencidas',
        value: pending.filter((item) => this.isOverdue(item.fechaProgramada)).length,
        detail: 'Requieren atencion inmediata',
        tone: 'red',
      },
      {
        label: 'Esta semana',
        value: pending.filter((item) => this.isThisWeek(item.fechaProgramada)).length,
        detail: 'Tareas comerciales programadas',
        tone: 'amber',
      },
      {
        label: 'Completadas',
        value: completed.length,
        detail: 'Historial de gestiones realizadas',
        tone: 'green',
      },
    ];
  });

  protected readonly commercialInbox = computed<CommercialInboxCard[]>(() =>
    this.followUpProspects()
      .map((prospecto) => {
        const prospectActivities = this.actividades()
          .filter((item) => item.prospectoId === prospecto.id)
          .sort((a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''));
        const pending = prospectActivities.filter((item) => item.estado === 'PENDIENTE');
        const done = prospectActivities
          .filter((item) => item.estado !== 'PENDIENTE')
          .sort((a, b) => Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)));
        const nextActivity = pending[0];
        const lastActivity = done[0] ?? [...prospectActivities].reverse()[0];
        const oportunidad = this.activeOpportunityForProspect(prospecto.id);
        const displayOpportunity = oportunidad ?? this.oportunidades()
          .filter((item) => item.prospectoId === prospecto.id)
          .sort((a, b) => Number(b.montoEstimado || 0) - Number(a.montoEstimado || 0))[0];
        return {
          prospecto,
          oportunidad: displayOpportunity,
          hasActiveOpportunity: Boolean(oportunidad),
          lastActivity,
          nextActivity,
          priority: this.followUpPriority(nextActivity, lastActivity),
          priorityLabel: this.followUpPriorityLabel(nextActivity, lastActivity),
          interestLabel: this.prospectInterestLabel(prospecto, displayOpportunity),
          interestTone: this.prospectInterestTone(prospecto, displayOpportunity),
          amount: Number(displayOpportunity?.montoEstimado ?? prospecto.presupuestoEstimado ?? 0),
          stageProgress: this.prospectStageProgress(prospecto, displayOpportunity),
          qualification: this.prospectQualification(prospecto),
        };
      })
      .sort((a, b) => this.followUpPriorityOrder(a.priority) - this.followUpPriorityOrder(b.priority)),
  );

  protected readonly followUpFilters = computed<FollowUpFilterOption[]>(() => {
    const inbox = this.commercialInbox();
    return [
      { value: 'TODAS', label: 'Todas', icon: 'pi pi-list', count: inbox.length },
      { value: 'MIS', label: 'Mis actividades', icon: 'pi pi-user', count: inbox.filter((item) => item.prospecto.responsableId === this.currentUserKey()).length },
      { value: 'PENDIENTES', label: 'Pendientes', icon: 'pi pi-calendar-clock', count: inbox.filter((item) => Boolean(item.nextActivity)).length },
      { value: 'HOY', label: 'Hoy', icon: 'pi pi-clock', count: inbox.filter((item) => item.priority === 'today').length },
      { value: 'VENCIDAS', label: 'Vencidas', icon: 'pi pi-exclamation-triangle', count: inbox.filter((item) => item.priority === 'overdue').length },
      { value: 'SIN_ACTIVIDAD', label: 'Sin actividad', icon: 'pi pi-minus-circle', count: inbox.filter((item) => !item.nextActivity && !item.lastActivity).length },
      { value: 'LLAMADAS', label: 'Llamadas', icon: 'pi pi-phone', count: inbox.filter((item) => this.followUpHasActivityType(item, 'LLAMADA')).length },
      { value: 'VISITAS', label: 'Visitas', icon: 'pi pi-building', count: inbox.filter((item) => this.followUpHasActivityType(item, 'VISITA', 'REUNION')).length },
      { value: 'CORREOS', label: 'Correos', icon: 'pi pi-envelope', count: inbox.filter((item) => this.followUpHasActivityType(item, 'CORREO')).length },
    ];
  });

  protected readonly followUpStageCards = computed<FollowUpStageCard[]>(() => [
    {
      tab: 'captacion',
      label: 'Prospectos',
      detail: 'Entradas nuevas',
      icon: 'pi pi-user-plus',
      count: this.captationProspectItems().length,
      tone: 'green',
    },
    {
      tab: 'seguimiento',
      label: 'Seguimiento',
      detail: 'Tareas y contactos',
      icon: 'pi pi-comments',
      count: this.commercialInbox().length,
      tone: 'blue',
    },
    {
      tab: 'oportunidades',
      label: 'Oportunidades',
      detail: 'Negocio completo',
      icon: 'pi pi-briefcase',
      count: this.oportunidades().filter((item) => this.isActiveOpportunity(item)).length,
      tone: 'violet',
    },
    {
      tab: 'clientes',
      label: 'Clientes',
      detail: 'Postventa',
      icon: 'pi pi-trophy',
      count: this.clientsDashboardItems().length,
      tone: 'emerald',
    },
  ]);

  protected readonly followUpTableTabs = computed<FollowUpTableTab[]>(() => {
    const inbox = this.commercialInbox();
    return [
      { value: 'TODAS', label: 'En seguimiento', count: inbox.length },
      { value: 'PENDIENTES', label: 'Pendientes', count: inbox.filter((item) => Boolean(item.nextActivity)).length },
      { value: 'VENCIDAS', label: 'Vencidas', count: inbox.filter((item) => item.priority === 'overdue').length },
      { value: 'SIN_ACTIVIDAD', label: 'Sin actividad', count: inbox.filter((item) => !item.nextActivity && !item.lastActivity).length },
    ];
  });

  protected readonly followUpContactOptions = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Pendiente contacto', value: 'PENDIENTE' },
    { label: 'En contacto', value: 'CONTACTADO' },
    { label: 'En oportunidad', value: 'OPORTUNIDAD' },
    { label: 'Sin canal', value: 'SIN_CANAL' },
  ];

  protected readonly followUpInterestOptions = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Alto', value: 'Alto' },
    { label: 'Medio', value: 'Medio' },
    { label: 'Bajo', value: 'Bajo' },
  ];

  protected readonly followUpDateOptions = [
    { label: 'Todos', value: 'TODOS' },
    { label: 'Vencidas', value: 'VENCIDAS' },
    { label: 'Hoy', value: 'HOY' },
    { label: 'Proximos dias', value: 'PROXIMOS' },
    { label: 'Sin fecha', value: 'SIN_FECHA' },
  ];

  protected readonly followUpResponsibleOptions = computed(() => {
    const values = new Set<string>();
    for (const item of this.commercialInbox()) {
      if (item.prospecto.responsableId) {
        values.add(String(item.prospecto.responsableId));
      }
      if (item.nextActivity?.usuarioId) {
        values.add(String(item.nextActivity.usuarioId));
      }
    }
    return [
      { label: 'Todos', value: 'TODOS' },
      ...Array.from(values)
        .sort((a, b) => this.responsibleName(a).localeCompare(this.responsibleName(b)))
        .map((value) => ({ label: this.responsibleName(value), value })),
    ];
  });

  protected readonly followUpOriginOptions = computed(() => {
    const origins = Array.from(new Set(this.commercialInbox().map((item) => this.followUpOrigin(item)).filter(Boolean))).sort();
    return [
      { label: 'Todos', value: 'TODOS' },
      ...origins.map((value) => ({ label: this.humanize(value), value })),
    ];
  });

  protected readonly filteredCommercialInbox = computed(() => {
    const filter = this.followUpFilter();
    const query = this.query().trim().toLowerCase();
    const contactFilter = this.followUpContactFilter();
    const responsibleFilter = this.followUpResponsibleFilter();
    const originFilter = this.followUpOriginFilter();
    const interestFilter = this.followUpInterestFilter();
    const dateFilter = this.followUpDateFilter();
    return this.commercialInbox()
      .filter((item) => {
        if (filter === 'MIS') {
          return item.prospecto.responsableId === this.currentUserKey() || item.nextActivity?.usuarioId === this.currentUserKey();
        }
        if (filter === 'PENDIENTES') {
          return Boolean(item.nextActivity);
        }
        if (filter === 'HOY') {
          return item.priority === 'today';
        }
        if (filter === 'VENCIDAS') {
          return item.priority === 'overdue';
        }
        if (filter === 'SIN_ACTIVIDAD') {
          return !item.nextActivity && !item.lastActivity;
        }
        if (filter === 'LLAMADAS') {
          return this.followUpHasActivityType(item, 'LLAMADA');
        }
        if (filter === 'VISITAS') {
          return this.followUpHasActivityType(item, 'VISITA', 'REUNION');
        }
        if (filter === 'CORREOS') {
          return this.followUpHasActivityType(item, 'CORREO');
        }
        return true;
      })
      .filter((item) => contactFilter === 'TODOS' || this.matchesFollowUpContactFilter(item, contactFilter))
      .filter((item) =>
        responsibleFilter === 'TODOS' ||
        item.prospecto.responsableId === responsibleFilter ||
        item.nextActivity?.usuarioId === responsibleFilter,
      )
      .filter((item) => originFilter === 'TODOS' || this.followUpOrigin(item) === originFilter)
      .filter((item) => interestFilter === 'TODOS' || item.interestLabel === interestFilter)
      .filter((item) => dateFilter === 'TODOS' || this.matchesFollowUpDateFilter(item, dateFilter))
      .filter((item) =>
        !query ||
        `${item.prospecto.nombre} ${item.prospecto.telefono ?? ''} ${item.prospecto.correo ?? ''} ${item.prospecto.interesPrincipal ?? ''} ${item.prospecto.estado} ${this.followUpOrigin(item)} ${item.nextActivity?.asunto ?? ''} ${item.lastActivity?.asunto ?? ''}`
          .toLowerCase()
          .includes(query),
      );
  });

  protected readonly followUpTimeline = computed<FollowUpTimelineEvent[]>(() =>
    [...this.actividades()]
      .sort((a, b) => Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)))
      .slice(0, 8)
      .map((item) => ({
        title: this.humanize(item.tipoActividad),
        subtitle: `${item.asunto} - ${item.prospectoNombre || item.oportunidadTitulo || item.clienteNombre || 'Sin relacion'}`,
        date: this.activityEffectiveDate(item),
        icon: this.activityIcon(item.tipoActividad),
        tone: item.estado === 'REALIZADA' ? 'green' : this.isOverdue(item.fechaProgramada) ? 'red' : this.isToday(item.fechaProgramada) ? 'amber' : 'blue',
      })),
  );

  protected readonly selectedFollowUpCard = computed(() => {
    const selectedId = this.selectedFollowUpProspectId();
    if (!selectedId) {
      return null;
    }
    const items = this.filteredCommercialInbox();
    return items.find((item) => item.prospecto.id === selectedId) ?? null;
  });

  protected readonly selectedFollowUpActivities = computed(() => {
    const prospectId = this.selectedFollowUpCard()?.prospecto.id;
    if (!prospectId) {
      return [];
    }
    return this.actividades()
      .filter((item) => item.prospectoId === prospectId)
      .sort((a, b) => Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)));
  });

  protected readonly selectedFollowUpHistory = computed(() =>
    this.selectedFollowUpActivities().filter((item) => item.estado !== 'PENDIENTE').slice(0, 8),
  );

  protected readonly selectedFollowUpUpcoming = computed(() =>
    this.selectedFollowUpActivities()
      .filter((item) => item.estado === 'PENDIENTE')
      .sort((a, b) => Date.parse(a.fechaProgramada) - Date.parse(b.fechaProgramada))
      .slice(0, 5),
  );

  protected readonly selectedFollowUpOpportunities = computed(() => {
    const prospectId = this.selectedFollowUpCard()?.prospecto.id;
    if (!prospectId) {
      return [];
    }
    return this.oportunidades().filter((item) => item.prospectoId === prospectId);
  });

  protected readonly prospectoOptions = computed(() =>
    this.prospectos()
      .filter((item) => item.estado !== 'DESCARTADO')
      .map((item) => ({
        label: `${item.nombre}${item.numeroDocumento ? ` - ${item.numeroDocumento}` : ''}`,
        value: item.id,
      })),
  );

  protected readonly oportunidadOptions = computed(() =>
    this.oportunidades()
      .filter((item) => this.isActiveOpportunity(item))
      .map((item) => ({
        label: `${item.titulo} (${this.humanize(item.etapa)})`,
        value: item.id,
      })),
  );

  protected readonly clienteOptions = computed(() =>
    this.clientes().map((item) => ({
      label: `${item.numeroDocumento} - ${item.nombre}`,
      value: item.id,
    })),
  );

  protected readonly sucursalOptions = computed(() =>
    this.sucursales()
      .filter((item) => item.activo)
      .map((item) => ({
        label: `${item.codigo} - ${item.nombre}`,
        value: item.id,
      })),
  );

  protected readonly productoOptions = computed(() =>
    this.productos().map((item) => ({
      label: `${item.sku} - ${item.nombre}`,
      value: item.id,
    })),
  );

  protected readonly catalogoOptions = computed(() =>
    this.catalogoItems()
      .filter((item) => item.estado === 'ACTIVO')
      .map((item) => ({
        label: `${this.opportunityTypeLabel(item.tipoItem)} - ${item.nombre}`,
        value: item.id,
        tipoItem: item.tipoItem,
      })),
  );

  protected selectedProspectCatalogItem(): CrmCatalogoItem | null {
    return this.catalogoItems().find((item) => item.id === this.prospectForm.catalogoItemId) ?? null;
  }

  constructor() {
    const initialTab = this.route.snapshot.data['initialTab'] as CrmTab | undefined;
    if (initialTab) {
      this.setTab(initialTab, false);
    }
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      prospectos: this.api.listCrmProspectos(),
      oportunidades: this.api.listCrmOportunidades(),
      etapas: this.api.listCrmEtapas().pipe(catchError(() => of([] as CrmEtapaPipeline[]))),
      catalogo: this.api.listCrmCatalogo().pipe(catchError(() => of([] as CrmCatalogoItem[]))),
      actividades: this.api.listCrmActividades(),
      clientes: this.api.listClientes().pipe(catchError(() => of([] as Cliente[]))),
      productos: this.api.listProductos().pipe(catchError(() => of([] as Producto[]))),
      sucursales: this.api.listSucursales().pipe(catchError(() => of([] as Sucursal[]))),
      usuarios: this.api.listUsuarios().pipe(catchError(() => of([] as UsuarioTenant[]))),
      cotizaciones: this.api.listCotizaciones().pipe(catchError(() => of([] as Cotizacion[]))),
      promociones: this.api.listPromocionesCotizacion().pipe(catchError(() => of([] as PromocionCotizacion[]))),
      integraciones: this.api.listCrmIntegraciones().pipe(catchError(() => of([] as CrmCanalTokenConfig[]))),
      dashboard: this.api.getCrmDashboard().pipe(catchError(() => of(null))),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ prospectos, oportunidades, etapas, catalogo, actividades, clientes, productos, sucursales, usuarios, cotizaciones, promociones, integraciones, dashboard }) => {
          this.prospectos.set(prospectos);
          this.reconcileProspectSelection(prospectos);
          this.oportunidades.set(oportunidades);
          this.reconcileLocalOpportunityRecords(oportunidades);
          this.etapas.set(etapas);
          this.catalogoItems.set(catalogo);
          this.actividades.set(actividades);
          this.clientes.set(clientes);
          this.productos.set(productos);
          this.sucursales.set(sucursales);
          this.usuarios.set(usuarios);
          this.cotizaciones.set(cotizaciones);
          this.promocionesCotizacion.set(promociones);
          this.crmIntegraciones.set(integraciones);
          this.dashboard.set(dashboard);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected setTab(tab: CrmTab, navigate = true): void {
    if (this.activeTab() !== tab) {
      this.query.set('');
    }
    this.activeTab.set(tab);
    const mappedView = this.opportunityViewForTab(tab);
    if (mappedView) {
      this.opportunityView.set(mappedView);
    }
    if (navigate) {
      void this.router.navigateByUrl(this.routeForTab(tab));
    }
  }

  protected routeForTab(tab: CrmTab): string {
    const routes: Record<CrmTab, string> = {
      dashboard: '/admin/crm',
      captacion: '/admin/crm/prospectos',
      seguimiento: '/admin/crm/seguimiento',
      embudo: '/admin/crm/pipeline',
      oportunidades: '/admin/crm/oportunidades',
      cotizaciones: '/admin/crm/oportunidades',
      negociacion: '/admin/crm/oportunidades',
      clientes: '/admin/crm/clientes',
      seguimientoPagos: '/admin/crm/seguimiento-pagos',
      catalogo: '/admin/crm/productos',
      administracion: '/admin/crm/administracion',
    };
    return routes[tab];
  }

  protected isOpportunityTab(tab: CrmTab = this.activeTab()): boolean {
    return ['oportunidades', 'clientes'].includes(tab);
  }

  protected isCommercialStageTab(tab: CrmTab = this.activeTab()): boolean {
    return ['captacion', 'seguimiento', 'oportunidades', 'clientes', 'seguimientoPagos'].includes(tab);
  }

  private opportunityViewForTab(tab: CrmTab): OpportunityView | null {
    const views: Partial<Record<CrmTab, OpportunityView>> = {
      oportunidades: 'ABIERTAS',
      cotizaciones: 'COTIZADAS',
      negociacion: 'NEGOCIACION',
      clientes: 'GANADAS',
    };
    return views[tab] ?? null;
  }

  private tabForOpportunity(item: CrmOportunidad): CrmTab {
    if (item.estado === 'GANADA' || item.etapa === 'GANADO') {
      return 'clientes';
    }
    if (item.etapa === 'NEGOCIACION') {
      return 'negociacion';
    }
    return 'oportunidades';
  }

  private isActiveOpportunity(item: CrmOportunidad): boolean {
    return !this.isSaleClosed(item) && !['GANADA', 'PERDIDA'].includes(item.estado) && !['GANADO', 'PERDIDO'].includes(item.etapa);
  }

  private hasClosedSaleForProspect(prospectoId: number | null | undefined): boolean {
    if (!prospectoId) {
      return false;
    }
    return this.oportunidades().some((item) => item.prospectoId === prospectoId && this.isSaleClosed(item));
  }

  private activeOpportunityForProspect(prospectoId: number | null | undefined): CrmOportunidad | null {
    if (!prospectoId) {
      return null;
    }
    return this.oportunidades()
      .filter((item) => item.prospectoId === prospectoId && this.isActiveOpportunity(item))
      .sort((a, b) => Number(b.montoEstimado || 0) - Number(a.montoEstimado || 0))[0] ?? null;
  }

  private opportunityForActivity(activity: CrmActividad): CrmOportunidad | null {
    if (activity.oportunidadId) {
      return this.oportunidades().find((item) => item.id === activity.oportunidadId) ?? null;
    }
    return this.activeOpportunityForProspect(activity.prospectoId);
  }

  private stageOptionByValue(value: string | null | undefined): PipelineStageOption | null {
    const code = String(value || '').toUpperCase();
    return this.etapaOptions().find((stage) => stage.value === code && stage.id) ?? null;
  }

  private shouldAutoAdvanceOpportunity(current: string | null | undefined, target: string | null | undefined): boolean {
    const stages = this.etapaOptions();
    const currentIndex = stages.findIndex((stage) => stage.value === current);
    const targetIndex = stages.findIndex((stage) => stage.value === target);
    return currentIndex >= 0 && targetIndex >= 0 && targetIndex > currentIndex;
  }

  private targetStageFromActivityResult(result: string | null | undefined): string | null {
    switch (String(result || '').toUpperCase()) {
      case 'CONTACTADO':
      case 'REPROGRAMADO':
        return 'CONTACTADO';
      case 'INTERESADO':
      case 'MUY_INTERESADO':
      case 'SOLICITA_PROPUESTA':
      case 'COTIZACION_SOLICITADA':
        return 'INTERESADO';
      default:
        return null;
    }
  }

  private autoAdvanceOpportunityAfterActivity(activity: CrmActividad) {
    if (activity.estado !== 'REALIZADA') {
      return of(null as CrmOportunidad | null);
    }
    const opportunity = this.opportunityForActivity(activity);
    const target = this.stageOptionByValue(this.targetStageFromActivityResult(activity.resultadoContacto));
    if (!opportunity || !target?.id || !this.shouldAutoAdvanceOpportunity(opportunity.etapa, target.value)) {
      return of(null as CrmOportunidad | null);
    }
    const observation = `Avance automatico por actividad ${this.humanize(activity.tipoActividad)}: ${this.humanize(activity.resultadoContacto)}`;
    return this.api.moverCrmOportunidadEtapa(opportunity.id, Number(target.id), observation).pipe(
      map((saved) => {
        this.upsertOpportunity(saved);
        return saved;
      }),
      catchError((error: unknown) => {
        this.errorMessage.set(`Actividad guardada, pero no se pudo actualizar el pipeline: ${this.resolveError(error)}`);
        return of(null as CrmOportunidad | null);
      }),
    );
  }

  private hasProspectActivity(prospectoId: number | null | undefined): boolean {
    return !!prospectoId && this.actividades().some((item) => item.prospectoId === prospectoId);
  }

  private isAutomaticLead(item: CrmProspecto): boolean {
    return (item.canalIngreso || 'MANUAL') !== 'MANUAL';
  }

  private captationProspectItems(): CrmProspecto[] {
    return this.incomingNewLeads();
  }

  private uniqueProspectValues(field: 'estado' | 'origen' | 'campania'): string[] {
    return [...new Set(this.incomingNewLeads().map((item) => {
      if (field === 'campania') {
        return item.campania?.trim() || 'Sin campania';
      }
      return String(item[field] || '').trim();
    }).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }

  private matchesProspectDateRange(item: CrmProspecto, dateFrom: string, dateTo: string): boolean {
    const date = (item.createdAt || item.fechaInteres || item.updatedAt || '').slice(0, 10);
    if (!date) {
      return !dateFrom && !dateTo;
    }
    return (!dateFrom || date >= dateFrom) && (!dateTo || date <= dateTo);
  }

  protected prospectCanMoveToFollowUp(item: CrmProspecto): boolean {
    return item.estado === 'NUEVO';
  }

  protected prospectProductName(item: CrmProspecto): string {
    const catalog = this.catalogoItems().find((catalogo) => Number(catalogo.id) === Number(item.catalogoItemId));
    return item.interesPrincipal?.trim() || catalog?.nombre || this.opportunityTypeLabel(item.tipoInteres);
  }

  protected prospectProductType(item: CrmProspecto): string {
    const catalog = this.catalogoItems().find((catalogo) => Number(catalogo.id) === Number(item.catalogoItemId));
    return this.opportunityTypeLabel(catalog?.tipoItem || item.tipoInteres);
  }

  protected prospectCompanyLabel(item: CrmProspecto): string {
    return item.razonSocial || item.nombreComercial || 'Sin empresa';
  }

  protected prospectCampaignLabel(item: CrmProspecto): string {
    return item.campania?.trim() || 'Sin campania';
  }

  protected prospectOriginIcon(item: CrmProspecto): string {
    const origin = String(item.canalIngreso || item.origen || '').toUpperCase();
    if (origin.includes('FACEBOOK')) {
      return 'pi pi-facebook';
    }
    if (origin.includes('INSTAGRAM')) {
      return 'pi pi-instagram';
    }
    if (origin.includes('WHATSAPP')) {
      return 'pi pi-whatsapp';
    }
    if (origin.includes('LINKEDIN')) {
      return 'pi pi-linkedin';
    }
    return 'pi pi-globe';
  }

  protected prospectOriginLabel(item: CrmProspecto): string {
    return this.humanize(item.origen || item.canalIngreso || 'WEB');
  }

  protected prospectOriginTag(item: CrmProspecto): string {
    return this.humanize(item.canalIngreso || item.origen || 'MANUAL');
  }

  protected prospectStatusClass(status: string | null | undefined): string {
    const normalized = String(status || 'NUEVO').toUpperCase();
    if (['CALIFICADO', 'CONVERTIDO'].includes(normalized)) {
      return 'qualified';
    }
    if (['CONTACTADO', 'EN_ESPERA'].includes(normalized)) {
      return 'follow';
    }
    if (['PERDIDO', 'DESCARTADO', 'NO_INTERESADO'].includes(normalized)) {
      return 'discarded';
    }
    return 'new';
  }

  private hasProspectCompletedContact(prospectoId: number | null | undefined): boolean {
    return !!prospectoId && this.actividades().some((item) =>
      item.prospectoId === prospectoId &&
      item.estado === 'REALIZADA' &&
      ['LLAMADA', 'WHATSAPP', 'CORREO', 'REUNION', 'VISITA'].includes(item.tipoActividad),
    );
  }

  private hasProspectConfirmedInterest(prospectoId: number | null | undefined): boolean {
    return !!prospectoId && this.actividades().some((item) =>
      item.prospectoId === prospectoId &&
      item.estado === 'REALIZADA' &&
      (
        ['INTERESADO', 'MUY_INTERESADO', 'SOLICITA_PROPUESTA', 'COTIZACION_SOLICITADA'].includes(String(item.resultadoContacto || '')) ||
        ['MEDIO', 'ALTO', 'TIBIO', 'CALIENTE'].includes(String(item.nivelInteres || '').toUpperCase())
      ),
    );
  }

  protected setOpportunityView(view: OpportunityView): void {
    this.opportunityView.set(view);
  }

  protected openCreateProspect(): void {
    this.prospectForm = this.emptyProspectForm();
    this.activeDialog.set('prospecto');
  }

  protected openEditProspect(item: CrmProspecto): void {
    this.prospectForm = {
      id: item.id,
      tipoPersona: item.tipoPersona || 'NATURAL',
      tipoDocumento: item.tipoDocumento || '',
      numeroDocumento: item.numeroDocumento || '',
      nombre: item.nombre || '',
      razonSocial: item.razonSocial || '',
      nombreComercial: item.nombreComercial || '',
      telefono: item.telefono || '',
      correo: item.correo || '',
      direccion: item.direccion || '',
      origen: item.origen || 'WHATSAPP',
      canalIngreso: item.canalIngreso || 'MANUAL',
      campania: item.campania || '',
      landingUrl: item.landingUrl || '',
      mensaje: item.mensaje || '',
      estado: item.estado || 'NUEVO',
      responsableId: item.responsableId || this.currentUserKey(),
      observacion: item.observacion || '',
      tipoInteres: this.normalizeOpportunityType(item.tipoInteres),
      interesPrincipal: item.interesPrincipal || '',
      interesDetalle: item.interesDetalle || '',
      presupuestoEstimado: Number(item.presupuestoEstimado || 0),
      fechaInteres: item.fechaInteres || '',
      catalogoItemId: item.catalogoItemId ?? null,
      metadataJson: item.metadataJson || '',
    };
    this.activeDialog.set('prospecto');
  }

  protected saveProspect(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.prospectForm.nombre.trim()) {
      this.errorMessage.set('El nombre del prospecto es obligatorio.');
      return;
    }
    if (!this.prospectForm.catalogoItemId && this.catalogoItems().some((item) => item.estado === 'ACTIVO')) {
      this.errorMessage.set('Selecciona la oferta o producto CRM que interesa al prospecto.');
      return;
    }

    const request = {
      tipoPersona: this.prospectForm.tipoPersona,
      tipoDocumento: this.prospectForm.tipoDocumento || null,
      numeroDocumento: this.prospectForm.numeroDocumento.trim() || null,
      nombre: this.prospectForm.nombre.trim(),
      razonSocial: this.prospectForm.razonSocial.trim() || null,
      nombreComercial: this.prospectForm.nombreComercial.trim() || null,
      telefono: this.prospectForm.telefono.trim() || null,
      correo: this.prospectForm.correo.trim() || null,
      direccion: this.prospectForm.direccion.trim() || null,
      origen: this.prospectForm.origen,
      canalIngreso: this.prospectForm.canalIngreso || 'MANUAL',
      campania: this.isManualProspect() ? 'Ingreso manual' : this.prospectForm.campania.trim() || null,
      landingUrl: this.isManualProspect() ? null : this.prospectForm.landingUrl.trim() || null,
      mensaje: this.isManualProspect() ? null : this.prospectForm.mensaje.trim() || null,
      tipoInteres: this.prospectForm.tipoInteres,
      interesPrincipal: this.prospectForm.interesPrincipal.trim() || null,
      interesDetalle: this.prospectForm.interesDetalle.trim() || null,
      presupuestoEstimado: Number(this.prospectForm.presupuestoEstimado || 0),
      fechaInteres: this.prospectForm.fechaInteres || null,
      catalogoItemId: this.prospectForm.catalogoItemId,
      metadataJson: this.prospectForm.metadataJson.trim() || null,
      estado: this.prospectForm.estado,
      responsableId: this.prospectForm.responsableId.trim() || null,
      observacion: this.prospectForm.observacion.trim() || null,
    };

    this.saving.set(true);
    const operation = this.prospectForm.id
      ? this.api.updateCrmProspecto(this.prospectForm.id, request)
      : this.api.createCrmProspecto(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.upsertProspect(saved);
        this.activeDialog.set(null);
        this.successMessage.set('Prospecto guardado correctamente.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected convertProspect(item: CrmProspecto): void {
    this.actionId.set(item.id);
    this.api
      .convertirCrmProspectoCliente(item.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Prospecto convertido a cliente.');
          this.load();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected moveProspectToFollowUp(item: CrmProspecto): void {
    if (!this.prospectCanMoveToFollowUp(item)) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.actionId.set(item.id);
    const existingActivities = this.hasProspectActivity(item.id);
    (existingActivities ? of([] as CrmActividad[]) : this.createInitialFollowUpActivities(item))
      .pipe(
        switchMap((actividades) =>
          this.api.updateCrmProspecto(item.id, { estado: 'EN_ESPERA' }).pipe(
            map((saved) => ({ actividades, saved })),
          ),
        ),
        finalize(() => this.actionId.set(null)),
      )
      .subscribe({
        next: ({ actividades, saved }) => {
          actividades.forEach((activity) => this.upsertActivity(activity));
          this.upsertProspect(saved);
          this.successMessage.set(
            actividades.length
              ? 'Prospecto enviado a seguimiento. Se programaron llamada, WhatsApp y correo; aun no esta contactado.'
              : 'Prospecto enviado a seguimiento con sus actividades existentes.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected isManualProspect(): boolean {
    return (this.prospectForm.canalIngreso || 'MANUAL').toUpperCase() === 'MANUAL';
  }

  protected openCreateCatalogo(): void {
    if (!this.canManageCrmCatalog()) {
      this.errorMessage.set('No tienes permisos para administrar el catalogo CRM.');
      return;
    }
    this.catalogoForm = this.emptyCatalogoForm();
    this.catalogStep.set('select');
    this.catalogDrawerOpen.set(true);
  }

  protected openEditCatalogo(item: CrmCatalogoItem): void {
    if (!this.canManageCrmCatalog()) {
      this.errorMessage.set('No tienes permisos para administrar el catalogo CRM.');
      return;
    }
    this.catalogoForm = {
      id: item.id,
      tipoItem: this.normalizeOpportunityType(item.tipoItem),
      nombre: item.nombre,
      descripcion: item.descripcion || '',
      precioReferencial: Number(item.precioReferencial || 0),
      estado: item.estado || 'ACTIVO',
      metadataJson: item.metadataJson || '',
      publicEnabled: item.publicEnabled !== false,
      landingSlug: item.landingSlug || '',
      atributos: this.extractCatalogAttributes(item.metadataJson),
    };
    this.catalogStep.set('form');
    this.catalogDrawerOpen.set(true);
  }

  protected saveCatalogo(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.canManageCrmCatalog()) {
      this.errorMessage.set('No tienes permisos para administrar el catalogo CRM.');
      return;
    }
    if (!this.catalogoForm.nombre.trim()) {
      this.errorMessage.set('El nombre del item comercial es obligatorio.');
      return;
    }
    if (Number(this.catalogoForm.precioReferencial || 0) < 0) {
      this.errorMessage.set('El precio referencial no puede ser negativo.');
      return;
    }
    this.catalogoForm.atributos = this.cleanCatalogAttributes();
    const request = {
      tipoItem: this.catalogoForm.tipoItem,
      nombre: this.catalogoForm.nombre.trim(),
      descripcion: this.catalogoForm.descripcion.trim(),
      precioReferencial: Number(this.catalogoForm.precioReferencial || 0),
      estado: this.catalogoForm.estado,
      metadataJson: this.buildCatalogMetadata(),
      publicEnabled: this.catalogoForm.publicEnabled,
      landingSlug: this.catalogoForm.landingSlug.trim() || null,
    };
    this.saving.set(true);
    const operation = this.catalogoForm.id
      ? this.api.updateCrmCatalogoItem(this.catalogoForm.id, request)
      : this.api.createCrmCatalogoItem(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.upsertCatalogo(saved);
        this.catalogDrawerOpen.set(false);
        this.successMessage.set('Item del catalogo CRM guardado correctamente.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected onProspectCatalogChange(value: number | null): void {
    this.prospectForm.catalogoItemId = value;
    const item = this.catalogoItems().find((catalogo) => catalogo.id === value);
    if (!item) {
      return;
    }
    this.prospectForm.tipoInteres = this.normalizeOpportunityType(item.tipoItem);
    this.prospectForm.interesPrincipal = item.nombre;
    this.prospectForm.interesDetalle = item.descripcion || this.prospectForm.interesDetalle;
    this.prospectForm.presupuestoEstimado = Number(item.precioReferencial || this.prospectForm.presupuestoEstimado || 0);
    this.prospectForm.metadataJson = this.catalogSnapshot(item);
  }

  protected selectCatalogType(type: OpportunityType): void {
    this.catalogoForm.tipoItem = type;
    this.catalogoForm.atributos = {};
    this.catalogStep.set('form');
  }

  protected backToCatalogTypeSelection(): void {
    if (this.catalogoForm.id) {
      return;
    }
    this.catalogStep.set('select');
  }

  protected catalogFields(): CatalogField[] {
    return this.catalogFieldMap[this.catalogoForm.tipoItem] ?? this.catalogFieldMap.OTRO ?? [];
  }

  protected catalogAttribute(key: string): string | number | null {
    return this.catalogoForm.atributos[key] ?? null;
  }

  protected setCatalogAttribute(field: CatalogField, value: string | number | null): void {
    const normalized = field.type === 'number' ? Number(value || 0) || null : String(value ?? '').trim();
    this.catalogoForm.atributos = {
      ...this.catalogoForm.atributos,
      [field.key]: normalized || null,
    };
  }

  protected catalogNamePlaceholder(): string {
    const examples: Partial<Record<OpportunityType, string>> = {
      CURSO: 'Ej. Curso Excel avanzado',
      VEHICULO: 'Ej. Toyota Hilux 2021',
      INMUEBLE: 'Ej. Departamento en Miraflores',
      SEGURO: 'Ej. Seguro vehicular premium',
      SOFTWARE: 'Ej. Sistema POS mensual',
      TURISMO: 'Ej. Paquete Cusco 4D/3N',
      MAQUINARIA: 'Ej. Excavadora CAT 320',
    };
    return examples[this.catalogoForm.tipoItem] || 'Ej. Oferta comercial para landing';
  }

  protected catalogDescriptionPlaceholder(): string {
    return `Resumen para ventas: ${this.opportunityTypeMeta(this.catalogoForm.tipoItem).secondaryLabel.toLowerCase()}`;
  }

  protected catalogLandingUrl(item: CrmCatalogoItem): string {
    const tenant = this.auth.currentSession()?.tenantId || this.auth.currentSession()?.empresa?.schemaName || '';
    const params = new URLSearchParams({
      tenant,
      catalogoItemId: String(item.id),
      token: item.publicToken || '',
      campania: 'Landing CRM',
    });
    return `/crm-lead?${params.toString()}`;
  }

  protected onOpportunityCatalogChange(value: number | null): void {
    this.opportunityForm.catalogoItemId = value;
    const item = this.catalogoItems().find((catalogo) => catalogo.id === value);
    if (!item) {
      return;
    }
    this.opportunityForm.tipoOportunidad = this.normalizeOpportunityType(item.tipoItem);
    if (!this.opportunityForm.titulo.trim()) {
      this.opportunityForm.titulo = `${this.opportunityTypeLabel(item.tipoItem)} - ${item.nombre}`;
    }
    if (!this.opportunityForm.detallePrincipal.trim()) {
      this.opportunityForm.detallePrincipal = item.nombre;
    }
    if (!this.opportunityForm.detalleSecundario.trim()) {
      this.opportunityForm.detalleSecundario = item.descripcion || '';
    }
    if (!Number(this.opportunityForm.montoEstimado || 0)) {
      this.opportunityForm.montoEstimado = Number(item.precioReferencial || 0);
    }
  }

  protected openCreateOpportunity(prospecto?: CrmProspecto): void {
    const activeOpportunity = prospecto ? this.activeOpportunityForProspect(prospecto.id) : null;
    if (activeOpportunity) {
      this.openExistingOpportunity(activeOpportunity, 'El prospecto ya tiene una oportunidad activa.');
      return;
    }
    this.opportunityForm = this.emptyOpportunityForm();
    if (prospecto) {
      this.applyProspectToOpportunityForm(prospecto, true);
    }
    this.activeDialog.set('oportunidad');
  }

  protected openExistingOpportunity(item: CrmOportunidad, message = 'Oportunidad activa localizada.'): void {
    this.activeDialog.set(null);
    this.selectedFollowUpProspectId.set(null);
    this.query.set(item.titulo || item.prospectoNombre || '');
    this.setTab(this.tabForOpportunity(item));
    this.successMessage.set(message);
  }

  protected onOpportunityProspectChange(value: number | null): void {
    this.opportunityForm.prospectoId = value;
    if (value) {
      this.opportunityForm.clienteId = null;
      const prospecto = this.prospectos().find((item) => item.id === value);
      if (prospecto) {
        this.applyProspectToOpportunityForm(prospecto);
      }
    }
  }

  protected onOpportunityClientChange(value: number | null): void {
    this.opportunityForm.clienteId = value;
    if (value) {
      this.opportunityForm.prospectoId = null;
    }
  }

  protected opportunityTargetLabel(): string {
    if (this.opportunityForm.prospectoId) {
      return 'Prospecto nuevo';
    }
    if (this.opportunityForm.clienteId) {
      return 'Cliente existente';
    }
    return 'Selecciona origen';
  }

  protected selectedOpportunityProspect(): CrmProspecto | null {
    return this.prospectos().find((item) => item.id === this.opportunityForm.prospectoId) ?? null;
  }

  protected selectedOpportunityClient(): Cliente | null {
    return this.clientes().find((item) => item.id === this.opportunityForm.clienteId) ?? null;
  }

  protected selectedOpportunityCatalogItem(): CrmCatalogoItem | null {
    return this.catalogoItems().find((item) => item.id === this.opportunityForm.catalogoItemId) ?? null;
  }

  protected opportunityPersonName(): string {
    const prospecto = this.selectedOpportunityProspect();
    if (prospecto) {
      return prospecto.nombre || prospecto.razonSocial || 'Prospecto sin nombre';
    }
    const cliente = this.selectedOpportunityClient();
    return cliente?.nombre || 'Cliente no seleccionado';
  }

  protected opportunityPersonDetail(): string {
    const prospecto = this.selectedOpportunityProspect();
    if (prospecto) {
      return [
        prospecto.numeroDocumento || 'Sin documento',
        prospecto.telefono || 'Sin telefono',
        prospecto.correo || 'Sin correo',
      ].filter(Boolean).join(' · ');
    }
    const cliente = this.selectedOpportunityClient();
    return cliente ? `${cliente.tipoDocumento || 'Doc.'} ${cliente.numeroDocumento || ''}`.trim() : 'Selecciona un prospecto o cliente.';
  }

  protected opportunityInterestLabel(): string {
    const catalogo = this.selectedOpportunityCatalogItem();
    if (catalogo) {
      return catalogo.nombre;
    }
    const prospecto = this.selectedOpportunityProspect();
    return prospecto?.interesPrincipal || this.opportunityForm.detallePrincipal || 'Oferta sin definir';
  }

  protected opportunityInterestDetail(): string {
    const catalogo = this.selectedOpportunityCatalogItem();
    const prospecto = this.selectedOpportunityProspect();
    return catalogo?.descripcion || prospecto?.interesDetalle || this.opportunityForm.detalleSecundario || 'Sin detalle registrado.';
  }

  protected opportunityResponsibleLabel(): string {
    const id = this.opportunityForm.responsableId;
    const user = this.usuarios().find((item) => String(item.id) === String(id) || item.username === id);
    return user?.nombres || user?.username || id || 'Sin responsable';
  }

  protected updateCrmCloseDays(value: number | string): void {
    const days = Math.min(365, Math.max(1, Number(value || 15)));
    this.crmLocalConfig.set({ ...this.crmLocalConfig(), cierreEstimadoDias: days });
  }

  protected saveCrmLocalConfig(): void {
    this.persistCrmLocalConfig(this.crmLocalConfig());
    this.successMessage.set(`Configuracion CRM guardada: cierre automatico en ${this.crmLocalConfig().cierreEstimadoDias} dias.`);
  }

  protected crmIntegrationIcon(canal: string): string {
    return {
      WEB: 'pi pi-globe',
      WHATSAPP: 'pi pi-whatsapp',
      INSTAGRAM: 'pi pi-instagram',
      FACEBOOK: 'pi pi-facebook',
    }[canal] ?? 'pi pi-link';
  }

  protected crmIntegrationDescription(canal: string): string {
    return {
      WEB: 'Token publico para landings, formularios web y UTM.',
      WHATSAPP: 'Credenciales de WhatsApp Business para mensajes y webhooks.',
      INSTAGRAM: 'Conexion para leads y mensajes captados desde Instagram.',
      FACEBOOK: 'Configuracion para Facebook Lead Ads y formularios.',
    }[canal] ?? 'Canal externo conectado al CRM.';
  }

  protected updateCrmIntegrationField(canal: string, field: CrmIntegrationField, value: string): void {
    this.crmIntegraciones.update((items) =>
      items.map((item) => item.canal === canal ? { ...item, [field]: value } : item),
    );
  }

  protected toggleCrmIntegration(canal: string, activo: boolean): void {
    this.crmIntegraciones.update((items) =>
      items.map((item) => item.canal === canal ? { ...item, activo } : item),
    );
  }

  protected saveCrmIntegration(integration: CrmCanalTokenConfig): void {
    if (!this.canManageCrmConfig()) {
      this.errorMessage.set('No tienes permisos para administrar integraciones CRM.');
      return;
    }
    const request: UpdateCrmCanalTokenConfigRequest = {
      canal: integration.canal,
      nombre: integration.nombre?.trim() || integration.canal,
      accessToken: integration.accessToken?.trim() || null,
      verifyToken: integration.verifyToken?.trim() || null,
      webhookUrl: integration.webhookUrl?.trim() || null,
      appId: integration.appId?.trim() || null,
      phoneNumberId: integration.phoneNumberId?.trim() || null,
      activo: integration.activo,
      metadataJson: integration.metadataJson?.trim() || null,
    };
    this.integrationSaving.set(integration.canal);
    this.api
      .saveCrmIntegracion(request)
      .pipe(finalize(() => this.integrationSaving.set(null)))
      .subscribe({
        next: (saved) => {
          this.crmIntegraciones.update((items) => items.map((item) => item.canal === saved.canal ? saved : item));
          this.successMessage.set(`Integracion ${saved.nombre} guardada.`);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected opportunityTypeMeta(type = this.opportunityForm.tipoOportunidad) {
    return this.opportunityTypeOptions.find((item) => item.value === type) ?? this.opportunityTypeOptions[0];
  }

  protected openCreateStage(): void {
    this.stageForm = this.emptyStageForm();
    this.activeDialog.set('etapa');
  }

  protected saveStage(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.stageForm.codigo.trim() || !this.stageForm.nombre.trim()) {
      this.errorMessage.set('Codigo y nombre de etapa son obligatorios.');
      return;
    }
    this.saving.set(true);
    this.api
      .createCrmEtapa({
        codigo: this.stageForm.codigo.trim(),
        nombre: this.stageForm.nombre.trim(),
        orden: Number(this.stageForm.orden || this.etapas().length + 1),
        color: this.stageForm.color || '#2563eb',
        ganado: this.stageForm.ganado,
        perdido: this.stageForm.perdido,
        activo: true,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.etapas.set([...this.etapas(), saved].sort((a, b) => a.orden - b.orden));
          this.activeDialog.set(null);
          this.successMessage.set('Etapa agregada al embudo.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openEditOpportunity(item: CrmOportunidad): void {
    this.opportunityForm = {
      id: item.id,
      prospectoId: item.prospectoId ?? null,
      clienteId: item.clienteId ?? null,
      tipoOportunidad: this.normalizeOpportunityType(item.tipoOportunidad),
      catalogoItemId: item.catalogoItemId ?? null,
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      detallePrincipal: '',
      detalleSecundario: '',
      ubicacion: '',
      fechaObjetivo: '',
      cantidad: 1,
      montoEstimado: Number(item.montoEstimado || 0),
      probabilidad: Number(item.probabilidad || 0),
      etapa: item.etapa || 'NUEVO',
      fechaCierreEstimada: item.fechaCierreEstimada || '',
      responsableId: item.responsableId || this.currentUserKey(),
    };
    this.activeDialog.set('oportunidad');
  }

  protected saveOpportunity(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.opportunityForm.titulo.trim()) {
      this.errorMessage.set('El titulo de la oportunidad es obligatorio.');
      return;
    }
    if (!this.opportunityForm.prospectoId && !this.opportunityForm.clienteId) {
      this.errorMessage.set('Relaciona la oportunidad con un prospecto o cliente.');
      return;
    }
    if (!this.opportunityForm.catalogoItemId) {
      this.errorMessage.set('Selecciona una oferta del catalogo CRM para la oportunidad.');
      return;
    }
    const request = {
      prospectoId: this.opportunityForm.prospectoId,
      clienteId: this.opportunityForm.prospectoId ? null : this.opportunityForm.clienteId,
      tipoOportunidad: this.opportunityForm.tipoOportunidad,
      catalogoItemId: this.opportunityForm.catalogoItemId,
      titulo: this.opportunityForm.titulo.trim(),
      descripcion: this.buildOpportunityDescription(),
      montoEstimado: Number(this.opportunityForm.montoEstimado || 0),
      probabilidad: Number(this.opportunityForm.probabilidad || 0),
      etapa: this.opportunityForm.etapa,
      fechaCierreEstimada: this.opportunityForm.fechaCierreEstimada || null,
      responsableId: this.opportunityForm.responsableId.trim() || null,
    };

    this.saving.set(true);
    const operation = this.opportunityForm.id
      ? this.api.updateCrmOportunidad(this.opportunityForm.id, request)
      : this.api.createCrmOportunidad(request);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.upsertOpportunity(saved);
        this.activeDialog.set(null);
        this.successMessage.set('Oportunidad guardada correctamente.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected markWon(item: CrmOportunidad): void {
    if (item.etapa === 'NEGOCIACION' && !this.canCloseWon(item)) {
      this.selectedOpportunity.set(item);
      this.opportunityDetailTab.set(this.hasFinalAgreement(item) ? 'pagos' : 'negociacion');
      this.opportunityDetailOpen.set(true);
      if (!this.hasFinalAgreement(item)) {
        this.errorMessage.set('Antes de marcar como ganado registra el acuerdo final de la negociacion.');
        return;
      }
      const plan = this.opportunityPaymentPlan(item);
      this.errorMessage.set(plan.isCredit
        ? 'Antes de cerrar registra la primera cuota con su comprobante; las cuotas restantes se programaran automaticamente.'
        : 'Antes de cerrar registra el pago completo de contado y adjunta obligatoriamente el comprobante.');
      return;
    }
    this.actionId.set(item.id);
    this.api
      .marcarCrmOportunidadGanada(item.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => {
          this.upsertOpportunity(saved);
          if (this.canCloseSale(saved)) {
            this.finalizeSaleClosure(saved);
            return;
          }
          this.successMessage.set('Oportunidad marcada como ganada. Revisa los requisitos pendientes para cerrar la venta.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected hasFinalAgreement(item: CrmOportunidad): boolean {
    return this.opportunityNegotiationRecords().some((record) =>
      record.oportunidadId === item.id &&
      (record.clienteConforme || record.estado === 'CLIENTE_CONFORME' || record.estado === 'GANADA' || record.resultado === 'ACEPTA'),
    );
  }

  protected latestFinalNegotiationRecord(item: CrmOportunidad): OpportunityNegotiationRecord | null {
    return this.opportunityNegotiationRecords()
      .filter((record) =>
        record.oportunidadId === item.id &&
        (record.clienteConforme || record.estado === 'CLIENTE_CONFORME' || record.estado === 'GANADA' || record.resultado === 'ACEPTA'),
      )
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
  }

  protected hasClosingEvidence(item: CrmOportunidad): boolean {
    const hasPayment = this.opportunityPaymentRecords().some((payment) =>
      payment.oportunidadId === item.id &&
      Number(payment.monto || 0) > 0 &&
      payment.estado !== 'VENCIDO',
    );
    const hasDocument = this.opportunityDocumentRecords().some((document) =>
      document.oportunidadId === item.id &&
      ['PAGO', 'CONTRATO', 'LEGAL'].includes(document.categoria) &&
      (!!document.archivoDataUrl || !!document.archivoNombre || !!document.nombre),
    );
    return hasPayment || hasDocument;
  }

  protected hasRequiredPaymentProof(item: CrmOportunidad): boolean {
    return this.opportunityPaymentRecords().some((payment) =>
      payment.oportunidadId === item.id &&
      payment.estado === 'PAGADO' &&
      Number(payment.monto || 0) > 0 &&
      Boolean(payment.archivoDataUrl || payment.archivoNombre),
    );
  }

  protected canCloseWon(item: CrmOportunidad): boolean {
    if (!this.hasFinalAgreement(item)) {
      return false;
    }
    const money = this.opportunityFinancialSummary(item);
    const plan = this.opportunityPaymentPlan(item);
    return plan.isCredit
      ? plan.firstPaymentDone && plan.hasPaymentProof && plan.remainingProgrammed
      : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
  }

  protected isRequiredClosurePaymentRegistered(item: CrmOportunidad): boolean {
    const money = this.opportunityFinancialSummary(item);
    const plan = this.opportunityPaymentPlan(item);
    return plan.isCredit
      ? plan.firstPaymentDone && plan.hasPaymentProof
      : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
  }

  protected saleClosureChecklist(item: CrmOportunidad) {
    const quotes = this.cotizaciones().filter((quote) => Number(quote.crmOportunidadId) === Number(item.id));
    const hasFinalQuote = quotes.some((quote) =>
      ['ACEPTADA', 'CONVERTIDA'].includes(this.quoteStatusValue(quote)),
    ) || (quotes.length > 0 && this.hasFinalAgreement(item));
    const money = this.opportunityFinancialSummary(item);
    const plan = this.opportunityPaymentPlan(item);
    const hasValidPayment = plan.isCredit
      ? plan.firstPaymentDone && plan.hasPaymentProof && plan.remainingProgrammed
      : money.total > 0 && money.pending <= 0 && plan.hasPaymentProof;
    const hasAttachedDocument = this.opportunityDocumentRecords().some((document) =>
      document.oportunidadId === item.id &&
      ['PAGO', 'CONTRATO', 'LEGAL'].includes(document.categoria) &&
      Boolean(document.archivoDataUrl || document.archivoNombre),
    ) || this.opportunityPaymentRecords().some((payment) =>
      payment.oportunidadId === item.id &&
      payment.estado === 'PAGADO' &&
      Boolean(payment.archivoDataUrl || payment.archivoNombre),
    );
    return [
      { label: 'Acuerdo final aceptado por el cliente', done: this.hasFinalAgreement(item) },
      { label: 'Cotizacion final aceptada y vinculada', done: hasFinalQuote },
      { label: plan.isCredit ? 'Primera cuota pagada y cuotas restantes programadas' : 'Pago completo conciliado sin saldo pendiente', done: hasValidPayment },
      { label: 'Voucher, contrato o documento legal adjunto', done: hasAttachedDocument },
    ];
  }

  protected canCloseSale(item: CrmOportunidad): boolean {
    return this.saleClosureChecklist(item).every((check) => check.done);
  }

  protected isSaleClosed(item: CrmOportunidad): boolean {
    return this.opportunityClosureRecords().some((record) => record.oportunidadId === item.id);
  }

  protected closeWonSale(item: CrmOportunidad): void {
    if (!this.canCloseSale(item)) {
      this.errorMessage.set('Completa el acuerdo, cotizacion final, pago requerido, cuotas si aplica y documento adjunto antes de cerrar la venta.');
      return;
    }
    if (this.isSaleClosed(item)) {
      this.successMessage.set('La venta ya se encuentra cerrada.');
      return;
    }
    this.finalizeSaleClosure(item);
  }

  private registerOpportunityClosure(item: CrmOportunidad): void {
    if (this.isSaleClosed(item)) {
      return;
    }
    const record: OpportunityClosureRecord = {
      id: this.createLocalId('close'),
      oportunidadId: item.id,
      closedAt: new Date().toISOString(),
      closedBy: this.auth.currentSession()?.nombres || this.auth.currentSession()?.username || 'Usuario',
    };
    const next = [record, ...this.opportunityClosureRecords()];
    this.opportunityClosureRecords.set(next);
    this.persistOpportunityRecords(this.opportunityClosureStorageKey(), next);
  }

  private finalizeSaleClosure(item: CrmOportunidad): void {
    this.registerOpportunityClosure(item);
    this.opportunityDetailOpen.set(false);
    const prospectAlreadyConverted = Boolean(this.prospectForOpportunity(item)?.clienteId);
    if (!item.prospectoId || item.clienteId || prospectAlreadyConverted) {
      this.successMessage.set('Venta cerrada y cliente registrado.');
      this.load();
      return;
    }
    this.actionId.set(item.id);
    this.api.convertirCrmProspectoCliente(item.prospectoId)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Venta cerrada. El prospecto ahora figura como cliente.');
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage.set(`La venta se cerro, pero no se pudo actualizar la ficha del cliente: ${this.resolveError(error)}`);
          this.load();
        },
      });
  }

  protected clientOutcomeLabel(item: CrmOportunidad): string {
    if (item.estado === 'PERDIDA' || item.etapa === 'PERDIDO') {
      return 'Perdido';
    }
    return 'Ganado';
  }

  protected clientOutcomeTone(item: CrmOportunidad): 'won' | 'lost' {
    return item.estado === 'PERDIDA' || item.etapa === 'PERDIDO' ? 'lost' : 'won';
  }

  protected clientClosureRecord(item: CrmOportunidad): OpportunityClosureRecord | null {
    return this.opportunityClosureRecords()
      .filter((record) => record.oportunidadId === item.id)
      .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))[0] ?? null;
  }

  protected clientClosureDate(item: CrmOportunidad): string {
    return this.clientClosureRecord(item)?.closedAt || item.updatedAt || item.fechaCierreEstimada || item.createdAt || new Date().toISOString();
  }

  protected clientDebt(item: CrmOportunidad): number {
    return this.opportunityFinancialSummary(item).pending;
  }

  protected clientDocumentCount(item: CrmOportunidad): number {
    return this.opportunityDocumentRecords().filter((document) => document.oportunidadId === item.id).length;
  }

  protected hasNegotiationContext(item: CrmOportunidad): boolean {
    const hasRecord = this.opportunityNegotiationRecords().some((record) => record.oportunidadId === item.id);
    const hasQuoteInNegotiation = this.cotizaciones().some((quote) =>
      Number(quote.crmOportunidadId) === Number(item.id) &&
      ['NEGOCIACION', 'ACEPTADA', 'RECHAZADA'].includes(this.quoteStatusValue(quote)),
    );
    return hasRecord || hasQuoteInNegotiation || ['NEGOCIACION', 'GANADO', 'PERDIDO'].includes(item.etapa);
  }

  protected markNegotiationWon(item: CrmOportunidad): void {
    this.markWon(item);
  }

  protected markLost(item: CrmOportunidad): void {
    if (this.canCloseWon(item)) {
      this.errorMessage.set('La venta ya tiene acuerdo y pago confirmados. Debe marcarse como ganada.');
      return;
    }
    this.openOpportunityLostDialog(item);
  }

  protected openProspectLostDialog(item: CrmProspecto, event?: Event): void {
    event?.stopPropagation();
    this.lossDialog.set({ type: 'PROSPECTO', prospecto: item });
    this.lossReason.set('');
    this.lossObservation.set('');
  }

  protected openOpportunityLostDialog(item: CrmOportunidad, event?: Event): void {
    event?.stopPropagation();
    this.lossDialog.set({ type: 'OPORTUNIDAD', oportunidad: item });
    this.lossReason.set('');
    this.lossObservation.set('');
  }

  protected closeLossDialog(): void {
    this.lossDialog.set(null);
    this.lossReason.set('');
    this.lossObservation.set('');
  }

  protected lossReasonOptions() {
    return this.lossDialog()?.type === 'OPORTUNIDAD'
      ? this.opportunityLossReasonOptions
      : this.prospectLossReasonOptions;
  }

  protected saveLoss(): void {
    const context = this.lossDialog();
    const reason = this.lossReason();
    const observation = this.lossObservation().trim();
    if (!context) {
      return;
    }
    if (!reason) {
      this.errorMessage.set('Selecciona el motivo de perdida.');
      return;
    }
    const reasonLabel = this.lossReasonOptions().find((item) => item.value === reason)?.label || reason;
    const detail = observation ? `${reasonLabel}. ${observation}` : reasonLabel;
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (context.type === 'PROSPECTO' && context.prospecto) {
      this.saveProspectLoss(context.prospecto, detail);
      return;
    }
    if (context.type === 'OPORTUNIDAD' && context.oportunidad) {
      this.saveOpportunityLoss(context.oportunidad, detail);
    }
  }

  protected moveOpportunityStage(event: Event, item: CrmOportunidad, direction: -1 | 1): void {
    event.stopPropagation();
    const stages = this.etapaOptions().filter((stage) => stage.id);
    const currentIndex = stages.findIndex((stage) => stage.value === item.etapa);
    const target = stages[currentIndex + direction];
    if (!target?.id) {
      return;
    }
    const review = this.buildStageMoveReview(item, target);
    if (review.mode !== 'FREE' && (review.errors.length || review.warnings.length)) {
      this.stageMoveComment.set('');
      this.stageMoveReview.set(review);
      return;
    }
    this.performOpportunityStageMove(item, target);
  }

  protected closeStageMoveReview(): void {
    this.stageMoveReview.set(null);
    this.stageMoveComment.set('');
  }

  protected canContinueStageMove(review: StageMoveReview): boolean {
    return review.canContinue || (review.target.value === 'PERDIDO' && !!this.stageMoveComment().trim());
  }

  protected continueStageMove(): void {
    const review = this.stageMoveReview();
    if (!review || !this.canContinueStageMove(review)) {
      return;
    }
    const comment = this.stageMoveComment().trim();
    this.stageMoveReview.set(null);
    this.stageMoveComment.set('');
    this.performOpportunityStageMove(
      review.opportunity,
      review.target,
      comment || `Movimiento a ${review.target.label} con validacion ${review.mode}`,
    );
  }

  protected runStageRequirementAction(action: StageRequirementAction, review: StageMoveReview): void {
    if (!action) {
      return;
    }
    this.stageMoveReview.set(null);
    if (action === 'activity') {
      this.openCreateActivity(review.opportunity);
      return;
    }
    if (action === 'quote') {
      this.openQuoteDialog(review.opportunity);
      return;
    }
    this.openOpportunityDetail(review.opportunity);
  }

  private performOpportunityStageMove(item: CrmOportunidad, target: PipelineStageOption, observacion?: string): void {
    const targetId = Number(target.id || 0);
    if (!targetId) {
      return;
    }
    this.actionId.set(item.id);
    this.api
      .moverCrmOportunidadEtapa(item.id, targetId, observacion || `Movimiento desde Kanban a ${target.label}`)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => this.upsertOpportunity(saved, `Oportunidad movida a ${target.label}.`),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCreateActivity(source?: CrmProspecto | CrmOportunidad): void {
    this.activityForm = this.emptyActivityForm();
    this.activityContext.set(null);
    if (source && 'titulo' in source) {
      this.activityForm.oportunidadId = source.id;
      this.activityForm.prospectoId = source.prospectoId ?? null;
      this.activityForm.clienteId = source.clienteId ?? null;
      this.activityContext.set({
        type: 'OPORTUNIDAD',
        title: source.titulo,
        subtitle: `${this.opportunityContactName(source)} · ${this.stageName(source.etapa)}`,
        detail: `La actividad quedara asociada a esta oportunidad. No se puede seleccionar otro prospecto desde aqui.`,
        icon: 'pi pi-briefcase',
      });
    } else if (source) {
      this.activityForm.prospectoId = source.id;
      this.activityForm.clienteId = source.clienteId ?? null;
      this.activityContext.set({
        type: 'PROSPECTO',
        title: source.nombre,
        subtitle: `${source.telefono || 'Sin telefono'} · ${source.correo || 'Sin correo'}`,
        detail: 'La actividad quedara asociada a este prospecto. No se puede seleccionar otro registro desde aqui.',
        icon: 'pi pi-user-plus',
      });
    }
    this.activeDialog.set('actividad');
  }

  protected closeActivityDialog(): void {
    this.activeDialog.set(null);
    this.activityContext.set(null);
  }

  protected openQuickActivity(source: CrmProspecto | CrmOportunidad | undefined, tipoActividad: string, asunto: string): void {
    this.openCreateActivity(source);
    this.activityForm.tipoActividad = tipoActividad;
    this.activityForm.asunto = asunto;
  }

  protected openCompleteActivity(item: CrmActividad, prospecto?: CrmProspecto): void {
    const resolvedProspect = prospecto ?? this.prospectos().find((current) => current.id === item.prospectoId);
    const resolvedOpportunity = item.oportunidadId
      ? this.oportunidades().find((current) => current.id === item.oportunidadId)
      : null;
    this.activityForm = this.emptyActivityForm();
    this.activityForm.id = item.id;
    this.activityForm.prospectoId = item.prospectoId ?? null;
    this.activityForm.oportunidadId = item.oportunidadId ?? null;
    this.activityForm.clienteId = item.clienteId ?? null;
    this.activityForm.tipoActividad = item.tipoActividad;
    this.activityForm.estadoActividad = 'REALIZADA';
    this.activityForm.resultadoContacto = item.resultadoContacto ?? '';
    this.activityForm.nivelInteres = item.nivelInteres ?? resolvedProspect?.nivelInteres ?? '';
    this.activityForm.nuevoEstadoProspecto = item.estadoProspectoResultado ?? '';
    this.activityForm.asunto = item.asunto;
    this.activityForm.descripcion = item.resultado || item.descripcion || '';
    this.activityForm.fechaProgramada = this.toInputDateTime(item.fechaProgramada);
    this.activityForm.usuarioId = item.usuarioId || resolvedProspect?.responsableId || this.currentUserKey();
    this.activityForm.programarSiguiente = Boolean(item.oportunidadId);
    this.prepareNextActivityDefaults(item);
    this.activityContext.set({
      type: item.oportunidadId ? 'OPORTUNIDAD' : 'PROSPECTO',
      title: item.oportunidadId
        ? item.oportunidadTitulo || resolvedOpportunity?.titulo || 'Oportunidad'
        : item.prospectoNombre || resolvedProspect?.nombre || 'Seguimiento',
      subtitle: `${this.humanize(item.tipoActividad)} · ${this.activityRelativeLabel(item.fechaProgramada)}`,
      detail: 'Marca esta gestion como cumplida y registra el resultado real obtenido.',
      icon: this.followUpActivityIcon(item.tipoActividad),
    });
    this.activeDialog.set('actividad');
  }

  protected onActivityResultChange(value: string): void {
    this.activityForm.resultadoContacto = value;
    if (value) {
      this.activityForm.estadoActividad = 'REALIZADA';
    }
    const statusByResult: Record<string, string> = {
      CONTACTADO: 'CONTACTADO',
      INTERESADO: 'CALIFICADO',
      MUY_INTERESADO: 'CALIFICADO',
      SOLICITA_PROPUESTA: 'CALIFICADO',
      COTIZACION_SOLICITADA: 'CALIFICADO',
      REPROGRAMADO: 'EN_ESPERA',
      EN_ESPERA: 'EN_ESPERA',
      NO_INTERESADO: 'PERDIDO',
      PERDIDO: 'PERDIDO',
    };
    const interestByResult: Record<string, string> = {
      INTERESADO: 'MEDIO',
      MUY_INTERESADO: 'ALTO',
      SOLICITA_PROPUESTA: 'ALTO',
      COTIZACION_SOLICITADA: 'ALTO',
      REPROGRAMADO: 'MEDIO',
      EN_ESPERA: 'MEDIO',
      SIN_RESPUESTA: 'BAJO',
      NO_RESPONDE: 'BAJO',
      NO_INTERESADO: 'BAJO',
      PERDIDO: 'BAJO',
    };
    if (this.activityForm.prospectoId) {
      this.activityForm.nuevoEstadoProspecto = statusByResult[value] ?? '';
    }
    this.activityForm.nivelInteres = interestByResult[value] ?? this.activityForm.nivelInteres;
  }

  protected onScheduleNextToggle(): void {
    if (this.activityForm.programarSiguiente && !this.activityForm.siguienteAsunto.trim()) {
      this.prepareNextActivityDefaults();
    }
  }

  protected setFollowUpFilter(filter: FollowUpFilter): void {
    this.followUpFilter.set(filter);
  }

  protected resetProspectFilters(): void {
    this.prospectOrigenFilter.set('TODOS');
    this.prospectCampaniaFilter.set('TODOS');
    this.prospectAsesorFilter.set('TODOS');
    this.prospectDateFrom.set('');
    this.prospectDateTo.set('');
    this.prospectPage.set(0);
  }

  protected applyProspectFilters(): void {
    this.prospectPage.set(0);
  }

  protected isProspectSelected(id: number): boolean {
    return this.selectedProspectIds().has(id);
  }

  protected arePagedProspectsSelected(): boolean {
    const page = this.pagedProspectTable();
    return !!page.length && page.every((item) => this.selectedProspectIds().has(item.id));
  }

  protected toggleProspectSelection(id: number, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    const selected = new Set(this.selectedProspectIds());
    if (checked) {
      selected.add(id);
    } else {
      selected.delete(id);
    }
    this.selectedProspectIds.set(selected);
  }

  protected togglePagedProspectSelection(event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    const selected = new Set(this.selectedProspectIds());
    for (const item of this.pagedProspectTable()) {
      if (checked) {
        selected.add(item.id);
      } else {
        selected.delete(item.id);
      }
    }
    this.selectedProspectIds.set(selected);
  }

  protected openProspectDistributionDialog(): void {
    if (!this.canAssignCrmProspects()) {
      this.errorMessage.set('No tienes permisos para repartir prospectos.');
      return;
    }
    const leads = this.distributionCandidateLeads();
    if (!leads.length) {
      this.errorMessage.set('No hay leads nuevos para repartir con los filtros actuales.');
      return;
    }
    const sellers = this.crmSellerUsers();
    if (!sellers.length) {
      this.errorMessage.set('No hay vendedores activos para asignar prospectos.');
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.prospectDistributionSelectedSellerIds.set(sellers.map((user) => String(user.id)));
    this.prospectDistributionDialogOpen.set(true);
  }

  protected isDistributionSellerSelected(id: number | string): boolean {
    return this.prospectDistributionSelectedSellerIds().includes(String(id));
  }

  protected toggleDistributionSeller(id: number | string, event: Event): void {
    const checked = (event.target as HTMLInputElement | null)?.checked ?? false;
    const key = String(id);
    const selected = new Set(this.prospectDistributionSelectedSellerIds());
    if (checked) {
      selected.add(key);
    } else {
      selected.delete(key);
    }
    this.prospectDistributionSelectedSellerIds.set([...selected]);
  }

  protected distributeProspects(): void {
    const prospectoIds = this.distributionCandidateLeads().map((item) => item.id);
    const responsableIds = this.prospectDistributionSelectedSellerIds();
    if (!prospectoIds.length) {
      this.errorMessage.set('No hay leads nuevos para repartir.');
      return;
    }
    if (!responsableIds.length) {
      this.errorMessage.set('Selecciona al menos un vendedor.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.api
      .repartirCrmProspectos({ prospectoIds, responsableIds, soloNuevos: true })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (response) => {
          response.prospectos.forEach((item) => this.upsertProspect(item));
          this.selectedProspectIds.set(new Set());
          this.prospectDistributionDialogOpen.set(false);
          this.successMessage.set(`Se repartieron ${response.totalAsignados} leads entre ${Object.keys(response.asignadosPorResponsable).length} vendedores.`);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected resetFollowUpAdvancedFilters(): void {
    this.followUpContactFilter.set('TODOS');
    this.followUpResponsibleFilter.set('TODOS');
    this.followUpOriginFilter.set('TODOS');
    this.followUpInterestFilter.set('TODOS');
    this.followUpDateFilter.set('TODOS');
  }

  protected applyFollowUpFilters(): void {
    this.selectedFollowUpProspectId.set(null);
  }

  protected selectFollowUpProspect(card: CommercialInboxCard): void {
    this.selectedFollowUpProspectId.set(card.prospecto.id);
  }

  protected closeFollowUpDetail(): void {
    this.selectedFollowUpProspectId.set(null);
  }

  protected isSelectedFollowUpCard(card: CommercialInboxCard): boolean {
    return this.selectedFollowUpCard()?.prospecto.id === card.prospecto.id;
  }

  protected advanceFollowUpProspect(card: CommercialInboxCard, event?: Event): void {
    event?.stopPropagation();
    if (card.hasActiveOpportunity && card.oportunidad) {
      this.openExistingOpportunity(card.oportunidad, 'Este prospecto ya esta en oportunidad. No se creo duplicado.');
      return;
    }
    this.confirmInterestAndOpenOpportunity(card.prospecto);
  }

  protected followUpAdvanceLabel(card: CommercialInboxCard): string {
    if (card.hasActiveOpportunity) {
      return 'Ver oportunidad';
    }
    return 'Confirmar interes';
  }

  protected openFollowUpOpportunity(card: CommercialInboxCard, event?: Event): void {
    event?.stopPropagation();
    if (card.hasActiveOpportunity && card.oportunidad) {
      this.openExistingOpportunity(card.oportunidad, 'Este prospecto ya esta en oportunidad.');
      return;
    }
    this.confirmInterestAndOpenOpportunity(card.prospecto);
  }

  protected confirmProspectInterest(prospecto: CrmProspecto, event?: Event): void {
    event?.stopPropagation();
    const activeOpportunity = this.activeOpportunityForProspect(prospecto.id);
    if (activeOpportunity) {
      this.openExistingOpportunity(activeOpportunity, 'Este prospecto ya esta en oportunidad.');
      return;
    }
    if (!this.hasProspectConfirmedInterest(prospecto.id)) {
      this.openQuickActivity(prospecto, 'LLAMADA', `Confirmar interes de ${prospecto.nombre}`);
      this.activityForm.estadoActividad = 'REALIZADA';
      this.onActivityResultChange('INTERESADO');
      this.errorMessage.set('Primero registra la actividad realizada que confirma el interes del cliente.');
      return;
    }
    this.confirmInterestAndOpenOpportunity(prospecto);
  }

  private confirmInterestAndOpenOpportunity(prospecto: CrmProspecto): void {
    const qualification = this.prospectQualification(prospecto);
    if (!qualification.canConvert) {
      this.openQuickActivity(prospecto, 'LLAMADA', `Confirmar interes de ${prospecto.nombre}`);
      this.activityForm.estadoActividad = 'REALIZADA';
      this.onActivityResultChange('INTERESADO');
      this.errorMessage.set(`Aun falta calificar: ${qualification.missing.join(', ') || 'registra una actividad con resultado real'}.`);
      return;
    }
    if (prospecto.estado === 'CALIFICADO' || prospecto.estado === 'INTERESADO') {
      this.openCreateOpportunity(prospecto);
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.actionId.set(prospecto.id);
    this.api
      .updateCrmProspecto(prospecto.id, { estado: 'CALIFICADO' })
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => {
          this.upsertProspect(saved);
          this.successMessage.set('Interes confirmado. Completa la oportunidad comercial.');
          this.openCreateOpportunity(saved);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected activityRelativeLabel(dateValue: string | null | undefined): string {
    const timestamp = Date.parse(dateValue || '');
    if (!Number.isFinite(timestamp)) {
      return 'Sin fecha';
    }
    const diffMs = timestamp - Date.now();
    const absHours = Math.abs(diffMs) / 36e5;
    if (this.isToday(dateValue)) {
      return diffMs < 0 ? 'Vencida hoy' : 'Hoy';
    }
    if (diffMs < 0) {
      const days = Math.max(1, Math.round(absHours / 24));
      return `Vencida hace ${days} dia(s)`;
    }
    const days = Math.max(1, Math.round(absHours / 24));
    return days === 1 ? 'Manana' : `En ${days} dias`;
  }

  protected followUpPriorityIcon(priority: CommercialInboxCard['priority']): string {
    switch (priority) {
      case 'overdue':
        return 'pi pi-exclamation-triangle';
      case 'today':
        return 'pi pi-clock';
      case 'upcoming':
        return 'pi pi-calendar';
      case 'done':
        return 'pi pi-check-circle';
      default:
        return 'pi pi-minus-circle';
    }
  }

  protected followUpActivityIcon(type: string | null | undefined): string {
    return this.activityIcon(type);
  }

  protected followUpActivityTone(item: CrmActividad): 'done' | 'pending' | 'overdue' | 'neutral' {
    if (item.estado === 'REALIZADA') {
      return 'done';
    }
    if (item.estado === 'PENDIENTE' && this.isOverdue(item.fechaProgramada)) {
      return 'overdue';
    }
    if (item.estado === 'PENDIENTE') {
      return 'pending';
    }
    return 'neutral';
  }

  protected followUpContactLabel(card: CommercialInboxCard): string {
    const type = (card.nextActivity?.tipoActividad || '').toUpperCase();
    if (type === 'LLAMADA') {
      return 'Llamada programada';
    }
    if (type === 'WHATSAPP') {
      return 'Mensaje WhatsApp';
    }
    if (type === 'CORREO') {
      return 'Correo programado';
    }
    if (type === 'REUNION' || type === 'VISITA') {
      return this.humanize(type);
    }
    if (!card.prospecto.telefono && !card.prospecto.correo) {
      return 'Sin contacto';
    }
    return card.lastActivity ? this.humanize(card.lastActivity.tipoActividad) : 'Pendiente contacto';
  }

  protected followUpContactTone(card: CommercialInboxCard): 'danger' | 'warning' | 'success' | 'info' | 'muted' {
    if (!card.prospecto.telefono && !card.prospecto.correo) {
      return 'danger';
    }
    if (card.priority === 'overdue') {
      return 'danger';
    }
    if (card.priority === 'today') {
      return 'warning';
    }
    if (card.priority === 'done') {
      return 'success';
    }
    return card.nextActivity ? 'info' : 'muted';
  }

  protected followUpContactProofLabel(card: CommercialInboxCard): string {
    if (!card.prospecto.telefono && !card.prospecto.correo) {
      return 'Sin dato de contacto';
    }
    return this.followUpWasContacted(card) ? 'Contactado' : 'Sin contactar';
  }

  protected followUpContactProofTone(card: CommercialInboxCard): 'success' | 'warning' | 'danger' {
    if (!card.prospecto.telefono && !card.prospecto.correo) {
      return 'danger';
    }
    return this.followUpWasContacted(card) ? 'success' : 'warning';
  }

  protected activityResultText(value = this.activityForm.resultadoContacto): string {
    const option = this.activityResultOptions.find((item) => item.value === value);
    return value ? option?.label ?? this.humanize(value) : '';
  }

  protected activityTypeIcon(value = this.activityForm.tipoActividad): string {
    return this.tipoActividadOptions.find((item) => item.value === value)?.icon || 'pi pi-calendar-plus';
  }

  protected followUpNextAction(card: CommercialInboxCard): string {
    if (card.nextActivity) {
      return card.nextActivity.asunto;
    }
    if (!card.prospecto.telefono && !card.prospecto.correo) {
      return 'Completar telefono o correo';
    }
    return 'Programar actividad';
  }

  protected followUpOrigin(card: CommercialInboxCard): string {
    return card.prospecto.canalIngreso || card.prospecto.origen || 'MANUAL';
  }

  protected followUpInterestScore(card: CommercialInboxCard): number {
    if (card.interestTone === 'hot') {
      return 5;
    }
    if (card.interestTone === 'warm') {
      return 4;
    }
    return 2;
  }

  protected followUpStars(): number[] {
    return [1, 2, 3, 4, 5];
  }

  protected followUpLastActivityTitle(card: CommercialInboxCard): string {
    if (!card.lastActivity) {
      return 'Sin actividad registrada';
    }
    return `${this.humanize(card.lastActivity.tipoActividad)} ${card.lastActivity.estado === 'REALIZADA' ? 'realizada' : 'registrada'}`;
  }

  protected followUpLastActivityMeta(card: CommercialInboxCard): string {
    if (!card.lastActivity) {
      return 'Agenda la primera gestion';
    }
    const owner = this.responsibleName(card.lastActivity.usuarioId || card.prospecto.responsableId);
    return `${this.activityRelativeLabel(this.activityEffectiveDate(card.lastActivity))} por ${owner}`;
  }

  protected followUpNextActionStatus(card: CommercialInboxCard): string {
    if (!card.nextActivity) {
      return 'Sin fecha';
    }
    return this.activityRelativeLabel(card.nextActivity.fechaProgramada);
  }

  protected followUpNextActionTone(card: CommercialInboxCard): 'danger' | 'warning' | 'success' | 'info' | 'muted' {
    if (card.priority === 'overdue') {
      return 'danger';
    }
    if (card.priority === 'today') {
      return 'warning';
    }
    if (card.priority === 'upcoming') {
      return 'success';
    }
    return 'muted';
  }

  protected followUpNextActionDate(card: CommercialInboxCard): string {
    return card.nextActivity ? this.activityRelativeLabel(card.nextActivity.fechaProgramada) : 'Sin fecha programada';
  }

  protected followUpResponsibleId(card: CommercialInboxCard): string | null {
    return card.nextActivity?.usuarioId || card.prospecto.responsableId || null;
  }

  private followUpWasContacted(card: CommercialInboxCard): boolean {
    const state = (card.prospecto.estado || '').toUpperCase();
    const contactedStates = ['CONTACTADO', 'INTERESADO', 'CALIFICADO', 'COTIZADO', 'NEGOCIACION', 'CONVERTIDO'];
    if (contactedStates.includes(state)) {
      return true;
    }

    const contactTypes = ['LLAMADA', 'WHATSAPP', 'CORREO', 'REUNION', 'VISITA'];
    return this.actividades().some((item) => {
      const resultCode = (item.resultadoContacto || '').toUpperCase();
      if (resultCode) {
        return item.prospectoId === card.prospecto.id &&
          item.estado === 'REALIZADA' &&
          ['CONTACTADO', 'INTERESADO', 'MUY_INTERESADO', 'SOLICITA_PROPUESTA', 'REPROGRAMADO', 'COTIZACION_SOLICITADA'].includes(resultCode);
      }
      const result = `${item.resultado || ''} ${item.descripcion || ''}`.toUpperCase();
      return item.prospectoId === card.prospecto.id &&
        item.estado === 'REALIZADA' &&
        contactTypes.includes((item.tipoActividad || '').toUpperCase()) &&
        !result.includes('SIN_RESPUESTA') &&
        !result.includes('NO RESPONDIO');
    });
  }

  protected exportFollowUpCsv(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const rows = [
      ['Prospecto', 'Telefono', 'Correo', 'Oferta', 'Valor estimado', 'Estado contacto', 'Interes', 'Ultima actividad', 'Proxima accion', 'Responsable'],
      ...this.filteredCommercialInbox().map((item) => [
        item.prospecto.nombre,
        item.prospecto.telefono || '',
        item.prospecto.correo || '',
        item.prospecto.interesPrincipal || item.oportunidad?.titulo || '',
        Number(item.amount || 0).toFixed(2),
        this.followUpContactLabel(item),
        item.interestLabel,
        this.followUpLastActivityTitle(item),
        this.followUpNextAction(item),
        this.responsibleName(this.followUpResponsibleId(item)),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `seguimiento-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected phoneUrl(item: CrmProspecto): string | null {
    const phone = this.onlyDigits(item.telefono);
    return phone ? `tel:${phone}` : null;
  }

  protected whatsappUrl(item: CrmProspecto): string | null {
    const phone = this.onlyDigits(item.telefono);
    if (!phone) {
      return null;
    }
    const message = encodeURIComponent(`Hola ${item.nombre}, te escribo por ${item.interesPrincipal || 'tu consulta'}.`);
    return `https://wa.me/${phone}?text=${message}`;
  }

  protected emailUrl(item: CrmProspecto): string | null {
    if (!item.correo) {
      return null;
    }
    const subject = encodeURIComponent(`Seguimiento ${item.interesPrincipal || 'comercial'}`);
    const body = encodeURIComponent(`Hola ${item.nombre},\n\nTe escribo para dar seguimiento a tu consulta.\n\nSaludos.`);
    return `mailto:${item.correo}?subject=${subject}&body=${body}`;
  }

  protected prospectInitials(item: CrmProspecto): string {
    const source = item.nombre || item.razonSocial || 'PR';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'PR';
  }

  protected userInitials(item: UsuarioTenant): string {
    const source = item.nombres || item.username || 'US';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'US';
  }

  protected prospectAvatarTone(index: number): string {
    return ['green', 'violet', 'amber', 'blue', 'rose', 'teal'][index % 6];
  }

  protected maskedContact(value: string | null | undefined): string {
    if (!value) {
      return 'Sin correo registrado';
    }
    const [user, domain] = value.split('@');
    if (!domain) {
      return value.length <= 5 ? value : `${value.slice(0, 3)}***${value.slice(-2)}`;
    }
    return `${user.slice(0, 2)}***@${domain}`;
  }

  protected relativePastLabel(dateValue: string | null | undefined): string {
    const timestamp = Date.parse(dateValue || '');
    if (!Number.isFinite(timestamp)) {
      return 'Sin fecha';
    }
    const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
    if (diffMinutes < 1) {
      return 'Ahora';
    }
    if (diffMinutes < 60) {
      return `Hace ${diffMinutes} min`;
    }
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `Hace ${diffHours} hora(s)`;
    }
    const diffDays = Math.round(diffHours / 24);
    return `Hace ${diffDays} dia(s)`;
  }

  protected saveActivity(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.activityForm.asunto.trim()) {
      this.errorMessage.set('El asunto de la actividad es obligatorio.');
      return;
    }
    if (!this.activityForm.prospectoId && !this.activityForm.oportunidadId && !this.activityForm.clienteId) {
      this.errorMessage.set('Relaciona la actividad con un prospecto, oportunidad o cliente.');
      return;
    }
    const fechaProgramada = this.activityForm.fechaProgramada
      ? new Date(this.activityForm.fechaProgramada).toISOString()
      : '';
    if (!fechaProgramada) {
      this.errorMessage.set('Indica la fecha programada.');
      return;
    }
    const resultado = this.activityResultText();
    if (this.activityForm.estadoActividad === 'REALIZADA' && !this.activityForm.resultadoContacto) {
      this.errorMessage.set('Selecciona el resultado obtenido antes de marcar el seguimiento como cumplido.');
      return;
    }
    const shouldProgramNext = this.activityForm.estadoActividad === 'REALIZADA' && this.activityForm.programarSiguiente;
    if (shouldProgramNext && !this.activityForm.siguienteAsunto.trim()) {
      this.errorMessage.set('Indica el asunto de la siguiente actividad.');
      return;
    }
    const siguienteFechaProgramada = this.activityForm.siguienteFechaProgramada
      ? new Date(this.activityForm.siguienteFechaProgramada).toISOString()
      : '';
    if (shouldProgramNext && !siguienteFechaProgramada) {
      this.errorMessage.set('Indica la fecha de la siguiente actividad.');
      return;
    }
    const resultadoDetalle = [resultado ? `Resultado: ${resultado}` : '', this.activityForm.descripcion.trim()]
      .filter(Boolean)
      .join('\n');
    const prospectStatus = this.activityForm.prospectoId && this.activityForm.nuevoEstadoProspecto
      ? this.activityForm.nuevoEstadoProspecto
      : '';
    const completionRequest = {
      resultado: resultadoDetalle || null,
      resultadoContacto: this.activityForm.resultadoContacto || null,
      nivelInteres: this.activityForm.nivelInteres || null,
      estadoProspecto: prospectStatus || null,
    };
    const maybeScheduleNext$ = (activity: CrmActividad) => {
      if (!shouldProgramNext) {
        return of({ activity, nextActivity: null as CrmActividad | null });
      }
      return this.api.createCrmActividad({
        prospectoId: this.activityForm.prospectoId,
        oportunidadId: this.activityForm.oportunidadId,
        clienteId: this.activityForm.clienteId,
        tipoActividad: this.activityForm.siguienteTipoActividad,
        asunto: this.activityForm.siguienteAsunto.trim(),
        descripcion: this.activityForm.siguienteDescripcion.trim() || null,
        fechaProgramada: siguienteFechaProgramada,
        usuarioId: this.activityForm.usuarioId.trim() || null,
      }).pipe(map((nextActivity) => ({ activity, nextActivity })));
    };
    const refreshProspect$ = (result: { activity: CrmActividad; nextActivity: CrmActividad | null }) => this.activityForm.prospectoId
      ? this.api.getCrmProspecto(Number(this.activityForm.prospectoId)).pipe(map((prospect) => ({ ...result, prospect })))
      : of({ ...result, prospect: null });
    this.saving.set(true);
    const save$ = this.activityForm.id
      ? this.api.realizarCrmActividad(this.activityForm.id, completionRequest).pipe(
        switchMap(maybeScheduleNext$),
        switchMap(refreshProspect$),
      )
      : this.api.createCrmActividad({
        prospectoId: this.activityForm.prospectoId,
        oportunidadId: this.activityForm.oportunidadId,
        clienteId: this.activityForm.clienteId,
        tipoActividad: this.activityForm.tipoActividad,
        asunto: this.activityForm.asunto.trim(),
        descripcion: this.activityForm.descripcion.trim() || null,
        fechaProgramada,
        usuarioId: this.activityForm.usuarioId.trim() || null,
      }).pipe(
        switchMap((created) => this.activityForm.estadoActividad === 'REALIZADA'
          ? this.api.realizarCrmActividad(created.id, completionRequest).pipe(switchMap(maybeScheduleNext$), switchMap(refreshProspect$))
          : of({ activity: created, nextActivity: null as CrmActividad | null, prospect: null })),
      );

    save$
      .pipe(
        switchMap((result) =>
          this.autoAdvanceOpportunityAfterActivity(result.activity).pipe(
            map((opportunity) => ({ ...result, opportunity })),
          ),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ activity, nextActivity, prospect, opportunity }) => {
          this.upsertActivity(activity);
          if (nextActivity) {
            this.upsertActivity(nextActivity);
          }
          if (prospect) {
            this.upsertProspect(prospect);
          }
          this.closeActivityDialog();
          this.successMessage.set(opportunity
            ? `Actividad cumplida y oportunidad movida a ${this.stageName(opportunity.etapa)}.`
            : nextActivity
              ? 'Actividad cumplida y siguiente paso programado.'
              : prospect
                ? 'Seguimiento cumplido y prospecto actualizado.'
                : 'Actividad guardada correctamente.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected completeActivity(item: CrmActividad): void {
    this.openCompleteActivity(item);
  }

  protected cancelActivity(item: CrmActividad): void {
    this.actionId.set(item.id);
    this.api
      .cancelarCrmActividad(item.id, 'Cancelada desde el panel CRM')
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => this.upsertActivity(saved, 'Actividad cancelada.'),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private updateProspectStatus(item: CrmProspecto, estado: string, message: string): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.actionId.set(item.id);
    this.api
      .updateCrmProspecto(item.id, { estado })
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => {
          this.upsertProspect(saved);
          this.successMessage.set(message);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private saveProspectLoss(item: CrmProspecto, motivo: string): void {
    const pending = this.actividades().filter((activity) => activity.prospectoId === item.id && activity.estado === 'PENDIENTE');
    this.saving.set(true);
    this.actionId.set(item.id);
    this.api.updateCrmProspecto(item.id, {
      estado: 'PERDIDO',
      motivoPerdida: motivo,
      observacionPerdida: `Prospecto perdido: ${motivo}`,
      observacion: `Perdido: ${motivo}`,
    }).pipe(
      switchMap((saved) => pending.length
        ? forkJoin(pending.map((activity) => this.api.cancelarCrmActividad(activity.id, `Prospecto perdido: ${motivo}`))).pipe(
          map((activities) => ({ saved, activities })),
        )
        : of({ saved, activities: [] as CrmActividad[] })),
      finalize(() => {
        this.saving.set(false);
        this.actionId.set(null);
      }),
    ).subscribe({
      next: ({ saved, activities }) => {
        this.upsertProspect(saved);
        activities.forEach((activity) => this.upsertActivity(activity));
        this.closeLossDialog();
        this.successMessage.set('Prospecto marcado como perdido. Actividades pendientes canceladas.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  private saveOpportunityLoss(item: CrmOportunidad, motivo: string): void {
    const pending = this.actividades().filter((activity) => activity.oportunidadId === item.id && activity.estado === 'PENDIENTE');
    this.saving.set(true);
    this.actionId.set(item.id);
    this.api.marcarCrmOportunidadPerdida(item.id, motivo).pipe(
      switchMap((saved) => pending.length
        ? forkJoin(pending.map((activity) => this.api.cancelarCrmActividad(activity.id, `Oportunidad perdida: ${motivo}`))).pipe(
          map((activities) => ({ saved, activities })),
        )
        : of({ saved, activities: [] as CrmActividad[] })),
      finalize(() => {
        this.saving.set(false);
        this.actionId.set(null);
      }),
    ).subscribe({
      next: ({ saved, activities }) => {
        this.upsertOpportunity(saved);
        activities.forEach((activity) => this.upsertActivity(activity));
        this.closeLossDialog();
        this.successMessage.set('Oportunidad marcada como perdida. Actividades pendientes canceladas.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected openQuoteDialog(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.quoteForm = this.emptyQuoteForm();
    this.quoteForm.oportunidadId = item.id;
    this.quoteForm.clienteId = item.clienteId ?? null;
    this.quoteForm.sucursalId = this.defaultQuoteSucursalId();
    this.quoteForm.observacion = `Propuesta comercial por ${this.quoteOfferName(item)}.`;
    this.quoteForm.detalles = this.quoteLinesFromOpportunityRequirements(item);
    this.activeDialog.set('cotizacion');
  }

  protected openQuoteFromRequirements(item: CrmOportunidad): void {
    if (!this.opportunityRequirementRows(item).length) {
      this.addDefaultRequirement(item);
    }
    this.openQuoteDialog(item);
    this.quoteForm.observacion = `Cotizacion por requerimientos registrados en ${item.titulo}.`;
  }

  protected openQuoteAdjustmentDialog(quote: Cotizacion): void {
    const opportunity = this.opportunityForQuote(quote) || this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('No se encontro la oportunidad para ajustar la cotizacion.');
      return;
    }
    this.selectedOpportunity.set(opportunity);
    this.quoteForm = this.emptyQuoteForm();
    this.quoteForm.oportunidadId = opportunity.id;
    this.quoteForm.clienteId = quote.clienteId ?? opportunity.clienteId ?? null;
    this.quoteForm.sucursalId = quote.sucursalId ?? this.defaultQuoteSucursalId();
    this.quoteForm.fechaVencimiento = '';
    this.quoteForm.observacion = `Ajuste comercial de COT-${String(quote.id).padStart(3, '0')}.`;
    this.quoteForm.detalles = this.quoteLinesFromExistingQuote(quote);
    this.activeDialog.set('cotizacion');
  }

  protected openOpportunityDetail(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.opportunityDetailTab.set('resumen');
    this.opportunityDetailOpen.set(true);
    this.refreshOpportunityQuotes(item.id);
    this.refreshOpportunityNegotiations(item.id);
  }

  protected openPipelineOpportunityDetail(item: CrmOportunidad, stage = item.etapa): void {
    this.selectedOpportunity.set(item);
    this.opportunityDetailTab.set(this.pipelineDetailTabForStage(stage));
    this.opportunityDetailOpen.set(true);
    this.refreshOpportunityQuotes(item.id);
    this.refreshOpportunityNegotiations(item.id);
  }

  protected closeOpportunityDetail(): void {
    this.opportunityDetailOpen.set(false);
  }

  protected setOpportunityDetailTab(tab: OpportunityDetailTab): void {
    this.opportunityDetailTab.set(tab);
    const opportunity = this.selectedOpportunity();
    if (opportunity && ['resumen', 'cotizaciones', 'negociacion'].includes(tab)) {
      this.refreshOpportunityQuotes(opportunity.id);
      this.refreshOpportunityNegotiations(opportunity.id);
    }
  }

  private pipelineDetailTabForStage(stage: string | null | undefined): OpportunityDetailTab {
    switch (String(stage || '').toUpperCase()) {
      case 'INTERESADO':
        return 'resumen';
      case 'COTIZADO':
        return 'cotizaciones';
      case 'NEGOCIACION':
        return 'negociacion';
      case 'GANADO':
        return 'cierre';
      case 'PERDIDO':
        return 'historial';
      default:
        return 'resumen';
    }
  }

  protected openOpportunityActivity(item: CrmOportunidad, tipoActividad = 'LLAMADA'): void {
    this.openQuickActivity(item, tipoActividad, this.defaultOpportunityActivitySubject(item, tipoActividad));
  }

  protected isInterestedOpportunity(item: CrmOportunidad): boolean {
    return item.etapa === 'INTERESADO' && item.estado === 'ABIERTA';
  }

  protected opportunityRequirementRows(item: CrmOportunidad): OpportunityRequirementRecord[] {
    return this.opportunityRequirementRecords()
      .filter((record) => record.oportunidadId === item.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  protected requirementTotal(item: OpportunityRequirementRecord): number {
    return Math.max(0, Number(item.cantidad || 0) * Number(item.precioUnitario || 0));
  }

  protected opportunityRequirementChecklist(item: CrmOportunidad) {
    const requirements = this.selectedOpportunityRequirements();
    const quotes = this.selectedOpportunityQuotes();
    const hasContact = !!this.opportunityContactName(item) && this.opportunityContactName(item) !== 'Sin contacto';
    const hasNamedOffer = requirements.some((requirement) => !!requirement.nombre.trim());
    const hasQuantity = requirements.every((requirement) => Number(requirement.cantidad || 0) > 0);
    const hasValue = requirements.every((requirement) => Number(requirement.precioUnitario || 0) > 0) || Number(item.montoEstimado || 0) > 0;
    const hasSentQuote = quotes.some((quote) => ['ENVIADA', 'EN_SEGUIMIENTO', 'ACEPTADA', 'NEGOCIACION', 'CONVERTIDA'].includes(this.quoteStatusValue(quote)));
    return [
      { label: 'Cliente definido', done: hasContact },
      { label: 'Curso definido', done: hasNamedOffer },
      { label: 'Vacantes definidas', done: hasQuantity },
      { label: 'Valor estimado', done: hasValue },
      { label: 'Cotizacion creada', done: quotes.length > 0 },
      { label: 'Cotizacion enviada', done: hasSentQuote },
    ];
  }

  protected openOpportunityRequirementDialog(item: CrmOportunidad, requirement?: OpportunityRequirementRecord): void {
    this.selectedOpportunity.set(item);
    this.requirementForm = requirement
      ? {
          id: requirement.id,
          catalogoItemId: requirement.catalogoItemId,
          nombre: requirement.nombre,
          cantidad: requirement.cantidad,
          precioUnitario: requirement.precioUnitario,
          observacion: requirement.observacion,
        }
      : this.emptyOpportunityRequirementForm(item);
    this.opportunityRequirementDialogOpen.set(true);
  }

  protected onRequirementCatalogChange(value: number | null): void {
    this.requirementForm.catalogoItemId = value;
    const item = this.catalogoItems().find((current) => current.id === value);
    if (!item) {
      return;
    }
    this.requirementForm.nombre = item.nombre;
    this.requirementForm.precioUnitario = Number(item.precioReferencial || this.requirementForm.precioUnitario || 0);
    this.requirementForm.observacion = item.descripcion || this.requirementForm.observacion;
  }

  protected saveOpportunityRequirement(): void {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('Selecciona una oportunidad para agregar requerimientos.');
      return;
    }
    const nombre = this.requirementForm.nombre.trim();
    if (!nombre) {
      this.errorMessage.set('Indica el curso, producto o servicio requerido.');
      return;
    }
    if (Number(this.requirementForm.cantidad || 0) <= 0) {
      this.errorMessage.set('La cantidad debe ser mayor a cero.');
      return;
    }
    const record: OpportunityRequirementRecord = {
      id: this.requirementForm.id || this.createLocalId('req'),
      oportunidadId: opportunity.id,
      catalogoItemId: this.requirementForm.catalogoItemId,
      nombre,
      cantidad: Math.max(1, Number(this.requirementForm.cantidad || 1)),
      precioUnitario: Math.max(0, Number(this.requirementForm.precioUnitario || 0)),
      observacion: this.requirementForm.observacion.trim(),
      createdAt: new Date().toISOString(),
    };
    const current = this.opportunityRequirementRecords();
    const next = current.some((item) => item.id === record.id)
      ? current.map((item) => item.id === record.id ? record : item)
      : [...current, record];
    this.opportunityRequirementRecords.set(next);
    this.persistOpportunityRecords(this.opportunityRequirementStorageKey(), next);
    this.opportunityRequirementDialogOpen.set(false);
    this.successMessage.set('Requerimiento agregado a la oportunidad.');
  }

  protected deleteOpportunityRequirement(id: string): void {
    const next = this.opportunityRequirementRecords().filter((item) => item.id !== id);
    this.opportunityRequirementRecords.set(next);
    this.persistOpportunityRecords(this.opportunityRequirementStorageKey(), next);
  }

  protected advanceInterestedToQuoted(item: CrmOportunidad): void {
    this.openQuoteFromRequirements(item);
  }

  protected openOpportunityPaymentActivity(item: CrmOportunidad): void {
    this.openOpportunityPaymentDialog(item);
  }

  protected openOpportunityNegotiationDialog(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.negotiationForm = this.emptyOpportunityNegotiationForm();
    const quote = this.selectedOpportunityCurrentQuote();
    const previous = this.selectedOpportunityNegotiations()[0] ?? null;
    this.negotiationForm.cotizacionId = quote?.id ?? null;
    this.negotiationForm.precioOriginal = Number(quote?.total ?? item.montoEstimado ?? 0);
    this.negotiationForm.precioFinal = Number(quote?.total ?? item.montoEstimado ?? 0);
    this.negotiationForm.fechaInicio = new Date().toISOString().slice(0, 10);
    if (previous) {
      this.negotiationForm.cotizacionId = previous.cotizacionId ?? this.negotiationForm.cotizacionId;
      this.negotiationForm.precioOriginal = Number(previous.precioOriginal || this.negotiationForm.precioOriginal);
      this.negotiationForm.precioFinal = Number(previous.precioFinal || this.negotiationForm.precioFinal);
      this.negotiationForm.descuento = Number(previous.descuento || 0);
      this.negotiationForm.promocion = previous.promocion || '';
      this.negotiationForm.formaPago = previous.formaPago || 'Contado';
      this.negotiationForm.cuotas = Math.max(1, Number(previous.cuotas || 1));
      this.negotiationForm.fechaInicio = previous.fechaInicio || this.negotiationForm.fechaInicio;
      this.negotiationForm.fechaEntrega = previous.fechaEntrega || '';
      this.negotiationForm.objecion = previous.objecion || 'MEJOR_PRECIO';
    }
    this.opportunityNegotiationDialogOpen.set(true);
  }

  protected negotiationFinancialSummary(): { base: number; discountPercent: number; agreed: number } {
    const base = Math.max(0, Number(this.negotiationForm.precioOriginal || 0));
    const agreed = Math.max(0, Number(this.negotiationForm.precioFinal || 0));
    const discountPercent = base > 0
      ? Math.max(0, Math.round(((base - agreed) / base) * 10000) / 100)
      : Math.max(0, Number(this.negotiationForm.descuento || 0));
    return { base, discountPercent, agreed };
  }

  protected onNegotiationPaymentModeChange(value: string): void {
    this.negotiationForm.formaPago = value;
    this.negotiationForm.cuotas = value === 'Credito'
      ? Math.max(2, Number(this.negotiationForm.cuotas || 2))
      : 1;
  }

  protected openOpportunityAgreementDialog(item: CrmOportunidad): void {
    if (this.hasFinalAgreement(item)) {
      this.successMessage.set('El acuerdo final ya fue registrado.');
      return;
    }
    this.openOpportunityNegotiationDialog(item);
    this.negotiationForm.resultado = 'ACEPTA';
    this.negotiationForm.estado = 'CLIENTE_CONFORME';
    this.negotiationForm.objecion = 'OTRO';
    this.negotiationForm.clienteConforme = true;
    this.negotiationForm.procedePago = true;
    this.negotiationForm.observacion = 'Acuerdo final registrado: cliente acepta condiciones finales. Pendiente registrar evidencia de cierre.';
  }

  protected saveOpportunityNegotiation(): void {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('Selecciona una oportunidad para registrar la negociacion.');
      return;
    }
    if (Number(this.negotiationForm.precioFinal || 0) <= 0) {
      this.errorMessage.set('El precio final debe ser mayor a cero.');
      return;
    }
    if (Number(this.negotiationForm.descuento || 0) < 0 || Number(this.negotiationForm.descuento || 0) > 100) {
      this.errorMessage.set('El descuento debe estar entre 0 y 100%.');
      return;
    }
    const isCredit = this.negotiationForm.formaPago === 'Credito';
    if (isCredit && Number(this.negotiationForm.cuotas || 0) < 2) {
      this.errorMessage.set('Para una venta a credito define como minimo 2 cuotas.');
      return;
    }
    if (!isCredit) {
      this.negotiationForm.cuotas = 1;
    }
    const finalAgreement = this.negotiationForm.resultado === 'ACEPTA' && this.negotiationForm.clienteConforme;
    const payload: CreateCrmNegociacionRequest = {
      cotizacionId: this.negotiationForm.cotizacionId,
      estado: finalAgreement ? 'CLIENTE_CONFORME' : (this.negotiationForm.estado || null),
      solicitudCliente: this.negotiationForm.objecion || 'MEJOR_PRECIO',
      precioOriginal: Number(this.negotiationForm.precioOriginal || 0),
      descuento: Number(this.negotiationForm.descuento || 0),
      precioFinal: Number(this.negotiationForm.precioFinal || 0),
      formaPago: this.negotiationForm.formaPago.trim(),
      cuotas: Math.max(1, Number(this.negotiationForm.cuotas || 1)),
      fechaInicio: this.negotiationForm.fechaInicio || null,
      fechaEntrega: this.negotiationForm.fechaEntrega || null,
      observacion: this.negotiationForm.observacion.trim(),
      resultado: this.negotiationForm.resultado,
    };
    this.actionId.set(opportunity.id);
    this.api.createCrmNegociacion(opportunity.id, payload).pipe(
      switchMap((saved) => this.api.getCrmOportunidad(opportunity.id).pipe(map((fresh) => ({ saved, fresh })))),
      finalize(() => this.actionId.set(null)),
    ).subscribe({
      next: ({ saved, fresh }) => {
        this.upsertOpportunity(fresh);
        this.selectedOpportunity.set(fresh);
        this.upsertNegotiation(this.mapNegotiationRecord(saved));
        this.opportunityDetailTab.set('negociacion');
        this.opportunityNegotiationDialogOpen.set(false);
        this.successMessage.set(saved.estado === 'CLIENTE_CONFORME' || saved.estado === 'GANADA'
          ? 'Acuerdo final registrado. Registra pago, voucher o comprobante antes de marcar como ganado.'
          : 'Negociacion registrada en la oportunidad.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected openOpportunityPaymentDialog(item: CrmOportunidad): void {
    if (this.isRequiredClosurePaymentRegistered(item)) {
      this.successMessage.set('El pago requerido y su comprobante ya fueron registrados.');
      return;
    }
    this.selectedOpportunity.set(item);
    this.paymentForm = this.emptyOpportunityPaymentForm();
    const plan = this.opportunityPaymentPlan(item);
    const pending = this.opportunityFinancialSummary(item).pending || Number(item.montoReal || item.montoEstimado || 0);
    if (plan.isCredit) {
      this.paymentForm.tipo = 'CUOTA';
      this.paymentForm.estado = 'PAGADO';
      this.paymentForm.monto = Math.min(pending, Math.round((pending / Math.max(1, plan.cuotas - plan.paidPayments.length)) * 100) / 100);
    } else {
      this.paymentForm.monto = pending;
    }
    this.opportunityPaymentDialogOpen.set(true);
  }

  protected saveOpportunityPayment(): void {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('Selecciona una oportunidad para registrar el pago.');
      return;
    }
    if (!this.paymentForm.fecha) {
      this.errorMessage.set('Indica la fecha del pago.');
      return;
    }
    if (Number(this.paymentForm.monto || 0) <= 0) {
      this.errorMessage.set('El monto del pago debe ser mayor a cero.');
      return;
    }
    if (this.paymentForm.estado !== 'PAGADO') {
      this.errorMessage.set('Para confirmar el pago selecciona el estado Pagado.');
      return;
    }
    if (!this.paymentForm.archivoNombre || !this.paymentForm.archivoDataUrl) {
      this.errorMessage.set('Adjunta obligatoriamente el voucher o comprobante del pago.');
      return;
    }
    const currentPlan = this.opportunityPaymentPlan(opportunity);
    const paymentAmount = Number(this.paymentForm.monto || 0);
    if (currentPlan.isCredit && !currentPlan.firstPaymentDone && paymentAmount + 0.01 < currentPlan.requiredInitialAmount) {
      this.errorMessage.set(`La primera cuota debe ser como minimo S/ ${currentPlan.requiredInitialAmount.toFixed(2)}.`);
      return;
    }
    if (!currentPlan.isCredit && paymentAmount + 0.01 < currentPlan.pendingAmount) {
      this.errorMessage.set(`El pago al contado debe cubrir el saldo completo de S/ ${currentPlan.pendingAmount.toFixed(2)}.`);
      return;
    }
    const record: OpportunityPaymentRecord = {
      id: this.paymentForm.id || this.createLocalId('pay'),
      oportunidadId: opportunity.id,
      fecha: this.paymentForm.fecha,
      tipo: this.paymentForm.tipo,
      monto: Number(this.paymentForm.monto || 0),
      estado: this.paymentForm.estado,
      metodo: this.paymentForm.metodo.trim(),
      observacion: this.paymentForm.observacion.trim(),
      archivoNombre: this.paymentForm.archivoNombre,
      archivoDataUrl: this.paymentForm.archivoDataUrl,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...this.opportunityPaymentRecords().filter((item) => item.id !== record.id)];
    this.opportunityPaymentRecords.set(next);
    this.persistOpportunityRecords(this.opportunityPaymentStorageKey(), next);
    this.opportunityPaymentDialogOpen.set(false);
    if (currentPlan.isCredit) {
      this.scheduleRemainingInstallments(opportunity);
    }
    if (this.canCloseWon(opportunity)) {
      this.markWon(opportunity);
      return;
    }
    this.opportunityDetailTab.set('pagos');
    this.successMessage.set('Pago y comprobante registrados en la oportunidad.');
  }

  protected deleteOpportunityPayment(id: string): void {
    const next = this.opportunityPaymentRecords().filter((item) => item.id !== id);
    this.opportunityPaymentRecords.set(next);
    this.persistOpportunityRecords(this.opportunityPaymentStorageKey(), next);
  }

  protected onOpportunityPaymentFileSelected(event: Event): void {
    this.readSmallFile(event, 5_000_000, (file, dataUrl) => {
      this.paymentForm.archivoNombre = file.name;
      this.paymentForm.archivoDataUrl = dataUrl;
    });
  }

  protected openOpportunityDocumentDialog(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.documentForm = this.emptyOpportunityDocumentForm();
    this.documentForm.nombre = `Documento ${this.quoteOfferName(item)}`;
    this.opportunityDocumentDialogOpen.set(true);
  }

  protected saveOpportunityDocument(): void {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('Selecciona una oportunidad para subir el documento.');
      return;
    }
    const nombre = this.documentForm.nombre.trim() || this.documentForm.archivoNombre.trim();
    if (!nombre) {
      this.errorMessage.set('Indica nombre o selecciona un archivo.');
      return;
    }
    const record: OpportunityDocumentRecord = {
      id: this.documentForm.id || this.createLocalId('doc'),
      oportunidadId: opportunity.id,
      categoria: this.documentForm.categoria,
      nombre,
      descripcion: this.documentForm.descripcion.trim(),
      archivoNombre: this.documentForm.archivoNombre,
      archivoDataUrl: this.documentForm.archivoDataUrl,
      mimeType: this.documentForm.mimeType,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...this.opportunityDocumentRecords().filter((item) => item.id !== record.id)];
    this.opportunityDocumentRecords.set(next);
    this.persistOpportunityRecords(this.opportunityDocumentStorageKey(), next);
    this.opportunityDetailTab.set('documentos');
    this.opportunityDocumentDialogOpen.set(false);
    this.successMessage.set('Documento agregado a la oportunidad.');
  }

  protected deleteOpportunityDocument(id: string): void {
    const next = this.opportunityDocumentRecords().filter((item) => item.id !== id);
    this.opportunityDocumentRecords.set(next);
    this.persistOpportunityRecords(this.opportunityDocumentStorageKey(), next);
  }

  protected onOpportunityDocumentFileSelected(event: Event): void {
    this.readSmallFile(event, 8_000_000, (file, dataUrl) => {
      this.documentForm.archivoNombre = file.name;
      this.documentForm.archivoDataUrl = dataUrl;
      this.documentForm.mimeType = file.type || 'application/octet-stream';
      if (!this.documentForm.nombre.trim()) {
        this.documentForm.nombre = file.name;
      }
    });
  }

  protected downloadLocalFile(name: string, dataUrl: string): void {
    if (!dataUrl || typeof document === 'undefined') {
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = name || 'archivo';
    anchor.click();
  }

  protected previewLocalFile(dataUrl: string): void {
    if (!dataUrl || typeof window === 'undefined') {
      return;
    }
    window.open(dataUrl, '_blank', 'noopener,noreferrer');
  }

  protected addOpportunityMessageTemplate(): void {
    const title = this.messageTemplateForm.title.trim();
    const body = this.messageTemplateForm.body.trim();
    const isAudio = this.messageTemplateForm.channel === 'AUDIO';
    if (!title || (!isAudio && !body) || (isAudio && !this.messageTemplateForm.audioDataUrl)) {
      this.errorMessage.set(isAudio ? 'Indica titulo y selecciona un audio.' : 'Indica titulo y mensaje para guardar la plantilla.');
      return;
    }
    const template: OpportunityMessageTemplate = {
      id: this.messageTemplateForm.id || `${Date.now()}-${Math.round(Math.random() * 1000)}`,
      channel: this.messageTemplateForm.channel,
      title,
      body,
      audioName: isAudio ? this.messageTemplateForm.audioName : null,
      audioDataUrl: isAudio ? this.messageTemplateForm.audioDataUrl : null,
    };
    const current = this.opportunityMessageTemplates();
    const next = current.some((item) => item.id === template.id)
      ? current.map((item) => item.id === template.id ? template : item)
      : [template, ...current];
    this.opportunityMessageTemplates.set(next);
    this.persistOpportunityMessageTemplates(next);
    this.messageTemplateForm = this.emptyMessageTemplateForm();
    this.successMessage.set('Plantilla guardada para oportunidades.');
  }

  protected editOpportunityMessageTemplate(template: OpportunityMessageTemplate): void {
    this.messageTemplateForm = {
      id: template.id,
      channel: template.channel,
      title: template.title,
      body: template.body,
      audioName: template.audioName || '',
      audioDataUrl: template.audioDataUrl || '',
    };
  }

  protected resetOpportunityMessageTemplate(): void {
    this.messageTemplateForm = this.emptyMessageTemplateForm();
  }

  protected onTemplateAudioSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('audio/')) {
      this.errorMessage.set('Selecciona un archivo de audio valido.');
      input.value = '';
      return;
    }
    if (file.size > 1_500_000) {
      this.errorMessage.set('El audio debe pesar 1.5 MB como maximo para guardarse rapido.');
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.messageTemplateForm.audioName = file.name;
      this.messageTemplateForm.audioDataUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  protected deleteOpportunityMessageTemplate(id: string): void {
    const next = this.opportunityMessageTemplates().filter((item) => item.id !== id);
    this.opportunityMessageTemplates.set(next);
    this.persistOpportunityMessageTemplates(next);
    if (this.messageTemplateForm.id === id) {
      this.resetOpportunityMessageTemplate();
    }
  }

  protected addQuoteLine(): void {
    this.quoteForm.detalles.push({
      catalogoItemId: null,
      productoId: null,
      promocionId: null,
      descripcion: '',
      cantidad: 1,
      precioUnitario: 0,
      descuento: 0,
    });
  }

  protected removeQuoteLine(index: number): void {
    if (this.quoteForm.detalles.length <= 1) {
      return;
    }
    this.quoteForm.detalles.splice(index, 1);
  }

  protected onQuoteCatalogChange(line: QuoteLineForm, value: number | null): void {
    line.catalogoItemId = value;
    const catalogo = this.catalogoItems().find((item) => item.id === value);
    if (!catalogo) {
      return;
    }
    line.descripcion = catalogo.nombre;
    line.precioUnitario = Number(catalogo.precioReferencial || 0);
  }

  protected lineTotal(line: QuoteLineForm): number {
    return Math.max(
      0,
      Number(line.cantidad || 0) * Number(line.precioUnitario || 0) - Number(line.descuento || 0) - this.linePromotionDiscount(line),
    );
  }

  protected normalizeQuoteQuantity(value: number | string | null): number {
    return Math.max(1, Math.trunc(Number(value) || 1));
  }

  protected linePromotionDiscount(line: QuoteLineForm): number {
    if (!line.promocionId) {
      return 0;
    }
    const promotion = this.promocionesCotizacion().find((item) => item.id === line.promocionId);
    if (!promotion || promotion.estado !== 'ACTIVA') {
      return 0;
    }
    const base = Math.max(0, Number(line.cantidad || 0) * Number(line.precioUnitario || 0) - Number(line.descuento || 0));
    if (promotion.tipoDescuento === 'PORCENTAJE') {
      return Math.min(base, base * (Number(promotion.valor || 0) / 100));
    }
    return Math.min(base, Number(promotion.valor || 0));
  }

  protected quoteTotal(): number {
    return this.quoteForm.detalles.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  protected quoteOfferName(item: CrmOportunidad | null | undefined = this.selectedOpportunity()): string {
    if (!item) {
      return 'Oferta CRM';
    }
    const catalogo = this.opportunityCatalogItem(item);
    return catalogo?.nombre || item.descripcion || item.titulo || 'Oferta CRM';
  }

  protected quoteOfferDescription(item: CrmOportunidad | null | undefined = this.selectedOpportunity()): string {
    if (!item) {
      return 'Cotizacion generada desde CRM.';
    }
    const catalogo = this.opportunityCatalogItem(item);
    return catalogo?.descripcion || item.descripcion || 'Oferta registrada desde CRM para seguimiento comercial.';
  }

  protected quoteCompanyLogoUrl(): string | null {
    const empresa = this.auth.currentSession()?.empresa as { logoPanelUrl?: string | null } | undefined;
    return empresa?.logoPanelUrl || null;
  }

  protected quoteCompanyName(): string {
    const empresa = this.auth.currentSession()?.empresa as { razonSocial?: string | null } | undefined;
    return empresa?.razonSocial || 'AZURION';
  }

  protected quoteOpportunityContactName(): string {
    const opportunity = this.selectedOpportunity();
    return opportunity ? this.opportunityContactName(opportunity) : 'Solicitante CRM';
  }

  protected quoteOpportunityContactDetail(): string {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return 'La cotizacion se genera desde una oportunidad CRM.';
    }
    const prospect = this.prospectForOpportunity(opportunity);
    const client = this.clientForOpportunity(opportunity);
    const document = prospect?.numeroDocumento || client?.numeroDocumento || 'Sin documento';
    const phone = this.opportunityContactPhone(opportunity) || 'Sin telefono';
    const email = this.opportunityContactEmail(opportunity) || 'Sin correo';
    return `${document} · ${phone} · ${email}`;
  }

  protected quoteResponsibleName(): string {
    const opportunity = this.selectedOpportunity();
    return this.responsibleName(opportunity?.responsableId || this.currentUserKey());
  }

  protected saveQuote(): void {
    const oportunidadId = this.quoteForm.oportunidadId;
    if (!oportunidadId) {
      this.errorMessage.set('No se encontro la oportunidad para generar la cotizacion.');
      return;
    }
    const detalles = this.quoteForm.detalles
      .filter((line) => (line.productoId || line.descripcion.trim()) && Number(line.cantidad) > 0)
      .map((line) => ({
        productoId: line.productoId ? Number(line.productoId) : null,
        promocionId: line.promocionId ? Number(line.promocionId) : null,
        descripcion: line.descripcion.trim() || null,
        cantidad: this.normalizeQuoteQuantity(line.cantidad),
        precioUnitario: Number(line.precioUnitario || 0),
        descuento: Number(line.descuento || 0),
      }));
    if (!detalles.length) {
      this.errorMessage.set('Agrega al menos un item para cotizar.');
      return;
    }

    this.saving.set(true);
    this.resolveQuoteSucursalId()
      .pipe(
        switchMap((sucursalId) => {
          if (!sucursalId) {
            this.errorMessage.set('No hay una sucursal activa para cotizar. Reinicia el backend para aplicar la sede CRM base o crea una sucursal desde Configuracion.');
            return EMPTY;
          }
          this.quoteForm.sucursalId = sucursalId;
          return this.api.generarCotizacionDesdeCrmOportunidad(oportunidadId, {
            clienteId: this.quoteForm.clienteId,
            usuarioId: this.currentUserKey(),
            usuarioNombre: this.auth.currentSession()?.nombres || this.auth.currentSession()?.username || 'Usuario',
            sucursalId,
            fechaVencimiento: this.quoteForm.fechaVencimiento || null,
            moneda: 'PEN',
            observacion: this.quoteForm.observacion.trim() || null,
            crmOportunidadId: oportunidadId,
            detalles,
          });
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (saved) => {
          this.upsertQuote(this.withQuoteOpportunity(saved, oportunidadId));
          this.refreshOpportunityQuotes(oportunidadId);
          this.api.listCrmOportunidades().subscribe({
            next: (oportunidades) => {
              this.oportunidades.set(oportunidades);
              const current = oportunidades.find((item) => item.id === oportunidadId);
              if (current) {
                this.selectedOpportunity.set(current);
              }
            },
            error: () => undefined,
          });
          this.activeDialog.set(null);
          this.successMessage.set('Cotizacion creada. Enviala por WhatsApp o correo para pasar la oportunidad a Cotizado.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected humanize(value: string | null | undefined): string {
    return (value || '')
      .toLowerCase()
      .replaceAll('_', ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  protected stageProgress(etapa: string | null | undefined): number {
    const stages = this.etapaOptions();
    const index = stages.findIndex((stage) => stage.value === etapa);
    if (index < 0 || stages.length <= 1) {
      return 0;
    }
    return Math.round((index / (stages.length - 1)) * 100);
  }

  protected stageColor(etapa: string | null | undefined): string {
    return this.etapaOptions().find((stage) => stage.value === etapa)?.color || '#2563eb';
  }

  protected pipelineStageColor(etapa: string | null | undefined): string {
    const colors: Record<string, string> = {
      INTERESADO: '#2563eb',
      COTIZADO: '#f59e0b',
      NEGOCIACION: '#7c3aed',
      GANADO: '#10b981',
      PERDIDO: '#ef4444',
    };
    return colors[String(etapa || '').toUpperCase()] || this.stageColor(etapa);
  }

  protected stageSoftColor(etapa: string | null | undefined): string {
    return `color-mix(in srgb, ${this.stageColor(etapa)} 13%, white)`;
  }

  protected stageName(etapa: string | null | undefined): string {
    return this.etapaOptions().find((stage) => stage.value === etapa)?.label || this.humanize(etapa);
  }

  protected stageObjective(stage: PipelineStageOption | string | null | undefined): string {
    const code = typeof stage === 'string' ? stage : stage?.value;
    const configured = typeof stage === 'string'
      ? this.etapaOptions().find((item) => item.value === code)?.descripcion
      : stage?.descripcion;
    return configured || this.defaultStageObjective(code);
  }

  protected stageValidationMode(stage: PipelineStageOption | string | null | undefined): StageValidationMode {
    const code = typeof stage === 'string' ? stage : stage?.value;
    const configured = typeof stage === 'string'
      ? this.etapaOptions().find((item) => item.value === code)?.modoValidacion
      : stage?.modoValidacion;
    const normalized = String(configured || this.defaultStageValidationMode(code)).toUpperCase();
    return normalized === 'STRICT' || normalized === 'FREE' ? normalized : 'WARNING';
  }

  protected stageChecklistPreview(item: CrmOportunidad, stage: PipelineStageOption): PipelineChecklistItem[] {
    return this.stageChecklistFor(item, stage.value);
  }

  protected stageChecklistDoneCount(item: CrmOportunidad, stage: PipelineStageOption): number {
    return this.stageChecklistPreview(item, stage).filter((check) => check.done).length;
  }

  protected opportunityRiskBadges(item: CrmOportunidad): string[] {
    const badges: string[] = [];
    if (!this.nextOpportunityActivity(item) && this.isActiveOpportunity(item)) {
      badges.push('Sin proxima accion');
    }
    if (item.fechaCierreEstimada && this.isOverdue(item.fechaCierreEstimada) && this.isActiveOpportunity(item)) {
      badges.push('Cierre vencido');
    }
    return badges.slice(0, 2);
  }

  protected opportunityStageStepState(item: CrmOportunidad, etapa: string | null | undefined): 'done' | 'current' | 'pending' {
    if ((item.etapa === 'GANADO' && etapa === 'PERDIDO') || (item.etapa === 'PERDIDO' && etapa === 'GANADO')) {
      return 'pending';
    }
    const stages = this.etapaOptions();
    const currentIndex = stages.findIndex((stage) => stage.value === item.etapa);
    const stageIndex = stages.findIndex((stage) => stage.value === etapa);
    if (stageIndex < 0 || currentIndex < 0) {
      return 'pending';
    }
    if (stageIndex < currentIndex) {
      return 'done';
    }
    if (stageIndex === currentIndex && (item.estado === 'GANADA' || item.estado === 'PERDIDA')) {
      return 'done';
    }
    return stageIndex === currentIndex ? 'current' : 'pending';
  }

  protected relationshipLabel(item: CrmOportunidad): string {
    if (item.clienteNombre) {
      return 'Cliente existente';
    }
    if (item.prospectoNombre) {
      return 'Prospecto nuevo';
    }
    return 'Sin contacto';
  }

  protected opportunityProgress(item: CrmOportunidad): number {
    return Math.max(0, Math.min(100, Number(item.probabilidad || 0)));
  }

  protected opportunityTemperatureValue(itemOrProbability: CrmOportunidad | number | null | undefined): 'FRIO' | 'MEDIO' | 'CALIENTE' {
    const probability = typeof itemOrProbability === 'number'
      ? itemOrProbability
      : Number(itemOrProbability?.probabilidad || 0);
    if (probability >= 70) {
      return 'CALIENTE';
    }
    if (probability >= 40) {
      return 'MEDIO';
    }
    return 'FRIO';
  }

  protected opportunityTemperatureLabel(itemOrProbability: CrmOportunidad | number | null | undefined): string {
    return this.humanize(this.opportunityTemperatureValue(itemOrProbability));
  }

  protected opportunityTemperatureTone(itemOrProbability: CrmOportunidad | number | null | undefined): 'cold' | 'warm' | 'hot' {
    const value = this.opportunityTemperatureValue(itemOrProbability);
    if (value === 'CALIENTE') {
      return 'hot';
    }
    if (value === 'MEDIO') {
      return 'warm';
    }
    return 'cold';
  }

  protected opportunityFormTemperature(): 'FRIO' | 'MEDIO' | 'CALIENTE' {
    return this.opportunityTemperatureValue(this.opportunityForm.probabilidad);
  }

  protected setOpportunityFormTemperature(value: string | null): void {
    const temperature = value === 'CALIENTE' || value === 'MEDIO' || value === 'FRIO' ? value : 'MEDIO';
    this.opportunityForm.probabilidad = temperature === 'CALIENTE' ? 85 : temperature === 'MEDIO' ? 60 : 25;
  }

  protected opportunityRingBackground(item: CrmOportunidad): string {
    const progress = this.opportunityProgress(item);
    return `conic-gradient(${this.stageColor(item.etapa)} 0 ${progress}%, #e5e7eb ${progress}% 100%)`;
  }

  protected opportunityFinancialSummary(item: CrmOportunidad): {
    total: number;
    paid: number;
    pending: number;
    percent: number;
    status: 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'VENCIDO';
  } {
    const agreedTotal = Number(this.latestFinalNegotiationRecord(item)?.precioFinal || 0);
    const total = Math.max(0, Number(agreedTotal || item.montoReal || item.montoEstimado || 0));
    const registeredPaid = this.opportunityPaymentRecords()
      .filter((payment) =>
        payment.oportunidadId === item.id &&
        ['PAGADO', 'PARCIAL'].includes(payment.estado),
      )
      .reduce((sum, payment) => sum + Math.max(0, Number(payment.monto || 0)), 0);
    const paid = Math.min(total, registeredPaid);
    const pending = Math.max(0, total - paid);
    const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
    const closeDate = item.fechaCierreEstimada ? new Date(item.fechaCierreEstimada) : null;
    const overdue = Boolean(closeDate && pending > 0 && closeDate.getTime() < Date.now());
    const status = pending <= 0 && total > 0 ? 'PAGADO' : paid > 0 ? 'PARCIAL' : overdue ? 'VENCIDO' : 'PENDIENTE';
    return { total, paid, pending, percent, status };
  }

  protected opportunityFinancialStatusLabel(item: CrmOportunidad): string {
    return this.humanize(this.opportunityFinancialSummary(item).status);
  }

  protected opportunityFinancialStatusTone(item: CrmOportunidad): 'pending' | 'partial' | 'paid' | 'overdue' {
    const status = this.opportunityFinancialSummary(item).status;
    if (status === 'PAGADO') {
      return 'paid';
    }
    if (status === 'PARCIAL') {
      return 'partial';
    }
    if (status === 'VENCIDO') {
      return 'overdue';
    }
    return 'pending';
  }

  protected paymentStatusLabel(value: string | null | undefined): string {
    return this.humanize(value || 'PENDIENTE');
  }

  protected paymentStatusTone(value: string | null | undefined): 'pending' | 'partial' | 'paid' | 'overdue' {
    const status = String(value || 'PENDIENTE').toUpperCase();
    if (status === 'PAGADO') {
      return 'paid';
    }
    if (status === 'PARCIAL') {
      return 'partial';
    }
    if (status === 'VENCIDO') {
      return 'overdue';
    }
    return 'pending';
  }

  protected opportunityPaymentPlan(item: CrmOportunidad): {
    isCredit: boolean;
    cuotas: number;
    paidPayments: OpportunityPaymentRecord[];
    pendingInstallments: OpportunityPaymentRecord[];
    overdueInstallments: OpportunityPaymentRecord[];
    paidAmount: number;
    pendingAmount: number;
    scheduledAmount: number;
    requiredInitialAmount: number;
    firstPaymentDone: boolean;
    hasPaymentProof: boolean;
    remainingProgrammed: boolean;
    paymentModeLabel: string;
  } {
    const agreement = this.latestFinalNegotiationRecord(item);
    const payments = this.opportunityPaymentRecords().filter((payment) => payment.oportunidadId === item.id);
    const installmentPayments = payments.filter((payment) => payment.tipo === 'CUOTA');
    const cuotas = Math.max(1, Number(agreement?.cuotas || 1), installmentPayments.length);
    const formaPago = String(agreement?.formaPago || '').toUpperCase();
    const isCredit = cuotas > 1 || installmentPayments.length > 0 || /CREDITO|CR[eÉ]DITO|CUOTA|FINAN/.test(formaPago);
    const paidPayments = payments.filter((payment) => ['PAGADO', 'PARCIAL'].includes(payment.estado));
    const pendingInstallments = payments.filter((payment) =>
      payment.tipo === 'CUOTA' &&
      ['PENDIENTE', 'PARCIAL', 'VENCIDO'].includes(payment.estado),
    );
    const overdueInstallments = pendingInstallments.filter((payment) =>
      payment.estado === 'VENCIDO' || this.isOverdue(payment.fecha),
    );
    const money = this.opportunityFinancialSummary(item);
    const paidAmount = paidPayments.reduce((sum, payment) => sum + Math.max(0, Number(payment.monto || 0)), 0);
    const scheduledAmount = pendingInstallments.reduce((sum, payment) => sum + Math.max(0, Number(payment.monto || 0)), 0);
    const requiredInitialAmount = isCredit
      ? Math.round((money.total / cuotas) * 100) / 100
      : money.total;
    const hasPaymentProof = paidPayments.some((payment) =>
      payment.estado === 'PAGADO' &&
      Boolean(payment.archivoDataUrl || payment.archivoNombre),
    );
    const expectedPendingInstallments = isCredit ? Math.max(0, cuotas - 1) : 0;
    const remainingProgrammed = !isCredit || (pendingInstallments.length >= expectedPendingInstallments && scheduledAmount + 0.01 >= money.pending);
    return {
      isCredit,
      cuotas,
      paidPayments,
      pendingInstallments,
      overdueInstallments,
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

  protected paymentFollowUpItems = computed(() =>
    this.paymentFollowUpCandidates()
      .filter((item) => {
        const plan = this.opportunityPaymentPlan(item);
        return plan.isCredit && plan.paidAmount > 0 && (plan.pendingAmount > 0 || plan.pendingInstallments.length > 0);
      })
      .filter((item) => this.matchesOpportunityQuery(item, this.query().trim().toLowerCase()))
      .sort((a, b) => this.paymentFollowUpPriority(b) - this.paymentFollowUpPriority(a)),
  );

  protected readonly paymentFollowUpMetrics = computed(() => {
    const items = this.paymentFollowUpItems();
    const pendingAmount = items.reduce((sum, item) => sum + this.opportunityPaymentPlan(item).pendingAmount, 0);
    const overdue = items.filter((item) => this.opportunityPaymentPlan(item).overdueInstallments.length > 0).length;
    const installments = items.reduce((sum, item) => sum + this.opportunityPaymentPlan(item).pendingInstallments.length, 0);
    return [
      { label: 'Clientes con deuda', value: String(items.length), detail: 'requieren seguimiento' },
      { label: 'Saldo pendiente', value: `S/ ${this.formatCompactAmount(pendingAmount)}`, detail: 'por cobrar' },
      { label: 'Cuotas pendientes', value: String(installments), detail: 'programadas' },
      { label: 'Vencidos', value: String(overdue), detail: 'atencion inmediata' },
    ];
  });

  protected readonly paymentFollowUpRows = computed(() => this.paymentFollowUpItems());

  protected readonly paymentFollowUpSummaryCards = computed(() => {
    const rows = this.paymentFollowUpRows();
    const pendingAmount = rows.reduce((sum, item) => sum + this.opportunityPaymentPlan(item).pendingAmount, 0);
    const pendingInstallments = rows.flatMap((item) => this.opportunityPaymentPlan(item).pendingInstallments);
    const overdueInstallments = rows.flatMap((item) => this.opportunityPaymentPlan(item).overdueInstallments);
    const soonInstallments = pendingInstallments.filter((payment) => this.paymentDaysUntil(payment.fecha) >= 0 && this.paymentDaysUntil(payment.fecha) <= 7);
    const paidThisMonth = this.opportunityPaymentRecords()
      .filter((payment) => ['PAGADO', 'PARCIAL'].includes(payment.estado) && this.isThisMonth(payment.fecha || payment.createdAt));
    const paidThisMonthAmount = paidThisMonth.reduce((sum, payment) => sum + Number(payment.monto || 0), 0);
    return [
      {
        label: 'Saldo total pendiente',
        value: `S/ ${this.formatCompactAmount(pendingAmount)}`,
        detail: `${rows.length} cuentas pendientes`,
        icon: 'pi pi-file-excel',
        color: '#ef4444',
        soft: '#fee2e2',
      },
      {
        label: 'Por vencer (proximos 7 dias)',
        value: `S/ ${this.formatCompactAmount(soonInstallments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0))}`,
        detail: `${soonInstallments.length} cuotas por vencer`,
        icon: 'pi pi-calendar',
        color: '#f97316',
        soft: '#ffedd5',
      },
      {
        label: 'Vencidos',
        value: `S/ ${this.formatCompactAmount(overdueInstallments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0))}`,
        detail: `${overdueInstallments.length} cuotas vencidas`,
        icon: 'pi pi-exclamation-triangle',
        color: '#ef4444',
        soft: '#fee2e2',
      },
      {
        label: 'Pagado este mes',
        value: `S/ ${this.formatCompactAmount(paidThisMonthAmount)}`,
        detail: `${paidThisMonth.length} pagos registrados`,
        icon: 'pi pi-dollar',
        color: '#059669',
        soft: '#dcfce7',
      },
    ];
  });

  protected readonly paymentFollowUpUpcoming = computed(() =>
    this.paymentFollowUpRows()
      .flatMap((item) =>
        this.opportunityPaymentPlan(item).pendingInstallments.map((payment) => ({
          id: `${item.id}-${payment.id}`,
          item,
          payment,
        })),
      )
      .sort((a, b) => Date.parse(a.payment.fecha || '') - Date.parse(b.payment.fecha || ''))
      .slice(0, 5),
  );

  protected readonly paymentCollectionSummary = computed(() => {
    const rows = this.paymentFollowUpRows();
    const overdue = rows.filter((item) => this.opportunityPaymentPlan(item).overdueInstallments.length > 0);
    const soon = rows.filter((item) => {
      const next = this.paymentNextInstallment(item);
      const days = this.paymentDaysUntil(next?.fecha);
      return !this.opportunityPaymentPlan(item).overdueInstallments.length && days >= 0 && days <= 7;
    });
    const paid = this.paymentFollowUpCandidates().filter((item) => this.opportunityFinancialSummary(item).pending <= 0);
    return [
      {
        label: 'Vencidas',
        count: overdue.length,
        amount: overdue.reduce((sum, item) => sum + this.opportunityPaymentPlan(item).overdueInstallments.reduce((inner, payment) => inner + Number(payment.monto || 0), 0), 0),
        color: '#ef4444',
      },
      {
        label: 'Por vencer',
        count: soon.length,
        amount: soon.reduce((sum, item) => sum + Number(this.paymentNextInstallment(item)?.monto || 0), 0),
        color: '#f97316',
      },
      {
        label: 'Pagadas',
        count: paid.length,
        amount: paid.reduce((sum, item) => sum + this.opportunityFinancialSummary(item).paid, 0),
        color: '#10b981',
      },
    ];
  });

  protected readonly paymentCollectionRingBackground = computed(() => {
    const summary = this.paymentCollectionSummary();
    const total = summary.reduce((sum, item) => sum + item.count, 0);
    if (!total) {
      return 'conic-gradient(#e5e7eb 0 100%)';
    }
    let cursor = 0;
    const stops = summary
      .map((item) => {
        const start = cursor;
        cursor += (item.count / total) * 100;
        return `${item.color} ${start}% ${cursor}%`;
      })
      .join(', ');
    return `conic-gradient(${stops})`;
  });

  protected paymentNextInstallment(item: CrmOportunidad): OpportunityPaymentRecord | null {
    return [...this.opportunityPaymentPlan(item).pendingInstallments]
      .sort((a, b) => Date.parse(a.fecha || '') - Date.parse(b.fecha || ''))[0] ?? null;
  }

  protected paymentDueTone(item: CrmOportunidad): { label: string; color: string; bg: string } {
    const plan = this.opportunityPaymentPlan(item);
    if (plan.pendingAmount <= 0) {
      return { label: 'Pagado', color: '#059669', bg: '#dcfce7' };
    }
    if (plan.overdueInstallments.length > 0) {
      return { label: 'Vencido', color: '#dc2626', bg: '#fee2e2' };
    }
    const next = this.paymentNextInstallment(item);
    const days = this.paymentDaysUntil(next?.fecha);
    if (days >= 0 && days <= 7) {
      return { label: 'Por vencer', color: '#f97316', bg: '#ffedd5' };
    }
    return { label: 'En seguimiento', color: '#2563eb', bg: '#dbeafe' };
  }

  protected paymentInstallmentProgress(item: CrmOportunidad): string {
    const plan = this.opportunityPaymentPlan(item);
    const paid = plan.paidPayments.length;
    const total = Math.max(plan.cuotas, paid + plan.pendingInstallments.length, 1);
    return `${paid}/${total}`;
  }

  protected paymentDaysLabel(dateValue: string | null | undefined): string {
    const days = this.paymentDaysUntil(dateValue);
    if (!Number.isFinite(days)) {
      return 'Sin fecha';
    }
    if (days === 0) {
      return 'Vence hoy';
    }
    if (days > 0) {
      return `En ${days} dia(s)`;
    }
    return `Vencio hace ${Math.abs(days)} dia(s)`;
  }

  protected paymentDaysUntil(dateValue: string | null | undefined): number {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return Number.POSITIVE_INFINITY;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.round((date.getTime() - today.getTime()) / 86_400_000);
  }

  protected scheduleRemainingInstallments(item: CrmOportunidad): void {
    const plan = this.opportunityPaymentPlan(item);
    if (!plan.isCredit) {
      this.errorMessage.set('Esta venta esta registrada como contado. No requiere cuotas pendientes.');
      return;
    }
    if (!plan.firstPaymentDone) {
      this.errorMessage.set('Primero registra el pago de la primera cuota.');
      return;
    }
    if (plan.pendingAmount <= 0) {
      this.successMessage.set('La venta no tiene saldo pendiente.');
      return;
    }
    const missingCount = Math.max(0, (plan.cuotas - 1) - plan.pendingInstallments.length);
    if (missingCount <= 0 && plan.scheduledAmount + 0.01 >= plan.pendingAmount) {
      this.successMessage.set('Las cuotas pendientes ya estan programadas.');
      return;
    }
    const count = Math.max(1, missingCount);
    const amount = Math.round((plan.pendingAmount / count) * 100) / 100;
    const baseDate = new Date();
    const existingCount = plan.paidPayments.length + plan.pendingInstallments.length;
    const records = Array.from({ length: count }, (_, index): OpportunityPaymentRecord => {
      const dueDate = this.addMonths(baseDate, index + 1);
      return {
        id: this.createLocalId('pay'),
        oportunidadId: item.id,
        fecha: this.toInputDate(dueDate),
        tipo: 'CUOTA',
        monto: index === count - 1
          ? Math.round((plan.pendingAmount - amount * (count - 1)) * 100) / 100
          : amount,
        estado: 'PENDIENTE',
        metodo: 'Credito',
        observacion: `Cuota ${existingCount + index + 1} de ${plan.cuotas} programada`,
        archivoNombre: '',
        archivoDataUrl: '',
        createdAt: new Date().toISOString(),
      };
    });
    const next = [...records, ...this.opportunityPaymentRecords()];
    this.opportunityPaymentRecords.set(next);
    this.persistOpportunityRecords(this.opportunityPaymentStorageKey(), next);
    this.successMessage.set('Cuotas pendientes programadas para seguimiento de pagos.');
  }

  protected openPaymentFollowUpDetail(item: CrmOportunidad): void {
    this.openPipelineOpportunityDetail(item, 'GANADO');
    this.opportunityDetailTab.set('pagos');
  }

  protected documentCategoryLabel(value: string | null | undefined): string {
    return this.documentCategoryOptions.find((item) => item.value === value)?.label || this.humanize(value || 'OTRO');
  }

  protected historyToneClass(value: OpportunityHistoryEvent['tone']): string {
    return `opportunity-history-item--${value}`;
  }

  protected ownerInitials(value: string | null | undefined): string {
    const raw = this.responsibleName(value || this.currentUserKey() || 'AZ').trim();
    const parts = raw.split(/[\s._-]+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : raw.slice(0, 2);
    return letters.toUpperCase();
  }

  protected contactInitials(value: string | null | undefined): string {
    const raw = String(value || 'Cliente').trim();
    const parts = raw.split(/[\s._-]+/).filter(Boolean);
    const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : raw.slice(0, 2);
    return letters.toUpperCase();
  }

  protected responsibleName(value: string | null | undefined): string {
    const key = String(value || '').trim();
    if (!key) {
      return 'Sin responsable';
    }
    const user = this.usuarios().find((item) => String(item.id) === key || item.username === key);
    if (user) {
      return user.nombres || user.username;
    }
    const session = this.auth.currentSession();
    if (key === this.currentUserKey() || key === session?.username) {
      return session?.nombres || session?.username || key;
    }
    return key;
  }

  private userDisplayName(user: UsuarioTenant): string {
    return user.nombres ? `${user.nombres} (${user.username})` : user.username;
  }

  protected opportunityStatusTone(item: CrmOportunidad): 'active' | 'won' | 'lost' | 'neutral' {
    if (item.estado === 'GANADA' || item.etapa === 'GANADO') {
      return 'won';
    }
    if (item.estado === 'PERDIDA' || item.etapa === 'PERDIDO') {
      return 'lost';
    }
    if (this.isActiveOpportunity(item)) {
      return 'active';
    }
    return 'neutral';
  }

  protected quoteStatusValue(item: Cotizacion): string {
    return (item.estado || 'BORRADOR').toUpperCase();
  }

  protected quoteStatusLabel(item: Cotizacion): string {
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
    return labels[this.quoteStatusValue(item)] || this.humanize(item.estado);
  }

  protected quoteStatusTone(item: Cotizacion): 'pending' | 'accepted' | 'rejected' {
    const status = this.quoteStatusValue(item);
    if (status === 'ACEPTADA' || status === 'NEGOCIACION' || status === 'CONVERTIDA') {
      return 'accepted';
    }
    if (status === 'RECHAZADA') {
      return 'rejected';
    }
    return 'pending';
  }

  protected quoteContactName(item: Cotizacion): string {
    if (item.clienteNombre) {
      return item.clienteNombre;
    }
    const opportunity = this.opportunityForQuote(item);
    return opportunity ? this.opportunityContactName(opportunity) : 'Cliente por definir';
  }

  protected quoteOpportunityTitle(item: Cotizacion): string {
    const opportunity = this.opportunityForQuote(item);
    return opportunity?.titulo || item.detalles?.[0]?.descripcion || 'Cotizacion comercial';
  }

  protected quoteNextStep(item: Cotizacion): string {
    const status = this.quoteStatusValue(item);
    if (status === 'BORRADOR') {
      return 'Enviar cotizacion';
    }
    if (status === 'ENVIADA') {
      return 'Dar seguimiento';
    }
    if (status === 'EN_SEGUIMIENTO') {
      return 'Esperar respuesta';
    }
    if (status === 'ACEPTADA') {
      return 'Aceptada en primera instancia';
    }
    if (status === 'NEGOCIACION') {
      return 'Cliente pidio ajuste o mejores condiciones';
    }
    if (status === 'RECHAZADA') {
      return 'Cerrada rechazada';
    }
    return this.quoteStatusLabel(item);
  }

  protected downloadQuotePdf(item: Cotizacion, successMessage = 'Documento PDF generado.'): void {
    this.actionId.set(item.id);
    this.api
      .getCotizacionPdf(item.id)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (file) => {
          const contentType = file.contentType || 'application/pdf';
          const fileName = file.fileName || `cotizacion-crm-${item.id}.pdf`;
          this.downloadLocalFile(fileName, `data:${contentType};base64,${file.base64}`);
          if (successMessage) {
            this.successMessage.set(successMessage);
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected quoteWhatsappUrl(item: Cotizacion): string | null {
    const phone = this.onlyDigits(this.quoteContactPhone(item));
    if (!phone) {
      return null;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(this.quoteShareMessage(item))}`;
  }

  protected quoteEmailUrl(item: Cotizacion): string | null {
    const email = this.quoteContactEmail(item);
    if (!email) {
      return null;
    }
    const subject = encodeURIComponent(`Cotizacion COT-${String(item.id).padStart(3, '0')} - ${this.quoteOpportunityTitle(item)}`);
    const body = encodeURIComponent(this.quoteShareMessage(item));
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  protected sendQuoteByWhatsapp(item: Cotizacion): void {
    const url = this.quoteWhatsappUrl(item);
    if (!url) {
      this.errorMessage.set('El contacto no tiene telefono para enviar la cotizacion por WhatsApp.');
      return;
    }
    this.downloadQuotePdf(item, 'PDF generado. Adjuntalo al WhatsApp antes de enviar.');
    globalThis.open(url, '_blank', 'noopener');
    this.sendQuote(item, 'WHATSAPP');
  }

  protected sendQuoteByEmail(item: Cotizacion): void {
    const url = this.quoteEmailUrl(item);
    if (!url) {
      this.errorMessage.set('El contacto no tiene correo para enviar la cotizacion.');
      return;
    }
    this.downloadQuotePdf(item, 'PDF generado. Adjuntalo al correo antes de enviar.');
    globalThis.location.href = url;
    this.sendQuote(item, 'CORREO');
  }

  protected sendQuote(item: Cotizacion, canalEnvio = 'WHATSAPP'): void {
    this.updateQuoteFlow(item, {
      estado: 'ENVIADA',
      canalEnvio,
    }, 'Cotizacion marcada como enviada.');
  }

  protected followQuote(item: Cotizacion): void {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    this.updateQuoteFlow(item, {
      estado: 'EN_SEGUIMIENTO',
      canalEnvio: item.canalEnvio || 'WHATSAPP',
      proximoSeguimientoEn: next.toISOString(),
    }, 'Cotizacion en seguimiento.');
  }

  protected acceptQuoteToNegotiation(item: Cotizacion): void {
    this.updateQuoteFlow(item, {
      estado: 'NEGOCIACION',
      decisionSiguiente: 'NEGOCIACION',
    }, 'Cliente no acepto la propuesta tal como esta. Oportunidad enviada a negociacion.', 'NEGOCIACION');
  }

  protected acceptQuoteToSale(item: Cotizacion): void {
    this.updateQuoteFlow(item, {
      estado: 'ACEPTADA',
      decisionSiguiente: 'VENTA',
    }, 'Cliente acepto condiciones. Oportunidad enviada a negociacion para confirmar cierre.', 'NEGOCIACION');
  }

  protected rejectQuote(item: Cotizacion): void {
    this.updateQuoteFlow(item, {
      estado: 'RECHAZADA',
      motivoRechazo: 'Rechazada desde CRM',
    }, 'Cotizacion rechazada.');
  }

  protected openQuoteOpportunityDetail(item: Cotizacion): void {
    const opportunity = this.opportunityForQuote(item);
    if (opportunity) {
      this.openOpportunityDetail(opportunity);
    }
  }

  private quoteContactPhone(item: Cotizacion): string {
    const opportunity = this.opportunityForQuote(item);
    if (opportunity) {
      return this.opportunityContactPhone(opportunity);
    }
    const client = item.clienteId ? this.clientes().find((cliente) => cliente.id === item.clienteId) : null;
    return client?.telefono || '';
  }

  private quoteContactEmail(item: Cotizacion): string {
    const opportunity = this.opportunityForQuote(item);
    if (opportunity) {
      return this.opportunityContactEmail(opportunity);
    }
    const client = item.clienteId ? this.clientes().find((cliente) => cliente.id === item.clienteId) : null;
    return client?.email || '';
  }

  private quoteShareMessage(item: Cotizacion): string {
    const contactName = this.quoteContactName(item);
    const opportunityTitle = this.quoteOpportunityTitle(item);
    const amount = Number(item.total || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dueDate = item.fechaVencimiento ? ` Vigencia: ${item.fechaVencimiento}.` : '';
    const observation = item.observacion ? `\n\nObservacion: ${item.observacion}` : '';
    return `Hola ${contactName}, te comparto la cotizacion COT-${String(item.id).padStart(3, '0')} por ${opportunityTitle}. Total: S/ ${amount}.${dueDate}${observation}`;
  }

  protected savePromotion(): void {
    const codigo = this.promotionForm.codigo.trim();
    const nombre = this.promotionForm.nombre.trim();
    if (!codigo || !nombre) {
      this.errorMessage.set('Indica codigo y nombre de la promocion.');
      return;
    }
    if (Number(this.promotionForm.valor || 0) < 0) {
      this.errorMessage.set('El valor de la promocion no puede ser negativo.');
      return;
    }
    this.saving.set(true);
    this.api
      .createPromocionCotizacion({
        codigo,
        nombre,
        descripcion: this.promotionForm.descripcion.trim() || null,
        tipoDescuento: this.promotionForm.tipoDescuento,
        valor: Number(this.promotionForm.valor || 0),
        fechaInicio: this.promotionForm.fechaInicio || null,
        fechaFin: this.promotionForm.fechaFin || null,
        estado: 'ACTIVA',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.promocionesCotizacion.set([saved, ...this.promocionesCotizacion().filter((item) => item.id !== saved.id)]);
          this.promotionForm = this.emptyPromotionForm();
          this.successMessage.set('Promocion registrada para cotizaciones.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected exportOpportunitiesCsv(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const rows = [
      ['Oportunidad', 'Contacto', 'Empresa', 'Etapa', 'Valor estimado', 'Interes', 'Fecha estimada', 'Responsable', 'Estado'],
      ...this.opportunityListItems().map((item) => [
        item.titulo,
        this.opportunityContactName(item),
        this.opportunityCompanyLabel(item),
        this.stageName(item.etapa),
        Number(item.montoEstimado || 0).toFixed(2),
        this.opportunityTemperatureLabel(item),
        item.fechaCierreEstimada || '',
        this.responsibleName(item.responsableId),
        this.humanize(item.estado),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `oportunidades-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected exportClientsCsv(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const rows = [
      ['Cliente', 'Empresa', 'Producto comprado', 'Valor compra', 'Monto pagado', 'Deuda pendiente', 'Documentos', 'Fecha cierre', 'Responsable'],
      ...this.clientsDashboardItems().map((item) => [
        this.opportunityContactName(item),
        this.opportunityCompanyLabel(item),
        this.quoteOfferName(item),
        Number(item.montoReal || item.montoEstimado || 0).toFixed(2),
        this.opportunityFinancialSummary(item).paid.toFixed(2),
        this.clientDebt(item).toFixed(2),
        String(this.clientDocumentCount(item)),
        this.clientClosureDate(item),
        this.responsibleName(item.responsableId),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  protected opportunityContactName(item: CrmOportunidad): string {
    return item.clienteNombre || item.prospectoNombre || 'Sin contacto';
  }

  protected opportunityCompanyLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    const cliente = this.clientForOpportunity(item);
    return prospect?.razonSocial || prospect?.nombreComercial || cliente?.nombre || this.opportunityContactName(item);
  }

  protected opportunityCampaignLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    return prospect?.campania?.trim() || (prospect ? 'Sin campania' : 'Ingreso manual');
  }

  protected opportunityOriginLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    if (prospect) {
      return this.humanize(prospect.canalIngreso || prospect.origen || 'WEB');
    }
    return item.clienteId ? 'Cliente existente' : 'Manual';
  }

  protected opportunityContactPhone(item: CrmOportunidad): string {
    return this.prospectForOpportunity(item)?.telefono || this.clientForOpportunity(item)?.telefono || '';
  }

  protected opportunityContactEmail(item: CrmOportunidad): string {
    return this.prospectForOpportunity(item)?.correo || this.clientForOpportunity(item)?.email || '';
  }

  protected opportunityTags(item: CrmOportunidad): string[] {
    const tags = [this.opportunityTypeLabel(item.tipoOportunidad), this.stageName(item.etapa)];
    const catalogo = this.catalogoItems().find((catalog) => catalog.id === item.catalogoItemId);
    if (catalogo?.nombre) {
      tags.push(catalogo.nombre);
    }
    return tags.filter(Boolean).slice(0, 4);
  }

  private defaultRequirementForOpportunity(item: CrmOportunidad): OpportunityRequirementRecord {
    const catalogo = this.opportunityCatalogItem(item);
    const name = catalogo?.nombre || item.descripcion || item.titulo || this.opportunityTypeLabel(item.tipoOportunidad);
    const amount = Number(item.montoEstimado || catalogo?.precioReferencial || 0);
    return {
      id: `default-${item.id}`,
      oportunidadId: item.id,
      catalogoItemId: item.catalogoItemId ?? null,
      nombre: name,
      cantidad: 1,
      precioUnitario: amount,
      observacion: catalogo?.descripcion || item.descripcion || '',
      createdAt: item.createdAt || new Date().toISOString(),
    };
  }

  private addDefaultRequirement(item: CrmOportunidad): void {
    if (this.opportunityRequirementRecords().some((record) => record.oportunidadId === item.id)) {
      return;
    }
    const record = { ...this.defaultRequirementForOpportunity(item), id: this.createLocalId('req') };
    const next = [...this.opportunityRequirementRecords(), record];
    this.opportunityRequirementRecords.set(next);
    this.persistOpportunityRecords(this.opportunityRequirementStorageKey(), next);
  }

  protected opportunityNextActionLabel(item: CrmOportunidad): string {
    return this.nextOpportunityActivity(item)?.asunto || 'Programar actividad';
  }

  protected opportunityNextActionDate(item: CrmOportunidad): string {
    const activity = this.nextOpportunityActivity(item);
    return activity ? this.activityRelativeLabel(activity.fechaProgramada) : 'Sin fecha programada';
  }

  protected opportunityCloseState(item: CrmOportunidad): string {
    if (item.estado === 'GANADA' || item.etapa === 'GANADO') {
      return 'Ganada';
    }
    if (item.estado === 'PERDIDA' || item.etapa === 'PERDIDO') {
      return 'Perdida';
    }
    if (!item.fechaCierreEstimada) {
      return 'Pendiente definir';
    }
    if (this.isOverdue(item.fechaCierreEstimada)) {
      return 'Cierre vencido';
    }
    if (this.isToday(item.fechaCierreEstimada)) {
      return 'Cierra hoy';
    }
    return 'Planificado';
  }

  private nextOpportunityActivity(item: CrmOportunidad): CrmActividad | null {
    return this.actividades()
      .filter((activity) => activity.oportunidadId === item.id && activity.estado === 'PENDIENTE')
      .sort((a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''))[0] ?? null;
  }

  private hasOpportunityActivity(item: CrmOportunidad, predicate?: (activity: CrmActividad) => boolean): boolean {
    return this.actividades().some((activity) => {
      const linked = activity.oportunidadId === item.id || (!!item.prospectoId && activity.prospectoId === item.prospectoId);
      return linked && (!predicate || predicate(activity));
    });
  }

  private hasOpportunityQuoteContext(item: CrmOportunidad): boolean {
    return this.cotizaciones().some((quote) => quote.crmOportunidadId === item.id);
  }

  private hasOpportunitySentQuote(item: CrmOportunidad): boolean {
    return this.cotizaciones().some((quote) =>
      quote.crmOportunidadId === item.id &&
      ['ENVIADA', 'EN_SEGUIMIENTO', 'ACEPTADA'].includes(this.quoteStatusValue(quote)),
    );
  }

  private isStageAtOrAfter(current: string | null | undefined, target: string): boolean {
    const stages = this.etapaOptions();
    const currentIndex = stages.findIndex((stage) => stage.value === current);
    const targetIndex = stages.findIndex((stage) => stage.value === target);
    return currentIndex >= 0 && targetIndex >= 0 && currentIndex >= targetIndex;
  }

  private normalizedOpportunityStages(): CrmEtapaPipeline[] {
    const order = new Map<string, number>(CRM_OPPORTUNITY_FLOW_STAGES.map((stage, index) => [stage, index]));
    return this.etapas()
      .filter((item) => order.has(item.codigo))
      .sort((a, b) => (order.get(a.codigo) ?? 0) - (order.get(b.codigo) ?? 0));
  }

  private defaultStageObjective(stage: string | null | undefined): string {
    const objectives: Record<string, string> = {
      NUEVO: 'Oportunidad recien creada, pendiente de primera gestion.',
      CONTACTADO: 'Cliente ya fue contactado y existe una primera respuesta.',
      INTERESADO: 'Cliente mostro interes real y se califico la necesidad.',
      COTIZADO: 'Se envio una propuesta o cotizacion formal.',
      NEGOCIACION: 'Se negocian precio, condiciones, pago o cierre.',
      GANADO: 'Venta aceptada o cierre comercial confirmado.',
      PERDIDO: 'Oportunidad descartada con motivo registrado.',
    };
    return objectives[String(stage || '').toUpperCase()] || 'Etapa comercial configurable.';
  }

  private defaultStageProbability(stage: string | null | undefined): number {
    const probabilities: Record<string, number> = {
      NUEVO: 10,
      CONTACTADO: 25,
      INTERESADO: 50,
      COTIZADO: 65,
      NEGOCIACION: 80,
      GANADO: 100,
      PERDIDO: 0,
    };
    return probabilities[String(stage || '').toUpperCase()] ?? 0;
  }

  private defaultStageValidationMode(stage: string | null | undefined): StageValidationMode {
    const strictStages = ['COTIZADO', 'GANADO', 'PERDIDO'];
    const code = String(stage || '').toUpperCase();
    if (code === 'NUEVO') {
      return 'FREE';
    }
    return strictStages.includes(code) ? 'STRICT' : 'WARNING';
  }

  private stageChecklistFor(item: CrmOportunidad, stage: string | null | undefined): PipelineChecklistItem[] {
    const code = String(stage || '').toUpperCase();
    const hasActivity = this.hasOpportunityActivity(item);
    const hasCompletedContact = this.hasOpportunityActivity(item, (activity) =>
      activity.estado === 'REALIZADA' && ['LLAMADA', 'WHATSAPP', 'CORREO', 'REUNION', 'VISITA'].includes(activity.tipoActividad),
    );
    const hasConfirmedInterest = this.hasOpportunityActivity(item, (activity) =>
      activity.estado === 'REALIZADA' &&
      (
        ['INTERESADO', 'COTIZACION_SOLICITADA'].includes(String(activity.resultadoContacto || '')) ||
        ['MEDIO', 'CALIENTE'].includes(String(activity.nivelInteres || '').toUpperCase())
      ),
    );
    const hasFutureActivity = !!this.nextOpportunityActivity(item);
    const hasQuote = this.hasOpportunityQuoteContext(item);
    const hasSentQuote = this.hasOpportunitySentQuote(item);
    const hasFinalAgreement = this.hasFinalAgreement(item);
    const hasClosingEvidence = this.hasClosingEvidence(item);
    const hasBudget = Number(item.montoEstimado || 0) > 0;
    const interest = this.opportunityTemperatureValue(item);
    const hasMediumInterest = interest === 'MEDIO' || interest === 'CALIENTE';
    const hasOffer = !!item.catalogoItemId || !!item.descripcion || !!item.tipoOportunidad;
    const hasCloseDate = !!item.fechaCierreEstimada;
    const hasLossReason = !!item.motivoPerdida;

    const make = (
      checklist: Array<[string, string, string, boolean, boolean, StageRequirementAction]>,
    ): PipelineChecklistItem[] =>
      checklist.map(([itemCode, label, description, required, done, action]) => ({
        code: itemCode,
        label,
        description,
        required,
        done,
        action,
      }));

    switch (code) {
      case 'CONTACTADO':
        return make([
          ['ACTIVIDAD_REALIZADA', 'Actividad de contacto cumplida', 'Marca una llamada, WhatsApp, correo, reunion o visita como realizada para confirmar que hubo contacto.', true, hasCompletedContact, 'activity'],
          ['RESPONSABLE', 'Responsable asignado', 'Debe existir un usuario responsable del siguiente contacto.', true, !!item.responsableId, 'detail'],
          ['PROXIMA_ACCION', 'Proxima actividad definida', 'Agenda el siguiente paso para no perder el seguimiento.', false, hasFutureActivity, 'activity'],
        ]);
      case 'INTERESADO':
        return make([
          ['CLIENTE_DEFINIDO', 'Cliente definido', 'La oportunidad debe estar asociada a un prospecto o cliente identificable.', true, !!this.opportunityContactName(item), 'detail'],
          ['INTERES_CONFIRMADO', 'Interes confirmado', 'Debe existir interes real o una actividad que confirme la necesidad.', true, hasConfirmedInterest || hasMediumInterest || hasOffer, 'activity'],
          ['REQUERIMIENTO', 'Requerimiento registrado', 'Completa curso, producto, servicio o paquete solicitado por el cliente.', true, this.selectedOpportunityRequirements().some((requirement) => !!requirement.nombre.trim()), 'detail'],
          ['PRESUPUESTO', 'Presupuesto estimado', 'Ayuda al vendedor a priorizar la oportunidad.', false, hasBudget, 'detail'],
        ]);
      case 'COTIZADO':
        return make([
          ['COTIZACION_CREADA', 'Crear cotizacion', 'Genera una cotizacion desde la oportunidad antes de moverla a cotizado.', true, hasQuote, 'quote'],
          ['COTIZACION_ENVIADA', 'Cotizacion enviada', 'Marca la cotizacion como enviada por WhatsApp o correo para congelar el pase a cotizado.', true, hasSentQuote, 'quote'],
          ['SEGUIMIENTO_COTIZACION', 'Programar seguimiento de cotizacion', 'Agenda una llamada o mensaje posterior al envio.', false, hasFutureActivity, 'activity'],
        ]);
      case 'NEGOCIACION':
        return make([
          ['COTIZACION_PREVIA', 'Cotizacion o propuesta previa', 'La negociacion debe partir de una propuesta enviada.', true, hasQuote, 'quote'],
          ['OBJECIONES', 'Registrar objeciones o condiciones', 'Anota precio, pago, garantia o alcance que se esta negociando.', false, !!item.descripcion, 'detail'],
          ['FECHA_CIERRE', 'Fecha probable de cierre', 'Define cuando se espera cerrar la negociacion.', true, hasCloseDate, 'detail'],
          ['PROXIMA_ACCION', 'Proxima accion comercial', 'Mantener una actividad futura evita oportunidades abandonadas.', true, hasFutureActivity, 'activity'],
        ]);
      case 'GANADO':
        return make([
          ['ACUERDO_FINAL', 'Acuerdo final registrado', 'Registra las condiciones finales aceptadas por el cliente.', true, hasFinalAgreement, 'detail'],
          ['EVIDENCIA_CIERRE', 'Pago o comprobante registrado', 'Adjunta voucher, contrato, comprobante o registra pago si aplica.', true, hasClosingEvidence, 'detail'],
          ['VALOR_CIERRE', 'Valor de cierre definido', 'El monto estimado debe estar registrado.', true, hasBudget, 'detail'],
          ['CONFIRMACION_CIERRE', 'Confirmacion de cierre', 'Usa Marcar ganado cuando el cierre ya este confirmado.', false, item.estado === 'GANADA', 'quote'],
        ]);
      case 'PERDIDO':
        return make([
          ['MOTIVO_PERDIDA', 'Motivo de perdida', 'Registra precio, competencia, sin presupuesto u otra razon.', true, hasLossReason, 'lost'],
          ['OBSERVACION_FINAL', 'Observacion final', 'Guarda el aprendizaje comercial del caso.', false, !!item.motivoPerdida || !!item.descripcion, 'lost'],
        ]);
      default:
        return make([
          ['REVISION_INFO', 'Revisar informacion del prospecto', 'Valida contacto, empresa y oferta.', true, !!this.opportunityContactName(item), 'detail'],
          ['RESPONSABLE', 'Asignar responsable', 'Toda oportunidad necesita un responsable claro.', true, !!item.responsableId, 'detail'],
          ['PRIMERA_ACTIVIDAD', 'Programar primera actividad', 'Agenda una accion inicial de seguimiento.', false, hasFutureActivity || hasActivity, 'activity'],
        ]);
    }
  }

  private buildStageMoveReview(item: CrmOportunidad, target: PipelineStageOption): StageMoveReview {
    const mode = this.stageValidationMode(target);
    const checklist = this.stageChecklistFor(item, target.value);
    const missing = checklist.filter((check) => check.required && !check.done);
    const risks = this.opportunityRiskBadges(item);
    const errors = mode === 'STRICT' ? missing.map((check) => check.label) : [];
    const warnings = [
      ...(mode === 'STRICT' ? [] : missing.map((check) => check.label)),
      ...risks,
    ];
    return {
      opportunity: item,
      target,
      objective: this.stageObjective(target),
      mode,
      checklist,
      errors,
      warnings,
      canContinue: mode !== 'STRICT' || errors.length === 0,
    };
  }

  protected opportunityWhatsappUrl(item: CrmOportunidad, template?: OpportunityMessageTemplate): string | null {
    const phone = this.onlyDigits(this.opportunityContactPhone(item));
    if (!phone) {
      return null;
    }
    const message = encodeURIComponent(this.renderOpportunityMessage(template, item));
    return `https://wa.me/${phone}?text=${message}`;
  }

  protected opportunityEmailUrl(item: CrmOportunidad, template?: OpportunityMessageTemplate): string | null {
    const email = this.opportunityContactEmail(item);
    if (!email) {
      return null;
    }
    const subject = encodeURIComponent(template?.title || `Seguimiento: ${item.titulo}`);
    const body = encodeURIComponent(this.renderOpportunityMessage(template, item));
    return `mailto:${email}?subject=${subject}&body=${body}`;
  }

  protected templatesByChannel(channel: OpportunityMessageTemplate['channel']): OpportunityMessageTemplate[] {
    return this.opportunityMessageTemplates().filter((item) => item.channel === channel);
  }

  private renderOpportunityMessage(template: OpportunityMessageTemplate | undefined, item: CrmOportunidad): string {
    const base = template?.body || 'Hola {{cliente}}, te escribo por la oportunidad {{oportunidad}}. El valor estimado es {{monto}} y podemos coordinar el siguiente paso.';
    const replacements: Record<string, string> = {
      cliente: this.opportunityContactName(item),
      oportunidad: item.titulo,
      monto: `S/ ${this.formatCompactAmount(Number(item.montoEstimado || 0))}`,
      etapa: this.stageName(item.etapa),
      cierre: item.fechaCierreEstimada || 'por definir',
      responsable: this.responsibleName(item.responsableId || this.currentUserKey()),
    };
    return Object.entries(replacements).reduce(
      (message, [key, value]) => message.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'gi'), value),
      base,
    );
  }

  private opportunityCatalogItem(item: CrmOportunidad | null | undefined): CrmCatalogoItem | null {
    if (!item?.catalogoItemId) {
      return null;
    }
    return this.catalogoItems().find((catalogo) => catalogo.id === item.catalogoItemId) ?? null;
  }

  private buildQuoteLineFromOpportunity(item: CrmOportunidad): QuoteLineForm {
    const catalogo = this.opportunityCatalogItem(item);
    const price = Number(item.montoEstimado || catalogo?.precioReferencial || 0);
    const descriptionParts = [
      catalogo?.nombre || item.titulo,
      catalogo?.descripcion || item.descripcion || null,
    ].filter(Boolean);
    return {
      catalogoItemId: catalogo?.id ?? null,
      productoId: null,
      promocionId: null,
      descripcion: descriptionParts.join(' - '),
      cantidad: 1,
      precioUnitario: price,
      descuento: 0,
    };
  }

  private quoteLinesFromOpportunityRequirements(item: CrmOportunidad): QuoteLineForm[] {
    const requirements = this.opportunityRequirementRows(item);
    const source = requirements.length ? requirements : [this.defaultRequirementForOpportunity(item)];
    const lines = source
      .filter((requirement) => requirement.nombre.trim() || Number(requirement.precioUnitario || 0) > 0)
      .map((requirement) => ({
        catalogoItemId: requirement.catalogoItemId,
        productoId: null,
        promocionId: null,
        descripcion: requirement.observacion
          ? `${requirement.nombre} - ${requirement.observacion}`
          : requirement.nombre,
        cantidad: this.normalizeQuoteQuantity(requirement.cantidad),
        precioUnitario: Math.max(0, Number(requirement.precioUnitario || 0)),
        descuento: 0,
      }));
    return lines.length ? lines : [this.buildQuoteLineFromOpportunity(item)];
  }

  private quoteLinesFromExistingQuote(quote: Cotizacion): QuoteLineForm[] {
    const lines = (quote.detalles || []).map((detail) => ({
      catalogoItemId: this.catalogoItems().find((item) =>
        (detail.descripcion || detail.productoNombre || '').toLowerCase().includes(item.nombre.toLowerCase()),
      )?.id ?? null,
      productoId: detail.productoId ?? null,
      promocionId: detail.promocionId ?? null,
      descripcion: detail.descripcion || detail.productoNombre || 'Ajuste de cotizacion',
      cantidad: this.normalizeQuoteQuantity(detail.cantidad),
      precioUnitario: Math.max(0, Number(detail.precioUnitario || 0)),
      descuento: Math.max(0, Number(detail.descuento || 0)),
    }));
    return lines.length
      ? lines
      : [{
          catalogoItemId: null,
          productoId: null,
          promocionId: null,
          descripcion: `Ajuste de COT-${String(quote.id).padStart(3, '0')}`,
          cantidad: 1,
          precioUnitario: Math.max(0, Number(quote.total || 0)),
          descuento: 0,
        }];
  }

  private defaultQuoteSucursalId(): number | null {
    return this.auth.currentSession()?.sucursales?.[0]?.id ?? this.sucursales().find((item) => item.activo)?.id ?? this.sucursales()[0]?.id ?? null;
  }

  private resolveQuoteSucursalId() {
    const current = this.quoteForm.sucursalId ?? this.defaultQuoteSucursalId();
    if (current) {
      return of(current);
    }
    return this.api.listSucursales().pipe(
      map((items) => {
        this.sucursales.set(items);
        return this.defaultQuoteSucursalId();
      }),
      catchError(() => of(null)),
    );
  }

  private prospectForOpportunity(item: CrmOportunidad): CrmProspecto | null {
    return item.prospectoId ? this.prospectos().find((prospect) => prospect.id === item.prospectoId) ?? null : null;
  }

  private clientForOpportunity(item: CrmOportunidad): Cliente | null {
    return item.clienteId ? this.clientes().find((cliente) => cliente.id === item.clienteId) ?? null : null;
  }

  private opportunityForQuote(item: Cotizacion): CrmOportunidad | null {
    return item.crmOportunidadId
      ? this.oportunidades().find((opportunity) => opportunity.id === item.crmOportunidadId) ?? null
      : null;
  }

  private defaultOpportunityActivitySubject(item: CrmOportunidad, tipoActividad: string): string {
    const action = this.humanize(tipoActividad).toLowerCase();
    return `${action.charAt(0).toUpperCase()}${action.slice(1)} por ${item.titulo}`;
  }

  private sumOpportunityAmount(items: CrmOportunidad[], preferReal = false): number {
    return items.reduce((sum, item) => sum + Number((preferReal ? item.montoReal : item.montoEstimado) ?? item.montoEstimado ?? 0), 0);
  }

  private averageProbability(items: CrmOportunidad[]): number {
    if (!items.length) {
      return 0;
    }
    return Math.round(items.reduce((sum, item) => sum + Number(item.probabilidad || 0), 0) / items.length);
  }

  private countThisMonth(items: CrmOportunidad[]): number {
    return items.filter((item) =>
      this.isThisMonth(item.fechaCierreReal || item.fechaCierreEstimada || item.updatedAt || item.createdAt),
    ).length;
  }

  protected isThisMonth(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const now = new Date();
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  private formatCompactAmount(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  private matchesOpportunityQuery(item: CrmOportunidad, query: string): boolean {
    return !query ||
      `${item.titulo} ${item.prospectoNombre ?? ''} ${item.clienteNombre ?? ''} ${item.tipoOportunidad} ${item.etapa} ${item.estado}`
        .toLowerCase()
        .includes(query);
  }

  private matchesQuoteQuery(item: Cotizacion, query: string): boolean {
    const opportunity = this.opportunityForQuote(item);
    return !query || [
      item.id,
      item.estado,
      item.clienteNombre,
      item.clienteDocumento,
      item.observacion,
      item.canalEnvio,
      opportunity?.titulo,
      opportunity ? this.opportunityContactName(opportunity) : null,
      ...(item.detalles || []).map((detalle) =>
        `${detalle.descripcion ?? ''} ${detalle.productoNombre ?? ''} ${detalle.promocionNombre ?? ''}`,
      ),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(query);
  }

  private updateQuoteFlow(item: Cotizacion, request: {
    estado: string;
    canalEnvio?: string | null;
    proximoSeguimientoEn?: string | null;
    motivoRechazo?: string | null;
    decisionSiguiente?: string | null;
  }, successMessage: string, targetStage?: string): void {
    const selectedOpportunityId = this.selectedOpportunity()?.id ?? null;
    const oportunidadId = Number(item.crmOportunidadId ?? selectedOpportunityId ?? 0) || null;
    this.actionId.set(item.id);
    this.api
      .updateCotizacionEstado(item.id, request)
      .pipe(
        switchMap((saved) => {
          const linkedSaved = oportunidadId ? this.withQuoteOpportunity(saved, oportunidadId) : saved;
          this.upsertQuote(linkedSaved);
          if (!targetStage || !linkedSaved.crmOportunidadId) {
            return of({ saved: linkedSaved, opportunity: null as CrmOportunidad | null });
          }
          const target = this.stageOptionByValue(targetStage);
          if (!target?.id) {
            return of({ saved: linkedSaved, opportunity: null as CrmOportunidad | null });
          }
          return this.api
            .moverCrmOportunidadEtapa(
              Number(linkedSaved.crmOportunidadId),
              Number(target.id),
              `Movimiento automatico por cotizacion COT-${String(linkedSaved.id).padStart(3, '0')}: ${this.quoteStatusLabel(linkedSaved)}`,
            )
            .pipe(map((opportunity) => ({ saved: linkedSaved, opportunity })));
        }),
        finalize(() => this.actionId.set(null)),
      )
      .subscribe({
        next: ({ saved, opportunity }) => {
          if (opportunity) {
            this.upsertOpportunity(opportunity);
          }
          if (saved.crmOportunidadId) {
            this.refreshOpportunityQuotes(Number(saved.crmOportunidadId));
          }
          this.successMessage.set(successMessage);
          if (saved.crmOportunidadId && !opportunity) {
            this.api.listCrmOportunidades().subscribe({
              next: (oportunidades) => {
                this.oportunidades.set(oportunidades);
                const current = this.selectedOpportunity();
                const updated = current
                  ? oportunidades.find((item) => Number(item.id) === Number(current.id))
                  : null;
                if (updated) {
                  this.selectedOpportunity.set(updated);
                }
              },
              error: () => undefined,
            });
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected opportunityTypeLabel(type: string | null | undefined): string {
    return this.opportunityTypeMeta(this.normalizeOpportunityType(type)).label;
  }

  protected statusSeverity(status: string | boolean): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (status === true || ['CONVERTIDO', 'GANADA', 'REALIZADA'].includes(String(status))) {
      return 'success';
    }
    if (['PERDIDA', 'DESCARTADO', 'CANCELADA', 'VENCIDA'].includes(String(status))) {
      return 'danger';
    }
    if (['INTERESADO', 'COTIZADO', 'NEGOCIACION', 'PENDIENTE'].includes(String(status))) {
      return 'warn';
    }
    if (['CONTACTADO', 'ABIERTA'].includes(String(status))) {
      return 'info';
    }
    return 'secondary';
  }

  protected dashboardUserName(): string {
    const raw =
      this.auth.currentSession()?.nombres ||
      this.auth.currentSession()?.username ||
      'Equipo';
    return raw.split(' ')[0] || raw;
  }

  protected dashboardCompanyName(): string {
    return this.auth.currentSession()?.empresa?.razonSocial || 'Operacion comercial activa';
  }

  private normalizeOpportunityType(value: string | null | undefined): OpportunityType {
    const allowed = this.opportunityTypeOptions.map((item) => item.value);
    return allowed.includes(value as OpportunityType) ? (value as OpportunityType) : 'PRODUCTO';
  }

  private buildOpportunityDescription(): string | null {
    const lines: string[] = [];
    const catalogo = this.catalogoItems().find((item) => item.id === this.opportunityForm.catalogoItemId);
    if (catalogo) {
      lines.push(`Oferta CRM: ${catalogo.nombre}`);
    }
    const note = this.opportunityForm.descripcion.trim();
    if (note) {
      lines.push(`Observacion: ${note}`);
    }
    return lines.length ? lines.join('\n') : null;
  }

  private buildCatalogMetadata(): string {
    let previous: Record<string, unknown> = {};
    try {
      previous = this.catalogoForm.metadataJson ? JSON.parse(this.catalogoForm.metadataJson) as Record<string, unknown> : {};
    } catch {
      previous = {};
    }
    const atributos = this.cleanCatalogAttributes();
    return JSON.stringify({
      ...previous,
      tipoItem: this.catalogoForm.tipoItem,
      nombre: this.catalogoForm.nombre.trim(),
      descripcion: this.catalogoForm.descripcion.trim() || null,
      precioReferencial: Number(this.catalogoForm.precioReferencial || 0),
      atributos,
      source: 'crm-catalogo',
    });
  }

  private extractCatalogAttributes(metadataJson: string | null | undefined): Record<string, string | number | null> {
    if (!metadataJson) {
      return {};
    }
    try {
      const parsed = JSON.parse(metadataJson) as { atributos?: Record<string, string | number | null> };
      return parsed.atributos && typeof parsed.atributos === 'object' ? parsed.atributos : {};
    } catch {
      return {};
    }
  }

  private toRate(value: number, total: number): number {
    if (total <= 0) {
      return 0;
    }

    return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
  }

  private activityPriorityTone(dateValue: string | null | undefined): 'high' | 'medium' | 'low' {
    const timestamp = Date.parse(dateValue || '');
    if (!Number.isFinite(timestamp)) {
      return 'low';
    }

    const diffHours = (timestamp - Date.now()) / 36e5;
    if (diffHours <= 24) {
      return 'high';
    }
    if (diffHours <= 72) {
      return 'medium';
    }
    return 'low';
  }

  protected activityEffectiveDate(item: CrmActividad): string {
    return item.fechaRealizada || item.updatedAt || item.fechaProgramada || item.createdAt || '';
  }

  private activityIcon(type: string | null | undefined): string {
    switch ((type || '').toUpperCase()) {
      case 'LLAMADA':
        return 'pi pi-phone';
      case 'WHATSAPP':
        return 'pi pi-whatsapp';
      case 'CORREO':
        return 'pi pi-envelope';
      case 'REUNION':
        return 'pi pi-users';
      case 'VISITA':
        return 'pi pi-building';
      case 'TAREA':
        return 'pi pi-list-check';
      default:
        return 'pi pi-calendar';
    }
  }

  private isToday(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const now = new Date();
    return date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
  }

  private isYesterday(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();
  }

  private isOverdue(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    return !!date && date.getTime() < Date.now();
  }

  private isThisWeek(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const now = new Date();
    const nextWeek = new Date(now);
    nextWeek.setDate(now.getDate() + 7);
    return date.getTime() >= now.getTime() && date.getTime() <= nextWeek.getTime();
  }

  private isWithinLastDays(dateValue: string | null | undefined, days: number): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - days + 1);
    start.setHours(0, 0, 0, 0);
    return date.getTime() >= start.getTime() && date.getTime() <= now.getTime();
  }

  private paymentFollowUpPriority(item: CrmOportunidad): number {
    const plan = this.opportunityPaymentPlan(item);
    return (plan.overdueInstallments.length ? 1_000_000 : 0) + Math.round(plan.pendingAmount * 100);
  }

  private isWithinRangeDays(dateValue: string | null | undefined, fromDaysAgo: number, toDaysAgo: number): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - toDaysAgo);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(now.getDate() - fromDaysAgo + 1);
    end.setHours(23, 59, 59, 999);
    return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
  }

  private isCurrentMonth(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    const now = new Date();
    return !!date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }

  private isPreviousMonth(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    if (!date) {
      return false;
    }
    const previous = new Date();
    previous.setMonth(previous.getMonth() - 1);
    return date.getFullYear() === previous.getFullYear() && date.getMonth() === previous.getMonth();
  }

  private toValidDate(dateValue: string | null | undefined): Date | null {
    const timestamp = Date.parse(dateValue || '');
    return Number.isFinite(timestamp) ? new Date(timestamp) : null;
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value || '').replace(/\D/g, '');
  }

  private deltaLabel(current: number, previous: number, decimal = false): string {
    if (previous <= 0) {
      return current > 0 ? '+100%' : '+0%';
    }
    const value = ((current - previous) / previous) * 100;
    const rounded = decimal ? Math.round(value * 10) / 10 : Math.round(value);
    return `${rounded >= 0 ? '+' : ''}${rounded}%`;
  }

  private followUpPriority(nextActivity?: CrmActividad, lastActivity?: CrmActividad): CommercialInboxCard['priority'] {
    if (nextActivity) {
      if (this.isOverdue(nextActivity.fechaProgramada)) {
        return 'overdue';
      }
      if (this.isToday(nextActivity.fechaProgramada)) {
        return 'today';
      }
      return 'upcoming';
    }
    return lastActivity?.estado === 'REALIZADA' ? 'done' : 'idle';
  }

  private followUpPriorityLabel(nextActivity?: CrmActividad, lastActivity?: CrmActividad): string {
    if (nextActivity) {
      if (this.isOverdue(nextActivity.fechaProgramada)) {
        return 'Vencido';
      }
      if (this.isToday(nextActivity.fechaProgramada)) {
        return 'Hoy';
      }
      return 'Proximos dias';
    }
    return lastActivity?.estado === 'REALIZADA' ? 'Completado' : 'Sin accion';
  }

  private followUpPriorityOrder(priority: CommercialInboxCard['priority']): number {
    const order: Record<CommercialInboxCard['priority'], number> = {
      overdue: 0,
      today: 1,
      upcoming: 2,
      idle: 3,
      done: 4,
    };
    return order[priority];
  }

  private followUpHasActivityType(item: CommercialInboxCard, ...types: string[]): boolean {
    const allowed = types.map((type) => type.toUpperCase());
    const currentTypes = [
      item.nextActivity?.tipoActividad,
      item.lastActivity?.tipoActividad,
    ].map((type) => (type || '').toUpperCase());
    return currentTypes.some((type) => allowed.includes(type));
  }

  private matchesFollowUpContactFilter(item: CommercialInboxCard, filter: string): boolean {
    if (filter === 'SIN_CANAL') {
      return !item.prospecto.telefono && !item.prospecto.correo;
    }
    if (filter === 'OPORTUNIDAD') {
      return item.hasActiveOpportunity;
    }
    if (filter === 'CONTACTADO') {
      return Boolean(item.lastActivity || item.nextActivity) && !item.hasActiveOpportunity;
    }
    if (filter === 'PENDIENTE') {
      return !item.lastActivity && !item.hasActiveOpportunity;
    }
    return true;
  }

  private matchesFollowUpDateFilter(item: CommercialInboxCard, filter: string): boolean {
    if (filter === 'SIN_FECHA') {
      return !item.nextActivity;
    }
    if (filter === 'VENCIDAS') {
      return item.priority === 'overdue';
    }
    if (filter === 'HOY') {
      return item.priority === 'today';
    }
    if (filter === 'PROXIMOS') {
      return item.priority === 'upcoming';
    }
    return true;
  }

  protected prospectQualification(prospecto: CrmProspecto): FollowUpQualification {
    const score = this.qualificationScore(prospecto);
    const temperatura = this.qualificationTemperature(score);
    const missing = this.qualificationMissing(prospecto);
    const estado = String(prospecto.estado || '').toUpperCase();
    const canConvert = missing.length === 0 && !['PERDIDO', 'CONVERTIDO'].includes(estado);
    const status: FollowUpQualification['status'] =
      estado === 'CONVERTIDO'
        ? 'CONVERTIDO'
        : estado === 'PERDIDO'
          ? 'PERDIDO'
          : estado === 'EN_ESPERA'
            ? 'ESPERA'
            : canConvert
              ? 'CALIFICADO'
              : 'SEGUIR';
    const label =
      status === 'CALIFICADO'
        ? 'Calificado'
        : status === 'ESPERA'
          ? 'En espera'
          : status === 'PERDIDO'
            ? 'Perdido'
            : status === 'CONVERTIDO'
              ? 'Convertido'
              : 'Seguir calificando';
    return { score, temperatura, label, canConvert, missing, status };
  }

  protected qualificationScore(prospecto: CrmProspecto): number {
    if (typeof prospecto.scoreCalificacion === 'number') {
      return Math.max(0, Math.min(100, prospecto.scoreCalificacion));
    }
    let score = prospecto.necesidadIdentificada ? 30 : 0;
    const interes = String(prospecto.interesReal || prospecto.nivelInteres || '').toUpperCase();
    score += ['ALTO', 'CALIENTE'].includes(interes) ? 30 : ['MEDIO', 'TIBIO'].includes(interes) ? 20 : 0;
    score += String(prospecto.presupuestoDefinido || '').toUpperCase() === 'SI' ? 20 : 0;
    const decisor = String(prospecto.tomadorDecision || '').toUpperCase();
    score += decisor === 'SI' ? 10 : decisor === 'DEBE_CONSULTAR' ? 5 : 0;
    switch (String(prospecto.fechaEstimadaCompra || '').toUpperCase()) {
      case 'INMEDIATO':
        score += 10;
        break;
      case 'TREINTA_DIAS':
        score += 8;
        break;
      case 'TRES_MESES':
        score += 5;
        break;
      case 'MAS_ADELANTE':
        score += 2;
        break;
    }
    return Math.max(0, Math.min(100, score));
  }

  protected qualificationTemperature(scoreOrValue: number | string | null | undefined): FollowUpQualification['temperatura'] {
    if (typeof scoreOrValue === 'string') {
      const value = scoreOrValue.toUpperCase();
      if (value === 'CALIENTE' || value === 'TIBIO' || value === 'FRIO') {
        return value;
      }
    }
    const score = Number(scoreOrValue || 0);
    if (score >= 70) {
      return 'CALIENTE';
    }
    if (score >= 40) {
      return 'TIBIO';
    }
    return 'FRIO';
  }

  protected qualificationMissing(prospecto: CrmProspecto): string[] {
    const missing: string[] = [];
    if (!prospecto.necesidadIdentificada) {
      missing.push('necesidad identificada');
    }
    const interes = String(prospecto.interesReal || prospecto.nivelInteres || '').toUpperCase();
    if (!['MEDIO', 'ALTO', 'TIBIO', 'CALIENTE'].includes(interes)) {
      missing.push('interes medio o alto');
    }
    return missing;
  }

  protected canConvertProspectToOpportunity(prospecto: CrmProspecto): boolean {
    return this.prospectQualification(prospecto).canConvert && !this.activeOpportunityForProspect(prospecto.id);
  }

  protected qualificationTemperatureLabel(value: number | string | null | undefined): string {
    return this.humanize(this.qualificationTemperature(value));
  }

  protected qualificationNeedLabel(prospecto: CrmProspecto): string {
    return prospecto.necesidadIdentificada ? 'Si' : 'Pendiente';
  }

  protected qualificationInterestLabel(prospecto: CrmProspecto): string {
    const value = String(prospecto.interesReal || prospecto.nivelInteres || '').toUpperCase();
    if (value === 'ALTO' || value === 'CALIENTE') {
      return 'Alto';
    }
    if (value === 'MEDIO' || value === 'TIBIO') {
      return 'Medio';
    }
    if (value === 'BAJO' || value === 'FRIO') {
      return 'Bajo';
    }
    return 'Pendiente';
  }

  private prospectInterestLabel(prospecto: CrmProspecto, oportunidad?: CrmOportunidad): string {
    const nivel = (prospecto.interesReal || prospecto.temperatura || prospecto.nivelInteres || '').toUpperCase();
    if (nivel === 'CALIENTE' || nivel === 'ALTO') {
      return 'Alto';
    }
    if (nivel === 'MEDIO' || nivel === 'TIBIO') {
      return 'Medio';
    }
    if (nivel === 'FRIO' || nivel === 'BAJO') {
      return 'Bajo';
    }
    if (oportunidad?.etapa === 'NEGOCIACION' || Number(oportunidad?.probabilidad || 0) >= 70 || prospecto.estado === 'CALIFICADO') {
      return 'Alto';
    }
    if (prospecto.estado === 'CONTACTADO' || Number(prospecto.presupuestoEstimado || 0) > 0) {
      return 'Medio';
    }
    return 'Bajo';
  }

  private prospectInterestTone(prospecto: CrmProspecto, oportunidad?: CrmOportunidad): CommercialInboxCard['interestTone'] {
    const label = this.prospectInterestLabel(prospecto, oportunidad);
    if (label === 'Alto') {
      return 'hot';
    }
    if (label === 'Medio') {
      return 'warm';
    }
    return 'cold';
  }

  private prospectStageProgress(prospecto: CrmProspecto, oportunidad?: CrmOportunidad): number {
    if (prospecto.clienteId || oportunidad?.estado === 'GANADA') {
      return 100;
    }
    if (oportunidad?.etapa === 'NEGOCIACION') {
      return 82;
    }
    if (oportunidad?.etapa === 'COTIZADO') {
      return 66;
    }
    if (oportunidad) {
      return 50;
    }
    if (prospecto.estado === 'CALIFICADO' || prospecto.estado === 'INTERESADO') {
      return 34;
    }
    if (prospecto.estado === 'CONTACTADO') {
      return 18;
    }
    return 8;
  }

  private cleanCatalogAttributes(): Record<string, string | number> {
    return this.catalogFields().reduce<Record<string, string | number>>((acc, field) => {
      const value = this.catalogoForm.atributos[field.key];
      if (value === null || value === undefined || value === '') {
        return acc;
      }
      acc[field.key] = field.type === 'number' ? Number(value || 0) : String(value).trim();
      return acc;
    }, {});
  }

  private catalogSnapshot(item: CrmCatalogoItem): string {
    let extra: Record<string, unknown> = {};
    if (item.metadataJson) {
      try {
        extra = JSON.parse(item.metadataJson) as Record<string, unknown>;
      } catch {
        extra = { metadataOriginal: item.metadataJson };
      }
    }
    return JSON.stringify(
      {
        catalogoItemId: item.id,
        tipoItem: item.tipoItem,
        nombre: item.nombre,
        descripcion: item.descripcion || null,
        precioReferencial: Number(item.precioReferencial || 0),
        ...extra,
      },
      null,
      2,
    );
  }

  private emptyProspectForm(): ProspectForm {
    return {
      id: null,
      tipoPersona: 'NATURAL',
      tipoDocumento: '1',
      numeroDocumento: '',
      nombre: '',
      razonSocial: '',
      nombreComercial: '',
      telefono: '',
      correo: '',
      direccion: '',
      origen: 'WHATSAPP',
      canalIngreso: 'MANUAL',
      campania: 'Ingreso manual',
      landingUrl: '',
      mensaje: '',
      estado: 'NUEVO',
      responsableId: this.currentUserKey(),
      observacion: '',
      tipoInteres: 'PRODUCTO',
      interesPrincipal: '',
      interesDetalle: '',
      presupuestoEstimado: 0,
      fechaInteres: '',
      catalogoItemId: null,
      metadataJson: '',
    };
  }

  private emptyCatalogoForm(): CatalogoForm {
    return {
      id: null,
      tipoItem: 'PRODUCTO',
      nombre: '',
      descripcion: '',
      precioReferencial: 0,
      estado: 'ACTIVO',
      metadataJson: '',
      publicEnabled: true,
      landingSlug: '',
      atributos: {},
    };
  }

  private emptyOpportunityForm(): OpportunityForm {
    return {
      id: null,
      prospectoId: null,
      clienteId: null,
      tipoOportunidad: 'PRODUCTO',
      catalogoItemId: null,
      titulo: '',
      descripcion: '',
      detallePrincipal: '',
      detalleSecundario: '',
      ubicacion: '',
      fechaObjetivo: '',
      cantidad: 1,
      montoEstimado: 0,
      probabilidad: 60,
      etapa: 'INTERESADO',
      fechaCierreEstimada: this.defaultOpportunityCloseDate(),
      responsableId: this.currentUserKey(),
    };
  }

  private applyProspectToOpportunityForm(prospecto: CrmProspecto, overwriteTitle = false): void {
    const catalogo = this.catalogoItems().find((item) => item.id === prospecto.catalogoItemId);
    this.opportunityForm.prospectoId = prospecto.id;
    this.opportunityForm.clienteId = null;
    this.opportunityForm.tipoOportunidad = this.normalizeOpportunityType(prospecto.tipoInteres || catalogo?.tipoItem);
    this.opportunityForm.catalogoItemId = prospecto.catalogoItemId ?? this.opportunityForm.catalogoItemId;
    this.opportunityForm.detallePrincipal = catalogo?.nombre || prospecto.interesPrincipal || this.opportunityForm.detallePrincipal;
    this.opportunityForm.detalleSecundario = catalogo?.descripcion || prospecto.interesDetalle || this.opportunityForm.detalleSecundario;
    this.opportunityForm.montoEstimado = Number(prospecto.presupuestoEstimado || catalogo?.precioReferencial || this.opportunityForm.montoEstimado || 0);
    this.opportunityForm.fechaObjetivo = prospecto.fechaInteres || '';
    this.opportunityForm.descripcion = prospecto.mensaje || prospecto.observacion || this.opportunityForm.descripcion;
    this.opportunityForm.responsableId = prospecto.responsableId || this.opportunityForm.responsableId || this.currentUserKey();
    if (!this.opportunityForm.fechaCierreEstimada) {
      this.opportunityForm.fechaCierreEstimada = this.defaultOpportunityCloseDate();
    }
    if (overwriteTitle || !this.opportunityForm.titulo.trim()) {
      const typeLabel = this.opportunityTypeLabel(this.opportunityForm.tipoOportunidad);
      this.opportunityForm.titulo = `${typeLabel} - ${this.opportunityForm.detallePrincipal || prospecto.nombre}`;
    }
  }

  private defaultOpportunityCloseDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + this.crmLocalConfig().cierreEstimadoDias);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  private loadCrmLocalConfig(): CrmLocalConfig {
    if (typeof localStorage === 'undefined') {
      return { cierreEstimadoDias: 15 };
    }
    try {
      const raw = localStorage.getItem(this.crmLocalConfigStorageKey());
      const parsed = raw ? JSON.parse(raw) as Partial<CrmLocalConfig> : {};
      const days = Number(parsed.cierreEstimadoDias || 15);
      return { cierreEstimadoDias: Math.min(365, Math.max(1, days)) };
    } catch {
      return { cierreEstimadoDias: 15 };
    }
  }

  private persistCrmLocalConfig(config: CrmLocalConfig): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.crmLocalConfigStorageKey(), JSON.stringify(config));
  }

  private crmLocalConfigStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.config`;
  }

  private emptyActivityForm(): ActivityForm {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + 60);
    return {
      id: null,
      prospectoId: null,
      oportunidadId: null,
      clienteId: null,
      tipoActividad: 'LLAMADA',
      estadoActividad: 'PENDIENTE',
      resultadoContacto: '',
      nivelInteres: '',
      nuevoEstadoProspecto: '',
      asunto: '',
      descripcion: '',
      fechaProgramada: date.toISOString().slice(0, 16),
      usuarioId: this.currentUserKey(),
      programarSiguiente: false,
      siguienteTipoActividad: 'LLAMADA',
      siguienteFechaProgramada: this.nextBusinessActivityDate(),
      siguienteAsunto: '',
      siguienteDescripcion: '',
    };
  }

  private toInputDateTime(value?: string | null): string {
    const date = value ? new Date(value) : new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private toInputDate(value?: string | Date | null): string {
    const date = value ? new Date(value) : new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  private addMonths(value: Date, months: number): Date {
    const date = new Date(value);
    date.setMonth(date.getMonth() + months);
    return date;
  }

  private nextBusinessActivityDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(10, 0, 0, 0);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private prepareNextActivityDefaults(item?: CrmActividad): void {
    const title = item?.oportunidadTitulo
      || item?.prospectoNombre
      || this.selectedOpportunity()?.titulo
      || 'este contacto';
    this.activityForm.siguienteTipoActividad = this.nextActivityType(item?.tipoActividad || this.activityForm.tipoActividad);
    this.activityForm.siguienteFechaProgramada = this.nextBusinessActivityDate();
    this.activityForm.siguienteAsunto = `Siguiente paso con ${title}`;
    this.activityForm.siguienteDescripcion = '';
  }

  private nextActivityType(currentType: string | null | undefined): string {
    switch ((currentType || '').toUpperCase()) {
      case 'LLAMADA':
        return 'WHATSAPP';
      case 'WHATSAPP':
        return 'CORREO';
      case 'CORREO':
        return 'LLAMADA';
      default:
        return 'LLAMADA';
    }
  }

  private emptyQuoteForm(): QuoteForm {
    return {
      oportunidadId: null,
      clienteId: null,
      sucursalId: null,
      fechaVencimiento: '',
      observacion: '',
      detalles: [
        {
          catalogoItemId: null,
          productoId: null,
          promocionId: null,
          descripcion: '',
          cantidad: 1,
          precioUnitario: 0,
          descuento: 0,
        },
      ],
    };
  }

  private emptyPromotionForm(): PromotionForm {
    return {
      codigo: '',
      nombre: '',
      descripcion: '',
      tipoDescuento: 'MONTO',
      valor: 0,
      fechaInicio: '',
      fechaFin: '',
    };
  }

  private emptyStageForm(): StageForm {
    const nextOrder = this.etapas().length + 1;
    return {
      codigo: '',
      nombre: '',
      orden: nextOrder,
      color: '#2563eb',
      ganado: false,
      perdido: false,
    };
  }

  private emptyOpportunityRequirementForm(item: CrmOportunidad | null = this.selectedOpportunity()): OpportunityRequirementForm {
    const base = item ? this.defaultRequirementForOpportunity(item) : null;
    return {
      id: null,
      catalogoItemId: base?.catalogoItemId ?? null,
      nombre: base?.nombre ?? '',
      cantidad: base?.cantidad ?? 1,
      precioUnitario: base?.precioUnitario ?? 0,
      observacion: base?.observacion ?? '',
    };
  }

  private emptyMessageTemplateForm(): OpportunityMessageTemplateForm {
    return {
      id: null,
      channel: 'WHATSAPP',
      title: '',
      audioName: '',
      audioDataUrl: '',
      body: 'Hola {{cliente}}, te escribo por {{oportunidad}}. Valor estimado: {{monto}}. ¿Coordinamos el siguiente paso?',
    };
  }

  private emptyOpportunityNegotiationForm(): OpportunityNegotiationForm {
    return {
      id: null,
      cotizacionId: null,
      estado: 'AJUSTE_SOLICITADO',
      precioOriginal: 0,
      precioFinal: 0,
      descuento: 0,
      promocion: '',
      formaPago: 'Contado',
      cuotas: 1,
      fechaInicio: '',
      fechaEntrega: '',
      objecion: 'MEJOR_PRECIO',
      resultado: 'PENDIENTE',
      clienteConforme: false,
      procedePago: false,
      observacion: '',
    };
  }

  private emptyOpportunityPaymentForm(): OpportunityPaymentForm {
    return {
      id: null,
      fecha: new Date().toISOString().slice(0, 10),
      tipo: 'CUOTA',
      monto: 0,
      estado: 'PAGADO',
      metodo: 'Efectivo',
      observacion: '',
      archivoNombre: '',
      archivoDataUrl: '',
    };
  }

  private emptyOpportunityDocumentForm(): OpportunityDocumentForm {
    return {
      id: null,
      categoria: 'PROPUESTA',
      nombre: '',
      descripcion: '',
      archivoNombre: '',
      archivoDataUrl: '',
      mimeType: '',
    };
  }

  private loadOpportunityRecords<T>(key: string): T[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) as T[] : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private persistOpportunityRecords<T>(key: string, items: T[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, JSON.stringify(items));
  }

  private reconcileLocalOpportunityRecords(opportunities: CrmOportunidad[]): void {
    const validIds = new Set(opportunities.map((item) => Number(item.id)));
    const reconcile = <T extends { oportunidadId: number }>(
      records: T[],
      storageKey: string,
      update: (items: T[]) => void,
    ): void => {
      const filtered = records.filter((item) => validIds.has(Number(item.oportunidadId)));
      if (filtered.length === records.length) {
        return;
      }
      update(filtered);
      this.persistOpportunityRecords(storageKey, filtered);
    };

    reconcile(
      this.opportunityRequirementRecords(),
      this.opportunityRequirementStorageKey(),
      (items) => this.opportunityRequirementRecords.set(items),
    );
    reconcile(
      this.opportunityNegotiationRecords(),
      this.opportunityNegotiationStorageKey(),
      (items) => this.opportunityNegotiationRecords.set(items),
    );
    reconcile(
      this.opportunityPaymentRecords(),
      this.opportunityPaymentStorageKey(),
      (items) => this.opportunityPaymentRecords.set(items),
    );
    reconcile(
      this.opportunityDocumentRecords(),
      this.opportunityDocumentStorageKey(),
      (items) => this.opportunityDocumentRecords.set(items),
    );
    reconcile(
      this.opportunityClosureRecords(),
      this.opportunityClosureStorageKey(),
      (items) => this.opportunityClosureRecords.set(items),
    );
  }

  private opportunityRequirementStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.requirements`;
  }

  private opportunityNegotiationStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.negotiations`;
  }

  private opportunityPaymentStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.payments`;
  }

  private opportunityDocumentStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.documents`;
  }

  private opportunityClosureStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.closures`;
  }

  private opportunityStoragePrefix(): string {
    const empresa = this.auth.currentSession()?.empresa as { tenantId?: string; ruc?: string } | undefined;
    const tenant = empresa?.tenantId || empresa?.ruc || 'default';
    return `azurion.crm.opportunity.${tenant}`;
  }

  private createLocalId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  }

  private readSmallFile(event: Event, maxBytes: number, assign: (file: File, dataUrl: string) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > maxBytes) {
      this.errorMessage.set(`El archivo debe pesar ${Math.round(maxBytes / 1_000_000)} MB como maximo.`);
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => assign(file, String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  private loadOpportunityMessageTemplates(): OpportunityMessageTemplate[] {
    if (typeof localStorage === 'undefined') {
      return this.defaultOpportunityMessageTemplates();
    }
    try {
      const raw = localStorage.getItem(this.opportunityTemplateStorageKey());
      const parsed = raw ? JSON.parse(raw) as OpportunityMessageTemplate[] : null;
      return Array.isArray(parsed) && parsed.length ? parsed : this.defaultOpportunityMessageTemplates();
    } catch {
      return this.defaultOpportunityMessageTemplates();
    }
  }

  private persistOpportunityMessageTemplates(items: OpportunityMessageTemplate[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(this.opportunityTemplateStorageKey(), JSON.stringify(items));
  }

  private opportunityTemplateStorageKey(): string {
    const empresa = this.auth.currentSession()?.empresa as { tenantId?: string; ruc?: string } | undefined;
    const tenant = empresa?.tenantId || empresa?.ruc || 'default';
    return `azurion.crm.opportunity.templates.${tenant}`;
  }

  private defaultOpportunityMessageTemplates(): OpportunityMessageTemplate[] {
    return [
      {
        id: 'default-whatsapp-next-step',
        channel: 'WHATSAPP',
        title: 'Coordinar siguiente paso',
        body: 'Hola {{cliente}}, soy {{responsable}} de AZURION. Te escribo por {{oportunidad}}. Podemos coordinar el siguiente paso y resolver tus dudas.',
      },
      {
        id: 'default-email-proposal',
        channel: 'CORREO',
        title: 'Seguimiento de propuesta',
        body: 'Hola {{cliente}},\n\nTe comparto seguimiento sobre {{oportunidad}}.\nValor estimado: {{monto}}.\nEtapa actual: {{etapa}}.\nCierre estimado: {{cierre}}.\n\nQuedo atento para coordinar el siguiente paso.\n\nSaludos.',
      },
    ];
  }

  private upsertProspect(item: CrmProspecto): void {
    const items = this.prospectos();
    this.prospectos.set(items.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [item, ...items]);
  }

  private reconcileProspectSelection(prospectos: CrmProspecto[]): void {
    const validIds = new Set(prospectos.map((item) => item.id));
    const selected = new Set([...this.selectedProspectIds()].filter((id) => validIds.has(id)));
    if (selected.size !== this.selectedProspectIds().size) {
      this.selectedProspectIds.set(selected);
    }
  }

  private hasCrmPermission(...permissions: string[]): boolean {
    const session = this.auth.currentSession();
    if (session?.adminEmpresa || session?.adminGeneral) {
      return true;
    }
    return permissions.some((permission) => session?.permissions?.includes(permission));
  }

  private upsertCatalogo(item: CrmCatalogoItem): void {
    const items = this.catalogoItems();
    this.catalogoItems.set(items.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [item, ...items]);
  }

  private upsertOpportunity(item: CrmOportunidad, message?: string): void {
    const items = this.oportunidades();
    this.oportunidades.set(items.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [item, ...items]);
    if (message) {
      this.successMessage.set(message);
    }
  }

  private upsertQuote(item: Cotizacion): void {
    const items = this.cotizaciones();
    this.cotizaciones.set(items.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [item, ...items]);
  }

  private withQuoteOpportunity(item: Cotizacion, oportunidadId: number): Cotizacion {
    return Number(item.crmOportunidadId) === Number(oportunidadId)
      ? item
      : { ...item, crmOportunidadId: oportunidadId };
  }

  private mapNegotiationRecord(item: CrmNegociacion): OpportunityNegotiationRecord {
    const result = ['ACEPTA', 'RECHAZA'].includes(String(item.resultado))
      ? String(item.resultado) as 'ACEPTA' | 'RECHAZA'
      : 'PENDIENTE';
    return {
      id: item.id,
      oportunidadId: item.oportunidadId,
      cotizacionId: item.cotizacionId ?? null,
      codigoCotizacion: item.codigoCotizacion ?? null,
      estado: item.estado,
      precioOriginal: Number(item.precioOriginal || 0),
      precioFinal: Number(item.precioFinal || 0),
      descuento: Number(item.descuento || 0),
      promocion: '',
      formaPago: item.formaPago || 'Contado',
      cuotas: Math.max(1, Number(item.cuotas || 1)),
      fechaInicio: item.fechaInicio || '',
      fechaEntrega: item.fechaEntrega || '',
      objecion: item.solicitudCliente || 'MEJOR_PRECIO',
      resultado: result,
      clienteConforme: item.estado === 'CLIENTE_CONFORME' || item.estado === 'GANADA',
      procedePago: item.estado === 'CLIENTE_CONFORME' || item.estado === 'GANADA',
      observacion: item.observacion || '',
      createdAt: item.createdAt || new Date().toISOString(),
      usuarioNombre: item.usuarioNombre || item.usuarioId || null,
    };
  }

  private upsertNegotiation(item: OpportunityNegotiationRecord): void {
    const items = this.opportunityNegotiationRecords();
    this.opportunityNegotiationRecords.set(items.some((current) => current.id === item.id)
      ? items.map((current) => current.id === item.id ? item : current)
      : [item, ...items]);
  }

  private refreshOpportunityQuotes(oportunidadId: number): void {
    this.api.listCotizaciones(oportunidadId).subscribe({
      next: (quotes) => {
        const normalized = quotes.map((quote) => this.withQuoteOpportunity(quote, oportunidadId));
        const externalQuotes = this.cotizaciones().filter((quote) => Number(quote.crmOportunidadId) !== Number(oportunidadId));
        this.cotizaciones.set([...normalized, ...externalQuotes]);
      },
      error: () => undefined,
    });
  }

  private refreshOpportunityNegotiations(oportunidadId: number): void {
    this.api.listCrmNegociaciones(oportunidadId).subscribe({
      next: (items) => {
        const normalized = items.map((item) => this.mapNegotiationRecord(item));
        const external = this.opportunityNegotiationRecords().filter((item) => Number(item.oportunidadId) !== Number(oportunidadId));
        this.opportunityNegotiationRecords.set([...normalized, ...external]);
      },
      error: () => undefined,
    });
  }

  private createInitialFollowUpActivities(prospecto: CrmProspecto) {
    const userId = prospecto.responsableId || this.currentUserKey();
    const name = prospecto.nombre || prospecto.razonSocial || 'prospecto';
    const plan = [
      {
        tipoActividad: 'LLAMADA',
        dayOffset: 1,
        hour: 9,
        asunto: `Llamar a ${name}`,
        descripcion: 'Primer contacto automatico al pasar a seguimiento.',
      },
      {
        tipoActividad: 'WHATSAPP',
        dayOffset: 2,
        hour: 10,
        asunto: `Enviar WhatsApp a ${name}`,
        descripcion: 'Segundo contacto automatico de seguimiento.',
      },
      {
        tipoActividad: 'CORREO',
        dayOffset: 3,
        hour: 11,
        asunto: `Enviar correo a ${name}`,
        descripcion: 'Tercer contacto automatico de seguimiento.',
      },
    ];

    return forkJoin(
      plan.map((item) => this.api.createCrmActividad({
        prospectoId: prospecto.id,
        oportunidadId: null,
        clienteId: null,
        tipoActividad: item.tipoActividad,
        asunto: item.asunto,
        descripcion: item.descripcion,
        fechaProgramada: this.followUpScheduleDate(item.dayOffset, item.hour),
        usuarioId: userId,
      })),
    );
  }

  private followUpScheduleDate(dayOffset: number, hour: number): string {
    const date = new Date();
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  }

  private upsertActivity(item: CrmActividad, message?: string): void {
    const items = this.actividades();
    this.actividades.set(items.some((current) => current.id === item.id) ? items.map((current) => current.id === item.id ? item : current) : [item, ...items]);
    if (message) {
      this.successMessage.set(message);
    }
  }

  private currentUserKey(): string {
    const session = this.auth.currentSession();
    return String(session?.userId ?? session?.username ?? 'system');
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}

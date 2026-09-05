import { DatePipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, forkJoin, of } from 'rxjs';
import type { Observable } from 'rxjs';
import { catchError, finalize, map, switchMap } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { ApiUrlService } from '@core/api/api-url.service';
import {
  CompleteClientDataModal,
  DeleteProspectModal,
  ProspectDistributionModal,
  RegisterPaymentModal,
  FollowupDetailModal,
  OpportunityDetailModal,
  OpportunityRequirementModal,
  RegisterNegotiationModal,
  OpportunityDocumentModal,
  StageMoveReviewModal,
  MarkLostModal,
  CatalogProductModal,
  ProspectFormModal,
  CreateOpportunityModal,
  ActivityFormModal,
  QuoteFormModal,
  ManageCrmGoalsModal,
} from './modals';
import {
  CATALOG_REGISTRATION_TYPES,
  CATALOG_TYPE_GROUPS,
  CatalogField,
  CatalogRegistrationType,
  CrmClientCompletionAction,
  CrmClientCompletionDraft,
  CrmPaymentDialogSummary,
  CrmPaymentInstallment,
  CrmPaymentPlan,
  CRM_OPPORTUNITY_FLOW,
  OpportunitySummaryCard,
  PHONE_COUNTRIES,
  PROSPECT_COUNTRIES,
  ProspectDocumentOption,
  ProspectFunnelContext,
  ProspectPersonType,
  isInFollowUpStage,
  catalogRegistrationType,
  prospectCountry,
  prospectDocuments,
  prospectLocalPhone,
  normalizeProspectPhoneDialCode,
  prospectPhoneDialCode,
  prospectPhoneDialCodeFromValue,
  prospectPhoneE164,
  phoneCountryByCode,
  phoneCountryForDialCode,
  phoneCountryForNumber,
} from './models';
import {
  CRM_ACTIVE_PIPELINE_STAGES,
  CRM_INITIAL_PAGE_SIZE,
  DEFAULT_CRM_CURRENCIES,
  DEFAULT_CRM_INTEGRATIONS,
} from './models/crm-admin-view.model';
import type {
  ActivityContext,
  ActivityForm,
  CatalogStep,
  CatalogoForm,
  CommercialInboxCard,
  CrmCurrencyField,
  CrmExecutiveKpi,
  CrmExecutivePipelineRow,
  CrmExecutiveRevenueChart,
  CrmIntegrationField,
  CrmLocalConfig,
  CrmPageMeta,
  CrmSectionTab,
  CrmStagePanel,
  CrmTab,
  DialogType,
  FollowUpFilter,
  FollowUpQualification,
  FollowUpStageCard,
  FollowUpTableTab,
  LegacyOpportunityRecords,
  LossDialogState,
  OpportunityClosureRecord,
  OpportunityDetailTab,
  OpportunityDocumentForm,
  OpportunityDocumentRecord,
  OpportunityForm,
  OpportunityHistoryEvent,
  OpportunityMessageTemplate,
  OpportunityNegotiationForm,
  OpportunityNegotiationRecord,
  OpportunityPaymentForm,
  OpportunityPaymentRecord,
  OpportunityRequirementForm,
  OpportunityRequirementRecord,
  OpportunityType,
  OpportunityView,
  PipelineChecklistItem,
  PipelineStageOption,
  PromotionForm,
  ProspectForm,
  QuoteForm,
  QuoteLineForm,
  StageMoveReview,
  StageRequirementAction,
  StageValidationMode,
} from './models/crm-admin-view.model';
import {
  addMonths,
  createActivityForm,
  createCatalogForm,
  createClientCompletionForm,
  createOpportunityDocumentForm,
  createOpportunityForm,
  createOpportunityNegotiationForm,
  createOpportunityPaymentForm,
  createOpportunityRequirementForm,
  createPromotionForm,
  createProspectForm,
  createQuoteForm,
  nextActivityType,
  nextBusinessActivityDate,
  toInputDate,
  toInputDateTime,
} from './utils/crm-admin-form.factory';
import { quoteCode } from '@shared/utils/quote-code';
import {
  CrmDashboardPage,
  CrmExecutiveAlertView,
  CrmExecutiveLeadSourceView,
  CrmExecutiveGoalSummaryView,
  CrmExecutiveSellerPerformanceView,
  CrmExecutiveTopDealView,
  CustomersPage,
  FollowupFilterState,
  FollowupsPage,
  OpportunitiesPage,
  PaymentTrackingFilterState,
  PaymentTrackingPage,
  PaymentTrackingRow,
  PaymentTrackingUpcomingItem,
  PipelinePage,
  ProspectFilterState,
  ProspectsPage,
} from './pages';
import {
  buildOpportunityListView,
  buildOpportunitySummaryCards,
} from './pages/opportunities-page/opportunities-page.viewmodel';
import {
  buildOpportunityFinancialSummary,
  buildOpportunityFlowViewState,
  buildOpportunityPaymentPlan,
  buildOpportunityRequirementChecklist,
  buildSaleClosureChecklist,
  canCloseWon as canCloseWonView,
  isRequiredClosurePaymentRegistered as isRequiredClosurePaymentRegisteredView,
  latestFinalAgreement,
  opportunityFinancialStatusTone as resolveOpportunityFinancialStatusTone,
  opportunityStatusTone as resolveOpportunityStatusTone,
  quoteStatusLabel as resolveQuoteStatusLabel,
  quoteStatusTone as resolveQuoteStatusTone,
  quoteStatusValue as resolveQuoteStatusValue,
  resolveNegotiationQuoteDecision as resolveNegotiationQuoteDecisionView,
} from './modals/opportunity-detail-modal/opportunity-detail.viewmodel';
import type { OpportunityFlowSnapshot } from './modals/opportunity-detail-modal/opportunity-detail.viewmodel';
import {
  CrmFollowupService,
  CrmInboxChannelStateService,
  CrmLiveUpdateService,
  CrmLocalStorageService,
  CrmOpportunityService,
  CrmProspectService,
  CrmQuotationService,
  CrmStorageCompanyIdentity,
} from './services';
import { EmailSettings } from './settings/email-settings/email-settings';
import { CrmCurrencyConfigPanel } from './components/crm-currency-config-panel/crm-currency-config-panel';
import { LandingChannelConfig } from './components/landing-channel-config/landing-channel-config';
import { WhatsappAutoReplyConfigComponent } from './components/whatsapp-auto-reply-config/whatsapp-auto-reply-config';
import { WhatsappFailedSendsComponent } from './components/whatsapp-failed-sends/whatsapp-failed-sends';
import { WhatsappTemplateEditorComponent } from './components/whatsapp-template-editor/whatsapp-template-editor';
import { WhatsappReengagementGuideComponent } from './components/whatsapp-reengagement-guide/whatsapp-reengagement-guide';
import { CrmApiService } from '@features/crm/data/crm-api.service';
import { CrmCatalogStore } from './services/crm-catalog.store';
import { CrmCurrencyStore } from './services/crm-currency.store';
import { CrmQuotationStore } from './services/crm-quotation.store';
import { CrmStageStore } from './services/crm-stage.store';
import { deltaLabel, formatCompactAmount, humanizeCode } from './services/crm-text.util';
import { CrmFeedbackService } from './services/crm-feedback.service';
import { Cotizacion, PromocionCotizacion } from '@core/api/cotizacion-api.types';
import { Cliente, Producto, Sucursal, UsuarioTenant } from '@core/api/catalog-api.types';
import {
  CrmActividad,
  CrmCanalTokenConfig,
  CrmCatalogoItem,
  CrmCurrencyConfig,
  CrmCurrencyOption,
  CrmDashboard,
  CrmLeadAssignmentConfig,
  CrmEtapaPipeline,
  CrmGoal,
  CrmNegociacion,
  CrmOportunidad,
  CrmOportunidadRecurso,
  CrmProspecto,
  CrmResponsableOption,
  CreateCrmNegociacionRequest,
  SaveCrmGoalRequest,
  UpdateCrmCanalTokenConfigRequest,
  UpdateCrmCurrencyConfigRequest,
  WhatsappConnectionStatus,
} from '@features/crm/data/crm-api.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-page',
  imports: [
    DatePipe,
    DecimalPipe,
    NgTemplateOutlet,
    RouterLink,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    CrmDashboardPage,
    CustomersPage,
    FollowupsPage,
    OpportunitiesPage,
    PaymentTrackingPage,
    PipelinePage,
    ProspectsPage,
    CompleteClientDataModal,
    DeleteProspectModal,
    FollowupDetailModal,
    OpportunityDetailModal,
    OpportunityRequirementModal,
    RegisterNegotiationModal,
    OpportunityDocumentModal,
    StageMoveReviewModal,
    MarkLostModal,
    CatalogProductModal,
    ProspectFormModal,
    CreateOpportunityModal,
    ActivityFormModal,
    QuoteFormModal,
    ManageCrmGoalsModal,
    ProspectDistributionModal,
    RegisterPaymentModal,
    EmailSettings,
    CrmCurrencyConfigPanel,
    LandingChannelConfig,
    WhatsappAutoReplyConfigComponent,
    WhatsappReengagementGuideComponent,
    WhatsappFailedSendsComponent,
    WhatsappTemplateEditorComponent,
  ],
  providers: [
    CrmFeedbackService,
    CrmCurrencyStore,
    CrmCatalogStore,
    CrmStageStore,
    CrmQuotationStore,
  ],
  templateUrl: './crm-page.html',
  styleUrl: './crm-page.scss',
  // CRM styles remain globally scoped during the incremental page extraction,
  // but are partitioned by domain under ./styles to keep ownership explicit.
  encapsulation: ViewEncapsulation.None,
})
export class CrmPage {
  readonly modalContext = this;
  private readonly api = inject(CrmApiService);
  private readonly feedback = inject(CrmFeedbackService);
  private readonly currencies = inject(CrmCurrencyStore);
  private readonly catalog = inject(CrmCatalogStore);
  private readonly stages = inject(CrmStageStore);
  private readonly quotations = inject(CrmQuotationStore);
  private readonly crmProspects = inject(CrmProspectService);
  private readonly crmFollowups = inject(CrmFollowupService);
  private readonly crmLiveUpdates = inject(CrmLiveUpdateService);
  private readonly crmInboxChannels = inject(CrmInboxChannelStateService);
  private readonly crmOpportunities = inject(CrmOpportunityService);
  private readonly crmQuotations = inject(CrmQuotationService);
  private readonly auth = inject(AuthSessionService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly crmLocalStorage = inject(CrmLocalStorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private quoteRouteHandled = false;
  private readonly destroyRef = inject(DestroyRef);
  private legacyOpportunityMigrationStarted = false;

  protected readonly prospectos = signal<CrmProspecto[]>([]);
  protected readonly oportunidades = signal<CrmOportunidad[]>([]);
  protected readonly actividades = signal<CrmActividad[]>([]);
  protected readonly etapas = this.stages.stages;
  protected readonly catalogoItems = this.catalog.items;
  protected readonly clientes = signal<Cliente[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected readonly usuarios = signal<UsuarioTenant[]>([]);
  protected readonly cotizaciones = this.quotations.quotes;
  protected readonly promocionesCotizacion = this.quotations.promotions;
  protected readonly crmIntegraciones = signal<CrmCanalTokenConfig[]>(
    DEFAULT_CRM_INTEGRATIONS.map((integration) => ({ ...integration })),
  );
  protected readonly crmCurrencyConfigs = this.currencies.configs;
  protected readonly crmCurrencyOptions = this.currencies.options;
  protected readonly selectedCrmIntegrationCanal = signal<string | null>(null);
  protected readonly selectedCrmIntegration = computed(() => {
    const integrations = this.crmIntegraciones();
    return (
      integrations.find((item) => item.canal === this.selectedCrmIntegrationCanal()) ??
      integrations[0] ??
      null
    );
  });
  protected readonly dashboard = signal<CrmDashboard | null>(null);
  protected readonly crmGoals = signal<CrmGoal[]>([]);
  protected readonly goalDialogOpen = signal(false);
  protected readonly goalSaving = signal(false);
  protected readonly goalYear = signal(new Date().getFullYear());
  protected readonly goalMonth = signal(new Date().getMonth() + 1);
  protected readonly loading = signal(false);
  public readonly saving = signal(false);
  protected readonly integrationSaving = signal<string | null>(null);
  protected readonly whatsappGeneratedVerifyToken = signal<string | null>(null);
  protected readonly whatsappTokenGenerating = signal(false);
  protected readonly whatsappTesting = signal(false);
  protected readonly whatsappSubscribing = signal(false);
  protected readonly whatsappConnectionStatus = signal<WhatsappConnectionStatus | null>(null);
  protected readonly currencySaving = this.currencies.saving;
  protected readonly activeTab = signal<CrmTab>('dashboard');
  protected readonly opportunityView = signal<OpportunityView>('ABIERTAS');
  public readonly activeDialog = signal<DialogType>(null);
  public readonly catalogDrawerOpen = signal(false);
  public readonly catalogStep = signal<CatalogStep>('select');
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
  protected readonly prospectDistributionMode = signal<'MANUAL' | 'AUTOMATICO'>('MANUAL');
  protected readonly leadAssignmentConfig = signal<CrmLeadAssignmentConfig>({
    automatico: false,
    estrategia: 'MENOR_CARGA',
    responsableIds: [],
  });
  protected readonly prospectDeleteTarget = signal<CrmProspecto | null>(null);
  protected readonly prospectDeleting = signal(false);
  protected readonly selectedProspectIds = signal<Set<number>>(new Set());
  protected readonly prospectPage = signal(0);
  protected readonly clientPage = signal(0);
  protected readonly followUpPage = signal(0);
  protected readonly opportunityPage = signal(0);
  protected readonly paymentTrackingPage = signal(0);
  protected readonly paymentTrackingStatusFilter = signal('TODOS');
  protected readonly paymentTrackingInstallmentFilter = signal('TODOS');
  protected readonly paymentTrackingDueFrom = signal('');
  protected readonly paymentTrackingDueTo = signal('');
  protected readonly paymentTrackingResponsible = signal('TODOS');
  protected readonly opportunityStageFilter = signal<string | null>(null);
  protected readonly opportunityResponsibleFilter = signal<string | null>(null);
  protected readonly opportunityStatusFilter = signal<string | null>('ABIERTA');
  protected readonly showOpportunityFilters = signal(false);
  protected readonly showClientFilters = signal(false);
  protected readonly clientOutcomeFilter = signal('TODOS');
  public readonly opportunityDetailOpen = signal(false);
  public readonly stageMoveReview = signal<StageMoveReview | null>(null);
  public readonly stageMoveComment = signal('');
  protected readonly followUpFilter = signal<FollowUpFilter>('TODAS');
  protected readonly followUpContactFilter = signal('TODOS');
  protected readonly followUpResponsibleFilter = signal('TODOS');
  protected readonly followUpOriginFilter = signal('TODOS');
  protected readonly followUpInterestFilter = signal('TODOS');
  protected readonly followUpDateFilter = signal('TODOS');
  protected readonly showFollowUpFilters = signal(false);
  protected readonly selectedFollowUpProspectId = signal<number | null>(null);
  // El estado vive en CrmFeedbackService; se reexpone para que la plantilla
  // y las llamadas existentes no cambien.
  public readonly errorMessage = this.feedback.errorMessage;
  protected readonly successMessage = this.feedback.successMessage;
  public readonly selectedOpportunity = signal<CrmOportunidad | null>(null);
  public readonly opportunityDetailTab = signal<OpportunityDetailTab>('resumen');
  protected readonly opportunityRequirementRecords = signal<OpportunityRequirementRecord[]>(
    this.loadOpportunityRecords<OpportunityRequirementRecord>(
      this.opportunityRequirementStorageKey(),
    ),
  );
  protected readonly opportunityNegotiationRecords = signal<OpportunityNegotiationRecord[]>([]);
  protected readonly opportunityPaymentRecords = signal<OpportunityPaymentRecord[]>(
    this.loadOpportunityRecords<OpportunityPaymentRecord>(this.opportunityPaymentStorageKey()),
  );
  protected readonly opportunityDocumentRecords = signal<OpportunityDocumentRecord[]>(
    this.loadOpportunityRecords<OpportunityDocumentRecord>(this.opportunityDocumentStorageKey()),
  );
  protected readonly opportunityClosureRecords = signal<OpportunityClosureRecord[]>(
    this.loadOpportunityRecords<OpportunityClosureRecord>(this.opportunityClosureStorageKey()),
  );
  public readonly opportunityRequirementDialogOpen = signal(false);
  public readonly opportunityNegotiationDialogOpen = signal(false);
  protected readonly opportunityPaymentDialogOpen = signal(false);
  protected readonly clientCompletionDialogOpen = signal(false);
  protected readonly clientCompletionAction = signal<CrmClientCompletionAction>('WON');
  protected readonly clientCompletionOpportunityId = signal<number | null>(null);
  protected readonly clientCompletionEditTarget = signal<'PROSPECT' | 'CLIENT'>('PROSPECT');
  private readonly clientCompletionQuote = signal<Cotizacion | null>(null);
  public readonly opportunityDocumentDialogOpen = signal(false);
  public readonly activityContext = signal<ActivityContext | null>(null);
  public readonly lossDialog = signal<LossDialogState | null>(null);
  public readonly lossReason = signal('');
  public readonly lossObservation = signal('');
  public readonly actionId = signal<number | null>(null);
  public readonly sendingQuotePdfIds = this.quotations.pdfDownloading;
  public readonly sendingQuoteWhatsappIds = this.quotations.whatsappSending;
  public readonly sendingQuoteEmailIds = this.quotations.emailSending;
  public readonly sendingOpportunityWhatsappIds = signal<ReadonlySet<number>>(new Set<number>());
  public readonly sendingOpportunityEmailIds = signal<ReadonlySet<number>>(new Set<number>());
  public readonly sendingProspectEmailIds = signal<ReadonlySet<number>>(new Set<number>());
  public readonly crmLocalConfig = signal<CrmLocalConfig>(this.loadCrmLocalConfig());
  protected readonly canManageCrmConfig = computed(() =>
    this.hasCrmPermission('CRM_CONFIG_MANAGE', 'CRM_PIPELINE_MANAGE'),
  );
  protected readonly canManageCrmCatalog = computed(() =>
    this.hasCrmPermission('CRM_CATALOG_MANAGE', 'CRM_CONFIG_MANAGE'),
  );
  public readonly canMoveCrmOpportunities = computed(() =>
    this.hasCrmPermission(
      'CRM_OPPORTUNITIES_STAGE',
      'CRM_PIPELINE_WRITE',
      'CRM_OPPORTUNITY_MOVE_STAGE',
    ),
  );
  protected readonly canCloseCrmOpportunities = computed(() =>
    this.hasCrmPermission(
      'CRM_OPPORTUNITIES_CLOSE',
      'CRM_CONVERT_SALE',
      'CRM_OPPORTUNITY_MARK_WON',
      'CRM_OPPORTUNITY_MARK_LOST',
    ),
  );
  protected readonly canCreateCrmQuotes = computed(() =>
    this.hasCrmPermission('CRM_QUOTES_CREATE', 'CRM_CONVERT_SALE'),
  );
  protected readonly canAssignCrmProspects = computed(() =>
    this.hasCrmPermission('CRM_ASSIGN', 'CRM_VIEW_ALL'),
  );
  protected readonly canDeleteCrmProspects = computed(() => this.hasCrmPermission('CRM_DELETE'));
  protected readonly canManageCrmGoals = computed(() => this.hasCrmPermission('CRM_GOALS_MANAGE'));
  protected readonly canReadCrmGoals = computed(() =>
    this.hasCrmPermission('CRM_GOALS_READ', 'CRM_GOALS_MANAGE'),
  );
  protected readonly dashboardNow = new Date();

  public prospectForm: ProspectForm = this.emptyProspectForm();
  public opportunityForm: OpportunityForm = this.emptyOpportunityForm();
  public catalogoForm: CatalogoForm = this.emptyCatalogoForm();
  public activityForm: ActivityForm = this.emptyActivityForm();
  public quoteForm: QuoteForm = this.emptyQuoteForm();
  protected promotionForm: PromotionForm = this.emptyPromotionForm();
  public requirementForm: OpportunityRequirementForm = this.emptyOpportunityRequirementForm();
  public negotiationForm: OpportunityNegotiationForm = this.emptyOpportunityNegotiationForm();
  protected paymentForm: OpportunityPaymentForm = this.emptyOpportunityPaymentForm();
  private paymentSelectedFile: File | null = null;
  protected clientCompletionForm: CrmClientCompletionDraft = this.emptyClientCompletionForm();
  public documentForm: OpportunityDocumentForm = this.emptyOpportunityDocumentForm();

  public readonly tipoPersonaOptions = [
    { label: 'Por definir', value: 'SIN_DEFINIR' },
    { label: 'Persona natural', value: 'NATURAL' },
    { label: 'Empresa', value: 'JURIDICA' },
  ];

  public readonly prospectCountryOptions = PROSPECT_COUNTRIES.map((country) => ({
    label: country.name,
    value: country.code,
  }));

  public readonly prospectPhoneCountryOptions = [...PHONE_COUNTRIES];

  // La conversión fiscal actual del módulo de clientes conserva los códigos SUNAT.
  public readonly documentoOptions = [
    { label: 'DNI', value: '1' },
    { label: 'RUC', value: '6' },
  ];

  public readonly origenOptions = [
    'WHATSAPP',
    'FACEBOOK',
    'INSTAGRAM',
    'WEB',
    'REFERIDO',
    'LLAMADA',
    'VISITA',
    'OTRO',
  ].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  public readonly prospectoEstadoOptions = [
    'NUEVO',
    'CONTACTADO',
    'EN_ESPERA',
    'CALIFICADO',
    'PERDIDO',
    'CONVERTIDO',
  ].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  public readonly canalIngresoOptions = [
    { label: 'Ingreso manual', value: 'MANUAL' },
    { label: 'Landing web', value: 'LANDING' },
    { label: 'Webhook', value: 'WEBHOOK' },
    { label: 'WhatsApp', value: 'WHATSAPP' },
    { label: 'Facebook', value: 'FACEBOOK' },
    { label: 'Importado', value: 'IMPORTADO' },
  ];

  public readonly catalogStatusOptions = [
    { label: 'Activa y disponible', value: 'ACTIVO' },
    { label: 'Inactiva', value: 'INACTIVO' },
    { label: 'Archivada', value: 'ARCHIVADO' },
  ];

  public readonly negotiationResultOptions = [
    { label: 'Acuerdo final / proceder a cierre', value: 'ACEPTA' },
    { label: 'No acepta / pide ajuste', value: 'PENDIENTE' },
    { label: 'Rechaza propuesta', value: 'RECHAZA' },
  ];

  public readonly negotiationObjectionOptions = [
    'MEJOR_PRECIO',
    'PROMOCION',
    'PLAZO',
    'FORMA_PAGO',
    'CONDICIONES',
    'OTRO',
  ].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  public readonly negotiationPaymentOptions = [
    { label: 'Contado', value: 'Contado' },
    { label: 'Credito', value: 'Credito' },
  ];

  protected readonly paymentTypeOptions = [
    'FACTURA',
    'BOLETA',
    'TICKET',
    'VOUCHER',
    'CUOTA',
    'OTRO',
  ].map((value) => ({
    label: this.humanize(value),
    value,
  }));

  protected readonly paymentStatusOptions = ['PENDIENTE', 'PARCIAL', 'PAGADO', 'VENCIDO'].map(
    (value) => ({
      label: this.humanize(value),
      value,
    }),
  );

  protected readonly paymentMethodOptions = [
    { label: 'Efectivo', value: 'Efectivo' },
    { label: 'Transferencia bancaria', value: 'Transferencia bancaria' },
    { label: 'Yape', value: 'Yape' },
    { label: 'Plin', value: 'Plin' },
    { label: 'Tarjeta', value: 'Tarjeta' },
    { label: 'Deposito', value: 'Deposito' },
  ];

  public readonly documentCategoryOptions = [
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
      primaryLabel: 'Vehículo de interés',
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
      description: 'Pólizas, renovaciones, cotizaciones y evaluación de riesgo.',
      primaryLabel: 'Seguro de interés',
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
      primaryLabel: 'Solución o módulo requerido',
      secondaryLabel: 'Usuarios, integraciones o alcance',
      locationLabel: 'Empresa o área usuaria',
      dateLabel: 'Fecha esperada de implementación',
      amountHint: 'Licencia, mensualidad o proyecto',
    },
    {
      value: 'MARKETING',
      label: 'Marketing',
      icon: 'pi pi-megaphone',
      description: 'Campañas, branding, anuncios, contenidos o gestión digital.',
      primaryLabel: 'Servicio de marketing',
      secondaryLabel: 'Objetivo, canal o audiencia',
      locationLabel: 'Mercado o zona objetivo',
      dateLabel: 'Inicio de campaña',
      amountHint: 'Fee, pauta o presupuesto mensual',
    },
    {
      value: 'CLINICA',
      label: 'Clínica',
      icon: 'pi pi-heart',
      description: 'Citas, tratamientos, paquetes médicos o servicios de salud.',
      primaryLabel: 'Servicio o especialidad',
      secondaryLabel: 'Sintoma, tratamiento o paquete',
      locationLabel: 'Sede de atención',
      dateLabel: 'Fecha deseada de cita',
      amountHint: 'Costo estimado de consulta o tratamiento',
    },
    {
      value: 'JURIDICO',
      label: 'Jurídico',
      icon: 'pi pi-briefcase',
      description: 'Consultas legales, contratos, procesos y asesorías.',
      primaryLabel: 'Caso o servicio legal',
      secondaryLabel: 'Materia, urgencia o etapa',
      locationLabel: 'Jurisdicción o sede',
      dateLabel: 'Fecha límite o audiencia',
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
      description: 'Créditos, inversiones, factoring o productos financieros.',
      primaryLabel: 'Producto financiero',
      secondaryLabel: 'Monto, plazo o condiciones',
      locationLabel: 'Empresa, sede o región',
      dateLabel: 'Fecha objetivo',
      amountHint: 'Monto solicitado o inversión',
    },
    {
      value: 'CONSULTORIA',
      label: 'Consultoría',
      icon: 'pi pi-compass',
      description: 'Diagnósticos, asesorías, auditorías o mejora de procesos.',
      primaryLabel: 'Tema de consultoría',
      secondaryLabel: 'Problema, alcance o entregable',
      locationLabel: 'Área o sede del cliente',
      dateLabel: 'Inicio esperado',
      amountHint: 'Presupuesto de consultoría',
    },
    {
      value: 'EDUCACION',
      label: 'Educación',
      icon: 'pi pi-book',
      description: 'Colegios, academias, capacitaciones y admisiones.',
      primaryLabel: 'Programa educativo',
      secondaryLabel: 'Nivel, modalidad o horario',
      locationLabel: 'Sede o campus',
      dateLabel: 'Fecha de inicio',
      amountHint: 'Matrícula, pensión o paquete',
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
      description: 'Pedidos industriales, producción, insumos o distribución.',
      primaryLabel: 'Pedido o producto industrial',
      secondaryLabel: 'Volumen, material o especificación',
      locationLabel: 'Planta o destino',
      dateLabel: 'Fecha requerida',
      amountHint: 'Valor del pedido o contrato',
    },
    {
      value: 'TELECOMUNICACION',
      label: 'Telecom',
      icon: 'pi pi-wifi',
      description: 'Internet, telefonía, enlaces, equipos o soporte.',
      primaryLabel: 'Servicio telecom',
      secondaryLabel: 'Velocidad, cobertura o equipos',
      locationLabel: 'Dirección de instalación',
      dateLabel: 'Fecha de instalación',
      amountHint: 'Plan, instalación o contrato',
    },
    {
      value: 'ENERGIA',
      label: 'Energía',
      icon: 'pi pi-bolt',
      description: 'Solar, eléctrico, mantenimiento o eficiencia energética.',
      primaryLabel: 'Solución energética',
      secondaryLabel: 'Consumo, potencia o alcance',
      locationLabel: 'Ubicación del proyecto',
      dateLabel: 'Fecha de instalación',
      amountHint: 'Presupuesto energético',
    },
    {
      value: 'AGRICULTURA',
      label: 'Agricultura',
      icon: 'pi pi-sun',
      description: 'Agro, insumos, maquinaria, riego o servicios de campo.',
      primaryLabel: 'Necesidad agrícola',
      secondaryLabel: 'Cultivo, hectareas o temporada',
      locationLabel: 'Predio o zona',
      dateLabel: 'Fecha de campaña',
      amountHint: 'Presupuesto agrícola',
    },
    {
      value: 'OTRO',
      label: 'Otro',
      icon: 'pi pi-objects-column',
      description: 'Cualquier rubro comercial no clasificado todavía.',
      primaryLabel: 'Interés principal',
      secondaryLabel: 'Detalle del requerimiento',
      locationLabel: 'Lugar relacionado',
      dateLabel: 'Fecha objetivo',
      amountHint: 'Monto referencial',
    },
  ];

  public readonly catalogTypeCards = CATALOG_REGISTRATION_TYPES;
  public readonly catalogTypeGroups = CATALOG_TYPE_GROUPS.map((group) => ({
    ...group,
    types: CATALOG_REGISTRATION_TYPES.filter((type) => type.group === group.code),
  }));

  public readonly etapaOptions = this.stages.options;

  public readonly activePipelineStageOptions = this.stages.activeOptions;

  public readonly tipoActividadOptions = [
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

  public readonly actividadEstadoOptions = [
    { label: 'Programada / pendiente', value: 'PENDIENTE', icon: 'pi pi-clock' },
    { label: 'Realizada ahora', value: 'REALIZADA', icon: 'pi pi-circle-fill' },
  ];

  public readonly activityResultOptions = [
    { label: 'Sin resultado aun', value: '', icon: 'pi pi-users' },
    { label: 'Contactado', value: 'CONTACTADO', icon: 'pi pi-check-circle' },
    { label: 'Interés medio confirmado', value: 'INTERESADO', icon: 'pi pi-star' },
    { label: 'Interés alto confirmado', value: 'MUY_INTERESADO', icon: 'pi pi-star-fill' },
    { label: 'Solicito propuesta', value: 'SOLICITA_PROPUESTA', icon: 'pi pi-file-edit' },
    { label: 'Solicitó cotización', value: 'COTIZACION_SOLICITADA', icon: 'pi pi-file' },
    { label: 'Pidio reprogramar', value: 'REPROGRAMADO', icon: 'pi pi-calendar' },
    { label: 'Queda en espera', value: 'EN_ESPERA', icon: 'pi pi-clock' },
    { label: 'No respondio', value: 'SIN_RESPUESTA', icon: 'pi pi-ban' },
    { label: 'No interesado', value: 'NO_INTERESADO', icon: 'pi pi-times-circle' },
    { label: 'Perdido / descartar', value: 'PERDIDO', icon: 'pi pi-trash' },
  ];

  public readonly activityInterestOptions = [
    { label: 'Bajo', value: 'BAJO', icon: 'pi pi-chart-bar' },
    { label: 'Medio', value: 'MEDIO', icon: 'pi pi-chart-line' },
    { label: 'Alto', value: 'ALTO', icon: 'pi pi-bolt' },
  ];

  public readonly activityProspectStatusOptions = [
    { label: 'Mantener estado actual', value: '', icon: 'pi pi-flag' },
    { label: 'Contactado', value: 'CONTACTADO', icon: 'pi pi-phone' },
    { label: 'En espera', value: 'EN_ESPERA', icon: 'pi pi-clock' },
    { label: 'Calificado', value: 'CALIFICADO', icon: 'pi pi-check' },
    { label: 'Perdido', value: 'PERDIDO', icon: 'pi pi-times' },
  ];

  protected readonly prospectLossReasonOptions = [
    { label: 'No responde', value: 'NO_RESPONDE' },
    { label: 'Numero incorrecto', value: 'NUMERO_INCORRECTO' },
    { label: 'Sin interés', value: 'SIN_INTERES' },
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

  public readonly opportunityTemperatureOptions = [
    { label: 'Frio', value: 'FRIO' },
    { label: 'Medio', value: 'MEDIO' },
    { label: 'Caliente', value: 'CALIENTE' },
  ];

  protected readonly metrics = computed(() => {
    const dashboard = this.dashboard();
    const oportunidadesAbiertas = this.oportunidades().filter((item) =>
      this.isActiveOpportunity(item),
    );
    return {
      prospectos: this.prospectos().length,
      leadsAutomaticos:
        dashboard?.leadsAutomaticos ??
        this.prospectos().filter((item) => (item.canalIngreso || 'MANUAL') !== 'MANUAL').length,
      oportunidades: oportunidadesAbiertas.length,
      catalogo: this.catalogoItems().filter((item) => item.estado === 'ACTIVO').length,
      actividadesPendientes: this.actividades().filter((item) => item.estado === 'PENDIENTE')
        .length,
      pipeline:
        oportunidadesAbiertas.length > 0
          ? this.sumOpportunityAmount(oportunidadesAbiertas)
          : (dashboard?.montoPipeline ?? 0),
    };
  });

  protected readonly wonAmount = computed(() =>
    this.sumOpportunityAmount(this.wonOpportunities(), true),
  );

  protected readonly dashboardGoal = computed(() => {
    const goals = this.crmGoals();
    const currentUser = this.currentUserKey();
    if (!this.canManageCrmGoals()) {
      const personal = goals.find(
        (goal) => goal.alcance === 'ASESOR' && String(goal.responsableId) === currentUser,
      );
      if (personal) {
        return personal;
      }
    }
    return goals.find((goal) => goal.alcance === 'EQUIPO') ?? goals[0] ?? null;
  });

  protected readonly dashboardTargetAmount = computed(() => {
    return Number(this.dashboardGoal()?.metaIngresos || 0);
  });

  protected readonly dashboardTargetProgress = computed(() =>
    Number(this.dashboardGoal()?.progresoIngresos || 0),
  );

  protected readonly executiveGoalSummary = computed<CrmExecutiveGoalSummaryView | null>(() => {
    const goal = this.dashboardGoal();
    if (!goal) {
      return null;
    }
    const value = (actual: number, target: number, suffix = '') => ({
      actual: `${this.formatCompactAmount(actual)}${suffix}`,
      target: `${this.formatCompactAmount(target)}${suffix}`,
    });
    return {
      title:
        goal.alcance === 'EQUIPO'
          ? 'Meta del equipo comercial'
          : `Meta de ${goal.responsableNombre}`,
      period: `${this.goalMonthLabel(goal.mes)} ${goal.anio}`,
      progress: Number(goal.progresoIngresos || 0),
      metrics: [
        {
          label: 'Ingresos',
          icon: 'pi pi-wallet',
          ...value(goal.actualIngresos, goal.metaIngresos),
          prefix: this.tenantBaseCurrencySymbol(),
          progress: goal.progresoIngresos,
        },
        {
          label: 'Ganadas',
          icon: 'pi pi-trophy',
          ...value(goal.actualOportunidadesGanadas, goal.metaOportunidadesGanadas),
          progress: goal.progresoOportunidadesGanadas,
        },
        {
          label: 'Prospectos',
          icon: 'pi pi-user-plus',
          ...value(goal.actualProspectosNuevos, goal.metaProspectosNuevos),
          progress: goal.progresoProspectosNuevos,
        },
        {
          label: 'Actividades',
          icon: 'pi pi-check-square',
          ...value(goal.actualActividadesRealizadas, goal.metaActividadesRealizadas),
          progress: goal.progresoActividadesRealizadas,
        },
        {
          label: 'Conversión',
          icon: 'pi pi-chart-line',
          ...value(goal.actualConversion, goal.metaConversion, '%'),
          progress: goal.progresoConversion,
        },
      ],
    };
  });

  protected readonly pipelineColumns = computed(() =>
    this.activePipelineStageOptions().map((stage) => {
      const items = this.oportunidades().filter(
        (item) => item.etapa === stage.value && this.isActiveOpportunity(item),
      );
      return {
        ...stage,
        items,
        total: this.sumOpportunityAmount(items),
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
          total: this.sumOpportunityAmount(items),
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
      (sum, column) =>
        sum + column.items.filter((item) => this.opportunityRiskBadges(item).length > 0).length,
      0,
    ),
  );

  protected readonly pipelineForecastAmount = computed(() =>
    this.pipelineBoardColumns().reduce(
      (total, column) =>
        total +
        column.items.reduce(
          (sum, item) =>
            sum + (this.opportunityAmountInBase(item) * Number(item.probabilidad || 0)) / 100,
          0,
        ),
      0,
    ),
  );

  protected readonly pipelineConversionRate = computed(() => {
    const closedCount = this.oportunidades().filter((item) =>
      ['GANADA', 'PERDIDA'].includes(item.estado),
    ).length;
    return this.toRate(this.wonOpportunities().length, Math.max(closedCount, 1));
  });

  protected readonly pipelineSummaryCards = computed(() => [
    {
      label: 'Pipeline activo',
      value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(this.pipelineBoardTotal())}`,
      detail: 'Valor total estimado',
      icon: 'pi pi-sitemap',
      tone: 'blue',
    },
    {
      label: 'Oportunidades',
      value: String(this.pipelineBoardCount()),
      detail: 'Total activas',
      icon: 'pi pi-users',
      tone: 'violet',
    },
    {
      label: 'Pronostico de cierre',
      value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(this.pipelineForecastAmount())}`,
      detail: 'Monto ponderado por probabilidad',
      icon: 'pi pi-chart-line',
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
    const goal = this.dashboardGoal();
    const income = goal?.actualIngresos ?? this.wonAmount();
    const target = this.dashboardTargetAmount();
    const conversion = goal?.actualConversion ?? this.pipelineConversionRate();
    const contacts = this.prospectos().length + this.clientes().length;
    const closedThisMonth =
      goal?.actualOportunidadesGanadas ??
      this.wonOpportunities().filter((item) =>
        this.isThisMonth(
          item.fechaGanada || item.fechaCierreReal || item.updatedAt || item.createdAt,
        ),
      ).length;

    return [
      {
        label: 'Ingresos',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(income)}`,
        detail:
          target > 0
            ? `Meta: ${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(target)}`
            : 'Sin meta configurada',
        trend:
          target > 0
            ? `${this.dashboardTargetProgress()}% de la meta`
            : 'Define un objetivo mensual',
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
        trend: `+${this.toRate(this.automaticLeads().length, Math.max(this.prospectos().length, 1))}% captación`,
        trendTone: 'up',
        icon: 'pi pi-users',
        tone: 'contacts',
      },
      {
        label: 'Conversion',
        value: `${conversion}%`,
        detail: 'Pipeline -> Cerrado',
        trend:
          this.pipelineRiskCount() > 0 ? `-${this.pipelineRiskCount()} en riesgo` : '+0 en riesgo',
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
        amount: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(item.total)}`,
        color: item.color || this.stageColor(item.value),
        percent: count > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 0,
      };
    });
  });

  protected readonly executivePipelineTotalLabel = computed(
    () =>
      `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(this.pipelineColumns().reduce((sum, item) => sum + item.total, 0))}`,
  );

  protected readonly executiveRevenueChart = computed<CrmExecutiveRevenueChart>(() => {
    const labels = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
    const year = this.dashboardNow.getFullYear();
    const monthly = new Array(12).fill(0) as number[];

    for (const item of this.wonOpportunities()) {
      const closedAt = this.toValidDate(
        item.fechaGanada || item.fechaCierreReal || item.updatedAt || item.createdAt,
      );
      if (closedAt?.getFullYear() === year) {
        monthly[closedAt.getMonth()] += this.opportunityAmountInBase(item, true);
      }
    }

    const cumulative = monthly.reduce<number[]>((items, value, index) => {
      items[index] = (items[index - 1] || 0) + value;
      return items;
    }, []);
    const monthlyTarget = this.dashboardTargetAmount();
    const targetCumulative = labels.map((_, index) => monthlyTarget * (index + 1));
    const max = Math.max(...cumulative, ...targetCumulative, monthlyTarget * 12, 1);
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
      label: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(max * ratio)}`,
      y: Math.round(bottom - ratio * height),
    }));

    return { labels, guides, realPoints, targetPoints, areaPoints };
  });

  protected readonly executiveTopDeals = computed<CrmExecutiveTopDealView[]>(() => {
    const active = this.oportunidades().filter((item) => this.isActiveOpportunity(item));
    return active
      .sort((a, b) => this.opportunityAmountInBase(b) - this.opportunityAmountInBase(a))
      .slice(0, 5)
      .map((item) => {
        const stage = item.etapa;
        const temp = this.opportunityTemperatureValue(item);
        const isRisk = this.opportunityRiskBadges(item).length > 0;
        return {
          id: item.id,
          title: item.titulo || 'Oportunidad sin título',
          clientName: this.opportunityContactName(item) || 'Cliente sin asignar',
          stageLabel: this.stageName(stage),
          stageColor: this.stageColor(stage),
          amount: `${this.catalogCurrencyPrefix(item.moneda)} ${this.formatCompactAmount(item.montoEstimado || 0)}`,
          rawAmount: this.opportunityAmountInBase(item),
          probability: Number(item.probabilidad || 0),
          sellerName: this.responsibleName(item.responsableId),
          temperature: temp === 'CALIENTE' ? 'CALIENTE' : temp === 'FRIO' ? 'FRIO' : 'MEDIO',
          isRisk,
        };
      });
  });

  protected readonly executiveLeadSources = computed<CrmExecutiveLeadSourceView[]>(() => {
    const prospectos = this.prospectos();
    const total = Math.max(prospectos.length, 1);
    const sourceMap = new Map<string, number>();

    for (const p of prospectos) {
      const src = (p.origen || p.canalIngreso || 'MANUAL').trim().toUpperCase();
      sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
    }

    const sourceConfig: Record<string, { label: string; icon: string; color: string }> = {
      WHATSAPP: { label: 'WhatsApp', icon: 'pi pi-whatsapp', color: '#22c55e' },
      WEB: { label: 'Sitio Web / Landing', icon: 'pi pi-globe', color: '#3b82f6' },
      LANDING: { label: 'Landing Page', icon: 'pi pi-window-maximize', color: '#6366f1' },
      FACEBOOK: { label: 'Facebook Ads', icon: 'pi pi-facebook', color: '#1877f2' },
      INSTAGRAM: { label: 'Instagram', icon: 'pi pi-instagram', color: '#e1306c' },
      REFERIDO: { label: 'Referidos', icon: 'pi pi-users', color: '#8b5cf6' },
      CAMPANIA: { label: 'Campañas', icon: 'pi pi-megaphone', color: '#f59e0b' },
      MANUAL: { label: 'Entrada Manual', icon: 'pi pi-user-plus', color: '#64748b' },
      LLAMADA: { label: 'Llamada Fría', icon: 'pi pi-phone', color: '#0ea5e9' },
      CORREO: { label: 'Email Marketing', icon: 'pi pi-envelope', color: '#ec4899' },
    };

    const result: CrmExecutiveLeadSourceView[] = [];
    sourceMap.forEach((count, source) => {
      const config = sourceConfig[source] || {
        label: source.charAt(0) + source.slice(1).toLowerCase(),
        icon: 'pi pi-tag',
        color: '#0d9488',
      };
      result.push({
        source,
        label: config.label,
        count,
        percent: Math.round((count / total) * 100),
        icon: config.icon,
        color: config.color,
      });
    });

    return result.sort((a, b) => b.count - a.count).slice(0, 5);
  });

  protected readonly executiveSellerRankings = computed<CrmExecutiveSellerPerformanceView[]>(() => {
    const activeOpportunities = this.oportunidades().filter((item) =>
      this.isActiveOpportunity(item),
    );
    const wonOpportunities = this.wonOpportunities();
    const sellerMap = new Map<
      string,
      { wonCount: number; wonAmount: number; activeCount: number; pipelineAmount: number }
    >();

    for (const op of wonOpportunities) {
      const key = String(op.responsableId || '').trim();
      const current = sellerMap.get(key) || {
        wonCount: 0,
        wonAmount: 0,
        activeCount: 0,
        pipelineAmount: 0,
      };
      current.wonCount += 1;
      current.wonAmount += this.opportunityAmountInBase(op, true);
      sellerMap.set(key, current);
    }

    for (const op of activeOpportunities) {
      const key = String(op.responsableId || '').trim();
      const current = sellerMap.get(key) || {
        wonCount: 0,
        wonAmount: 0,
        activeCount: 0,
        pipelineAmount: 0,
      };
      current.activeCount += 1;
      current.pipelineAmount += this.opportunityAmountInBase(op);
      sellerMap.set(key, current);
    }

    const result: CrmExecutiveSellerPerformanceView[] = [];
    sellerMap.forEach((data, sellerKey) => {
      const totalDeals = data.wonCount + data.activeCount;
      const convRate = totalDeals > 0 ? Math.round((data.wonCount / totalDeals) * 100) : 0;
      result.push({
        name: this.responsibleName(sellerKey),
        wonCount: data.wonCount,
        wonAmount: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(data.wonAmount)}`,
        activeDealsCount: data.activeCount,
        pipelineAmount: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(data.pipelineAmount)}`,
        conversionRate: convRate,
      });
    });

    return result.sort((a, b) => b.wonCount - a.wonCount).slice(0, 5);
  });

  protected readonly executiveAlerts = computed<CrmExecutiveAlertView[]>(() => {
    const alerts: CrmExecutiveAlertView[] = [];
    const risks = this.pipelineRiskCount();
    const pendingTasks = this.actividades().filter((item) => item.estado === 'PENDIENTE').length;
    const unassignedLeads = this.prospectos().filter(
      (item) => !item.responsableId || String(item.responsableId).trim() === '',
    ).length;

    if (risks > 0) {
      alerts.push({
        type: 'risk',
        title: `${risks} ${risks === 1 ? 'deal en riesgo' : 'deals en riesgo'}`,
        description: 'Oportunidades con fecha de cierre vencida o inactividad',
        count: risks,
        icon: 'pi pi-exclamation-triangle',
        tone: 'danger',
        tabTarget: 'embudo',
        actionLabel: 'Revisar embudo',
      });
    }

    if (pendingTasks > 0) {
      alerts.push({
        type: 'urgent_task',
        title: `${pendingTasks} ${pendingTasks === 1 ? 'actividad pendiente' : 'actividades pendientes'}`,
        description: 'Llamadas, correos y reuniones programadas',
        count: pendingTasks,
        icon: 'pi pi-calendar-clock',
        tone: 'warning',
        tabTarget: 'seguimiento',
        actionLabel: 'Ver agenda',
      });
    }

    if (unassignedLeads > 0) {
      alerts.push({
        type: 'unassigned',
        title: `${unassignedLeads} ${unassignedLeads === 1 ? 'lead sin asignar' : 'leads sin asignar'}`,
        description: 'Prospectos nuevos en espera de asesor comercial',
        count: unassignedLeads,
        icon: 'pi pi-user-plus',
        tone: 'info',
        tabTarget: 'captacion',
        actionLabel: 'Asignar',
      });
    }

    return alerts;
  });

  protected openOpportunityDetailById(id: number): void {
    const target = this.oportunidades().find((op) => op.id === id);
    if (target) {
      this.openOpportunityDetail(target);
    }
  }

  /**
   * Contactos que se estan trabajando pero todavia no llegaron a oportunidad.
   *
   * La regla de reparto vive en resolveFunnelStage: cada contacto cuenta en una
   * sola etapa del embudo.
   */
  protected readonly followUpProspects = computed(() =>
    this.prospectos().filter((item) => isInFollowUpStage(this.funnelContextFor(item))),
  );

  protected readonly negotiationOpportunities = computed(() =>
    this.oportunidades().filter(
      (item) => item.etapa === 'NEGOCIACION' && this.isActiveOpportunity(item),
    ),
  );

  protected readonly wonOpportunities = computed(() =>
    this.oportunidades().filter((item) => item.estado === 'GANADA' || item.etapa === 'GANADO'),
  );

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
        // Cuenta contactos, no contactos + actividades: sumar ambos daba una
        // cifra distinta a la de la propia pantalla de seguimiento.
        count: this.commercialInbox().length,
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
        description:
          'Indicadores, proceso comercial, pipeline y actividades para dirigir el equipo.',
      },
      captacion: {
        eyebrow: 'Captación comercial',
        title: 'Prospectos y leads',
        description:
          'Revisa entradas nuevas, leads automaticos y contactos que necesitan primera gestion.',
      },
      seguimiento: {
        eyebrow: 'Gestion comercial',
        title: 'Seguimiento',
        description:
          'Organiza llamadas, tareas, proximos pasos y oportunidades que requieren accion.',
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
        description: 'Revisa las propuestas enviadas y mueve las que respondan hacia negociación.',
      },
      negociacion: {
        eyebrow: 'Negociación comercial',
        title: 'Negociación',
        description: 'Gestiona precio, condiciones y cierre de oportunidades con alta intencion.',
      },
      clientes: {
        eyebrow: 'Conversion comercial',
        title: 'Clientes',
        description:
          'Consulta ventas cerradas, productos comprados, pagos, deuda y documentos del expediente.',
      },
      seguimientoPagos: {
        eyebrow: 'Cobranza CRM',
        title: 'Seguimiento de pagos',
        description: 'Controla clientes con saldo pendiente, cuotas programadas y pagos vencidos.',
      },
      catalogo: {
        eyebrow: 'Catalogo CRM',
        title: 'Productos CRM',
        description:
          'Registra productos, servicios o bienes que se captan desde landing y se venden desde CRM.',
      },
      administracion: {
        eyebrow: 'Administracion CRM',
        title: 'Configuración general',
        description: 'Ajusta reglas operativas del CRM, etapas, roles y parametros base.',
      },
      administracionGeneral: {
        eyebrow: 'Configuración CRM',
        title: 'Configuración general',
        description: 'Ajusta reglas operativas del CRM, etapas, roles y parametros base.',
      },
      administracionCanales: {
        eyebrow: 'Captación e integraciones',
        title: 'Canales de entrada',
        description: 'Configura landing web, WhatsApp, Instagram y Facebook para recibir leads.',
      },
      administracionCorreo: {
        eyebrow: 'Comunicacion CRM',
        title: 'Correo saliente',
        description: 'Configura el remitente y el SMTP del tenant para enviar mensajes desde CRM.',
      },
      administracionMonedas: {
        eyebrow: 'Finanzas CRM',
        title: 'Monedas y conversion',
        description: 'Configura dolar, euro y margen aplicado al tipo de cambio comercial.',
      },
      administracionPromociones: {
        eyebrow: 'Comercial CRM',
        title: 'Promociones',
        description:
          'Administra descuentos y campañas que el equipo puede aplicar en cotizaciones.',
      },
    };
    return meta[this.activeTab()];
  });

  protected readonly automaticLeads = computed(() =>
    this.prospectos().filter((item) => this.isAutomaticLead(item)),
  );

  protected readonly incomingNewLeads = computed(() =>
    this.automaticLeads().filter((item) => item.estado === 'NUEVO'),
  );

  protected readonly prospectSummaryCards = computed(() => {
    const leads = this.incomingNewLeads();
    const web = leads.filter((item) =>
      ['WEB', 'LANDING', 'WEBHOOK'].includes(
        String(item.canalIngreso || item.origen).toUpperCase(),
      ),
    ).length;
    const whatsapp = leads.filter((item) =>
      String(item.canalIngreso || item.origen)
        .toUpperCase()
        .includes('WHATSAPP'),
    ).length;
    const social = leads.filter((item) =>
      ['FACEBOOK', 'INSTAGRAM', 'LINKEDIN'].some((channel) =>
        String(item.canalIngreso || item.origen)
          .toUpperCase()
          .includes(channel),
      ),
    ).length;
    const campaigns = new Set(leads.map((item) => item.campania?.trim()).filter(Boolean)).size;
    return [
      { label: 'Leads nuevos', value: String(leads.length), icon: 'pi pi-megaphone', tone: 'blue' },
      { label: 'Web / landing', value: String(web), icon: 'pi pi-globe', tone: 'violet' },
      { label: 'WhatsApp', value: String(whatsapp), icon: 'pi pi-whatsapp', tone: 'green' },
      { label: 'Redes sociales', value: String(social), icon: 'pi pi-share-alt', tone: 'amber' },
      { label: 'Campañas activas', value: String(campaigns), icon: 'pi pi-filter', tone: 'rose' },
    ];
  });

  protected readonly prospectOrigenFilterOptions = computed(() => [
    { label: 'Origen', value: 'TODOS' },
    ...this.uniqueProspectValues('origen').map((value) => ({ label: this.humanize(value), value })),
  ]);

  protected readonly prospectCampaniaFilterOptions = computed(() => [
    { label: 'Campaña', value: 'TODOS' },
    ...this.uniqueProspectValues('campania').map((value) => ({ label: value, value })),
  ]);

  protected readonly prospectAsesorFilterOptions = computed(() => [
    { label: 'Asesor', value: 'TODOS' },
    ...[
      ...new Set(
        this.incomingNewLeads()
          .map((item) => item.responsableId)
          .filter(Boolean),
      ),
    ]
      .sort((a, b) => this.responsibleName(a).localeCompare(this.responsibleName(b)))
      .map((value) => ({ label: this.responsibleName(value), value })),
  ]);

  protected readonly crmSellerUsers = computed(() => {
    const sellerRoles = new Set(['CRM_VENDEDOR', 'VENDEDOR', 'ASESOR', 'CRM_CALLCENTER']);
    const activeUsers = this.usuarios().filter((user) => user.activo !== false);
    const sellers = activeUsers.filter((user) =>
      user.roles?.some((role) => sellerRoles.has(String(role).toUpperCase())),
    );
    return sellers.length ? sellers : activeUsers;
  });

  protected readonly selectedProspectCount = computed(() => this.selectedProspectIds().size);

  protected readonly distributionCandidateLeads = computed(() => {
    const selected = this.selectedProspectIds();
    const source = selected.size
      ? this.filteredProspectTable().filter((item) => selected.has(item.id))
      : this.filteredProspectTable();
    return source.filter(
      (item) => item.estado === 'NUEVO' && !item.oportunidadId && !item.clienteId,
    );
  });

  protected readonly prospectDistributionPreview = computed(() => {
    const leads = this.distributionCandidateLeads();
    const sellers = this.crmSellerUsers().filter((user) =>
      this.prospectDistributionSelectedSellerIds().includes(String(user.id)),
    );
    if (!leads.length || !sellers.length) {
      return [];
    }
    const loads = new Map(
      sellers.map((user) => [
        String(user.id),
        this.incomingNewLeads().filter((item) => String(item.responsableId) === String(user.id))
          .length,
      ]),
    );
    const assigned = new Map(sellers.map((user) => [String(user.id), 0]));
    for (const lead of leads) {
      void lead;
      const next =
        [...loads.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? String(sellers[0].id);
      loads.set(next, (loads.get(next) ?? 0) + 1);
      assigned.set(next, (assigned.get(next) ?? 0) + 1);
    }
    return sellers.map((user) => ({
      id: String(user.id),
      name: user.nombres || user.username,
      current: this.incomingNewLeads().filter(
        (item) => String(item.responsableId) === String(user.id),
      ).length,
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
      .filter(
        (item) =>
          !query ||
          `${item.nombre} ${item.razonSocial ?? ''} ${item.nombreComercial ?? ''} ${item.numeroDocumento ?? ''} ${item.telefono ?? ''} ${item.correo ?? ''} ${item.interesPrincipal ?? ''} ${item.tipoInteres ?? ''} ${item.origen ?? ''} ${item.canalIngreso ?? ''} ${item.campania ?? ''} ${item.estado ?? ''}`
            .toLowerCase()
            .includes(query),
      )
      .filter((item) => estado === 'TODOS' || item.estado === estado)
      .filter((item) => origen === 'TODOS' || item.origen === origen)
      .filter((item) => campania === 'TODOS' || (item.campania || 'Sin campaña') === campania)
      .filter((item) => asesor === 'TODOS' || item.responsableId === asesor)
      .filter((item) => this.matchesProspectDateRange(item, dateFrom, dateTo))
      .sort(
        (a, b) =>
          Date.parse(b.createdAt || b.updatedAt || '') -
            Date.parse(a.createdAt || a.updatedAt || '') || b.id - a.id,
      );
  });

  protected readonly prospectPageSize = 20;

  protected readonly pagedProspectTable = computed(() => {
    const page = Math.min(this.prospectPage(), Math.max(this.prospectTotalPages() - 1, 0));
    const start = page * this.prospectPageSize;
    return this.filteredProspectTable().slice(start, start + this.prospectPageSize);
  });

  protected readonly prospectPageRows = computed(() =>
    this.pagedProspectTable().map((item, index) => ({
      prospect: item,
      avatarTone: this.prospectAvatarTone(index),
      initials: this.prospectInitials(item),
      company: this.prospectCompanyLabel(item),
      productName: this.prospectProductName(item),
      productType: this.prospectProductType(item),
      originIcon: this.prospectOriginIcon(item),
      originLabel: this.prospectOriginLabel(item),
      originTag: this.prospectOriginTag(item),
      campaign: this.prospectCampaignLabel(item),
      campaignDetail: item.mensaje || item.interesDetalle || 'Sin detalle',
      statusLabel: this.humanize(item.estado),
      statusClass: this.prospectStatusClass(item.estado),
      advisor: this.responsibleName(item.responsableId),
      registrationDate: item.createdAt || item.fechaInteres || item.updatedAt || null,
      registrationTime: item.createdAt || item.updatedAt || null,
      selected: this.isProspectSelected(item.id),
      canMoveToFollowUp: this.prospectCanMoveToFollowUp(item),
    })),
  );

  protected readonly prospectFilterState = computed<ProspectFilterState>(() => ({
    origin: this.prospectOrigenFilter(),
    campaign: this.prospectCampaniaFilter(),
    advisor: this.prospectAsesorFilter(),
    dateFrom: this.prospectDateFrom(),
    dateTo: this.prospectDateTo(),
  }));

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

  protected readonly crmLargeListPageSize = 20;

  protected readonly filteredCatalogo = computed(() => this.catalog.search(this.query()));

  protected readonly catalogStats = computed(() => this.catalog.stats());

  protected readonly quoteDashboardItems = computed(() =>
    this.quotations.search(this.query(), (quote) => this.quoteOpportunityContext(quote)),
  );

  protected readonly quoteDashboardMetrics = computed(() => {
    const items = this.quoteDashboardItems();
    // Total agregado en moneda base: cada cotizacion conserva su moneda propia.
    const amount = items.reduce(
      (sum, item) => sum + Number(item.totalMonedaBase ?? item.total ?? 0),
      0,
    );
    return [
      {
        label: 'Cotizaciones',
        value: String(items.length),
        delta: deltaLabel(items.length, 0),
        detail: 'vs mes anterior',
      },
      {
        label: 'Valor total',
        value: `${this.tenantBaseCurrencySymbol()} ${formatCompactAmount(amount)}`,
        delta: deltaLabel(amount, 0),
        detail: 'vs mes anterior',
      },
      {
        label: 'Pendientes respuesta',
        value: String(this.quotations.countPending(items)),
        delta: 'En espera',
        detail: 'por responder',
      },
      {
        label: 'Aceptadas',
        value: String(this.quotations.countAccepted(items)),
        delta: deltaLabel(this.quotations.countAccepted(items), 0),
        detail: 'vs mes anterior',
      },
    ];
  });

  protected readonly quoteStatusSummary = computed(() =>
    this.quotations.statusSummary(this.quoteDashboardItems()),
  );

  protected readonly quoteStatusRingBackground = computed(() =>
    this.quotations.statusRingBackground(this.quoteStatusSummary()),
  );

  public readonly selectedOpportunityQuotes = computed(() =>
    this.quotations.forOpportunity(this.selectedOpportunity()?.id),
  );

  public readonly selectedOpportunityCurrentQuote = computed(
    () => this.selectedOpportunityQuotes()[0] ?? null,
  );

  public readonly selectedOpportunityRequirements = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    const saved = this.opportunityRequirementRows(opportunity);
    return saved.length ? saved : [this.defaultRequirementForOpportunity(opportunity)];
  });

  public readonly selectedOpportunityNegotiations = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityNegotiationRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  public readonly selectedOpportunityFlowState = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return null;
    }
    const isSaleClosed = this.opportunityClosureRecords().some(
      (record) => record.oportunidadId === opportunity.id,
    );
    return buildOpportunityFlowViewState(this.opportunityFlowSnapshot(opportunity), isSaleClosed);
  });

  public negotiationQuoteDecision(quote: Cotizacion): {
    label: string;
    tone: 'accepted' | 'adjustment' | 'rejected' | 'waiting';
  } {
    return resolveNegotiationQuoteDecisionView(quote, this.selectedOpportunityNegotiations());
  }

  public readonly selectedOpportunityPayments = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityPaymentRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.fecha || b.createdAt) - Date.parse(a.fecha || a.createdAt));
  });

  public readonly selectedOpportunityDocuments = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.opportunityDocumentRecords()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  });

  public readonly promotionOptions = computed(() =>
    this.promocionesCotizacion()
      .filter((item) => item.estado === 'ACTIVA')
      .map((item) => ({
        label: `${item.codigo} - ${item.nombre} (${item.tipoDescuento === 'PORCENTAJE' ? `${item.valor}%` : `${this.tenantBaseCurrencySymbol()} ${Number(item.valor || 0).toFixed(2)}`})`,
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
    [...this.filteredNegotiationOpportunities()].sort(
      (a, b) => Number(b.probabilidad || 0) - Number(a.probabilidad || 0),
    ),
  );

  protected readonly negotiationDashboardMetrics = computed(() => {
    const items = this.negotiationDashboardItems();
    const amount = this.sumOpportunityAmount(items);
    const average = this.averageProbability(items);
    const estimatedClosings = items.filter((item) =>
      this.isThisMonth(item.fechaCierreEstimada),
    ).length;
    return [
      {
        label: 'En negociacion',
        value: String(items.length),
        delta: this.deltaLabel(items.length, 0),
        detail: 'vs mes anterior',
      },
      {
        label: 'Valor en juego',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(amount)}`,
        delta: this.deltaLabel(amount, 0),
        detail: 'vs mes anterior',
      },
      {
        label: 'Probabilidad promedio',
        value: `${average}%`,
        delta: this.deltaLabel(average, 0, true),
        detail: 'vs mes anterior',
      },
      {
        label: 'Cierres estimados',
        value: String(estimatedClosings),
        delta: 'Este mes',
        detail: 'estimados',
      },
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
      .filter(
        (item) =>
          outcome === 'TODOS' ||
          (outcome === 'PAGADOS' && this.clientDebt(item) <= 0) ||
          (outcome === 'CON_DEUDA' && this.clientDebt(item) > 0),
      )
      .filter((item) => this.matchesOpportunityQuery(item, query))
      .sort(
        (a, b) => Date.parse(this.clientClosureDate(b)) - Date.parse(this.clientClosureDate(a)),
      );
  });

  protected readonly clientsWonItems = computed(() => {
    const byId = new Map<number, CrmOportunidad>();
    for (const record of [...this.opportunityClosureRecords()].sort(
      (a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt),
    )) {
      const item = this.oportunidades().find(
        (opportunity) => opportunity.id === record.oportunidadId,
      );
      if (item && !byId.has(item.id)) {
        byId.set(item.id, item);
      }
    }

    for (const item of this.oportunidades()) {
      const prospectClientId = this.prospectForOpportunity(item)?.clienteId;
      const isWon = item.estado === 'GANADA' || item.etapa === 'GANADO';
      const hasLinkedClient = Boolean(item.clienteId || prospectClientId);
      if (isWon && hasLinkedClient) {
        byId.set(item.id, item);
      }
    }

    return Array.from(byId.values()).sort(
      (a, b) => Date.parse(this.clientClosureDate(b)) - Date.parse(this.clientClosureDate(a)),
    );
  });

  protected readonly pipelinePageColumns = computed(() =>
    this.pipelineBoardColumns().map((column) => ({
      label: column.label,
      value: column.value,
      total: column.total,
      color: this.pipelineStageColor(column.value),
      icon: this.pipelineStageIcon(column.value),
      averageProbability: column.items.length
        ? Math.round(
            column.items.reduce((sum, item) => sum + Number(item.probabilidad || 0), 0) /
              column.items.length,
          )
        : 0,
      items: column.items.map((item) => {
        const nextActivity = this.nextOpportunityActivity(item);
        return {
          opportunity: item,
          title: item.titulo,
          amount: Number(item.montoEstimado || 0),
          company: this.opportunityCompanyLabel(item),
          campaign: this.opportunityCampaignLabel(item),
          origin: this.opportunityOriginLabel(item),
          temperatureLabel: this.opportunityTemperatureLabel(item),
          temperatureTone: this.opportunityTemperatureTone(item),
          closingDate: item.fechaCierreEstimada || null,
          probability: Number(item.probabilidad || 0),
          ownerName: this.responsibleName(item.responsableId),
          ownerInitials: this.ownerInitials(item.responsableId),
          nextAction: nextActivity?.asunto || 'Sin próxima acción',
          nextActionDue: nextActivity
            ? this.activityRelativeLabel(nextActivity.fechaProgramada)
            : 'Programar ahora',
          nextActionTone: this.pipelineActivityTone(nextActivity),
          priorityLabel: this.pipelinePriorityLabel(item),
          priorityTone: this.pipelinePriorityTone(item),
          riskBadges: this.opportunityRiskBadges(item),
          won: item.estado === 'GANADA' || item.etapa === 'GANADO',
          lost: item.estado === 'PERDIDA' || item.etapa === 'PERDIDO',
        };
      }),
    })),
  );

  protected readonly paymentFollowUpCandidates = computed(() => {
    const byId = new Map<number, CrmOportunidad>();
    for (const item of this.clientsWonItems()) {
      byId.set(item.id, item);
    }
    for (const item of this.oportunidades()) {
      const convertedProspect = Boolean(this.prospectForOpportunity(item)?.clienteId);
      const isClientSale =
        this.isSaleClosed(item) ||
        item.estado === 'GANADA' ||
        item.etapa === 'GANADO' ||
        Boolean(item.clienteId) ||
        convertedProspect;
      if (
        isClientSale &&
        this.opportunityPaymentRecords().some((payment) => payment.oportunidadId === item.id)
      ) {
        byId.set(item.id, item);
      }
    }
    return Array.from(byId.values());
  });

  protected readonly clientsDashboardMetrics = computed(() => {
    const items = this.clientsDashboardItems();
    const amount = this.sumOpportunityAmount(items, true);
    const paid = items.reduce((sum, item) => sum + this.opportunityFinancialSummary(item).paid, 0);
    const debt = items.reduce((sum, item) => sum + this.clientDebt(item), 0);
    const documents = items.reduce((sum, item) => sum + this.clientDocumentCount(item), 0);
    return [
      {
        label: 'Clientes cerrados',
        value: String(items.length),
        delta: this.deltaLabel(items.length, 0),
        detail: 'expedientes completos',
      },
      {
        label: 'Ventas cerradas',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(amount)}`,
        delta: this.deltaLabel(amount, 0),
        detail: 'valor contratado',
      },
      {
        label: 'Monto cobrado',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(paid)}`,
        delta: this.deltaLabel(paid, 0),
        detail: 'pagos conciliados',
      },
      {
        label: 'Cuentas por cobrar',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(debt)}`,
        delta: String(documents),
        detail: 'documentos asociados',
      },
    ];
  });

  protected readonly customerPageRows = computed(() =>
    this.pagedClientsDashboardItems().map((item) => {
      const contactName = this.opportunityContactName(item);
      return {
        opportunity: item,
        initials: this.ownerInitials(contactName),
        contactName,
        purchaseLabel: `${this.quoteOfferName(item)} - Compra ${this.catalogCurrencyPrefix(item.moneda)} ${Number(item.montoReal || item.montoEstimado || 0).toFixed(2)}`,
        companyLabel: this.opportunityCompanyLabel(item),
        documentCount: this.clientDocumentCount(item),
        closureDate: this.clientClosureDate(item),
        debt: this.clientDebt(item),
      };
    }),
  );

  protected readonly clientsProductSummary = computed(() => {
    const items = this.clientsDashboardItems();
    const colors = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#14b8a6'];
    const grouped = new Map<string, { label: string; value: number; color: string }>();
    for (const item of items) {
      const catalogo = this.catalogoItems().find((catalog) => catalog.id === item.catalogoItemId);
      const label =
        catalogo?.nombre || this.opportunityTypeLabel(item.tipoOportunidad) || 'Sin producto';
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

  protected readonly opportunitySummaryCards = computed<OpportunitySummaryCard[]>(() =>
    buildOpportunitySummaryCards({
      items: this.oportunidades(),
      isActive: (item) => this.isActiveOpportunity(item),
      isThisMonth: (date) => this.isThisMonth(date),
      formatAmount: (value) => this.formatCompactAmount(value),
      deltaLabel: (current, previous, decimal) => this.deltaLabel(current, previous, decimal),
    }),
  );

  protected readonly opportunityStageFilterOptions = computed(() => [
    { label: 'Etapa: Todas', value: null },
    ...this.etapaOptions().map((item) => ({ label: item.label, value: item.value })),
  ]);

  protected readonly opportunityResponsibleFilterOptions = computed(() => {
    const responsables = Array.from(
      new Set(
        this.oportunidades()
          .map((item) => item.responsableId)
          .filter(Boolean),
      ),
    ).sort();
    return [
      { label: 'Responsable: Todos', value: null },
      ...responsables.map((value) => ({ label: this.responsibleName(value), value })),
    ];
  });

  public readonly responsableOptions = computed(() => {
    const current = this.currentUserKey();
    const users = this.usuarios().map((user) => ({
      label: this.userDisplayName(user),
      value: String(user.id),
    }));
    const hasCurrent = users.some((item) => item.value === current);
    return hasCurrent || !current
      ? users
      : [
          {
            label:
              this.auth.currentSession()?.nombres ||
              this.auth.currentSession()?.username ||
              current,
            value: current,
          },
          ...users,
        ];
  });

  protected readonly goalAdvisorOptions = computed<CrmResponsableOption[]>(() =>
    this.usuarios()
      .filter((user) => user.activo)
      .map((user) => ({
        id: String(user.id),
        username: user.username,
        nombre: [user.nombres, user.apellidos].filter(Boolean).join(' ') || user.username,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  protected readonly opportunityStatusFilterOptions = [
    { label: 'Estado: Todas', value: null },
    { label: 'Activas', value: 'ABIERTA' },
    { label: 'Ganadas', value: 'GANADA' },
    { label: 'Pérdidas', value: 'PERDIDA' },
  ];

  protected readonly clientOutcomeFilterOptions = [
    { label: 'Clientes: Todos', value: 'TODOS' },
    { label: 'Pagados', value: 'PAGADOS' },
    { label: 'Con deuda', value: 'CON_DEUDA' },
  ];

  protected readonly opportunityListView = computed(() =>
    buildOpportunityListView({
      items: this.oportunidades(),
      view: this.opportunityView(),
      query: this.query(),
      stage: this.opportunityStageFilter(),
      responsible: this.opportunityResponsibleFilter(),
      status: this.opportunityStatusFilter(),
      page: this.opportunityPage(),
      pageSize: this.crmLargeListPageSize,
      isActive: (item) => this.isActiveOpportunity(item),
      toRow: (item) => ({
        opportunity: item,
        typeLabel: this.opportunityTypeLabel(item.tipoOportunidad),
        contactName: this.opportunityContactName(item),
        companyLabel: this.opportunityCompanyLabel(item),
        stageName: this.stageName(item.etapa),
        stageBackground: this.stageSoftColor(item.etapa),
        stageColor: this.stageColor(item.etapa),
        temperatureLabel: this.opportunityTemperatureLabel(item),
        temperatureTone: this.opportunityTemperatureTone(item),
        ownerInitials: this.ownerInitials(item.responsableId),
        ownerName: this.responsibleName(item.responsableId),
        statusLabel: this.humanize(item.estado),
        statusTone: this.opportunityStatusTone(item),
      }),
    }),
  );

  protected readonly visibleOpportunities = computed(() => this.opportunityListView().visibleItems);
  protected readonly opportunityListItems = computed(
    () => this.opportunityListView().filteredItems,
  );
  protected readonly opportunityPageMeta = computed(() => this.opportunityListView().pageMeta);
  protected readonly opportunityPageRows = computed(() => this.opportunityListView().rows);

  public readonly selectedOpportunityActivities = computed(() => {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      return [];
    }
    return this.actividades()
      .filter((item) => item.oportunidadId === opportunity.id)
      .sort(
        (a, b) =>
          Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)),
      );
  });

  public readonly selectedOpportunityNextActivity = computed(
    () =>
      this.selectedOpportunityActivities()
        .filter((item) => item.estado === 'PENDIENTE')
        .sort(
          (a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''),
        )[0] ?? null,
  );

  public readonly selectedOpportunityHistory = computed<OpportunityHistoryEvent[]>(() => {
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
        tone: activity.estado === 'REALIZADA' ? ('green' as const) : ('amber' as const),
      })),
      ...this.selectedOpportunityQuotes().map((quote) => ({
        id: `quote-${quote.id}`,
        title: `Cotización ${this.quoteStatusLabel(quote)}`,
        detail: `${quoteCode(quote.id)} - ${this.catalogCurrencyPrefix(quote.moneda)} ${Number(quote.total || 0).toFixed(2)}`,
        date: quote.fechaEmision || new Date().toISOString(),
        icon: 'pi pi-file-edit',
        tone: 'violet' as const,
      })),
      ...this.selectedOpportunityNegotiations().map((record) => ({
        id: `negotiation-${record.id}`,
        title: `Negociación ${this.humanize(record.resultado)}`,
        detail: `Precio final ${this.negotiationCurrencyPrefix(record)} ${Number(record.precioFinal || 0).toFixed(2)} - ${record.formaPago || 'Sin forma de pago'}`,
        date: record.createdAt,
        icon: 'pi pi-handshake',
        tone:
          record.resultado === 'ACEPTA'
            ? ('green' as const)
            : record.resultado === 'RECHAZA'
              ? ('red' as const)
              : ('amber' as const),
      })),
      ...this.selectedOpportunityPayments().map((payment) => ({
        id: `payment-${payment.id}`,
        title: `Pago ${this.humanize(payment.estado)}`,
        detail: `${this.humanize(payment.tipo)} - ${this.catalogCurrencyPrefix(this.selectedOpportunity()?.moneda)} ${Number(payment.monto || 0).toFixed(2)}`,
        date: payment.fecha || payment.createdAt,
        icon: 'pi pi-credit-card',
        tone:
          payment.estado === 'PAGADO'
            ? ('green' as const)
            : payment.estado === 'VENCIDO'
              ? ('red' as const)
              : ('amber' as const),
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

  public readonly opportunityDetailTabs = computed(() => {
    const opportunity = this.selectedOpportunity();
    const negotiationTabs =
      opportunity && this.hasNegotiationContext(opportunity)
        ? [
            {
              tab: 'negociacion' as OpportunityDetailTab,
              label: 'Negociación',
              icon: 'pi pi-handshake',
              count: this.selectedOpportunityNegotiations().length,
            },
          ]
        : [];
    const closureTabs =
      opportunity && (opportunity.estado === 'GANADA' || opportunity.etapa === 'GANADO')
        ? [
            {
              tab: 'cierre' as OpportunityDetailTab,
              label: 'Cierre',
              icon: 'pi pi-verified',
              count: null,
            },
          ]
        : [];
    return [
      {
        tab: 'resumen' as OpportunityDetailTab,
        label: 'Resumen',
        icon: 'pi pi-table',
        count: null,
      },
      {
        tab: 'actividades' as OpportunityDetailTab,
        label: 'Actividades',
        icon: 'pi pi-comments',
        count: this.selectedOpportunityActivities().length,
      },
      {
        tab: 'cotizaciones' as OpportunityDetailTab,
        label: 'Cotizaciones',
        icon: 'pi pi-file-edit',
        count: this.selectedOpportunityQuotes().length,
      },
      ...negotiationTabs,
      ...closureTabs,
      {
        tab: 'pagos' as OpportunityDetailTab,
        label: 'Pagos',
        icon: 'pi pi-credit-card',
        count: this.selectedOpportunityPayments().length,
      },
      {
        tab: 'historial' as OpportunityDetailTab,
        label: 'Historial',
        icon: 'pi pi-history',
        count: this.selectedOpportunityHistory().length,
      },
    ];
  });

  protected readonly opportunityStagePanel = computed<CrmStagePanel | null>(() => {
    const tab = this.activeTab();
    if (!this.isOpportunityTab(tab)) {
      return null;
    }

    const all = this.oportunidades();
    const active = all.filter((item) => this.isActiveOpportunity(item));
    const quoted = all.filter(
      (item) => item.etapa === 'COTIZADO' && this.isActiveOpportunity(item),
    );
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
        tableAction: 'Nueva cotización',
        emptyMessage: 'No hay cotizaciones en seguimiento.',
        metrics: [
          {
            label: 'Cotizaciones',
            value: String(quoted.length),
            delta: this.deltaLabel(quoted.length, 0),
            detail: 'vs mes anterior',
          },
          {
            label: 'Valor total',
            value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(amount)}`,
            delta: this.deltaLabel(amount, 0),
            detail: 'vs mes anterior',
          },
          {
            label: 'Pendientes respuesta',
            value: String(quoted.length),
            delta: 'En espera',
            detail: 'por responder',
          },
          {
            label: 'Tasa avance',
            value: `${quotedToNegotiation}%`,
            delta: this.deltaLabel(quotedToNegotiation, 0, true),
            detail: 'hacia negociación',
          },
        ],
      };
    }

    if (tab === 'negociacion') {
      return {
        tab,
        index: 5,
        title: 'Negociación',
        detail: 'Precio y cierre',
        icon: 'pi pi-handshake',
        tone: 'teal',
        count: negotiation.length,
        items,
        tableTitle: 'Negociaciones activas',
        tableAction: 'Nueva negociación',
        emptyMessage: 'No hay oportunidades en negociación.',
        metrics: [
          {
            label: 'En negociación',
            value: String(negotiation.length),
            delta: this.deltaLabel(negotiation.length, 0),
            detail: 'vs mes anterior',
          },
          {
            label: 'Valor en juego',
            value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(amount)}`,
            delta: this.deltaLabel(amount, 0),
            detail: 'vs mes anterior',
          },
          {
            label: 'Interés promedio',
            value: this.opportunityTemperatureLabel(averageProbability),
            delta: this.deltaLabel(averageProbability, 0, true),
            detail: 'vs mes anterior',
          },
          {
            label: 'Cierres estimados',
            value: String(
              items.filter((item) => this.isThisMonth(item.fechaCierreEstimada)).length,
            ),
            delta: 'Este mes',
            detail: 'estimados',
          },
        ],
      };
    }

    if (tab === 'clientes') {
      const closedClients = this.clientsWonItems();
      const closedAmount = this.sumOpportunityAmount(closedClients, true);
      const closedThisMonth = closedClients.filter((item) =>
        this.isThisMonth(this.clientClosureDate(item)),
      ).length;
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
          {
            label: 'Clientes cerrados',
            value: String(closedClients.length),
            delta: this.deltaLabel(closedClients.length, 0),
            detail: 'expedientes completos',
          },
          {
            label: 'Cerrados este mes',
            value: String(closedThisMonth),
            delta: this.deltaLabel(closedThisMonth, 0),
            detail: 'vs mes anterior',
          },
          {
            label: 'Valor total clientes',
            value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(closedAmount)}`,
            delta: this.deltaLabel(closedAmount, 0),
            detail: 'ventas cerradas',
          },
          {
            label: 'Documentos',
            value: String(
              closedClients.reduce((sum, item) => sum + this.clientDocumentCount(item), 0),
            ),
            delta: '+0%',
            detail: 'expedientes',
          },
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
        {
          label: 'Oportunidades',
          value: String(active.length),
          delta: this.deltaLabel(active.length, 0),
          detail: 'vs mes anterior',
        },
        {
          label: 'Valor total',
          value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(amount)}`,
          delta: this.deltaLabel(amount, 0),
          detail: 'vs mes anterior',
        },
        {
          label: 'Interés frío',
          value: String(risk),
          delta: risk ? 'Atencion requerida' : 'Sin riesgo critico',
          detail: 'requiere impulso comercial',
          danger: risk > 0,
        },
        {
          label: 'Tasa cierre',
          value: `${closeRate}%`,
          delta: this.deltaLabel(closeRate, 0, true),
          detail: 'vs mes anterior',
        },
      ],
    };
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

  protected readonly commercialInbox = computed<CommercialInboxCard[]>(() =>
    this.followUpProspects()
      .map((prospecto) => {
        const prospectActivities = this.actividades()
          .filter((item) => item.prospectoId === prospecto.id)
          .sort(
            (a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''),
          );
        const pending = prospectActivities.filter((item) => item.estado === 'PENDIENTE');
        const done = prospectActivities
          .filter((item) => item.estado !== 'PENDIENTE')
          .sort(
            (a, b) =>
              Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)),
          );
        const nextActivity = pending[0];
        const lastActivity = done[0] ?? [...prospectActivities].reverse()[0];
        const oportunidad = this.activeOpportunityForProspect(prospecto.id);
        const displayOpportunity =
          oportunidad ??
          this.oportunidades()
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
      .sort(
        (a, b) => this.followUpPriorityOrder(a.priority) - this.followUpPriorityOrder(b.priority),
      ),
  );

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
      {
        value: 'PENDIENTES',
        label: 'Pendientes',
        count: inbox.filter((item) => Boolean(item.nextActivity)).length,
      },
      {
        value: 'VENCIDAS',
        label: 'Vencidas',
        count: inbox.filter((item) => item.priority === 'overdue').length,
      },
      {
        value: 'SIN_ACTIVIDAD',
        label: 'Sin actividad',
        count: inbox.filter((item) => !item.nextActivity && !item.lastActivity).length,
      },
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
    const origins = Array.from(
      new Set(
        this.commercialInbox()
          .map((item) => this.followUpOrigin(item))
          .filter(Boolean),
      ),
    ).sort();
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
          return (
            item.prospecto.responsableId === this.currentUserKey() ||
            item.nextActivity?.usuarioId === this.currentUserKey()
          );
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
      .filter(
        (item) =>
          contactFilter === 'TODOS' || this.matchesFollowUpContactFilter(item, contactFilter),
      )
      .filter(
        (item) =>
          responsibleFilter === 'TODOS' ||
          item.prospecto.responsableId === responsibleFilter ||
          item.nextActivity?.usuarioId === responsibleFilter,
      )
      .filter((item) => originFilter === 'TODOS' || this.followUpOrigin(item) === originFilter)
      .filter((item) => interestFilter === 'TODOS' || item.interestLabel === interestFilter)
      .filter((item) => dateFilter === 'TODOS' || this.matchesFollowUpDateFilter(item, dateFilter))
      .filter(
        (item) =>
          !query ||
          `${item.prospecto.nombre} ${item.prospecto.telefono ?? ''} ${item.prospecto.correo ?? ''} ${item.prospecto.interesPrincipal ?? ''} ${item.prospecto.estado} ${this.followUpOrigin(item)} ${item.nextActivity?.asunto ?? ''} ${item.lastActivity?.asunto ?? ''}`
            .toLowerCase()
            .includes(query),
      );
  });

  protected readonly followupFilterState = computed<FollowupFilterState>(() => ({
    contact: this.followUpContactFilter(),
    responsible: this.followUpResponsibleFilter(),
    origin: this.followUpOriginFilter(),
    interest: this.followUpInterestFilter(),
    date: this.followUpDateFilter(),
  }));

  protected readonly pagedCommercialInbox = computed(() => {
    const page = Math.min(this.followUpPage(), Math.max(this.followUpTotalPages() - 1, 0));
    const start = page * this.crmLargeListPageSize;
    return this.filteredCommercialInbox().slice(start, start + this.crmLargeListPageSize);
  });

  protected readonly followUpTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredCommercialInbox().length / this.crmLargeListPageSize)),
  );

  protected readonly followUpPageRangeLabel = computed(() => {
    const total = this.filteredCommercialInbox().length;
    if (!total) {
      return '0 de 0';
    }
    const page = Math.min(this.followUpPage(), Math.max(this.followUpTotalPages() - 1, 0));
    const start = page * this.crmLargeListPageSize + 1;
    const end = Math.min(start + this.crmLargeListPageSize - 1, total);
    return `${start}-${end} de ${total}`;
  });

  protected readonly followUpPageMeta = computed(() => ({
    page: Math.min(this.followUpPage(), Math.max(this.followUpTotalPages() - 1, 0)),
    pageSize: this.crmLargeListPageSize,
    totalItems: this.filteredCommercialInbox().length,
    totalPages: this.followUpTotalPages(),
    rangeLabel: this.followUpPageRangeLabel(),
  }));

  protected readonly followupPageRows = computed(() =>
    this.pagedCommercialInbox().map((card) => {
      const responsibleId = this.followUpResponsibleId(card);
      const origin = this.followUpOrigin(card);
      return {
        source: card,
        selected: this.isSelectedFollowUpCard(card),
        avatarTone: this.prospectAvatarTone(card.prospecto.id),
        initials: this.prospectInitials(card.prospecto),
        contact: card.prospecto.telefono || card.prospecto.correo || 'Sin teléfono ni correo',
        originLabel: this.humanize(origin),
        originTone: origin.toLowerCase(),
        offer:
          card.prospecto.interesPrincipal ||
          card.oportunidad?.titulo ||
          this.opportunityTypeLabel(card.prospecto.tipoInteres),
        contactState: this.followUpContactLabel(card),
        contactTone: this.followUpContactTone(card),
        ownerInitials: this.ownerInitials(responsibleId),
        ownerName: this.responsibleName(responsibleId),
        proofLabel: this.followUpContactProofLabel(card),
        proofTone: this.followUpContactProofTone(card),
        temperatureLabel: this.qualificationTemperatureLabel(card.qualification.temperatura),
        interestScore: this.followUpInterestScore(card),
        lastActivityTitle: this.followUpLastActivityTitle(card),
        lastActivityMeta: this.followUpLastActivityMeta(card),
        lastActivityTone: card.lastActivity
          ? this.followUpActivityTone(card.lastActivity)
          : 'neutral',
        lastActivityIcon: card.lastActivity
          ? this.followUpActivityIcon(card.lastActivity.tipoActividad)
          : 'pi pi-minus',
        nextAction: this.followUpNextAction(card),
        nextActionDate: this.followUpNextActionDate(card),
        nextActionStatus: this.followUpNextActionStatus(card),
        nextActionTone: this.followUpNextActionTone(card),
        phoneUrl: this.phoneUrl(card.prospecto),
        whatsappAvailable: Boolean(this.onlyDigits(card.prospecto.telefono)),
        emailAvailable: Boolean(card.prospecto.correo),
        emailSending: this.sendingProspectEmailIds().has(card.prospecto.id),
      };
    }),
  );

  public readonly selectedFollowUpCard = computed(() => {
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
      .sort(
        (a, b) =>
          Date.parse(this.activityEffectiveDate(b)) - Date.parse(this.activityEffectiveDate(a)),
      );
  });

  public readonly selectedFollowUpHistory = computed(() =>
    this.selectedFollowUpActivities()
      .filter((item) => item.estado !== 'PENDIENTE')
      .slice(0, 8),
  );

  public readonly selectedFollowUpUpcoming = computed(() =>
    this.selectedFollowUpActivities()
      .filter((item) => item.estado === 'PENDIENTE')
      .sort((a, b) => Date.parse(a.fechaProgramada) - Date.parse(b.fechaProgramada))
      .slice(0, 5),
  );

  public readonly prospectoOptions = computed(() =>
    this.prospectos()
      .filter((item) => item.estado !== 'DESCARTADO')
      .map((item) => ({
        label: `${item.nombre}${item.numeroDocumento ? ` - ${item.numeroDocumento}` : ''}`,
        value: item.id,
      })),
  );

  public readonly oportunidadOptions = computed(() =>
    this.oportunidades()
      .filter((item) => this.isActiveOpportunity(item))
      .map((item) => ({
        label: `${item.titulo} (${this.humanize(item.etapa)})`,
        value: item.id,
      })),
  );

  public readonly clienteOptions = computed(() =>
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

  public readonly catalogoOptions = computed(() =>
    this.catalog.activeOptions((tipoItem) => this.opportunityTypeLabel(tipoItem)),
  );

  public selectedProspectCatalogItem(): CrmCatalogoItem | null {
    return (
      this.catalogoItems().find((item) => item.id === this.prospectForm.catalogoItemId) ?? null
    );
  }

  constructor() {
    const initialTab = this.route.snapshot.data['initialTab'] as CrmTab | undefined;
    if (initialTab) {
      this.setTab(initialTab, false);
    }
    this.load();
    this.startLiveUpdates();
  }

  private startLiveUpdates(): void {
    const liveTabs: readonly CrmTab[] = [
      'dashboard',
      'captacion',
      'seguimiento',
      'embudo',
      'oportunidades',
    ];
    this.crmLiveUpdates
      .watch(30_000, () => liveTabs.includes(this.activeTab()) && !this.loading())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((snapshot) => {
        this.prospectos.set(snapshot.prospectos);
        this.reconcileProspectSelection(snapshot.prospectos);
        this.oportunidades.set(snapshot.oportunidades);
        this.actividades.set(snapshot.actividades);

        if (this.activeTab() === 'dashboard' && this.canReadCrmGoals()) {
          this.loadCrmGoalsPeriod(this.goalYear(), this.goalMonth(), false);
        }

        const selectedId = this.selectedOpportunity()?.id;
        if (selectedId) {
          const updated = snapshot.oportunidades.find(
            (item) => Number(item.id) === Number(selectedId),
          );
          if (updated) {
            this.selectedOpportunity.set(updated);
          }
        }
      });
  }

  protected load(): void {
    const legacyRecords = this.legacyOpportunityRecords();
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      prospectos: this.crmProspects
        .page({ page: 0, size: CRM_INITIAL_PAGE_SIZE })
        .pipe(map((page) => page.content)),
      oportunidades: this.crmOpportunities
        .page({ page: 0, size: CRM_INITIAL_PAGE_SIZE })
        .pipe(map((page) => page.content)),
      etapas: this.crmOpportunities
        .listStages()
        .pipe(catchError(() => of([] as CrmEtapaPipeline[]))),
      catalogo: this.api.listCrmCatalogo().pipe(catchError(() => of([] as CrmCatalogoItem[]))),
      actividades: this.crmFollowups
        .pageActivities({ page: 0, size: CRM_INITIAL_PAGE_SIZE })
        .pipe(map((page) => page.content)),
      clientes: this.api.listClientes().pipe(catchError(() => of([] as Cliente[]))),
      productos: this.api.listAllProductos().pipe(catchError(() => of([] as Producto[]))),
      sucursales: this.api.listSucursales().pipe(catchError(() => of([] as Sucursal[]))),
      usuarios: this.api.listUsuarios().pipe(catchError(() => of([] as UsuarioTenant[]))),
      cotizaciones: this.crmQuotations.list().pipe(catchError(() => of([] as Cotizacion[]))),
      promociones: this.crmQuotations
        .listPromotions()
        .pipe(catchError(() => of([] as PromocionCotizacion[]))),
      integraciones: this.api
        .listCrmIntegraciones()
        .pipe(catchError(() => of([] as CrmCanalTokenConfig[]))),
      whatsappStatus: this.api.getCrmWhatsappConnectionStatus().pipe(catchError(() => of(null))),
      monedas: this.api
        .listCrmCurrencyConfig()
        .pipe(catchError(() => of([] as CrmCurrencyConfig[]))),
      currencyOptions: this.canManageCrmConfig()
        ? this.api
            .listAvailableCrmCurrencies()
            .pipe(catchError(() => of([] as CrmCurrencyOption[])))
        : of([] as CrmCurrencyOption[]),
      assignmentConfig: this.canAssignCrmProspects()
        ? this.crmProspects.getAssignmentConfiguration().pipe(
            catchError(() =>
              of({
                automatico: false,
                estrategia: 'MENOR_CARGA',
                responsableIds: [],
              } as CrmLeadAssignmentConfig),
            ),
          )
        : of({
            automatico: false,
            estrategia: 'MENOR_CARGA',
            responsableIds: [],
          } as CrmLeadAssignmentConfig),
      dashboard: this.api.getCrmDashboard().pipe(catchError(() => of(null))),
      goals: this.canReadCrmGoals()
        ? this.api
            .listCrmGoals(this.goalYear(), this.goalMonth())
            .pipe(catchError(() => of([] as CrmGoal[])))
        : of([] as CrmGoal[]),
      resources: this.crmOpportunities.listResources(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({
          prospectos,
          oportunidades,
          etapas,
          catalogo,
          actividades,
          clientes,
          productos,
          sucursales,
          usuarios,
          cotizaciones,
          promociones,
          integraciones,
          whatsappStatus,
          monedas,
          currencyOptions,
          assignmentConfig,
          dashboard,
          goals,
          resources,
        }) => {
          this.prospectos.set(prospectos);
          this.reconcileProspectSelection(prospectos);
          this.oportunidades.set(oportunidades);
          this.applyOpportunityResources(resources);
          this.migrateLegacyOpportunityRecords(legacyRecords);
          this.stages.setStages(etapas);
          this.catalog.setItems(catalogo);
          this.actividades.set(actividades);
          this.clientes.set(clientes);
          this.productos.set(productos);
          this.sucursales.set(sucursales);
          this.usuarios.set(usuarios);
          this.quotations.setQuotes(cotizaciones);
          this.quotations.setPromotions(promociones);
          this.crmIntegraciones.set(this.withDefaultCrmIntegrations(integraciones));
          this.whatsappConnectionStatus.set(whatsappStatus);
          this.currencies.setConfigs(monedas);
          this.currencies.setOptions(currencyOptions);
          this.leadAssignmentConfig.set(assignmentConfig);
          this.dashboard.set(dashboard);
          this.crmGoals.set(goals);
          this.openQuoteRequestedFromRoute();
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openCrmGoals(): void {
    if (!this.canManageCrmGoals()) {
      return;
    }
    const now = new Date();
    this.goalYear.set(now.getFullYear());
    this.goalMonth.set(now.getMonth() + 1);
    this.goalDialogOpen.set(true);
    this.loadCrmGoalsPeriod(now.getFullYear(), now.getMonth() + 1);
  }

  protected changeCrmGoalPeriod(period: { year: number; month: number }): void {
    this.goalYear.set(period.year);
    this.goalMonth.set(period.month);
    this.loadCrmGoalsPeriod(period.year, period.month);
  }

  protected saveCrmGoal(request: SaveCrmGoalRequest): void {
    if (!this.canManageCrmGoals() || this.goalSaving()) {
      return;
    }
    this.goalSaving.set(true);
    this.errorMessage.set(null);
    this.api
      .saveCrmGoal(request)
      .pipe(finalize(() => this.goalSaving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Meta comercial guardada correctamente.');
          this.loadCrmGoalsPeriod(request.anio, request.mes);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected deleteCrmGoal(id: number): void {
    if (!this.canManageCrmGoals() || this.goalSaving()) {
      return;
    }
    if (!window.confirm('¿Eliminar esta meta comercial?')) {
      return;
    }
    this.goalSaving.set(true);
    this.errorMessage.set(null);
    this.api
      .deleteCrmGoal(id)
      .pipe(finalize(() => this.goalSaving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Meta eliminada.');
          this.loadCrmGoalsPeriod(this.goalYear(), this.goalMonth());
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private loadCrmGoalsPeriod(year: number, month: number, reportError = true): void {
    if (!this.canReadCrmGoals()) {
      this.crmGoals.set([]);
      return;
    }
    this.api.listCrmGoals(year, month).subscribe({
      next: (goals) => this.crmGoals.set(goals),
      error: (error: unknown) => {
        if (reportError) {
          this.errorMessage.set(this.resolveError(error));
        }
      },
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
      administracion: '/admin/crm/administracion/general',
      administracionGeneral: '/admin/crm/administracion/general',
      administracionCanales: '/admin/crm/administracion/canales',
      administracionCorreo: '/admin/crm/administracion/correo',
      administracionMonedas: '/admin/crm/administracion/monedas',
      administracionPromociones: '/admin/crm/administracion/promociones',
    };
    return routes[tab];
  }

  protected isCrmConfigTab(tab: CrmTab = this.activeTab()): boolean {
    return [
      'administracion',
      'administracionGeneral',
      'administracionCanales',
      'administracionCorreo',
      'administracionMonedas',
      'administracionPromociones',
    ].includes(tab);
  }

  protected isOpportunityTab(tab: CrmTab = this.activeTab()): boolean {
    return ['oportunidades', 'clientes'].includes(tab);
  }

  protected isCommercialStageTab(tab: CrmTab = this.activeTab()): boolean {
    return ['captacion', 'seguimiento', 'oportunidades', 'clientes', 'seguimientoPagos'].includes(
      tab,
    );
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
    return (
      !this.isSaleClosed(item) &&
      !['GANADA', 'PERDIDA'].includes(item.estado) &&
      !['GANADO', 'PERDIDO'].includes(item.etapa)
    );
  }

  private hasClosedSaleForProspect(prospectoId: number | null | undefined): boolean {
    if (!prospectoId) {
      return false;
    }
    return this.oportunidades().some(
      (item) => item.prospectoId === prospectoId && this.isSaleClosed(item),
    );
  }

  private hasActiveOpportunityForProspect(prospectoId: number | null | undefined): boolean {
    if (!prospectoId) {
      return false;
    }
    return this.oportunidades().some(
      (item) => item.prospectoId === prospectoId && this.isActiveOpportunity(item),
    );
  }

  /** Resuelve, para un prospecto, los datos que la regla del embudo necesita. */
  private funnelContextFor(item: CrmProspecto): ProspectFunnelContext {
    return {
      estado: item.estado,
      hasClosedSale: this.hasClosedSaleForProspect(item.id),
      hasActiveOpportunity: this.hasActiveOpportunityForProspect(item.id),
      hasActivity: this.hasProspectActivity(item.id),
      isAutomaticLead: this.isAutomaticLead(item),
    };
  }

  private activeOpportunityForProspect(
    prospectoId: number | null | undefined,
  ): CrmOportunidad | null {
    if (!prospectoId) {
      return null;
    }
    return (
      this.oportunidades()
        .filter((item) => item.prospectoId === prospectoId && this.isActiveOpportunity(item))
        .sort((a, b) => Number(b.montoEstimado || 0) - Number(a.montoEstimado || 0))[0] ?? null
    );
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

  private shouldAutoAdvanceOpportunity(
    current: string | null | undefined,
    target: string | null | undefined,
  ): boolean {
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
    const target = this.stageOptionByValue(
      this.targetStageFromActivityResult(activity.resultadoContacto),
    );
    if (
      !opportunity ||
      !target?.id ||
      !this.shouldAutoAdvanceOpportunity(opportunity.etapa, target.value)
    ) {
      return of(null as CrmOportunidad | null);
    }
    const observation = `Avance automatico por actividad ${this.humanize(activity.tipoActividad)}: ${this.humanize(activity.resultadoContacto)}`;
    return this.crmOpportunities.moveStage(opportunity.id, Number(target.id), observation).pipe(
      map((saved) => {
        this.upsertOpportunity(saved);
        return saved;
      }),
      catchError((error: unknown) => {
        this.errorMessage.set(
          `Actividad guardada, pero no se pudo actualizar el pipeline: ${this.resolveError(error)}`,
        );
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
    return [
      ...new Set(
        this.incomingNewLeads()
          .map((item) => {
            if (field === 'campania') {
              return item.campania?.trim() || 'Sin campaña';
            }
            return String(item[field] || '').trim();
          })
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b));
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
    const catalog = this.catalogoItems().find(
      (catalogo) => Number(catalogo.id) === Number(item.catalogoItemId),
    );
    return (
      item.interesPrincipal?.trim() ||
      catalog?.nombre ||
      this.opportunityTypeLabel(item.tipoInteres)
    );
  }

  protected prospectProductType(item: CrmProspecto): string {
    const catalog = this.catalogoItems().find(
      (catalogo) => Number(catalogo.id) === Number(item.catalogoItemId),
    );
    return this.opportunityTypeLabel(catalog?.tipoItem || item.tipoInteres);
  }

  protected prospectCompanyLabel(item: CrmProspecto): string {
    const personType = this.normalizeProspectPersonType(item.tipoPersona);
    if (personType === 'SIN_DEFINIR') {
      return item.razonSocial || item.nombreComercial || 'Persona o empresa por confirmar';
    }
    if (personType === 'JURIDICA') {
      return item.razonSocial || item.nombreComercial || 'Empresa sin identificar';
    }
    return 'Persona natural';
  }

  protected prospectCampaignLabel(item: CrmProspecto): string {
    return item.campania?.trim() || 'Sin campaña';
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

  protected openCreateProspect(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.prospectForm = this.emptyProspectForm();
    this.activeDialog.set('prospecto');
  }

  public openEditProspect(item: CrmProspecto): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const countryCode = item.paisCodigo || this.defaultProspectCountryCode();
    const phoneDialCode = prospectPhoneDialCodeFromValue(item.telefono, countryCode);
    const phoneCountry =
      phoneCountryForNumber(item.telefono, countryCode) ||
      phoneCountryForDialCode(phoneDialCode, countryCode);
    this.prospectForm = {
      id: item.id,
      tipoPersona: this.normalizeProspectPersonType(item.tipoPersona),
      paisCodigo: countryCode,
      tipoDocumento: item.tipoDocumento || '',
      numeroDocumento: item.numeroDocumento || '',
      nombre: item.nombre || '',
      razonSocial: item.razonSocial || '',
      nombreComercial: item.nombreComercial || '',
      telefonoPaisCodigo: phoneCountry?.code || '',
      telefonoCodigoPais: phoneDialCode,
      telefono: prospectLocalPhone(item.telefono, countryCode, phoneDialCode),
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

  public saveProspect(): void {
    if (this.saving()) {
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.prospectForm.nombre.trim()) {
      this.errorMessage.set(
        this.isCompanyProspect()
          ? 'El nombre de la persona de contacto es obligatorio.'
          : 'El nombre completo del prospecto es obligatorio.',
      );
      return;
    }
    if (this.prospectForm.tipoPersona !== 'SIN_DEFINIR') {
      if (!this.prospectForm.paisCodigo.trim()) {
        this.errorMessage.set('Selecciona el país del prospecto.');
        return;
      }
      const document = this.selectedProspectDocument();
      if (!document) {
        this.errorMessage.set(
          this.isCompanyProspect()
            ? 'Selecciona el tipo de identificación fiscal de la empresa.'
            : 'Selecciona el tipo de identificación de la persona.',
        );
        return;
      }
      this.normalizeProspectDocumentNumber();
      if (!this.prospectForm.numeroDocumento) {
        this.errorMessage.set(`Ingresa el número de ${document.label}.`);
        return;
      }
      if (!document.pattern.test(this.prospectForm.numeroDocumento)) {
        this.errorMessage.set(document.validationMessage);
        return;
      }
      if (this.isCompanyProspect() && !this.prospectForm.razonSocial.trim()) {
        this.errorMessage.set('La razón social de la empresa es obligatoria.');
        return;
      }
    }
    if (
      this.prospectForm.correo.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.prospectForm.correo.trim())
    ) {
      this.errorMessage.set('Ingresa un correo electrónico válido.');
      return;
    }
    if (
      this.prospectForm.telefono.trim() &&
      !/^[1-9]\d{0,3}$/.test(this.prospectForm.telefonoCodigoPais.trim())
    ) {
      this.errorMessage.set('Ingresa un código telefónico internacional válido.');
      return;
    }
    const telefono = prospectPhoneE164(
      this.prospectForm.telefono,
      this.prospectForm.paisCodigo,
      this.prospectForm.telefonoCodigoPais,
    );
    if (telefono && (telefono.length < 8 || telefono.length > 15)) {
      this.errorMessage.set('Ingresa un teléfono válido para el país seleccionado.');
      return;
    }
    if (
      !this.prospectForm.catalogoItemId &&
      this.catalogoItems().some((item) => item.estado === 'ACTIVO')
    ) {
      this.errorMessage.set('Selecciona la oferta o producto CRM que interesa al prospecto.');
      return;
    }

    const request = {
      tipoPersona: this.prospectForm.tipoPersona,
      paisCodigo: this.prospectForm.paisCodigo || null,
      tipoDocumento: this.prospectForm.tipoDocumento || null,
      numeroDocumento: this.prospectForm.numeroDocumento.trim() || null,
      nombre: this.prospectForm.nombre.trim(),
      razonSocial: this.isCompanyProspect() ? this.prospectForm.razonSocial.trim() || null : null,
      nombreComercial: this.isCompanyProspect()
        ? this.prospectForm.nombreComercial.trim() || null
        : null,
      telefono: telefono ? `+${telefono}` : null,
      correo: this.prospectForm.correo.trim() || null,
      direccion: this.prospectForm.direccion.trim() || null,
      origen: this.prospectForm.origen,
      canalIngreso: this.prospectForm.canalIngreso || 'MANUAL',
      campania: this.isManualProspect()
        ? 'Ingreso manual'
        : this.prospectForm.campania.trim() || null,
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
    const creatingManualProspect = !this.prospectForm.id && this.isManualProspect();
    const operation = this.prospectForm.id
      ? this.crmProspects.update(this.prospectForm.id, request)
      : this.crmProspects.create(request);
    operation
      .pipe(
        switchMap((saved) => {
          if (!creatingManualProspect) {
            return of({ saved, actividades: [] as CrmActividad[] });
          }
          return this.createInitialFollowUpActivities(saved).pipe(
            switchMap((actividades) =>
              this.crmProspects
                .update(saved.id, { estado: 'EN_ESPERA' })
                .pipe(map((updated) => ({ saved: updated, actividades }))),
            ),
          );
        }),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ saved, actividades }) => {
          this.upsertProspect(saved);
          actividades.forEach((activity) => this.upsertActivity(activity));
          this.activeDialog.set(null);
          this.successMessage.set(
            creatingManualProspect
              ? 'Prospecto manual registrado y enviado a Seguimiento con sus actividades iniciales.'
              : 'Prospecto guardado correctamente.',
          );
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
          this.crmProspects
            .update(item.id, { estado: 'EN_ESPERA' })
            .pipe(map((saved) => ({ actividades, saved }))),
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

  public isManualProspect(): boolean {
    return (this.prospectForm.canalIngreso || 'MANUAL').toUpperCase() === 'MANUAL';
  }

  public openCreateCatalogo(): void {
    if (!this.canManageCrmCatalog()) {
      this.errorMessage.set('No tienes permisos para administrar el catalogo CRM.');
      return;
    }
    this.errorMessage.set(null);
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
      moneda: item.moneda || this.tenantBaseCurrencyCode(),
      estado: item.estado || 'ACTIVO',
      metadataJson: item.metadataJson || '',
      publicEnabled: item.publicEnabled !== false,
      landingSlug: item.landingSlug || '',
      atributos: this.migrateCatalogAttributes(
        this.normalizeOpportunityType(item.tipoItem),
        this.extractCatalogAttributes(item.metadataJson),
      ),
    };
    this.catalogStep.set('form');
    this.catalogDrawerOpen.set(true);
  }

  public saveCatalogo(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.canManageCrmCatalog()) {
      this.errorMessage.set('No tienes permisos para administrar el catalogo CRM.');
      return;
    }
    const registration = this.catalogRegistrationDefinition();
    if (!this.catalogoForm.nombre.trim()) {
      this.errorMessage.set(`Completa el campo "${registration.nameLabel}".`);
      return;
    }
    this.errorMessage.set(null);
    if (this.catalogoForm.descripcion.trim().length < 10) {
      this.errorMessage.set(
        'Agrega una descripcion comercial de al menos 10 caracteres para que ventas sepa que incluye la oferta.',
      );
      return;
    }
    if (Number(this.catalogoForm.precioReferencial || 0) < 0) {
      this.errorMessage.set('El precio referencial no puede ser negativo.');
      return;
    }
    if (!this.catalogoForm.moneda) {
      this.errorMessage.set('Selecciona la moneda del precio referencial.');
      return;
    }
    const missingField = registration.fields.find(
      (field) => field.required && this.catalogAttributeIsEmpty(field.key),
    );
    if (missingField) {
      this.errorMessage.set(
        `Completa el campo "${missingField.label}" para registrar ${registration.label.toLowerCase()}.`,
      );
      return;
    }
    const invalidNumberField = registration.fields.find((field) => {
      if (field.type !== 'number' || this.catalogAttributeIsEmpty(field.key)) {
        return false;
      }
      const value = Number(this.catalogAttribute(field.key));
      return !Number.isFinite(value) || (field.min !== undefined && value < field.min);
    });
    if (invalidNumberField) {
      this.errorMessage.set(`Revisa el valor de "${invalidNumberField.label}".`);
      return;
    }
    if (this.catalogoForm.tipoItem === 'FINANCIERO') {
      const minimum = Number(this.catalogAttribute('montoMinimo') || 0);
      const maximum = Number(this.catalogAttribute('montoMaximo') || 0);
      if (minimum > 0 && maximum > 0 && minimum > maximum) {
        this.errorMessage.set('El monto minimo no puede ser mayor que el monto maximo.');
        return;
      }
    }
    this.ensureCatalogLandingSlug();
    if (
      this.catalogoForm.publicEnabled &&
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(this.catalogoForm.landingSlug)
    ) {
      this.errorMessage.set(
        'El slug de landing solo puede contener letras minusculas, numeros y guiones.',
      );
      return;
    }
    this.catalogoForm.atributos = this.cleanCatalogAttributes();
    const request = {
      tipoItem: this.catalogoForm.tipoItem,
      nombre: this.catalogoForm.nombre.trim(),
      descripcion: this.catalogoForm.descripcion.trim(),
      precioReferencial: Number(this.catalogoForm.precioReferencial || 0),
      moneda: this.catalogoForm.moneda,
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

  public onProspectCatalogChange(value: number | null): void {
    this.prospectForm.catalogoItemId = value;
    const item = this.catalogoItems().find((catalogo) => catalogo.id === value);
    if (!item) {
      return;
    }
    this.prospectForm.tipoInteres = this.normalizeOpportunityType(item.tipoItem);
    this.prospectForm.interesPrincipal = item.nombre;
    this.prospectForm.interesDetalle = item.descripcion || this.prospectForm.interesDetalle;
    this.prospectForm.presupuestoEstimado = Number(
      item.precioReferencial || this.prospectForm.presupuestoEstimado || 0,
    );
    this.prospectForm.metadataJson = this.catalogSnapshot(item);
  }

  public selectCatalogType(type: OpportunityType): void {
    this.errorMessage.set(null);
    this.catalogoForm.tipoItem = type;
    this.catalogoForm.atributos = {};
    this.catalogStep.set('form');
  }

  public backToCatalogTypeSelection(): void {
    if (this.catalogoForm.id) {
      return;
    }
    this.errorMessage.set(null);
    this.catalogStep.set('select');
  }

  public catalogFields(): CatalogField[] {
    return [...this.catalogRegistrationDefinition().fields];
  }

  public catalogFieldOptions(field: CatalogField): Array<{ label: string; value: string }> {
    return (field.options ?? []).map((option) => ({ label: option, value: option }));
  }

  public catalogRegistrationDefinition(
    type: OpportunityType = this.catalogoForm.tipoItem,
  ): CatalogRegistrationType {
    return catalogRegistrationType(type);
  }

  public catalogAttribute(key: string): string | number | null {
    return this.catalogoForm.atributos[key] ?? null;
  }

  public setCatalogAttribute(field: CatalogField, value: string | number | null): void {
    const normalized =
      field.type === 'number'
        ? value === null || value === '' || !Number.isFinite(Number(value))
          ? null
          : Number(value)
        : String(value ?? '').trim();
    this.catalogoForm.atributos = {
      ...this.catalogoForm.atributos,
      [field.key]: normalized === '' ? null : normalized,
    };
  }

  public catalogNamePlaceholder(): string {
    return this.catalogRegistrationDefinition().namePlaceholder;
  }

  public catalogDescriptionPlaceholder(): string {
    return this.catalogRegistrationDefinition().descriptionPlaceholder;
  }

  public ensureCatalogLandingSlug(): void {
    if (!this.catalogoForm.publicEnabled) {
      return;
    }
    if (!this.catalogoForm.landingSlug.trim()) {
      this.catalogoForm.landingSlug = this.toCatalogSlug(this.catalogoForm.nombre);
    } else {
      this.normalizeCatalogLandingSlug();
    }
  }

  public normalizeCatalogLandingSlug(): void {
    this.catalogoForm.landingSlug = this.toCatalogSlug(this.catalogoForm.landingSlug);
  }

  public catalogPricePreview(): string {
    const value = Number(this.catalogoForm.precioReferencial || 0);
    if (value <= 0) {
      return 'Precio por cotizar';
    }
    const symbol = this.catalogCurrencyPrefix(this.catalogoForm.moneda);
    return `${symbol} ${new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
  }

  public catalogCurrencyOptions(): { label: string; value: string }[] {
    return this.availableCurrencyOptions(this.catalogoForm.moneda);
  }

  public readonly quoteCode = quoteCode;

  public tenantBaseCurrencyCode(): string {
    return this.currencies.baseCurrencyCode();
  }

  public tenantBaseCurrencySymbol(): string {
    return this.currencies.baseCurrencySymbol();
  }

  private availableCurrencyOptions(
    retainedCurrency?: string | null,
  ): { label: string; value: string }[] {
    return this.currencies.selectableOptions(retainedCurrency);
  }

  public catalogCurrencyPrefix(moneda: string | null | undefined): string {
    const currencyCode = (moneda || this.tenantBaseCurrencyCode()).toUpperCase();
    if (currencyCode === this.tenantBaseCurrencyCode()) {
      return this.tenantBaseCurrencySymbol();
    }
    return (
      this.crmCurrencyConfigs().find((currency) => currency.moneda === currencyCode)?.simbolo ||
      ({ PEN: 'S/', USD: 'US$', EUR: '€' } as Record<string, string>)[currencyCode] ||
      currencyCode
    );
  }

  /** La negociacion hereda la moneda de su cotizacion; sin ella, la de la oportunidad. */
  private negotiationCurrencyPrefix(record: { cotizacionId?: number | null }): string {
    const quote = record.cotizacionId
      ? this.selectedOpportunityQuotes().find((item) => item.id === record.cotizacionId)
      : null;
    return this.catalogCurrencyPrefix(quote?.moneda || this.selectedOpportunity()?.moneda);
  }

  public catalogPreviewAttributes(): Array<{ label: string; value: string }> {
    return this.catalogFields()
      .map((field) => ({
        label: field.label,
        value: String(this.catalogAttribute(field.key) ?? '').trim(),
      }))
      .filter((item) => item.value)
      .slice(0, 6);
  }

  public catalogPublicationLabel(): string {
    if (!this.catalogoForm.publicEnabled) {
      return 'Solo disponible dentro del CRM';
    }
    return this.catalogoForm.estado === 'ACTIVO'
      ? 'Disponible para CRM y landing'
      : 'La landing se habilitara al activar la oferta';
  }

  protected catalogLandingUrl(item: CrmCatalogoItem): string {
    return this.catalog.landingUrl(item);
  }

  public onProspectPersonTypeChange(value: string): void {
    const type = this.normalizeProspectPersonType(value);
    const previousDocumentType = this.prospectForm.tipoDocumento;
    this.prospectForm.tipoPersona = type;
    const firstDocument = this.prospectDocumentOptions()[0]?.value || '';
    this.prospectForm.tipoDocumento = firstDocument;
    if (type === 'SIN_DEFINIR' || previousDocumentType !== firstDocument) {
      this.prospectForm.numeroDocumento = '';
    }
  }

  public onProspectDocumentTypeChange(value: string | null): void {
    const documentType = String(value || '')
      .trim()
      .toUpperCase();
    if (documentType !== this.prospectForm.tipoDocumento) {
      this.prospectForm.numeroDocumento = '';
    }
    this.prospectForm.tipoDocumento = documentType;
  }

  public onProspectCountryChange(value: string | null): void {
    const country = prospectCountry(value);
    const previousDocumentType = this.prospectForm.tipoDocumento;
    this.prospectForm.paisCodigo = country.code;
    this.prospectForm.telefonoPaisCodigo = country.code;
    this.prospectForm.telefonoCodigoPais = prospectPhoneDialCode(country.code);
    const firstDocument = this.prospectDocumentOptions()[0]?.value || '';
    this.prospectForm.tipoDocumento = firstDocument;
    if (previousDocumentType !== firstDocument) {
      this.prospectForm.numeroDocumento = '';
    }
  }

  public onProspectPhoneChange(value: string | null): void {
    const rawValue = String(value || '').trim();
    if (/^(?:\+|00)/.test(rawValue)) {
      const detectedCountry = phoneCountryForNumber(
        rawValue,
        this.prospectForm.telefonoPaisCodigo || this.prospectForm.paisCodigo,
      );
      if (detectedCountry) {
        this.prospectForm.telefonoPaisCodigo = detectedCountry.code;
        this.prospectForm.telefonoCodigoPais = detectedCountry.dialCode;
      }
    }
    this.prospectForm.telefono = prospectLocalPhone(
      rawValue,
      this.prospectForm.paisCodigo,
      this.prospectForm.telefonoCodigoPais,
    );
  }

  public onProspectPhoneCountryChange(value: string | null): void {
    const country = phoneCountryByCode(value);
    if (!country) {
      return;
    }
    this.prospectForm.telefonoPaisCodigo = country.code;
    this.prospectForm.telefonoCodigoPais = country.dialCode;
  }

  public onProspectPhoneDialCodeChange(value: string | null): void {
    const dialCode = String(value || '')
      .replace(/\D/g, '')
      .slice(0, 4);
    this.prospectForm.telefonoCodigoPais = dialCode;
    this.prospectForm.telefonoPaisCodigo =
      phoneCountryForDialCode(
        dialCode,
        this.prospectForm.telefonoPaisCodigo || this.prospectForm.paisCodigo,
      )?.code || '';
  }

  public prospectPhoneCountryName(): string {
    return (
      phoneCountryByCode(this.prospectForm.telefonoPaisCodigo)?.name ||
      'Código internacional personalizado'
    );
  }

  public prospectPhoneDialCode(): string {
    return normalizeProspectPhoneDialCode(
      this.prospectForm.telefonoCodigoPais,
      this.prospectForm.paisCodigo,
    );
  }

  public prospectPhonePreview(): string | null {
    const phone = prospectPhoneE164(
      this.prospectForm.telefono,
      this.prospectForm.paisCodigo,
      this.prospectForm.telefonoCodigoPais,
    );
    return phone ? `+${phone}` : null;
  }

  public prospectDocumentOptions(): { label: string; value: string }[] {
    return prospectDocuments(
      this.prospectForm.paisCodigo,
      this.normalizeProspectPersonType(this.prospectForm.tipoPersona),
    ).map((document) => ({ label: document.label, value: document.value }));
  }

  public selectedProspectDocument(): ProspectDocumentOption | null {
    return (
      prospectDocuments(
        this.prospectForm.paisCodigo,
        this.normalizeProspectPersonType(this.prospectForm.tipoPersona),
      ).find((document) => document.value === this.prospectForm.tipoDocumento) ?? null
    );
  }

  public prospectDocumentPlaceholder(): string {
    return (
      this.selectedProspectDocument()?.placeholder || 'Selecciona primero el tipo de documento'
    );
  }

  public prospectDocumentHelp(): string {
    return this.selectedProspectDocument()?.help || '';
  }

  public prospectDocumentInputMode(): 'numeric' | 'text' {
    return this.selectedProspectDocument()?.inputMode || 'text';
  }

  public prospectCountryName(): string {
    return prospectCountry(this.prospectForm.paisCodigo).name;
  }

  public isNaturalProspect(): boolean {
    return this.prospectForm.tipoPersona === 'NATURAL';
  }

  public isCompanyProspect(): boolean {
    return this.prospectForm.tipoPersona === 'JURIDICA';
  }

  public normalizeProspectDocumentNumber(): void {
    const document = this.selectedProspectDocument();
    const current = this.prospectForm.numeroDocumento.trim().toUpperCase();
    this.prospectForm.numeroDocumento =
      document?.inputMode === 'numeric' ? current.replace(/\D/g, '') : current.replace(/\s+/g, '');
  }

  protected catalogLandingAbsoluteUrl(item: CrmCatalogoItem): string {
    return this.catalog.landingAbsoluteUrl(this.catalog.landingUrl(item));
  }

  protected catalogIsPublic(item: CrmCatalogoItem): boolean {
    return this.catalog.isPublic(item);
  }

  protected catalogTokenMask(item: CrmCatalogoItem): string {
    return this.catalog.tokenMask(item);
  }

  protected catalogConversionRate(item: CrmCatalogoItem): number {
    return this.catalog.conversionRate(item);
  }

  protected catalogAttributeBadges(item: CrmCatalogoItem): string[] {
    const attributes = this.extractCatalogAttributes(item.metadataJson);
    const fields = this.catalogRegistrationDefinition(
      this.normalizeOpportunityType(item.tipoItem),
    ).fields;
    const labelByKey = new Map(fields.map((field) => [field.key, field.label]));
    return Object.entries(attributes)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .slice(0, 3)
      .map(([key, value]) => `${labelByKey.get(key) || this.humanize(key)}: ${value}`);
  }

  protected copyCatalogLandingUrl(item: CrmCatalogoItem): void {
    if (!this.catalogIsPublic(item)) {
      this.errorMessage.set('Activa la oferta y su acceso publico antes de copiar el enlace.');
      return;
    }
    this.copyWhatsappValue(this.catalogLandingAbsoluteUrl(item), 'Enlace de landing');
  }

  protected openCatalogLandingPreview(item: CrmCatalogoItem): void {
    if (!this.catalogIsPublic(item)) {
      this.errorMessage.set('Esta oferta no esta disponible publicamente.');
      return;
    }
    window.open(this.catalogLandingAbsoluteUrl(item), '_blank', 'noopener,noreferrer');
  }

  public onOpportunityCatalogChange(value: number | null): void {
    const previous = this.catalogoItems().find(
      (catalogo) => catalogo.id === this.opportunityForm.catalogoItemId,
    );
    this.opportunityForm.catalogoItemId = value;
    const item = this.catalogoItems().find((catalogo) => catalogo.id === value);
    if (!item) {
      return;
    }
    this.opportunityForm.tipoOportunidad = this.normalizeOpportunityType(item.tipoItem);
    // Titulo y detalles solo se regeneran si el usuario no los personalizo
    // (siguen siendo los autogenerados de la oferta anterior).
    const titulo = this.opportunityForm.titulo.trim();
    if (!titulo || (previous && titulo === this.catalogAutoTitle(previous))) {
      this.opportunityForm.titulo = this.catalogAutoTitle(item);
    }
    const detallePrincipal = this.opportunityForm.detallePrincipal.trim();
    if (!detallePrincipal || (previous && detallePrincipal === previous.nombre)) {
      this.opportunityForm.detallePrincipal = item.nombre;
    }
    const detalleSecundario = this.opportunityForm.detalleSecundario.trim();
    if (
      !detalleSecundario ||
      (previous && detalleSecundario === (previous.descripcion || '').trim())
    ) {
      this.opportunityForm.detalleSecundario = item.descripcion || '';
    }
    // Sin conversiones: al elegir una oferta, el monto toma su precio original
    // en su moneda; el usuario puede ajustarlo despues.
    this.opportunityForm.montoEstimado = Number(
      item.precioReferencial || this.opportunityForm.montoEstimado || 0,
    );
  }

  private catalogAutoTitle(item: CrmCatalogoItem): string {
    return `${this.opportunityTypeLabel(item.tipoItem)} - ${item.nombre}`;
  }

  protected openCreateOpportunity(prospecto?: CrmProspecto): void {
    const activeOpportunity = prospecto ? this.activeOpportunityForProspect(prospecto.id) : null;
    if (activeOpportunity) {
      this.openExistingOpportunity(
        activeOpportunity,
        'El prospecto ya tiene una oportunidad activa.',
      );
      return;
    }
    this.opportunityForm = this.emptyOpportunityForm();
    if (prospecto) {
      this.applyProspectToOpportunityForm(prospecto, true);
    }
    this.activeDialog.set('oportunidad');
  }

  protected openExistingOpportunity(
    item: CrmOportunidad,
    message = 'Oportunidad activa localizada.',
  ): void {
    this.activeDialog.set(null);
    this.selectedFollowUpProspectId.set(null);
    this.query.set(item.titulo || item.prospectoNombre || '');
    this.setTab(this.tabForOpportunity(item));
    this.successMessage.set(message);
  }

  public onOpportunityProspectChange(value: number | null): void {
    this.opportunityForm.prospectoId = value;
    if (value) {
      this.opportunityForm.clienteId = null;
      const prospecto = this.prospectos().find((item) => item.id === value);
      if (prospecto) {
        this.applyProspectToOpportunityForm(prospecto);
      }
    }
  }

  public onOpportunityClientChange(value: number | null): void {
    this.opportunityForm.clienteId = value;
    if (value) {
      this.opportunityForm.prospectoId = null;
    }
  }

  public opportunityTargetLabel(): string {
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
    return (
      this.catalogoItems().find((item) => item.id === this.opportunityForm.catalogoItemId) ?? null
    );
  }

  public opportunityFormCurrency(): string | null {
    return this.selectedOpportunityCatalogItem()?.moneda ?? null;
  }

  public opportunityPersonName(): string {
    const prospecto = this.selectedOpportunityProspect();
    if (prospecto) {
      return prospecto.nombre || prospecto.razonSocial || 'Prospecto sin nombre';
    }
    const cliente = this.selectedOpportunityClient();
    return cliente?.nombre || 'Cliente no seleccionado';
  }

  public opportunityPersonDetail(): string {
    const prospecto = this.selectedOpportunityProspect();
    if (prospecto) {
      return [
        prospecto.numeroDocumento || 'Sin documento',
        prospecto.telefono || 'Sin telefono',
        prospecto.correo || 'Sin correo',
      ]
        .filter(Boolean)
        .join(' · ');
    }
    const cliente = this.selectedOpportunityClient();
    return cliente
      ? `${cliente.tipoDocumento || 'Doc.'} ${cliente.numeroDocumento || ''}`.trim()
      : 'Selecciona un prospecto o cliente.';
  }

  public opportunityInterestLabel(): string {
    const catalogo = this.selectedOpportunityCatalogItem();
    if (catalogo) {
      return catalogo.nombre;
    }
    const prospecto = this.selectedOpportunityProspect();
    return (
      prospecto?.interesPrincipal || this.opportunityForm.detallePrincipal || 'Oferta sin definir'
    );
  }

  public opportunityInterestDetail(): string {
    const catalogo = this.selectedOpportunityCatalogItem();
    const prospecto = this.selectedOpportunityProspect();
    return (
      catalogo?.descripcion ||
      prospecto?.interesDetalle ||
      this.opportunityForm.detalleSecundario ||
      'Sin detalle registrado.'
    );
  }

  protected updateCrmCloseDays(value: number | string): void {
    const days = Math.min(365, Math.max(1, Number(value || 15)));
    this.crmLocalConfig.set({ ...this.crmLocalConfig(), cierreEstimadoDias: days });
  }

  protected saveCrmLocalConfig(): void {
    this.persistCrmLocalConfig(this.crmLocalConfig());
    this.successMessage.set(
      `Configuracion CRM guardada: cierre automatico en ${this.crmLocalConfig().cierreEstimadoDias} dias.`,
    );
  }

  protected crmIntegrationIcon(canal: string): string {
    return (
      {
        WEB: 'pi pi-globe',
        WHATSAPP: 'pi pi-whatsapp',
        INSTAGRAM: 'pi pi-instagram',
        FACEBOOK: 'pi pi-facebook',
      }[canal] ?? 'pi pi-link'
    );
  }

  protected crmIntegrationDescription(canal: string): string {
    return (
      {
        WEB: 'Recepcion de leads desde formularios web y UTM.',
        WHATSAPP: 'Credenciales de WhatsApp Business para mensajes y webhooks.',
        INSTAGRAM: 'Conexion para leads y mensajes captados desde Instagram.',
        FACEBOOK: 'Configuracion para Facebook Lead Ads y formularios.',
      }[canal] ?? 'Canal externo conectado al CRM.'
    );
  }

  protected whatsappWebhookUrl(): string {
    const tenant = this.auth.currentSession()?.tenantId || 'TU_TENANT';
    const configuredUrl = this.apiUrl.url(
      'saasCore',
      `/v1/public/crm/whatsapp/${encodeURIComponent(tenant)}/webhook`,
    );
    return new URL(configuredUrl, window.location.origin).toString();
  }

  protected whatsappWebhookIsPublicHttps(): boolean {
    try {
      const url = new URL(this.whatsappWebhookUrl());
      return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch {
      return false;
    }
  }

  protected copyWhatsappValue(value: string | null | undefined, label: string): void {
    if (!value) {
      this.errorMessage.set(`No hay ${label.toLowerCase()} disponible para copiar.`);
      return;
    }
    void navigator.clipboard.writeText(value).then(
      () => this.successMessage.set(`${label} copiado.`),
      () => this.errorMessage.set(`No se pudo copiar ${label.toLowerCase()}.`),
    );
  }

  protected generateWhatsappVerifyToken(integration: CrmCanalTokenConfig): void {
    if (!this.canManageCrmConfig() || this.whatsappTokenGenerating()) {
      return;
    }
    if (
      integration.verifyTokenConfigured &&
      !window.confirm(
        'Se reemplazara el verify token actual. Meta dejara de validar el webhook hasta que copies el nuevo token alli. ¿Deseas continuar?',
      )
    ) {
      return;
    }
    this.errorMessage.set(null);
    this.whatsappTokenGenerating.set(true);
    this.api
      .generateCrmWhatsappVerifyToken()
      .pipe(finalize(() => this.whatsappTokenGenerating.set(false)))
      .subscribe({
        next: (result) => {
          this.whatsappGeneratedVerifyToken.set(result.verifyToken);
          this.crmIntegraciones.update((items) =>
            items.map((item) =>
              item.canal === 'WHATSAPP'
                ? { ...item, verifyTokenConfigured: true, webhookVerifiedAt: null }
                : item,
            ),
          );
          this.whatsappConnectionStatus.update((status) =>
            status
              ? { ...status, webhookVerificado: false, conectado: false, webhookVerifiedAt: null }
              : status,
          );
          this.successMessage.set('Verify token generado y guardado. Copialo ahora en Meta.');
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveWhatsappEndpointError(error)),
      });
  }

  protected testWhatsappConnection(): void {
    if (!this.canManageCrmConfig() || this.whatsappTesting()) {
      return;
    }
    this.errorMessage.set(null);
    this.whatsappTesting.set(true);
    this.api
      .testCrmWhatsappConnection()
      .pipe(finalize(() => this.whatsappTesting.set(false)))
      .subscribe({
        next: (status) => {
          this.whatsappConnectionStatus.set(status);
          if (status.conectado) {
            this.successMessage.set(status.message || 'WhatsApp esta conectado correctamente.');
          } else {
            this.errorMessage.set(
              status.message || 'La configuracion de WhatsApp aun no esta completa.',
            );
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveWhatsappEndpointError(error)),
      });
  }

  protected metaWebhookUrl(canal: string): string {
    const tenant = this.auth.currentSession()?.tenantId || 'TU_TENANT';
    const channel = canal.toLowerCase();
    const configuredUrl = this.apiUrl.url(
      'saasCore',
      `/v1/public/crm/meta/${encodeURIComponent(tenant)}/${encodeURIComponent(channel)}/webhook`,
    );
    return new URL(configuredUrl, window.location.origin).toString();
  }

  protected metaWebhookIsPublicHttps(canal: string): boolean {
    try {
      const url = new URL(this.metaWebhookUrl(canal));
      return url.protocol === 'https:' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    } catch {
      return false;
    }
  }

  protected metaIntegrationReady(integration: CrmCanalTokenConfig): boolean {
    return Boolean(
      (integration.accessToken?.trim() || integration.accessTokenConfigured) &&
      integration.appId?.trim() &&
      (integration.appSecret?.trim() || integration.appSecretConfigured) &&
      (integration.verifyToken?.trim() || integration.verifyTokenConfigured) &&
      this.metaWebhookIsPublicHttps(integration.canal),
    );
  }

  protected metaAccountIdLabel(canal: string): string {
    return canal === 'INSTAGRAM' ? 'Instagram account ID' : 'Facebook Page ID';
  }

  protected subscribeWhatsappApp(): void {
    if (!this.canManageCrmConfig() || this.whatsappSubscribing()) {
      return;
    }
    this.errorMessage.set(null);
    this.whatsappSubscribing.set(true);
    this.api
      .subscribeCrmWhatsappApp()
      .pipe(finalize(() => this.whatsappSubscribing.set(false)))
      .subscribe({
        next: (status) => {
          this.whatsappConnectionStatus.set(status);
          this.crmIntegraciones.update((items) =>
            items.map((item) =>
              item.canal === 'WHATSAPP'
                ? {
                    ...item,
                    wabaSubscribed: status.wabaSuscrita,
                    lastConnectionOk: status.accesoMetaValido,
                  }
                : item,
            ),
          );
          this.successMessage.set(
            status.wabaSuscrita
              ? 'La aplicacion quedo suscrita al WABA. Configura ahora el webhook de Meta.'
              : status.message || 'Meta no confirmo la suscripcion al WABA.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveWhatsappEndpointError(error)),
      });
  }

  private openQuoteRequestedFromRoute(): void {
    if (this.quoteRouteHandled) {
      return;
    }
    this.quoteRouteHandled = true;
    const prospectId = Number(this.route.snapshot.queryParamMap.get('prospectoId') || 0);
    if (!prospectId) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { prospectoId: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const opportunity = this.activeOpportunityForProspect(prospectId);
    if (!opportunity) {
      this.errorMessage.set(
        'El prospecto todavía no tiene una oportunidad activa. Crea la oportunidad antes de generar la cotización.',
      );
      return;
    }
    this.openQuoteDialog(opportunity);
  }

  protected updateCrmIntegrationField(
    canal: string,
    field: CrmIntegrationField,
    value: string,
  ): void {
    this.crmIntegraciones.update((items) =>
      items.map((item) => (item.canal === canal ? { ...item, [field]: value } : item)),
    );
  }

  protected toggleCrmIntegration(canal: string, activo: boolean): void {
    this.crmIntegraciones.update((items) =>
      items.map((item) => (item.canal === canal ? { ...item, activo } : item)),
    );
  }

  protected saveCrmIntegration(integration: CrmCanalTokenConfig): void {
    if (!this.canManageCrmConfig()) {
      this.errorMessage.set('No tienes permisos para administrar integraciones CRM.');
      return;
    }
    const isWeb = integration.canal === 'WEB';
    const isWhatsapp = integration.canal === 'WHATSAPP';
    const isMetaWebhook = integration.canal === 'FACEBOOK' || integration.canal === 'INSTAGRAM';
    if (isMetaWebhook && integration.activo && !this.metaIntegrationReady(integration)) {
      this.errorMessage.set(
        'Completa token de acceso, App ID, App secret y Verify token. El callback tambien debe ser HTTPS publico.',
      );
      return;
    }
    const request: UpdateCrmCanalTokenConfigRequest = {
      canal: integration.canal,
      nombre: integration.nombre?.trim() || integration.canal,
      accessToken: isWeb ? null : integration.accessToken?.trim() || null,
      verifyToken: isWeb ? null : integration.verifyToken?.trim() || null,
      webhookUrl: isMetaWebhook
        ? this.metaWebhookUrl(integration.canal)
        : isWeb || isWhatsapp
          ? null
          : integration.webhookUrl?.trim() || null,
      appId: isWeb ? null : integration.appId?.trim() || null,
      appSecret: isWeb ? null : integration.appSecret?.trim() || null,
      phoneNumberId: isWeb ? null : integration.phoneNumberId?.trim() || null,
      wabaId: isWhatsapp ? integration.wabaId?.trim() || null : null,
      activo: integration.activo,
      metadataJson: isWhatsapp ? null : integration.metadataJson?.trim() || null,
    };
    this.integrationSaving.set(integration.canal);
    this.api
      .saveCrmIntegracion(request)
      .pipe(finalize(() => this.integrationSaving.set(null)))
      .subscribe({
        next: (saved) => {
          this.crmIntegraciones.update((items) =>
            items.map((item) => (item.canal === saved.canal ? saved : item)),
          );
          if (saved.canal === 'WHATSAPP') {
            this.api
              .getCrmWhatsappConnectionStatus()
              .pipe(catchError(() => of(null)))
              .subscribe((status) => {
                this.whatsappConnectionStatus.set(status);
              });
          }
          this.crmInboxChannels.updateChannel(saved.canal, saved.activo, saved.nombre);
          this.successMessage.set(`Integracion ${saved.nombre} guardada.`);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected updateCrmCurrencyField(
    moneda: string,
    field: CrmCurrencyField,
    value: string | number,
  ): void {
    this.currencies.updateField(moneda, field, value);
  }

  protected toggleCrmCurrency(moneda: string, activo: boolean): void {
    this.currencies.toggle(moneda, activo);
  }

  protected addCrmCurrency(moneda: string): void {
    this.currencies.add(moneda);
  }

  protected saveCrmCurrency(currency: CrmCurrencyConfig): void {
    this.currencies.save(currency, this.canManageCrmConfig());
  }

  protected calculateCurrencySaleRate(base: number, margin: number): number {
    return this.currencies.saleRate(base, margin);
  }

  public opportunityTypeMeta(type = this.opportunityForm.tipoOportunidad) {
    return (
      this.opportunityTypeOptions.find((item) => item.value === type) ??
      this.opportunityTypeOptions[0]
    );
  }

  public openEditOpportunity(item: CrmOportunidad): void {
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
      proximaAccion: '',
      fechaProximaAccion: '',
    };
    this.activeDialog.set('oportunidad');
  }

  public opportunityContactEditLabel(item: CrmOportunidad): string {
    return this.clientForOpportunity(item) ? 'Datos cliente' : 'Datos prospecto';
  }

  public openOpportunityContactEditor(item: CrmOportunidad): void {
    const client = this.clientForOpportunity(item);
    const prospect = this.prospectForOpportunity(item);
    this.selectedOpportunity.set(item);
    this.clientCompletionOpportunityId.set(item.id);
    this.clientCompletionAction.set('EDIT');
    this.errorMessage.set(null);

    if (client) {
      this.clientCompletionEditTarget.set('CLIENT');
      const tipoPersona =
        client.tipoDocumento === '6' ||
        client.tipoDocumento === 'RFC' ||
        client.tipoDocumento === 'NIT' ||
        client.tipoDocumento === 'RUT' ||
        client.tipoDocumento === 'EIN'
          ? 'JURIDICA'
          : 'NATURAL';
      this.clientCompletionForm = {
        paisCodigo: prospect?.paisCodigo || 'PE',
        tipoPersona,
        tipoDocumento: client.tipoDocumento || (tipoPersona === 'JURIDICA' ? '6' : '1'),
        numeroDocumento: client.numeroDocumento || '',
        nombre: tipoPersona === 'JURIDICA' ? '' : client.nombre || '',
        razonSocial: tipoPersona === 'JURIDICA' ? client.nombre || '' : '',
        nombreComercial: '',
        telefono: client.telefono || '',
        correo: client.email || '',
        direccion: client.direccion || '',
      };
      this.clientCompletionDialogOpen.set(true);
      return;
    }

    if (prospect) {
      this.clientCompletionEditTarget.set('PROSPECT');
      const tipoPersona = this.normalizeProspectPersonType(prospect.tipoPersona);
      this.clientCompletionForm = {
        paisCodigo: prospect.paisCodigo || 'PE',
        tipoPersona,
        tipoDocumento:
          prospect.tipoDocumento ||
          (tipoPersona === 'JURIDICA' ? '6' : tipoPersona === 'NATURAL' ? '1' : ''),
        numeroDocumento: prospect.numeroDocumento || '',
        nombre: prospect.nombre || '',
        razonSocial: prospect.razonSocial || '',
        nombreComercial: prospect.nombreComercial || '',
        telefono: prospect.telefono || '',
        correo: prospect.correo || '',
        direccion: prospect.direccion || '',
      };
      this.clientCompletionDialogOpen.set(true);
      return;
    }

    this.errorMessage.set('La oportunidad no tiene prospecto o cliente asociado para editar.');
  }

  public saveOpportunity(): void {
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
    if (Number(this.opportunityForm.montoEstimado || 0) <= 0) {
      this.errorMessage.set('El monto estimado debe ser mayor que cero.');
      return;
    }
    if (!this.opportunityForm.fechaCierreEstimada) {
      this.errorMessage.set('Define la fecha estimada de cierre.');
      return;
    }
    if (!this.opportunityForm.responsableId.trim()) {
      this.errorMessage.set('Asigna un responsable a la oportunidad.');
      return;
    }
    if (!this.opportunityForm.id && !this.opportunityForm.proximaAccion.trim()) {
      this.errorMessage.set('Define la siguiente accion comercial.');
      return;
    }
    if (!this.opportunityForm.id && !this.opportunityForm.fechaProximaAccion) {
      this.errorMessage.set('Define cuando se realizara la siguiente accion.');
      return;
    }
    if (
      !this.opportunityForm.id &&
      Date.parse(this.opportunityForm.fechaProximaAccion) <= Date.now()
    ) {
      this.errorMessage.set('La siguiente accion debe programarse para una fecha futura.');
      return;
    }
    const request = {
      prospectoId: this.opportunityForm.prospectoId,
      clienteId: this.opportunityForm.prospectoId ? null : this.opportunityForm.clienteId,
      tipoOportunidad: this.opportunityForm.tipoOportunidad,
      catalogoItemId: Number(this.opportunityForm.catalogoItemId),
      titulo: this.opportunityForm.titulo.trim(),
      descripcion: this.buildOpportunityDescription(),
      montoEstimado: Number(this.opportunityForm.montoEstimado || 0),
      probabilidad: Number(this.opportunityForm.probabilidad || 0),
      etapa: this.opportunityForm.etapa,
      fechaCierreEstimada: this.opportunityForm.fechaCierreEstimada,
      responsableId: this.opportunityForm.responsableId.trim(),
    };

    this.saving.set(true);
    const operation = this.opportunityForm.id
      ? this.crmOpportunities.update(this.opportunityForm.id, request)
      : this.crmOpportunities.create({
          ...request,
          proximaAccion: this.opportunityForm.proximaAccion.trim(),
          fechaProximaAccion: new Date(this.opportunityForm.fechaProximaAccion).toISOString(),
        });
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.upsertOpportunity(saved);
        this.activeDialog.set(null);
        this.successMessage.set('Oportunidad guardada correctamente.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  private requireClientCompletion(
    item: CrmOportunidad,
    action: CrmClientCompletionAction,
  ): boolean {
    const prospect = this.prospectForOpportunity(item);
    const client = this.clientForOpportunity(item);
    if (
      (client && this.hasCompleteClientRecord(client)) ||
      (!client && prospect && this.hasCompleteClientIdentity(prospect))
    ) {
      return false;
    }
    if (!prospect && !client) {
      this.errorMessage.set(
        'La oportunidad no tiene un prospecto o cliente vinculado para completar la cotizacion.',
      );
      return true;
    }

    const tipoPersona = client
      ? client.tipoDocumento === '6' ||
        client.tipoDocumento === 'RFC' ||
        client.tipoDocumento === 'NIT' ||
        client.tipoDocumento === 'RUT' ||
        client.tipoDocumento === 'EIN'
        ? 'JURIDICA'
        : 'NATURAL'
      : this.normalizeProspectPersonType(prospect?.tipoPersona);
    this.selectedOpportunity.set(item);
    this.clientCompletionOpportunityId.set(item.id);
    this.clientCompletionAction.set(action);
    this.clientCompletionEditTarget.set(client ? 'CLIENT' : 'PROSPECT');
    this.clientCompletionForm = {
      paisCodigo: prospect?.paisCodigo || 'PE',
      tipoPersona,
      tipoDocumento:
        client?.tipoDocumento ||
        prospect?.tipoDocumento ||
        (tipoPersona === 'JURIDICA' ? '6' : tipoPersona === 'NATURAL' ? '1' : ''),
      numeroDocumento: client?.numeroDocumento || prospect?.numeroDocumento || '',
      nombre: client?.nombre || prospect?.nombre || '',
      razonSocial:
        tipoPersona === 'JURIDICA'
          ? client?.nombre || prospect?.razonSocial || prospect?.nombre || ''
          : '',
      nombreComercial: prospect?.nombreComercial || '',
      telefono: client?.telefono || prospect?.telefono || '',
      correo: client?.email || prospect?.correo || '',
      direccion: client?.direccion || prospect?.direccion || '',
    };
    this.errorMessage.set(null);
    this.clientCompletionDialogOpen.set(true);
    return true;
  }

  private withDefaultCrmIntegrations(integrations: CrmCanalTokenConfig[]): CrmCanalTokenConfig[] {
    const configuredByChannel = new Map(
      integrations.map((integration) => [integration.canal, integration]),
    );
    const standardChannels = DEFAULT_CRM_INTEGRATIONS.map((fallback) => ({
      ...fallback,
      ...configuredByChannel.get(fallback.canal),
    }));
    const customChannels = integrations.filter(
      (integration) =>
        !DEFAULT_CRM_INTEGRATIONS.some((fallback) => fallback.canal === integration.canal),
    );
    return [...standardChannels, ...customChannels];
  }

  protected closeClientCompletion(): void {
    this.clientCompletionDialogOpen.set(false);
    this.clientCompletionOpportunityId.set(null);
    this.clientCompletionEditTarget.set('PROSPECT');
    this.clientCompletionQuote.set(null);
  }

  protected clientCompletionProspectName(): string {
    const opportunity = this.selectedOpportunity();
    const client = opportunity ? this.clientForOpportunity(opportunity) : null;
    if (client) {
      return client.nombre || opportunity?.clienteNombre || 'Cliente';
    }
    const prospect = opportunity ? this.prospectForOpportunity(opportunity) : null;
    return prospect?.razonSocial || prospect?.nombre || opportunity?.prospectoNombre || 'Prospecto';
  }

  protected saveClientCompletion(): void {
    const opportunityId = this.clientCompletionOpportunityId();
    const opportunity =
      this.oportunidades().find((item) => item.id === opportunityId) || this.selectedOpportunity();
    const prospect = opportunity ? this.prospectForOpportunity(opportunity) : null;
    const client = opportunity ? this.clientForOpportunity(opportunity) : null;
    if (!opportunity || (!prospect && !client)) {
      this.errorMessage.set('No se encontro el contacto asociado a la oportunidad.');
      return;
    }

    const form = this.clientCompletionForm;
    if (form.tipoPersona === 'SIN_DEFINIR') {
      this.errorMessage.set(
        'Indica si el cliente es una persona natural o una empresa para continuar.',
      );
      return;
    }

    const countryCode = form.paisCodigo || prospect?.paisCodigo || 'PE';
    const personType: ProspectPersonType = form.tipoPersona === 'JURIDICA' ? 'JURIDICA' : 'NATURAL';
    const availableDocs = prospectDocuments(countryCode, personType);
    const selectedDoc = availableDocs.find((d) => d.value === form.tipoDocumento);

    if (!form.tipoDocumento?.trim()) {
      this.errorMessage.set('Selecciona el tipo de documento para continuar.');
      return;
    }

    let documentNumber = form.numeroDocumento.trim();
    if (selectedDoc?.inputMode === 'numeric') {
      documentNumber = documentNumber.replace(/\D/g, '');
    } else {
      documentNumber = documentNumber.replace(/\s+/g, '').toUpperCase();
    }

    if (!documentNumber) {
      this.errorMessage.set(`Ingresa el número de ${selectedDoc?.label || 'documento'}.`);
      return;
    }

    if (selectedDoc && !selectedDoc.pattern.test(documentNumber)) {
      this.errorMessage.set(selectedDoc.validationMessage);
      return;
    } else if (!selectedDoc && (documentNumber.length < 3 || documentNumber.length > 30)) {
      this.errorMessage.set('Ingresa un número de documento válido (entre 3 y 30 caracteres).');
      return;
    }

    if (form.tipoPersona === 'JURIDICA' ? !form.razonSocial.trim() : !form.nombre.trim()) {
      this.errorMessage.set(
        form.tipoPersona === 'JURIDICA'
          ? 'La razon social es obligatoria.'
          : 'El nombre completo es obligatorio.',
      );
      return;
    }
    if (!form.telefono.trim() && !form.correo.trim()) {
      this.errorMessage.set('Registra al menos un medio de contacto: telefono o correo.');
      return;
    }
    if (form.correo.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim())) {
      this.errorMessage.set('Ingresa un correo electronico valido.');
      return;
    }

    const continuation = this.clientCompletionAction();
    this.saving.set(true);
    if (this.clientCompletionEditTarget() === 'CLIENT' && client) {
      this.api
        .updateCliente(client.id, {
          tipoDocumento: form.tipoDocumento,
          numeroDocumento: documentNumber,
          nombre: (form.tipoPersona === 'JURIDICA' ? form.razonSocial : form.nombre).trim(),
          email: form.correo.trim() || null,
          direccion: form.direccion.trim() || null,
          ubigeo: client.ubigeo || null,
          telefono: form.telefono.trim() || null,
          limiteCredito: Number(client.limiteCredito || 0),
          diasCredito: Number(client.diasCredito || 0),
          activo: client.activo,
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: (saved) => {
            this.clientes.set([saved, ...this.clientes().filter((item) => item.id !== saved.id)]);
            this.clientCompletionDialogOpen.set(false);
            this.clientCompletionOpportunityId.set(null);
            this.clientCompletionEditTarget.set('PROSPECT');
            this.continueAfterClientCompletion(continuation, opportunity);
          },
          error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
        });
      return;
    }

    if (!prospect) {
      this.saving.set(false);
      this.errorMessage.set('No se encontro el prospecto asociado a la oportunidad.');
      return;
    }

    this.crmProspects
      .update(prospect.id, {
        paisCodigo: countryCode,
        tipoPersona: form.tipoPersona,
        tipoDocumento: form.tipoDocumento,
        numeroDocumento: documentNumber,
        nombre:
          form.tipoPersona === 'JURIDICA'
            ? form.nombre.trim() || form.razonSocial.trim()
            : form.nombre.trim(),
        razonSocial: form.tipoPersona === 'JURIDICA' ? form.razonSocial.trim() : null,
        nombreComercial:
          form.tipoPersona === 'JURIDICA' ? form.nombreComercial.trim() || null : null,
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        direccion: form.direccion.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (saved) => {
          this.upsertProspect(saved);
          this.clientCompletionDialogOpen.set(false);
          this.clientCompletionOpportunityId.set(null);
          this.clientCompletionEditTarget.set('PROSPECT');
          const currentOpportunity =
            this.oportunidades().find((item) => item.id === opportunity.id) || opportunity;
          this.continueAfterClientCompletion(continuation, currentOpportunity);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private hasCompleteClientIdentity(prospect: CrmProspecto): boolean {
    if (!['NATURAL', 'JURIDICA'].includes(prospect.tipoPersona)) {
      return false;
    }
    const countryCode = prospect.paisCodigo || 'PE';
    const personType = prospect.tipoPersona as ProspectPersonType;
    const availableDocs = prospectDocuments(countryCode, personType);
    const selectedDoc = availableDocs.find((d) => d.value === prospect.tipoDocumento);

    const documentNumber = String(prospect.numeroDocumento || '').trim();
    if (!documentNumber) {
      return false;
    }

    let validDocument = false;
    if (selectedDoc) {
      const clean =
        selectedDoc.inputMode === 'numeric'
          ? documentNumber.replace(/\D/g, '')
          : documentNumber.replace(/\s+/g, '').toUpperCase();
      validDocument = selectedDoc.pattern.test(clean);
    } else {
      validDocument = documentNumber.length >= 3 && documentNumber.length <= 30;
    }

    const validName =
      prospect.tipoPersona === 'JURIDICA'
        ? Boolean(
            prospect.razonSocial?.trim() ||
            prospect.nombreComercial?.trim() ||
            prospect.nombre?.trim(),
          )
        : Boolean(prospect.nombre?.trim());
    return (
      validDocument && validName && Boolean(prospect.telefono?.trim() || prospect.correo?.trim())
    );
  }

  private normalizeClientDocumentType(value: string | null | undefined): string {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
    if (normalized === '1' || normalized === 'DNI') {
      return '1';
    }
    if (normalized === '6' || normalized === 'RUC') {
      return '6';
    }
    return '';
  }

  private normalizeProspectPersonType(
    value: string | null | undefined,
  ): 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA' {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();
    if (normalized === 'JURIDICA') {
      return 'JURIDICA';
    }
    if (normalized === 'NATURAL') {
      return 'NATURAL';
    }
    return 'SIN_DEFINIR';
  }

  private defaultProspectCountryCode(): string {
    const configuredCountry = this.auth.currentSession()?.empresa?.paisCodigo;
    return prospectCountry(configuredCountry).code;
  }

  protected markWon(item: CrmOportunidad): void {
    if (item.etapa === 'NEGOCIACION' && !this.canCloseWon(item)) {
      this.selectedOpportunity.set(item);
      this.opportunityDetailTab.set(this.hasFinalAgreement(item) ? 'pagos' : 'negociacion');
      this.opportunityDetailOpen.set(true);
      if (!this.hasFinalAgreement(item)) {
        this.errorMessage.set(
          'Antes de marcar como ganado registra el acuerdo final de la negociacion.',
        );
        return;
      }
      const plan = this.opportunityPaymentPlan(item);
      this.errorMessage.set(
        plan.isCredit
          ? 'Antes de cerrar registra la primera cuota con su comprobante; las cuotas restantes se programaran automaticamente.'
          : 'Antes de cerrar registra el pago completo de contado y adjunta obligatoriamente el comprobante.',
      );
      return;
    }
    if (this.requireClientCompletion(item, 'WON')) {
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
          this.successMessage.set(
            'Oportunidad marcada como ganada. Revisa los requisitos pendientes para cerrar la venta.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public hasFinalAgreement(item: CrmOportunidad): boolean {
    return Boolean(latestFinalAgreement(item.id, this.opportunityNegotiationRecords()));
  }

  protected latestFinalNegotiationRecord(
    item: CrmOportunidad,
  ): OpportunityNegotiationRecord | null {
    return latestFinalAgreement(item.id, this.opportunityNegotiationRecords());
  }

  protected hasClosingEvidence(item: CrmOportunidad): boolean {
    const hasPayment = this.opportunityPaymentRecords().some(
      (payment) =>
        payment.oportunidadId === item.id &&
        Number(payment.monto || 0) > 0 &&
        payment.estado !== 'VENCIDO',
    );
    const hasDocument = this.opportunityDocumentRecords().some(
      (document) =>
        document.oportunidadId === item.id &&
        ['PAGO', 'CONTRATO', 'LEGAL'].includes(document.categoria) &&
        (!!document.archivoDataUrl || !!document.archivoNombre || !!document.nombre),
    );
    return hasPayment || hasDocument;
  }

  public canCloseWon(item: CrmOportunidad): boolean {
    return canCloseWonView(this.opportunityFlowSnapshot(item));
  }

  public isRequiredClosurePaymentRegistered(item: CrmOportunidad): boolean {
    return isRequiredClosurePaymentRegisteredView(this.opportunityFlowSnapshot(item));
  }

  public saleClosureChecklist(item: CrmOportunidad) {
    return buildSaleClosureChecklist(this.opportunityFlowSnapshot(item));
  }

  private opportunityFlowSnapshot(item: CrmOportunidad): OpportunityFlowSnapshot {
    return {
      opportunity: item,
      negotiations: this.opportunityNegotiationRecords(),
      payments: this.opportunityPaymentRecords(),
      documents: this.opportunityDocumentRecords(),
      quotes: this.cotizaciones(),
    };
  }

  public canCloseSale(item: CrmOportunidad): boolean {
    return this.saleClosureChecklist(item).every((check) => check.done);
  }

  public isSaleClosed(item: CrmOportunidad): boolean {
    return this.opportunityClosureRecords().some((record) => record.oportunidadId === item.id);
  }

  public closeWonSale(item: CrmOportunidad): void {
    if (!this.canCloseSale(item)) {
      this.errorMessage.set(
        'Completa el acuerdo, cotizacion final, pago requerido, cuotas si aplica y documento adjunto antes de cerrar la venta.',
      );
      return;
    }
    if (this.isSaleClosed(item)) {
      this.successMessage.set('La venta ya se encuentra cerrada.');
      return;
    }
    this.finalizeSaleClosure(item);
  }

  private finalizeSaleClosure(item: CrmOportunidad): void {
    const clientKey = this.createLocalId('close');
    this.saving.set(true);
    this.crmOpportunities
      .createResource(item.id, 'CIERRE', {
        clientKey,
        closedAt: new Date().toISOString(),
        closedBy:
          this.auth.currentSession()?.nombres || this.auth.currentSession()?.username || 'Usuario',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (resource) => {
          const record = this.mapClosureResource(resource);
          this.opportunityClosureRecords.set([record, ...this.opportunityClosureRecords()]);
          this.completeSaleClosure(item);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private completeSaleClosure(item: CrmOportunidad): void {
    this.opportunityDetailOpen.set(false);
    const prospectAlreadyConverted = Boolean(this.prospectForOpportunity(item)?.clienteId);
    if (!item.prospectoId || item.clienteId || prospectAlreadyConverted) {
      this.successMessage.set('Venta cerrada y cliente registrado.');
      this.load();
      return;
    }
    this.actionId.set(item.id);
    this.crmProspects
      .convertToCustomer(item.prospectoId)
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () => {
          this.successMessage.set('Venta cerrada. El prospecto ahora figura como cliente.');
          this.load();
        },
        error: (error: unknown) => {
          this.errorMessage.set(
            `La venta se cerro, pero no se pudo actualizar la ficha del cliente: ${this.resolveError(error)}`,
          );
          this.load();
        },
      });
  }

  protected clientClosureRecord(item: CrmOportunidad): OpportunityClosureRecord | null {
    return (
      this.opportunityClosureRecords()
        .filter((record) => record.oportunidadId === item.id)
        .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))[0] ?? null
    );
  }

  protected clientClosureDate(item: CrmOportunidad): string {
    return (
      this.clientClosureRecord(item)?.closedAt ||
      item.updatedAt ||
      item.fechaCierreEstimada ||
      item.createdAt ||
      new Date().toISOString()
    );
  }

  protected clientDebt(item: CrmOportunidad): number {
    return this.opportunityFinancialSummary(item).pending;
  }

  protected clientDocumentCount(item: CrmOportunidad): number {
    return this.opportunityDocumentRecords().filter(
      (document) => document.oportunidadId === item.id,
    ).length;
  }

  protected hasNegotiationContext(item: CrmOportunidad): boolean {
    const hasRecord = this.opportunityNegotiationRecords().some(
      (record) => record.oportunidadId === item.id,
    );
    const hasQuoteInNegotiation = this.cotizaciones().some(
      (quote) =>
        Number(quote.crmOportunidadId) === Number(item.id) &&
        ['NEGOCIACION', 'ACEPTADA', 'RECHAZADA'].includes(this.quoteStatusValue(quote)),
    );
    return (
      hasRecord ||
      hasQuoteInNegotiation ||
      ['NEGOCIACION', 'GANADO', 'PERDIDO'].includes(item.etapa)
    );
  }

  public markNegotiationWon(item: CrmOportunidad): void {
    this.markWon(item);
  }

  public markLost(item: CrmOportunidad): void {
    if (this.canCloseWon(item)) {
      this.errorMessage.set(
        'La venta ya tiene acuerdo y pago confirmados. Debe marcarse como ganada.',
      );
      return;
    }
    this.openOpportunityLostDialog(item);
  }

  protected openOpportunityLostDialog(item: CrmOportunidad, event?: Event): void {
    event?.stopPropagation();
    this.lossDialog.set({ type: 'OPORTUNIDAD', oportunidad: item });
    this.lossReason.set('');
    this.lossObservation.set('');
  }

  public closeLossDialog(): void {
    this.lossDialog.set(null);
    this.lossReason.set('');
    this.lossObservation.set('');
  }

  public lossReasonOptions() {
    return this.lossDialog()?.type === 'OPORTUNIDAD'
      ? this.opportunityLossReasonOptions
      : this.prospectLossReasonOptions;
  }

  public saveLoss(): void {
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
    const reasonLabel =
      this.lossReasonOptions().find((item) => item.value === reason)?.label || reason;
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

  public moveOpportunityStage(event: Event, item: CrmOportunidad, direction: -1 | 1): void {
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

  public closeStageMoveReview(): void {
    this.stageMoveReview.set(null);
    this.stageMoveComment.set('');
  }

  public canContinueStageMove(review: StageMoveReview): boolean {
    return (
      review.canContinue || (review.target.value === 'PERDIDO' && !!this.stageMoveComment().trim())
    );
  }

  public continueStageMove(): void {
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

  public runStageRequirementAction(action: StageRequirementAction, review: StageMoveReview): void {
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

  private performOpportunityStageMove(
    item: CrmOportunidad,
    target: PipelineStageOption,
    observacion?: string,
  ): void {
    if (target.value === 'GANADO') {
      this.markWon(item);
      return;
    }
    if (target.value === 'PERDIDO') {
      if (observacion?.trim()) {
        this.saveOpportunityLoss(item, observacion.trim());
      } else {
        this.openOpportunityLostDialog(item);
      }
      return;
    }
    const targetId = Number(target.id || 0);
    if (!targetId) {
      return;
    }
    this.actionId.set(item.id);
    this.api
      .moverCrmOportunidadEtapa(
        item.id,
        targetId,
        observacion || `Movimiento desde Kanban a ${target.label}`,
      )
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: (saved) => this.upsertOpportunity(saved, `Oportunidad movida a ${target.label}.`),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public openCreateActivity(source?: CrmProspecto | CrmOportunidad): void {
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
        detail:
          'La actividad quedara asociada a este prospecto. No se puede seleccionar otro registro desde aqui.',
        icon: 'pi pi-user-plus',
      });
    }
    this.activeDialog.set('actividad');
  }

  public closeActivityDialog(): void {
    this.activeDialog.set(null);
    this.activityContext.set(null);
  }

  public openQuickActivity(
    source: CrmProspecto | CrmOportunidad | undefined,
    tipoActividad: string,
    asunto: string,
  ): void {
    this.openCreateActivity(source);
    this.activityForm.tipoActividad = tipoActividad;
    this.activityForm.asunto = asunto;
  }

  public openCompleteActivity(item: CrmActividad, prospecto?: CrmProspecto): void {
    const resolvedProspect =
      prospecto ?? this.prospectos().find((current) => current.id === item.prospectoId);
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
    this.activityForm.fechaProgramada = toInputDateTime(item.fechaProgramada);
    this.activityForm.usuarioId =
      item.usuarioId || resolvedProspect?.responsableId || this.currentUserKey();
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

  public onActivityResultChange(value: string): void {
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

  public onScheduleNextToggle(): void {
    if (this.activityForm.programarSiguiente && !this.activityForm.siguienteAsunto.trim()) {
      this.prepareNextActivityDefaults();
    }
  }

  protected setFollowUpFilter(filter: FollowUpFilter): void {
    this.followUpFilter.set(filter);
    this.followUpPage.set(0);
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

  protected setProspectSelection(id: number, checked: boolean): void {
    const selected = new Set(this.selectedProspectIds());
    checked ? selected.add(id) : selected.delete(id);
    this.selectedProspectIds.set(selected);
  }

  protected setPagedProspectSelection(checked: boolean): void {
    const selected = new Set(this.selectedProspectIds());
    for (const item of this.pagedProspectTable()) {
      checked ? selected.add(item.id) : selected.delete(item.id);
    }
    this.selectedProspectIds.set(selected);
  }

  protected updateProspectFilters(filters: ProspectFilterState): void {
    this.prospectOrigenFilter.set(filters.origin);
    this.prospectCampaniaFilter.set(filters.campaign);
    this.prospectAsesorFilter.set(filters.advisor);
    this.prospectDateFrom.set(filters.dateFrom);
    this.prospectDateTo.set(filters.dateTo);
    this.prospectPage.set(0);
  }

  protected openProspectDistributionDialog(): void {
    if (!this.canAssignCrmProspects()) {
      this.errorMessage.set('No tienes permisos para repartir prospectos.');
      return;
    }
    const sellers = this.crmSellerUsers();
    if (!sellers.length) {
      this.errorMessage.set('No hay vendedores activos para asignar prospectos.');
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);
    const configuredIds = this.leadAssignmentConfig().responsableIds.filter((id) =>
      sellers.some((user) => String(user.id) === String(id)),
    );
    this.prospectDistributionSelectedSellerIds.set(
      configuredIds.length ? [...configuredIds] : sellers.map((user) => String(user.id)),
    );
    this.prospectDistributionMode.set(
      this.leadAssignmentConfig().automatico ? 'AUTOMATICO' : 'MANUAL',
    );
    this.prospectDistributionDialogOpen.set(true);
  }

  protected updateDistributionSellerSelection(event: {
    id: number | string;
    checked: boolean;
  }): void {
    const { id, checked } = event;
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
          this.successMessage.set(
            `Se repartieron ${response.totalAsignados} leads entre ${Object.keys(response.asignadosPorResponsable).length} vendedores.`,
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private hasCompleteClientRecord(client: Cliente): boolean {
    return Boolean(
      client.nombre?.trim() &&
      client.numeroDocumento?.trim() &&
      (client.telefono?.trim() || client.email?.trim()),
    );
  }

  private continueAfterClientCompletion(
    action: CrmClientCompletionAction,
    opportunity: CrmOportunidad,
  ): void {
    const quote = this.clientCompletionQuote();
    this.clientCompletionQuote.set(null);
    if (action === 'EDIT') {
      this.successMessage.set('Datos del contacto actualizados correctamente.');
      return;
    }
    if (action === 'PAYMENT') {
      this.openOpportunityPaymentDialog(opportunity);
      return;
    }
    if (action === 'WON') {
      this.markWon(opportunity);
      return;
    }
    if (action === 'QUOTE_CREATE') {
      this.openQuoteDialog(opportunity, true);
      return;
    }
    if (!quote) {
      this.errorMessage.set('No se encontro la cotizacion que se iba a emitir.');
      return;
    }
    if (action === 'QUOTE_PDF') {
      this.downloadQuotePdf(quote, 'Documento PDF generado.', true);
    } else if (action === 'QUOTE_EMAIL') {
      this.sendQuoteByEmail(quote, true);
    } else {
      this.sendQuoteByWhatsapp(quote, true);
    }
  }

  protected saveAutomaticLeadAssignment(automatico: boolean): void {
    const responsableIds = this.prospectDistributionSelectedSellerIds();
    if (automatico && !responsableIds.length) {
      this.errorMessage.set('Selecciona al menos un vendedor para activar el reparto automatico.');
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.crmProspects
      .updateAssignmentConfiguration(automatico, responsableIds)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (config) => {
          this.leadAssignmentConfig.set(config);
          this.prospectDistributionDialogOpen.set(false);
          this.successMessage.set(
            config.automatico
              ? 'Reparto automatico activado. Los nuevos leads se asignaran por menor carga.'
              : 'Reparto automatico desactivado. Los nuevos leads quedaran en la bandeja general.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openDeleteProspect(prospect: CrmProspecto): void {
    this.errorMessage.set(null);
    this.prospectDeleteTarget.set(prospect);
  }

  protected deleteProspect(): void {
    const prospect = this.prospectDeleteTarget();
    if (!prospect || this.prospectDeleting()) {
      return;
    }

    this.prospectDeleting.set(true);
    this.errorMessage.set(null);
    this.crmProspects
      .delete(prospect.id)
      .pipe(finalize(() => this.prospectDeleting.set(false)))
      .subscribe({
        next: () => {
          this.prospectos.update((items) => items.filter((item) => item.id !== prospect.id));
          const selected = new Set(this.selectedProspectIds());
          selected.delete(prospect.id);
          this.selectedProspectIds.set(selected);
          this.prospectDeleteTarget.set(null);
          this.successMessage.set(`Prospecto ${prospect.nombre} eliminado correctamente.`);
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
    this.followUpPage.set(0);
  }

  protected applyFollowUpFilters(): void {
    this.selectedFollowUpProspectId.set(null);
    this.followUpPage.set(0);
  }

  protected selectFollowUpProspect(card: CommercialInboxCard): void {
    this.selectedFollowUpProspectId.set(card.prospecto.id);
  }

  public closeFollowUpDetail(): void {
    this.selectedFollowUpProspectId.set(null);
  }

  protected isSelectedFollowUpCard(card: CommercialInboxCard): boolean {
    return this.selectedFollowUpCard()?.prospecto.id === card.prospecto.id;
  }

  public openFollowUpOpportunity(card: CommercialInboxCard, event?: Event): void {
    event?.stopPropagation();
    if (card.hasActiveOpportunity && card.oportunidad) {
      this.openExistingOpportunity(card.oportunidad, 'Este prospecto ya esta en oportunidad.');
      return;
    }
    this.confirmInterestAndOpenOpportunity(card.prospecto);
  }

  private confirmInterestAndOpenOpportunity(prospecto: CrmProspecto): void {
    const qualification = this.prospectQualification(prospecto);
    if (!qualification.canConvert) {
      this.openQuickActivity(prospecto, 'LLAMADA', `Confirmar interes de ${prospecto.nombre}`);
      this.activityForm.estadoActividad = 'REALIZADA';
      this.onActivityResultChange('INTERESADO');
      this.errorMessage.set(
        `Aun falta calificar: ${qualification.missing.join(', ') || 'registra una actividad con resultado real'}.`,
      );
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

  public activityRelativeLabel(dateValue: string | null | undefined): string {
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

  public followUpActivityIcon(type: string | null | undefined): string {
    return this.activityIcon(type);
  }

  public followUpActivityTone(item: CrmActividad): 'done' | 'pending' | 'overdue' | 'neutral' {
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
    return card.lastActivity
      ? this.humanize(card.lastActivity.tipoActividad)
      : 'Pendiente contacto';
  }

  protected followUpContactTone(
    card: CommercialInboxCard,
  ): 'danger' | 'warning' | 'success' | 'info' | 'muted' {
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

  public activityResultText(value = this.activityForm.resultadoContacto): string {
    const option = this.activityResultOptions.find((item) => item.value === value);
    return value ? (option?.label ?? this.humanize(value)) : '';
  }

  public activityTypeIcon(value = this.activityForm.tipoActividad): string {
    return (
      this.tipoActividadOptions.find((item) => item.value === value)?.icon || 'pi pi-calendar-plus'
    );
  }

  public activityTypeLabel(value = this.activityForm.tipoActividad): string {
    return (
      this.tipoActividadOptions.find((item) => item.value === value)?.label || this.humanize(value)
    );
  }

  public activityStateLabel(value = this.activityForm.estadoActividad): string {
    return (
      this.actividadEstadoOptions.find((item) => item.value === value)?.label ||
      this.humanize(value)
    );
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

  protected followUpNextActionTone(
    card: CommercialInboxCard,
  ): 'danger' | 'warning' | 'success' | 'info' | 'muted' {
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
    return card.nextActivity
      ? this.activityRelativeLabel(card.nextActivity.fechaProgramada)
      : 'Sin fecha programada';
  }

  protected followUpResponsibleId(card: CommercialInboxCard): string | null {
    return card.nextActivity?.usuarioId || card.prospecto.responsableId || null;
  }

  private followUpWasContacted(card: CommercialInboxCard): boolean {
    const state = (card.prospecto.estado || '').toUpperCase();
    const contactedStates = [
      'CONTACTADO',
      'INTERESADO',
      'CALIFICADO',
      'COTIZADO',
      'NEGOCIACION',
      'CONVERTIDO',
    ];
    if (contactedStates.includes(state)) {
      return true;
    }

    const contactTypes = ['LLAMADA', 'WHATSAPP', 'CORREO', 'REUNION', 'VISITA'];
    return this.actividades().some((item) => {
      const resultCode = (item.resultadoContacto || '').toUpperCase();
      if (resultCode) {
        return (
          item.prospectoId === card.prospecto.id &&
          item.estado === 'REALIZADA' &&
          [
            'CONTACTADO',
            'INTERESADO',
            'MUY_INTERESADO',
            'SOLICITA_PROPUESTA',
            'REPROGRAMADO',
            'COTIZACION_SOLICITADA',
          ].includes(resultCode)
        );
      }
      const result = `${item.resultado || ''} ${item.descripcion || ''}`.toUpperCase();
      return (
        item.prospectoId === card.prospecto.id &&
        item.estado === 'REALIZADA' &&
        contactTypes.includes((item.tipoActividad || '').toUpperCase()) &&
        !result.includes('SIN_RESPUESTA') &&
        !result.includes('NO RESPONDIO')
      );
    });
  }

  protected exportFollowUpCsv(): void {
    if (typeof document === 'undefined') {
      return;
    }
    const rows = [
      [
        'Prospecto',
        'Telefono',
        'Correo',
        'Oferta',
        'Valor estimado',
        'Estado contacto',
        'Interes',
        'Ultima actividad',
        'Proxima accion',
        'Responsable',
      ],
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

  public sendProspectWhatsapp(item: CrmProspecto): void {
    if (this.actionId() === item.id) {
      return;
    }
    if (!this.onlyDigits(item.telefono)) {
      this.errorMessage.set('El prospecto no tiene un teléfono válido para WhatsApp.');
      return;
    }
    const message = `Hola ${item.nombre}, te escribo por ${item.interesPrincipal || 'tu consulta'}.`;
    this.actionId.set(item.id);
    this.errorMessage.set(null);
    this.api
      .sendCrmWhatsappMessage(item.id, { mensaje: message, previewUrl: true })
      .pipe(finalize(() => this.actionId.set(null)))
      .subscribe({
        next: () =>
          this.successMessage.set(
            'Mensaje enviado por el canal de WhatsApp configurado en Azurion.',
          ),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public sendProspectByEmail(item: CrmProspecto): void {
    if (!item.correo || this.sendingProspectEmailIds().has(item.id)) {
      return;
    }
    const subject = `Seguimiento ${item.interesPrincipal || 'comercial'}`;
    const message = `Hola ${item.nombre},\n\nTe escribo para dar seguimiento a tu consulta.\n\nSaludos.`;
    this.sendingProspectEmailIds.update((current) => new Set(current).add(item.id));
    this.errorMessage.set(null);
    this.api
      .sendCrmProspectEmail(item.id, subject, message)
      .pipe(
        finalize(() =>
          this.sendingProspectEmailIds.update((current) => {
            const next = new Set(current);
            next.delete(item.id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Correo enviado desde Azurion a ${response.destinatario}.`);
          this.crmFollowups.pageActivities({ page: 0, size: CRM_INITIAL_PAGE_SIZE }).subscribe({
            next: (page) => this.actividades.set(page.content),
            error: () => undefined,
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected prospectInitials(item: CrmProspecto): string {
    const source = item.nombre || item.razonSocial || 'PR';
    return (
      source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || '')
        .join('') || 'PR'
    );
  }

  protected prospectAvatarTone(index: number): string {
    return ['green', 'violet', 'amber', 'blue', 'rose', 'teal'][index % 6];
  }

  public saveActivity(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.activityForm.asunto.trim()) {
      this.errorMessage.set('El asunto de la actividad es obligatorio.');
      return;
    }
    if (
      !this.activityForm.prospectoId &&
      !this.activityForm.oportunidadId &&
      !this.activityForm.clienteId
    ) {
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
      this.errorMessage.set(
        'Selecciona el resultado obtenido antes de marcar el seguimiento como cumplido.',
      );
      return;
    }
    const shouldProgramNext =
      this.activityForm.estadoActividad === 'REALIZADA' && this.activityForm.programarSiguiente;
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
    const resultadoDetalle = [
      resultado ? `Resultado: ${resultado}` : '',
      this.activityForm.descripcion.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    const prospectStatus =
      this.activityForm.prospectoId && this.activityForm.nuevoEstadoProspecto
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
      return this.crmFollowups
        .createActivity({
          prospectoId: this.activityForm.prospectoId,
          oportunidadId: this.activityForm.oportunidadId,
          clienteId: this.activityForm.clienteId,
          tipoActividad: this.activityForm.siguienteTipoActividad,
          asunto: this.activityForm.siguienteAsunto.trim(),
          descripcion: this.activityForm.siguienteDescripcion.trim() || null,
          fechaProgramada: siguienteFechaProgramada,
          usuarioId: this.activityForm.usuarioId.trim() || null,
        })
        .pipe(map((nextActivity) => ({ activity, nextActivity })));
    };
    const refreshProspect$ = (result: {
      activity: CrmActividad;
      nextActivity: CrmActividad | null;
    }) =>
      this.activityForm.prospectoId
        ? this.crmProspects
            .get(Number(this.activityForm.prospectoId))
            .pipe(map((prospect) => ({ ...result, prospect })))
        : of({ ...result, prospect: null });
    this.saving.set(true);
    const save$ = this.activityForm.id
      ? this.crmFollowups
          .completeActivity(this.activityForm.id, completionRequest)
          .pipe(switchMap(maybeScheduleNext$), switchMap(refreshProspect$))
      : this.crmFollowups
          .createActivity({
            prospectoId: this.activityForm.prospectoId,
            oportunidadId: this.activityForm.oportunidadId,
            clienteId: this.activityForm.clienteId,
            tipoActividad: this.activityForm.tipoActividad,
            asunto: this.activityForm.asunto.trim(),
            descripcion: this.activityForm.descripcion.trim() || null,
            fechaProgramada,
            usuarioId: this.activityForm.usuarioId.trim() || null,
          })
          .pipe(
            switchMap((created) =>
              this.activityForm.estadoActividad === 'REALIZADA'
                ? this.crmFollowups
                    .completeActivity(created.id, completionRequest)
                    .pipe(switchMap(maybeScheduleNext$), switchMap(refreshProspect$))
                : of({
                    activity: created,
                    nextActivity: null as CrmActividad | null,
                    prospect: null,
                  }),
            ),
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
          this.successMessage.set(
            opportunity
              ? `Actividad cumplida y oportunidad movida a ${this.stageName(opportunity.etapa)}.`
              : nextActivity
                ? 'Actividad cumplida y siguiente paso programado.'
                : prospect
                  ? 'Seguimiento cumplido y prospecto actualizado.'
                  : 'Actividad guardada correctamente.',
          );
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

  private saveProspectLoss(item: CrmProspecto, motivo: string): void {
    const pending = this.actividades().filter(
      (activity) => activity.prospectoId === item.id && activity.estado === 'PENDIENTE',
    );
    this.saving.set(true);
    this.actionId.set(item.id);
    this.crmProspects
      .update(item.id, {
        estado: 'PERDIDO',
        motivoPerdida: motivo,
        observacionPerdida: `Prospecto perdido: ${motivo}`,
        observacion: `Perdido: ${motivo}`,
      })
      .pipe(
        switchMap((saved) =>
          pending.length
            ? forkJoin(
                pending.map((activity) =>
                  this.crmFollowups.cancelActivity(activity.id, `Prospecto perdido: ${motivo}`),
                ),
              ).pipe(map((activities) => ({ saved, activities })))
            : of({ saved, activities: [] as CrmActividad[] }),
        ),
        finalize(() => {
          this.saving.set(false);
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: ({ saved, activities }) => {
          this.upsertProspect(saved);
          activities.forEach((activity) => this.upsertActivity(activity));
          this.closeLossDialog();
          this.successMessage.set(
            'Prospecto marcado como perdido. Actividades pendientes canceladas.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private saveOpportunityLoss(item: CrmOportunidad, motivo: string): void {
    const pending = this.actividades().filter(
      (activity) => activity.oportunidadId === item.id && activity.estado === 'PENDIENTE',
    );
    this.saving.set(true);
    this.actionId.set(item.id);
    this.crmOpportunities
      .markLost(item.id, motivo)
      .pipe(
        switchMap((saved) =>
          pending.length
            ? forkJoin(
                pending.map((activity) =>
                  this.crmFollowups.cancelActivity(activity.id, `Oportunidad perdida: ${motivo}`),
                ),
              ).pipe(map((activities) => ({ saved, activities })))
            : of({ saved, activities: [] as CrmActividad[] }),
        ),
        finalize(() => {
          this.saving.set(false);
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: ({ saved, activities }) => {
          this.upsertOpportunity(saved);
          activities.forEach((activity) => this.upsertActivity(activity));
          this.closeLossDialog();
          this.successMessage.set(
            'Oportunidad marcada como perdida. Actividades pendientes canceladas.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public openQuoteDialog(item: CrmOportunidad, clientValidated = false): void {
    if (!clientValidated && this.requireClientCompletion(item, 'QUOTE_CREATE')) {
      return;
    }
    this.selectedOpportunity.set(item);
    const detalles = this.quoteLinesFromOpportunityRequirements(item);
    this.quoteForm = this.emptyQuoteForm(this.quoteInitialCurrency(item, detalles));
    this.quoteForm.oportunidadId = item.id;
    this.quoteForm.clienteId = item.clienteId ?? null;
    this.quoteForm.sucursalId = this.defaultQuoteSucursalId();
    this.quoteForm.observacion = `Propuesta comercial por ${this.quoteOfferName(item)}.`;
    this.quoteForm.detalles = this.alignQuoteLineCurrencies(detalles);
    this.activeDialog.set('cotizacion');
  }

  public openQuoteFromRequirements(item: CrmOportunidad): void {
    if (!this.opportunityRequirementRows(item).length) {
      this.addDefaultRequirement(item);
    }
    this.openQuoteDialog(item);
    this.quoteForm.observacion = `Cotizacion por requerimientos registrados en ${item.titulo}.`;
  }

  public openQuoteAdjustmentDialog(quote: Cotizacion): void {
    const opportunity = this.opportunityForQuote(quote) || this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('No se encontro la oportunidad para ajustar la cotizacion.');
      return;
    }
    this.selectedOpportunity.set(opportunity);
    this.quoteForm = this.emptyQuoteForm(quote.moneda);
    this.quoteForm.oportunidadId = opportunity.id;
    this.quoteForm.clienteId = quote.clienteId ?? opportunity.clienteId ?? null;
    this.quoteForm.sucursalId = quote.sucursalId ?? this.defaultQuoteSucursalId();
    this.quoteForm.fechaVencimiento = '';
    this.quoteForm.observacion = `Ajuste comercial de ${quoteCode(quote.id)}.`;
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

  public closeOpportunityDetail(): void {
    this.opportunityDetailOpen.set(false);
  }

  public setOpportunityDetailTab(tab: OpportunityDetailTab): void {
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

  public openOpportunityActivity(item: CrmOportunidad, tipoActividad = 'LLAMADA'): void {
    this.openQuickActivity(
      item,
      tipoActividad,
      this.defaultOpportunityActivitySubject(item, tipoActividad),
    );
  }

  public isInterestedOpportunity(item: CrmOportunidad): boolean {
    return item.etapa === 'INTERESADO' && item.estado === 'ABIERTA';
  }

  protected opportunityRequirementRows(item: CrmOportunidad): OpportunityRequirementRecord[] {
    return this.opportunityRequirementRecords()
      .filter((record) => record.oportunidadId === item.id)
      .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  public requirementTotal(item: OpportunityRequirementRecord): number {
    return Math.max(0, Number(item.cantidad || 0) * Number(item.precioUnitario || 0));
  }

  public requirementCatalogItem(item: OpportunityRequirementRecord): CrmCatalogoItem | null {
    if (!item.catalogoItemId) {
      return null;
    }
    return this.catalogoItems().find((catalogo) => catalogo.id === item.catalogoItemId) ?? null;
  }

  public requirementCurrencyPrefix(item: OpportunityRequirementRecord): string {
    return this.catalogCurrencyPrefix(
      this.requirementCatalogItem(item)?.moneda || this.tenantBaseCurrencyCode(),
    );
  }

  public requirementQuantityLabel(item: OpportunityRequirementRecord): string {
    return this.requirementCatalogItem(item)?.tipoItem === 'CURSO'
      ? 'Participantes / Cantidad'
      : 'Cantidad solicitada';
  }

  public requirementDescription(item: OpportunityRequirementRecord): string {
    return (
      this.requirementCatalogItem(item)?.descripcion ||
      item.observacion ||
      'Sin descripcion comercial registrada.'
    );
  }

  public requirementObservation(item: OpportunityRequirementRecord): string | null {
    const observation = item.observacion.trim();
    return observation && observation !== this.requirementCatalogItem(item)?.descripcion
      ? observation
      : null;
  }

  public catalogCommercialAttributes(
    item: CrmCatalogoItem | null | undefined,
  ): Array<{ key: string; label: string; value: string }> {
    if (!item) {
      return [];
    }
    const attributes = this.extractCatalogAttributes(item.metadataJson);
    const fields = this.catalogRegistrationDefinition(
      this.normalizeOpportunityType(item.tipoItem),
    ).fields;
    const labelByKey = new Map(fields.map((field) => [field.key, field.label]));
    return Object.entries(attributes)
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .map(([key, value]) => ({
        key,
        label: labelByKey.get(key) || this.humanize(key),
        value: String(value),
      }));
  }

  public requirementFormCatalogItem(): CrmCatalogoItem | null {
    const catalogoItemId = Number(this.requirementForm.catalogoItemId);
    if (!Number.isFinite(catalogoItemId)) {
      return null;
    }
    return this.catalogoItems().find((item) => item.id === catalogoItemId) ?? null;
  }

  public requirementFormAttributes(): Array<{ key: string; label: string; value: string }> {
    return this.catalogCommercialAttributes(this.requirementFormCatalogItem());
  }

  public requirementFormTypeMeta(fallbackType: string | null | undefined) {
    return this.opportunityTypeMeta(
      this.normalizeOpportunityType(this.requirementFormCatalogItem()?.tipoItem || fallbackType),
    );
  }

  public requirementFormCurrencyCode(): string {
    return (
      this.requirementFormCatalogItem()?.moneda || this.tenantBaseCurrencyCode()
    ).toUpperCase();
  }

  public requirementFormCurrencyPrefix(): string {
    return this.catalogCurrencyPrefix(this.requirementFormCurrencyCode());
  }

  public requirementFormDescription(): string {
    return (
      this.requirementFormCatalogItem()?.descripcion ||
      this.requirementForm.observacion ||
      'Selecciona una oferta para consultar su descripcion comercial.'
    );
  }

  public requirementFormQuantityLabel(): string {
    return this.requirementFormCatalogItem()?.tipoItem === 'CURSO'
      ? 'Participantes / Cantidad'
      : 'Cantidad solicitada';
  }

  public requirementFormTotal(): number {
    return Math.max(
      0,
      Number(this.requirementForm.cantidad || 0) * Number(this.requirementForm.precioUnitario || 0),
    );
  }

  public requirementContactInitials(item: CrmOportunidad): string {
    return this.contactInitials(this.opportunityContactName(item));
  }

  public requirementContactPhone(item: CrmOportunidad): string {
    return this.opportunityContactPhone(item) || 'Sin telefono registrado';
  }

  public requirementContactEmail(item: CrmOportunidad): string {
    return this.opportunityContactEmail(item) || 'Sin correo registrado';
  }

  public opportunityRequirementChecklist(item: CrmOportunidad) {
    return buildOpportunityRequirementChecklist({
      contactName: this.opportunityContactName(item),
      estimatedAmount: item.montoEstimado,
      requirements: this.selectedOpportunityRequirements(),
      quotes: this.selectedOpportunityQuotes(),
    });
  }

  public openOpportunityRequirementDialog(
    item: CrmOportunidad,
    requirement?: OpportunityRequirementRecord,
  ): void {
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

  public onRequirementCatalogChange(value: number | null): void {
    this.requirementForm.catalogoItemId = value;
    const item = this.catalogoItems().find((current) => current.id === value);
    if (!item) {
      return;
    }
    this.requirementForm.nombre = item.nombre;
    this.requirementForm.precioUnitario = Number(
      item.precioReferencial || this.requirementForm.precioUnitario || 0,
    );
    this.requirementForm.observacion = item.descripcion || this.requirementForm.observacion;
  }

  public saveOpportunityRequirement(): void {
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
    const clientKey = this.requirementForm.id || this.createLocalId('req');
    const data = {
      clientKey,
      catalogoItemId: this.requirementForm.catalogoItemId,
      nombre,
      cantidad: Math.max(1, Number(this.requirementForm.cantidad || 1)),
      precioUnitario: Math.max(0, Number(this.requirementForm.precioUnitario || 0)),
      observacion: this.requirementForm.observacion.trim(),
    };
    const resourceId = Number(this.requirementForm.id);
    const request$ =
      this.requirementForm.id && Number.isFinite(resourceId)
        ? this.crmOpportunities.updateResource(opportunity.id, resourceId, 'REQUISITO', data)
        : this.crmOpportunities.createResource(opportunity.id, 'REQUISITO', data);
    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (resource) => {
        const record = this.mapRequirementResource(resource);
        const current = this.opportunityRequirementRecords();
        this.opportunityRequirementRecords.set(
          current.some((item) => item.id === record.id)
            ? current.map((item) => (item.id === record.id ? record : item))
            : [...current, record],
        );
        this.opportunityRequirementDialogOpen.set(false);
        this.successMessage.set('Requerimiento guardado en la oportunidad.');
        this.refreshOpportunityAfterEstimateChange(opportunity.id);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public deleteOpportunityRequirement(id: string): void {
    const record = this.opportunityRequirementRecords().find((item) => item.id === id);
    const resourceId = Number(id);
    if (!record || !Number.isFinite(resourceId)) {
      return;
    }
    this.crmOpportunities.deleteResource(record.oportunidadId, resourceId).subscribe({
      next: () => {
        this.opportunityRequirementRecords.set(
          this.opportunityRequirementRecords().filter((item) => item.id !== id),
        );
        this.refreshOpportunityAfterEstimateChange(record.oportunidadId);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  /** El backend recalcula el monto estimado con cada requerimiento o cotizacion; refresca la cabecera. */
  private refreshOpportunityAfterEstimateChange(oportunidadId: number): void {
    this.crmOpportunities.list().subscribe({
      next: (oportunidades) => {
        this.oportunidades.set(oportunidades);
        const current = oportunidades.find((item) => item.id === oportunidadId);
        if (current && this.selectedOpportunity()?.id === oportunidadId) {
          this.selectedOpportunity.set(current);
        }
      },
      error: () => undefined,
    });
  }

  public advanceInterestedToQuoted(item: CrmOportunidad): void {
    this.openQuoteFromRequirements(item);
  }

  public openOpportunityPaymentActivity(item: CrmOportunidad): void {
    this.openOpportunityPaymentDialog(item);
  }

  public openOpportunityNegotiationDialog(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.negotiationForm = this.emptyOpportunityNegotiationForm();
    const quote = this.selectedOpportunityCurrentQuote();
    const previous = this.selectedOpportunityNegotiations()[0] ?? null;
    this.negotiationForm.cotizacionId = quote?.id ?? null;
    this.negotiationForm.precioOriginal = Number(quote?.total ?? item.montoEstimado ?? 0);
    this.negotiationForm.precioFinal = Number(quote?.total ?? item.montoEstimado ?? 0);
    this.negotiationForm.fechaInicio = new Date().toISOString().slice(0, 10);
    if (previous) {
      this.negotiationForm.cotizacionId =
        previous.cotizacionId ?? this.negotiationForm.cotizacionId;
      this.negotiationForm.precioOriginal = Number(
        previous.precioOriginal || this.negotiationForm.precioOriginal,
      );
      this.negotiationForm.precioFinal = Number(
        previous.precioFinal || this.negotiationForm.precioFinal,
      );
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

  public negotiationFinancialSummary(): { base: number; discountPercent: number; agreed: number } {
    const base = Math.max(0, Number(this.negotiationForm.precioOriginal || 0));
    const agreed = Math.max(0, Number(this.negotiationForm.precioFinal || 0));
    const discountPercent =
      base > 0
        ? Math.max(0, Math.round(((base - agreed) / base) * 10000) / 100)
        : Math.max(0, Number(this.negotiationForm.descuento || 0));
    return { base, discountPercent, agreed };
  }

  public onNegotiationPaymentModeChange(value: string): void {
    this.negotiationForm.formaPago = value;
    this.negotiationForm.cuotas =
      value === 'Credito' ? Math.max(2, Number(this.negotiationForm.cuotas || 2)) : 1;
  }

  public openOpportunityAgreementDialog(item: CrmOportunidad): void {
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
    this.negotiationForm.observacion =
      'Acuerdo final registrado: cliente acepta condiciones finales. Pendiente registrar evidencia de cierre.';
  }

  public saveOpportunityNegotiation(): void {
    const opportunity = this.selectedOpportunity();
    if (!opportunity) {
      this.errorMessage.set('Selecciona una oportunidad para registrar la negociacion.');
      return;
    }
    if (Number(this.negotiationForm.precioFinal || 0) <= 0) {
      this.errorMessage.set('El precio final debe ser mayor a cero.');
      return;
    }
    const precioOriginal = Math.max(0, Number(this.negotiationForm.precioOriginal || 0));
    const precioFinal = Math.max(0, Number(this.negotiationForm.precioFinal || 0));
    if (precioOriginal > 0 && precioFinal > precioOriginal) {
      this.errorMessage.set('El precio final no puede ser mayor al precio original.');
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
    const finalAgreement =
      this.negotiationForm.resultado === 'ACEPTA' && this.negotiationForm.clienteConforme;
    const payload: CreateCrmNegociacionRequest = {
      cotizacionId: this.negotiationForm.cotizacionId,
      estado: finalAgreement ? 'CLIENTE_CONFORME' : this.negotiationForm.estado || null,
      solicitudCliente: this.negotiationForm.objecion || 'MEJOR_PRECIO',
      precioOriginal,
      descuento: Math.max(0, Math.round((precioOriginal - precioFinal) * 100) / 100),
      precioFinal,
      formaPago: this.negotiationForm.formaPago.trim(),
      cuotas: Math.max(1, Number(this.negotiationForm.cuotas || 1)),
      fechaInicio: this.negotiationForm.fechaInicio || null,
      fechaEntrega: this.negotiationForm.fechaEntrega || null,
      observacion: this.negotiationForm.observacion.trim(),
      resultado: this.negotiationForm.resultado,
    };
    this.actionId.set(opportunity.id);
    this.crmOpportunities
      .createNegotiation(opportunity.id, payload)
      .pipe(
        switchMap((saved) =>
          this.crmOpportunities.get(opportunity.id).pipe(map((fresh) => ({ saved, fresh }))),
        ),
        finalize(() => this.actionId.set(null)),
      )
      .subscribe({
        next: ({ saved, fresh }) => {
          this.upsertOpportunity(fresh);
          this.selectedOpportunity.set(fresh);
          this.upsertNegotiation(this.mapNegotiationRecord(saved));
          this.opportunityDetailTab.set('negociacion');
          this.opportunityNegotiationDialogOpen.set(false);
          this.successMessage.set(
            saved.estado === 'CLIENTE_CONFORME' || saved.estado === 'GANADA'
              ? 'Acuerdo final registrado. Registra pago, voucher o comprobante antes de marcar como ganado.'
              : 'Negociacion registrada en la oportunidad.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected openOpportunityPaymentDialog(item: CrmOportunidad): void {
    if (this.requireClientCompletion(item, 'PAYMENT')) {
      return;
    }
    const plan = this.opportunityPaymentPlan(item);
    if (this.isRequiredClosurePaymentRegistered(item) && plan.pendingAmount <= 0) {
      this.successMessage.set('El pago requerido y su comprobante ya fueron registrados.');
      return;
    }
    this.selectedOpportunity.set(item);
    this.paymentForm = this.emptyOpportunityPaymentForm();
    this.paymentSelectedFile = null;
    const pending =
      this.opportunityFinancialSummary(item).pending ||
      Number(item.montoReal || item.montoEstimado || 0);
    if (plan.isCredit) {
      this.paymentForm.tipo = 'CUOTA';
      this.paymentForm.estado = 'PAGADO';
      this.paymentForm.monto = Math.min(
        pending,
        Math.round((pending / Math.max(1, plan.cuotas - plan.paidPayments.length)) * 100) / 100,
      );
    } else {
      this.paymentForm.monto = pending;
    }
    const firstPendingInstallment = this.paymentDialogInstallments(item).find(
      (installment) => installment.selectable,
    );
    if (firstPendingInstallment) {
      this.selectOpportunityPaymentInstallment(item, firstPendingInstallment.key);
    }
    this.opportunityPaymentDialogOpen.set(true);
  }

  protected updateFollowupFilters(filters: FollowupFilterState): void {
    this.followUpContactFilter.set(filters.contact);
    this.followUpResponsibleFilter.set(filters.responsible);
    this.followUpOriginFilter.set(filters.origin);
    this.followUpInterestFilter.set(filters.interest);
    this.followUpDateFilter.set(filters.date);
    this.followUpPage.set(0);
  }

  protected updatePaymentTrackingFilters(filters: PaymentTrackingFilterState): void {
    this.paymentTrackingStatusFilter.set(filters.status);
    this.paymentTrackingInstallmentFilter.set(filters.installmentStatus);
    this.paymentTrackingDueFrom.set(filters.dueFrom);
    this.paymentTrackingDueTo.set(filters.dueTo);
    this.paymentTrackingResponsible.set(filters.responsible);
    this.paymentTrackingPage.set(0);
  }

  protected setOpportunityStageFilter(value: string | null): void {
    this.opportunityStageFilter.set(value);
    this.opportunityPage.set(0);
  }

  protected setOpportunityResponsibleFilter(value: string | null): void {
    this.opportunityResponsibleFilter.set(value);
    this.opportunityPage.set(0);
  }

  protected setOpportunityStatusFilter(value: string | null): void {
    this.opportunityStatusFilter.set(value);
    this.opportunityPage.set(0);
  }

  protected openClosedOpportunityList(status: 'GANADA' | 'PERDIDA'): void {
    this.opportunityStageFilter.set(null);
    this.opportunityStatusFilter.set(status);
    this.opportunityPage.set(0);
    this.setTab('oportunidades');
  }

  protected resetOpportunityFilters(): void {
    this.opportunityStageFilter.set(null);
    this.opportunityResponsibleFilter.set(null);
    this.opportunityStatusFilter.set('ABIERTA');
    this.opportunityPage.set(0);
  }

  protected updateCrmQuery(value: string): void {
    this.query.set(value);
    this.prospectPage.set(0);
    this.followUpPage.set(0);
    this.opportunityPage.set(0);
    this.paymentTrackingPage.set(0);
  }

  protected paymentDialogInstallments(item: CrmOportunidad): CrmPaymentInstallment[] {
    const plan = this.opportunityPaymentPlan(item);
    const money = this.opportunityFinancialSummary(item);
    const agreement = this.latestFinalNegotiationRecord(item);
    const baseDate = this.toValidDate(agreement?.fechaInicio) || new Date();
    const records = [
      ...new Map(
        [...plan.paidPayments, ...plan.pendingInstallments].map((payment) => [payment.id, payment]),
      ).values(),
    ].sort((a, b) => Date.parse(a.fecha || '') - Date.parse(b.fecha || ''));
    const installmentCount = Math.max(plan.isCredit ? plan.cuotas : 1, records.length, 1);
    const regularAmount = Math.round((money.total / installmentCount) * 100) / 100;

    return Array.from({ length: installmentCount }, (_, index): CrmPaymentInstallment => {
      const record = records[index] || null;
      const dueDate = record?.fecha || toInputDate(addMonths(baseDate, index));
      const amount =
        record?.monto ??
        (index === installmentCount - 1
          ? Math.max(
              0,
              Math.round((money.total - regularAmount * (installmentCount - 1)) * 100) / 100,
            )
          : regularAmount);
      const status = record?.estado || (this.isOverdue(dueDate) ? 'VENCIDO' : 'PENDIENTE');
      return {
        key: record?.id || `planned-${item.id}-${index + 1}`,
        recordId: record && !['PAGADO'].includes(record.estado) ? record.id : null,
        number: index + 1,
        dueDate,
        amount: Math.max(0, Number(amount || 0)),
        status,
        selectable: !['PAGADO'].includes(status),
      };
    });
  }

  protected paymentDialogSummary(item: CrmOportunidad): CrmPaymentDialogSummary {
    const money = this.opportunityFinancialSummary(item);
    const installments = this.paymentDialogInstallments(item);
    return {
      total: money.total,
      paid: money.paid,
      pending: money.pending,
      paidInstallments: installments.filter((installment) => installment.status === 'PAGADO')
        .length,
      pendingInstallments: installments.filter((installment) => installment.status !== 'PAGADO')
        .length,
      overdueInstallments: installments.filter((installment) => installment.status === 'VENCIDO')
        .length,
    };
  }

  protected selectOpportunityPaymentInstallment(item: CrmOportunidad, key: string): void {
    const installment = this.paymentDialogInstallments(item).find(
      (candidate) => candidate.key === key,
    );
    if (!installment?.selectable) {
      return;
    }
    const automaticObservation = /^Pago de cuota \d+ de \d+$/.test(
      this.paymentForm.observacion.trim(),
    );
    this.paymentForm = {
      ...this.paymentForm,
      id: installment.recordId,
      cuotaKey: installment.key,
      tipo: 'CUOTA',
      monto: installment.amount,
      estado: 'PAGADO',
      observacion:
        !this.paymentForm.observacion || automaticObservation
          ? `Pago de cuota ${installment.number} de ${this.opportunityPaymentPlan(item).cuotas}`
          : this.paymentForm.observacion,
    };
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
    const file =
      this.paymentSelectedFile ??
      this.fileFromDataUrl(this.paymentForm.archivoDataUrl, this.paymentForm.archivoNombre);
    if (!this.paymentForm.archivoNombre || !file) {
      this.errorMessage.set('Adjunta obligatoriamente el voucher o comprobante del pago.');
      return;
    }
    const currentPlan = this.opportunityPaymentPlan(opportunity);
    const paymentAmount = Number(this.paymentForm.monto || 0);
    const selectedInstallment = this.paymentDialogInstallments(opportunity).find(
      (installment) => installment.key === this.paymentForm.cuotaKey,
    );
    if (
      currentPlan.isCredit &&
      selectedInstallment &&
      paymentAmount + 0.01 < selectedInstallment.amount
    ) {
      const currencySymbol = this.catalogCurrencyPrefix(opportunity.moneda);
      this.errorMessage.set(
        `La cuota seleccionada requiere un pago de ${currencySymbol} ${selectedInstallment.amount.toFixed(2)}.`,
      );
      return;
    }
    if (
      currentPlan.isCredit &&
      !currentPlan.firstPaymentDone &&
      paymentAmount + 0.01 < currentPlan.requiredInitialAmount
    ) {
      const currencySymbol = this.catalogCurrencyPrefix(opportunity.moneda);
      this.errorMessage.set(
        `La primera cuota debe ser como mínimo ${currencySymbol} ${currentPlan.requiredInitialAmount.toFixed(2)}.`,
      );
      return;
    }
    if (!currentPlan.isCredit && paymentAmount + 0.01 < currentPlan.pendingAmount) {
      const currencySymbol = this.catalogCurrencyPrefix(opportunity.moneda);
      this.errorMessage.set(
        `El pago al contado debe cubrir el saldo completo de ${currencySymbol} ${currentPlan.pendingAmount.toFixed(2)}.`,
      );
      return;
    }
    const clientKey = this.paymentForm.id || this.createLocalId('pay');
    const data = {
      clientKey,
      fecha: this.paymentForm.fecha,
      tipo: this.paymentForm.tipo,
      monto: Number(this.paymentForm.monto || 0),
      estado: this.paymentForm.estado,
      metodo: this.paymentForm.metodo.trim(),
      observacion: this.paymentForm.observacion.trim(),
    };
    const resourceId = Number(this.paymentForm.id);
    const request$ =
      this.paymentForm.id && Number.isFinite(resourceId)
        ? this.crmOpportunities.updateResource(opportunity.id, resourceId, 'PAGO', data, file)
        : this.crmOpportunities.createResource(opportunity.id, 'PAGO', data, file);
    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (resource) => {
        const record = this.mapPaymentResource(resource);
        this.opportunityPaymentRecords.set([
          record,
          ...this.opportunityPaymentRecords().filter((item) => item.id !== record.id),
        ]);
        this.paymentSelectedFile = null;
        this.opportunityPaymentDialogOpen.set(false);
        if (currentPlan.isCredit && !currentPlan.firstPaymentDone) {
          this.scheduleRemainingInstallments(opportunity);
        }
        if (this.canCloseWon(opportunity)) {
          this.markWon(opportunity);
          return;
        }
        this.opportunityDetailTab.set('pagos');
        this.successMessage.set('Pago y comprobante guardados en el servidor.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public deleteOpportunityPayment(id: string): void {
    const record = this.opportunityPaymentRecords().find((item) => item.id === id);
    const resourceId = Number(id);
    if (!record || !Number.isFinite(resourceId)) {
      return;
    }
    this.crmOpportunities.deleteResource(record.oportunidadId, resourceId).subscribe({
      next: () =>
        this.opportunityPaymentRecords.set(
          this.opportunityPaymentRecords().filter((item) => item.id !== id),
        ),
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected onOpportunityPaymentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.paymentSelectedFile = null;
    this.paymentForm = { ...this.paymentForm, archivoNombre: '', archivoDataUrl: '' };
    const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const allowedExtensions = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp']);
    if (!allowedExtensions.has(extension)) {
      this.errorMessage.set('El comprobante debe ser PDF, PNG, JPG o WEBP.');
      input.value = '';
      return;
    }
    if (file.size <= 0 || file.size > 8 * 1024 * 1024) {
      this.errorMessage.set('El comprobante debe pesar como maximo 8 MB.');
      input.value = '';
      return;
    }
    this.paymentSelectedFile = file;
    this.paymentForm = {
      ...this.paymentForm,
      archivoNombre: file.name,
      archivoDataUrl: '',
    };
  }

  public openOpportunityDocumentDialog(item: CrmOportunidad): void {
    this.selectedOpportunity.set(item);
    this.documentForm = this.emptyOpportunityDocumentForm();
    this.documentForm.nombre = `Documento ${this.quoteOfferName(item)}`;
    this.opportunityDocumentDialogOpen.set(true);
  }

  public saveOpportunityDocument(): void {
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
    const clientKey = this.documentForm.id || this.createLocalId('doc');
    const data = {
      clientKey,
      categoria: this.documentForm.categoria,
      nombre,
      descripcion: this.documentForm.descripcion.trim(),
    };
    const file = this.fileFromDataUrl(
      this.documentForm.archivoDataUrl,
      this.documentForm.archivoNombre,
      this.documentForm.mimeType,
    );
    const resourceId = Number(this.documentForm.id);
    const request$ =
      this.documentForm.id && Number.isFinite(resourceId)
        ? this.crmOpportunities.updateResource(opportunity.id, resourceId, 'DOCUMENTO', data, file)
        : this.crmOpportunities.createResource(opportunity.id, 'DOCUMENTO', data, file);
    this.saving.set(true);
    request$.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (resource) => {
        const record = this.mapDocumentResource(resource);
        this.opportunityDocumentRecords.set([
          record,
          ...this.opportunityDocumentRecords().filter((item) => item.id !== record.id),
        ]);
        this.opportunityDetailTab.set('documentos');
        this.opportunityDocumentDialogOpen.set(false);
        this.successMessage.set('Documento guardado en el servidor.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public deleteOpportunityDocument(id: string): void {
    const record = this.opportunityDocumentRecords().find((item) => item.id === id);
    const resourceId = Number(id);
    if (!record || !Number.isFinite(resourceId)) {
      return;
    }
    this.crmOpportunities.deleteResource(record.oportunidadId, resourceId).subscribe({
      next: () =>
        this.opportunityDocumentRecords.set(
          this.opportunityDocumentRecords().filter((item) => item.id !== id),
        ),
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public onOpportunityDocumentFileSelected(event: Event): void {
    this.readSmallFile(event, 8_000_000, (file, dataUrl) => {
      this.documentForm.archivoNombre = file.name;
      this.documentForm.archivoDataUrl = dataUrl;
      this.documentForm.mimeType = file.type || 'application/octet-stream';
      if (!this.documentForm.nombre.trim()) {
        this.documentForm.nombre = file.name;
      }
    });
  }

  public downloadLocalFile(name: string, resourceReference: string): void {
    if (!resourceReference || typeof document === 'undefined') {
      return;
    }
    const resourceId = Number(resourceReference);
    const record = [...this.opportunityDocumentRecords(), ...this.opportunityPaymentRecords()].find(
      (item) => Number(item.id) === resourceId,
    );
    if (!record || !Number.isFinite(resourceId)) {
      return;
    }
    this.crmOpportunities.downloadResource(record.oportunidadId, resourceId).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = name || 'archivo';
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public previewLocalFile(resourceReference: string): void {
    if (!resourceReference || typeof window === 'undefined') {
      return;
    }
    const resourceId = Number(resourceReference);
    const record = this.opportunityDocumentRecords().find((item) => Number(item.id) === resourceId);
    if (!record || !Number.isFinite(resourceId)) {
      return;
    }
    this.crmOpportunities.downloadResource(record.oportunidadId, resourceId, true).subscribe({
      next: (blob) => {
        const objectUrl = URL.createObjectURL(blob);
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  public addQuoteLine(): void {
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

  public quoteCurrencyOptions(): { label: string; value: string }[] {
    return this.availableCurrencyOptions(this.quoteForm.moneda);
  }

  public quoteCurrencyPrefix(moneda: string = this.quoteForm.moneda): string {
    return this.catalogCurrencyPrefix(moneda);
  }

  public quoteCurrencyInfo(moneda: string = this.quoteForm.moneda): CrmCurrencyConfig | null {
    if (moneda === this.tenantBaseCurrencyCode()) {
      return null;
    }
    return this.crmCurrencyConfigs().find((currency) => currency.moneda === moneda) ?? null;
  }

  public onQuoteCurrencyChange(moneda: string): void {
    const nextCurrency = moneda || this.tenantBaseCurrencyCode();
    const currentCurrency = this.quoteForm.moneda || this.tenantBaseCurrencyCode();
    if (nextCurrency === currentCurrency) {
      return;
    }
    const currentRate = this.quoteExchangeRate(currentCurrency);
    const nextRate = this.quoteExchangeRate(nextCurrency);
    if (currentRate === null || nextRate === null) {
      this.errorMessage.set(
        `Configura y activa el tipo de cambio de ${currentRate === null ? currentCurrency : nextCurrency} antes de convertir la cotización.`,
      );
      return;
    }
    this.quoteForm.detalles.forEach((line) => {
      const priceInBaseCurrency = Number(line.precioUnitario || 0) * currentRate;
      const discountInBaseCurrency = Number(line.descuento || 0) * currentRate;
      line.precioUnitario = this.roundMoney(priceInBaseCurrency / nextRate);
      line.descuento = this.roundMoney(discountInBaseCurrency / nextRate);
    });
    this.quoteForm.moneda = nextCurrency;
  }

  public removeQuoteLine(index: number): void {
    if (this.quoteForm.detalles.length <= 1) {
      return;
    }
    this.quoteForm.detalles.splice(index, 1);
  }

  public onQuoteCatalogChange(line: QuoteLineForm, value: number | null): void {
    line.catalogoItemId = value;
    const catalogo = this.catalogoItems().find((item) => item.id === value);
    if (!catalogo) {
      return;
    }
    line.descripcion = catalogo.nombre;
    const sourceRate = this.quoteExchangeRate(catalogo.moneda);
    const targetRate = this.quoteExchangeRate(this.quoteForm.moneda);
    if (sourceRate === null || targetRate === null) {
      this.errorMessage.set(
        `Configura y activa el tipo de cambio de ${sourceRate === null ? catalogo.moneda : this.quoteForm.moneda} antes de agregar este producto.`,
      );
      return;
    }
    line.precioUnitario = this.roundMoney(
      (Number(catalogo.precioReferencial || 0) * sourceRate) / targetRate,
    );
  }

  public quoteLineCatalogItem(line: QuoteLineForm): CrmCatalogoItem | null {
    if (!line.catalogoItemId) {
      return null;
    }
    return this.catalogoItems().find((item) => item.id === line.catalogoItemId) ?? null;
  }

  public lineTotal(line: QuoteLineForm): number {
    return Math.max(
      0,
      Number(line.cantidad || 0) * Number(line.precioUnitario || 0) -
        Number(line.descuento || 0) -
        this.linePromotionDiscount(line),
    );
  }

  public normalizeQuoteQuantity(value: number | string | null): number {
    return Math.max(1, Math.trunc(Number(value) || 1));
  }

  public linePromotionDiscount(line: QuoteLineForm): number {
    if (!line.promocionId) {
      return 0;
    }
    const promotion = this.promocionesCotizacion().find((item) => item.id === line.promocionId);
    if (!promotion || promotion.estado !== 'ACTIVA') {
      return 0;
    }
    const base = Math.max(
      0,
      Number(line.cantidad || 0) * Number(line.precioUnitario || 0) - Number(line.descuento || 0),
    );
    if (promotion.tipoDescuento === 'PORCENTAJE') {
      return Math.min(base, base * (Number(promotion.valor || 0) / 100));
    }
    return Math.min(base, Number(promotion.valor || 0));
  }

  public quoteTotal(): number {
    return this.quoteForm.detalles.reduce((sum, line) => sum + this.lineTotal(line), 0);
  }

  private quoteExchangeRate(moneda: string): number | null {
    if (!moneda || moneda === this.tenantBaseCurrencyCode()) {
      return 1;
    }
    const currency = this.quoteCurrencyInfo(moneda);
    const rate = Number(currency?.tipoCambioVenta || 0);
    return currency?.activo && rate > 0 ? rate : null;
  }

  private quoteLineCurrency(line: QuoteLineForm): string {
    return this.quoteLineCatalogItem(line)?.moneda || this.tenantBaseCurrencyCode();
  }

  private quoteInitialCurrency(item: CrmOportunidad, lines: QuoteLineForm[]): string {
    // La cotizacion abre en la moneda original del primer producto cotizado,
    // con su precio intacto; el usuario decide despues si cambia la moneda.
    const firstCatalogCurrency = lines
      .map((line) => this.quoteLineCatalogItem(line)?.moneda)
      .find((moneda): moneda is string => !!moneda);
    if (firstCatalogCurrency) {
      return firstCatalogCurrency;
    }
    return this.opportunityCatalogItem(item)?.moneda || this.tenantBaseCurrencyCode();
  }

  private alignQuoteLineCurrencies(lines: QuoteLineForm[]): QuoteLineForm[] {
    const targetCurrency = this.quoteForm.moneda || this.tenantBaseCurrencyCode();
    lines.forEach((line) => {
      const sourceCurrency = this.quoteLineCurrency(line);
      if (sourceCurrency === targetCurrency) {
        return;
      }
      const sourceRate = this.quoteExchangeRate(sourceCurrency);
      const targetRate = this.quoteExchangeRate(targetCurrency);
      if (sourceRate === null || targetRate === null) {
        this.errorMessage.set(
          `Configura y activa el tipo de cambio de ${sourceRate === null ? sourceCurrency : targetCurrency} antes de cotizar este producto.`,
        );
        return;
      }
      line.precioUnitario = this.roundMoney(
        (Number(line.precioUnitario || 0) * sourceRate) / targetRate,
      );
      line.descuento = this.roundMoney((Number(line.descuento || 0) * sourceRate) / targetRate);
    });
    return lines;
  }

  private roundMoney(value: number): number {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  public quoteOfferName(
    item: CrmOportunidad | null | undefined = this.selectedOpportunity(),
  ): string {
    if (!item) {
      return 'Oferta CRM';
    }
    const catalogo = this.opportunityCatalogItem(item);
    return catalogo?.nombre || item.descripcion || item.titulo || 'Oferta CRM';
  }

  public quoteOfferDescription(
    item: CrmOportunidad | null | undefined = this.selectedOpportunity(),
  ): string {
    if (!item) {
      return 'Cotizacion generada desde CRM.';
    }
    const catalogo = this.opportunityCatalogItem(item);
    return (
      catalogo?.descripcion ||
      item.descripcion ||
      'Oferta registrada desde CRM para seguimiento comercial.'
    );
  }

  public quoteCompanyLogoUrl(): string | null {
    const empresa = this.auth.currentSession()?.empresa as
      | { logoPanelUrl?: string | null }
      | undefined;
    return empresa?.logoPanelUrl || null;
  }

  public quoteCompanyName(): string {
    const empresa = this.auth.currentSession()?.empresa as
      | { razonSocial?: string | null }
      | undefined;
    return empresa?.razonSocial || 'AZURION';
  }

  public quoteOpportunityContactName(): string {
    const opportunity = this.selectedOpportunity();
    return opportunity ? this.opportunityContactName(opportunity) : 'Solicitante CRM';
  }

  public quoteOpportunityContactDetail(): string {
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

  public quoteResponsibleName(): string {
    const opportunity = this.selectedOpportunity();
    return this.responsibleName(opportunity?.responsableId || this.currentUserKey());
  }

  public saveQuote(): void {
    const oportunidadId = this.quoteForm.oportunidadId;
    if (!oportunidadId) {
      this.errorMessage.set('No se encontro la oportunidad para generar la cotizacion.');
      return;
    }
    const detalles = this.quoteForm.detalles
      .filter((line) => (line.productoId || line.descripcion.trim()) && Number(line.cantidad) > 0)
      .map((line) => ({
        productoId: line.productoId ? Number(line.productoId) : null,
        catalogoItemId: line.catalogoItemId ? Number(line.catalogoItemId) : null,
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
            this.errorMessage.set(
              'No hay una sucursal activa para cotizar. Reinicia el backend para aplicar la sede CRM base o crea una sucursal desde Configuracion.',
            );
            return EMPTY;
          }
          this.quoteForm.sucursalId = sucursalId;
          return this.crmQuotations.generateFromOpportunity(oportunidadId, {
            clienteId: this.quoteForm.clienteId,
            usuarioId: this.currentUserKey(),
            usuarioNombre:
              this.auth.currentSession()?.nombres ||
              this.auth.currentSession()?.username ||
              'Usuario',
            sucursalId,
            fechaVencimiento: this.quoteForm.fechaVencimiento || null,
            moneda: this.quoteForm.moneda || this.tenantBaseCurrencyCode(),
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
          this.crmOpportunities.list().subscribe({
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
          this.successMessage.set(
            'Cotizacion creada. Enviala por WhatsApp o correo para pasar la oportunidad a Cotizado.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public humanize(value: string | null | undefined): string {
    return humanizeCode(value);
  }

  protected stageProgress(etapa: string | null | undefined): number {
    return this.stages.progress(etapa);
  }

  public stageColor(etapa: string | null | undefined): string {
    return this.stages.color(etapa);
  }

  protected pipelineStageColor(etapa: string | null | undefined): string {
    return this.stages.boardColor(etapa);
  }

  protected stageSoftColor(etapa: string | null | undefined): string {
    return this.stages.softColor(etapa);
  }

  public stageName(etapa: string | null | undefined): string {
    return this.stages.name(etapa);
  }

  protected stageObjective(stage: PipelineStageOption | string | null | undefined): string {
    return this.stages.objective(stage);
  }

  protected stageValidationMode(
    stage: PipelineStageOption | string | null | undefined,
  ): StageValidationMode {
    return this.stages.validationMode(stage);
  }

  protected opportunityRiskBadges(item: CrmOportunidad): string[] {
    const badges: string[] = [];
    if (!this.nextOpportunityActivity(item) && this.isActiveOpportunity(item)) {
      badges.push('Sin proxima accion');
    }
    if (
      item.fechaCierreEstimada &&
      this.isOverdue(item.fechaCierreEstimada) &&
      this.isActiveOpportunity(item)
    ) {
      badges.push('Cierre vencido');
    }
    return badges.slice(0, 2);
  }

  public relationshipLabel(item: CrmOportunidad): string {
    if (item.clienteNombre) {
      return 'Cliente existente';
    }
    if (item.prospectoNombre) {
      return 'Prospecto nuevo';
    }
    return 'Sin contacto';
  }

  public opportunityProgress(item: CrmOportunidad): number {
    return Math.max(0, Math.min(100, Number(item.probabilidad || 0)));
  }

  protected opportunityTemperatureValue(
    itemOrProbability: CrmOportunidad | number | null | undefined,
  ): 'FRIO' | 'MEDIO' | 'CALIENTE' {
    const probability =
      typeof itemOrProbability === 'number'
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

  public opportunityTemperatureLabel(
    itemOrProbability: CrmOportunidad | number | null | undefined,
  ): string {
    return this.humanize(this.opportunityTemperatureValue(itemOrProbability));
  }

  public opportunityTemperatureTone(
    itemOrProbability: CrmOportunidad | number | null | undefined,
  ): 'cold' | 'warm' | 'hot' {
    const value = this.opportunityTemperatureValue(itemOrProbability);
    if (value === 'CALIENTE') {
      return 'hot';
    }
    if (value === 'MEDIO') {
      return 'warm';
    }
    return 'cold';
  }

  public opportunityFormTemperature(): 'FRIO' | 'MEDIO' | 'CALIENTE' {
    return this.opportunityTemperatureValue(this.opportunityForm.probabilidad);
  }

  public setOpportunityFormTemperature(value: string | null): void {
    const temperature =
      value === 'CALIENTE' || value === 'MEDIO' || value === 'FRIO' ? value : 'MEDIO';
    this.opportunityForm.probabilidad =
      temperature === 'CALIENTE' ? 85 : temperature === 'MEDIO' ? 60 : 25;
  }

  public opportunityFinancialSummary(item: CrmOportunidad) {
    return buildOpportunityFinancialSummary(
      item,
      this.latestFinalNegotiationRecord(item),
      this.opportunityPaymentRecords(),
    );
  }

  public opportunityFinancialStatusLabel(item: CrmOportunidad): string {
    return this.humanize(this.opportunityFinancialSummary(item).status);
  }

  public opportunityFinancialStatusTone(
    item: CrmOportunidad,
  ): 'pending' | 'partial' | 'paid' | 'overdue' {
    return resolveOpportunityFinancialStatusTone(this.opportunityFinancialSummary(item).status);
  }

  public paymentStatusLabel(value: string | null | undefined): string {
    return this.humanize(value || 'PENDIENTE');
  }

  public paymentStatusTone(
    value: string | null | undefined,
  ): 'pending' | 'partial' | 'paid' | 'overdue' {
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

  public opportunityPaymentPlan(item: CrmOportunidad): CrmPaymentPlan {
    return buildOpportunityPaymentPlan(
      item,
      this.latestFinalNegotiationRecord(item),
      this.opportunityPaymentRecords(),
    );
  }

  protected paymentFollowUpItems = computed(() =>
    this.paymentFollowUpCandidates().filter((item) => {
      const plan = this.opportunityPaymentPlan(item);
      return (
        plan.isCredit &&
        plan.paidAmount > 0 &&
        (plan.pendingAmount > 0 || plan.pendingInstallments.length > 0)
      );
    }),
  );

  protected readonly paymentTrackingFilterState = computed<PaymentTrackingFilterState>(() => ({
    status: this.paymentTrackingStatusFilter(),
    installmentStatus: this.paymentTrackingInstallmentFilter(),
    dueFrom: this.paymentTrackingDueFrom(),
    dueTo: this.paymentTrackingDueTo(),
    responsible: this.paymentTrackingResponsible(),
  }));

  protected readonly paymentTrackingResponsibleOptions = computed(() => {
    const values = Array.from(
      new Set(
        this.paymentFollowUpItems()
          .map((item) => item.responsableId)
          .filter(Boolean),
      ),
    ).sort((a, b) => this.responsibleName(a).localeCompare(this.responsibleName(b)));
    return [
      { label: 'Todos', value: 'TODOS' },
      ...values.map((value) => ({ label: this.responsibleName(value), value })),
    ];
  });

  protected readonly filteredPaymentFollowUpItems = computed(() => {
    const query = this.query().trim().toLowerCase();
    const status = this.paymentTrackingStatusFilter();
    const installmentStatus = this.paymentTrackingInstallmentFilter();
    const dueFrom = this.toValidDate(this.paymentTrackingDueFrom());
    const dueTo = this.toValidDate(this.paymentTrackingDueTo());
    const responsible = this.paymentTrackingResponsible();

    return this.paymentFollowUpItems()
      .filter((item) => this.matchesOpportunityQuery(item, query))
      .filter((item) => responsible === 'TODOS' || item.responsableId === responsible)
      .filter((item) => {
        if (status === 'TODOS') {
          return true;
        }
        const tone = this.paymentDueTone(item).label.toUpperCase().replace(/\s+/g, '_');
        return tone === status;
      })
      .filter((item) => {
        if (installmentStatus === 'TODOS') {
          return true;
        }
        const plan = this.opportunityPaymentPlan(item);
        if (installmentStatus === 'PAGADAS') {
          return plan.pendingAmount <= 0;
        }
        if (installmentStatus === 'VENCIDAS') {
          return plan.overdueInstallments.length > 0;
        }
        return plan.pendingInstallments.length > 0;
      })
      .filter((item) => {
        if (!dueFrom && !dueTo) {
          return true;
        }
        const nextDate = this.toValidDate(this.paymentNextInstallment(item)?.fecha);
        if (!nextDate) {
          return false;
        }
        const fromOk = !dueFrom || nextDate >= dueFrom;
        const toOk = !dueTo || nextDate <= dueTo;
        return fromOk && toOk;
      })
      .sort((a, b) => this.paymentFollowUpPriority(b) - this.paymentFollowUpPriority(a));
  });

  protected readonly paymentFollowUpRows = computed(() => {
    const page = Math.min(
      this.paymentTrackingPage(),
      Math.max(this.paymentTrackingTotalPages() - 1, 0),
    );
    const start = page * this.crmLargeListPageSize;
    return this.filteredPaymentFollowUpItems().slice(start, start + this.crmLargeListPageSize);
  });

  protected readonly paymentTrackingTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredPaymentFollowUpItems().length / this.crmLargeListPageSize)),
  );

  protected readonly paymentTrackingPageRangeLabel = computed(() => {
    const total = this.filteredPaymentFollowUpItems().length;
    if (!total) {
      return '0 de 0';
    }
    const page = Math.min(
      this.paymentTrackingPage(),
      Math.max(this.paymentTrackingTotalPages() - 1, 0),
    );
    const start = page * this.crmLargeListPageSize + 1;
    const end = Math.min(start + this.crmLargeListPageSize - 1, total);
    return `${start}-${end} de ${total}`;
  });

  protected readonly paymentTrackingPageMeta = computed(() => ({
    page: Math.min(this.paymentTrackingPage(), Math.max(this.paymentTrackingTotalPages() - 1, 0)),
    pageSize: this.crmLargeListPageSize,
    totalItems: this.filteredPaymentFollowUpItems().length,
    totalPages: this.paymentTrackingTotalPages(),
    rangeLabel: this.paymentTrackingPageRangeLabel(),
  }));

  protected readonly paymentFollowUpSummaryCards = computed(() => {
    const rows = this.filteredPaymentFollowUpItems();
    const pendingAmount = rows.reduce(
      (sum, item) => sum + this.opportunityPaymentPlan(item).pendingAmount,
      0,
    );
    const pendingInstallments = rows.flatMap(
      (item) => this.opportunityPaymentPlan(item).pendingInstallments,
    );
    const overdueInstallments = rows.flatMap(
      (item) => this.opportunityPaymentPlan(item).overdueInstallments,
    );
    const soonInstallments = pendingInstallments.filter(
      (payment) =>
        this.paymentDaysUntil(payment.fecha) >= 0 && this.paymentDaysUntil(payment.fecha) <= 7,
    );
    const paidThisMonth = this.opportunityPaymentRecords().filter(
      (payment) =>
        ['PAGADO', 'PARCIAL'].includes(payment.estado) &&
        this.isThisMonth(payment.fecha || payment.createdAt),
    );
    const paidThisMonthAmount = paidThisMonth.reduce(
      (sum, payment) => sum + Number(payment.monto || 0),
      0,
    );
    return [
      {
        label: 'Saldo total pendiente',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(pendingAmount)}`,
        detail: `${rows.length} cuentas pendientes`,
        icon: 'pi pi-file-excel',
        color: '#ef4444',
        soft: '#fee2e2',
      },
      {
        label: 'Por vencer (proximos 7 dias)',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(soonInstallments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0))}`,
        detail: `${soonInstallments.length} cuotas por vencer`,
        icon: 'pi pi-calendar',
        color: '#f97316',
        soft: '#ffedd5',
      },
      {
        label: 'Vencidos',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(overdueInstallments.reduce((sum, payment) => sum + Number(payment.monto || 0), 0))}`,
        detail: `${overdueInstallments.length} cuotas vencidas`,
        icon: 'pi pi-exclamation-triangle',
        color: '#ef4444',
        soft: '#fee2e2',
      },
      {
        label: 'Pagado este mes',
        value: `${this.tenantBaseCurrencySymbol()} ${this.formatCompactAmount(paidThisMonthAmount)}`,
        detail: `${paidThisMonth.length} pagos registrados`,
        icon: 'pi pi-dollar',
        color: '#059669',
        soft: '#dcfce7',
      },
    ];
  });

  protected readonly paymentFollowUpUpcoming = computed(() =>
    this.filteredPaymentFollowUpItems()
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
    const rows = this.filteredPaymentFollowUpItems();
    const overdue = rows.filter(
      (item) => this.opportunityPaymentPlan(item).overdueInstallments.length > 0,
    );
    const soon = rows.filter((item) => {
      const next = this.paymentNextInstallment(item);
      const days = this.paymentDaysUntil(next?.fecha);
      return (
        !this.opportunityPaymentPlan(item).overdueInstallments.length && days >= 0 && days <= 7
      );
    });
    const paid = this.paymentFollowUpCandidates()
      .filter((item) => this.opportunityFinancialSummary(item).pending <= 0)
      .filter((item) => this.matchesOpportunityQuery(item, this.query().trim().toLowerCase()));
    return [
      {
        label: 'Vencidas',
        count: overdue.length,
        amount: overdue.reduce(
          (sum, item) =>
            sum +
            this.opportunityPaymentPlan(item).overdueInstallments.reduce(
              (inner, payment) => inner + Number(payment.monto || 0),
              0,
            ),
          0,
        ),
        color: '#ef4444',
      },
      {
        label: 'Por vencer',
        count: soon.length,
        amount: soon.reduce(
          (sum, item) => sum + Number(this.paymentNextInstallment(item)?.monto || 0),
          0,
        ),
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

  protected readonly paymentTrackingRows = computed<PaymentTrackingRow[]>(() =>
    this.paymentFollowUpRows().map((item) => {
      const plan = this.opportunityPaymentPlan(item);
      const nextPayment = this.paymentNextInstallment(item);
      const tone = this.paymentDueTone(item);
      return {
        id: item.id,
        initials: this.contactInitials(this.opportunityContactName(item)),
        contactName: this.opportunityContactName(item),
        offerName: this.quoteOfferName(item),
        opportunityCode: `Oportunidad #OP-${item.id}`,
        pendingAmount: plan.pendingAmount,
        currencyPrefix: this.catalogCurrencyPrefix(item.moneda),
        installmentProgress: this.paymentInstallmentProgress(item),
        pendingInstallmentsCount: plan.pendingInstallments.length,
        nextPaymentDate: nextPayment?.fecha || null,
        nextPaymentLabel: nextPayment ? this.paymentDaysLabel(nextPayment.fecha) : 'Sin cuota',
        dueLabel: tone.label,
        dueColor: tone.color,
        dueBg: tone.bg,
        responsibleName: this.responsibleName(item.responsableId),
        isCredit: plan.isCredit,
        remainingProgrammed: plan.remainingProgrammed,
      };
    }),
  );

  protected readonly paymentTrackingUpcoming = computed<PaymentTrackingUpcomingItem[]>(() =>
    this.paymentFollowUpUpcoming().map((entry) => ({
      id: entry.id,
      opportunityId: entry.item.id,
      initials: this.contactInitials(this.opportunityContactName(entry.item)),
      contactName: this.opportunityContactName(entry.item),
      amount: Number(entry.payment.monto || 0),
      currencyPrefix: this.catalogCurrencyPrefix(entry.item.moneda),
      date: entry.payment.fecha,
      dayLabel: this.paymentDaysLabel(entry.payment.fecha),
      overdue: this.paymentDaysUntil(entry.payment.fecha) < 0,
    })),
  );

  protected registerFirstPaymentFromTracking(): void {
    const first = this.paymentFollowUpRows()[0];
    if (first) {
      this.openOpportunityPaymentDialog(first);
    }
  }

  protected openPaymentTrackingDetail(id: number): void {
    const item = this.paymentTrackingOpportunityById(id);
    if (item) {
      this.openPaymentFollowUpDetail(item);
    }
  }

  protected openPaymentTrackingPaymentDialog(id: number): void {
    const item = this.paymentTrackingOpportunityById(id);
    if (item) {
      this.openOpportunityPaymentDialog(item);
    }
  }

  protected schedulePaymentTrackingInstallments(id: number): void {
    const item = this.paymentTrackingOpportunityById(id);
    if (item) {
      this.scheduleRemainingInstallments(item);
    }
  }

  protected showPaymentTrackingOverdue(): void {
    this.query.set('vencido');
  }

  private paymentTrackingOpportunityById(id: number): CrmOportunidad | null {
    return this.paymentFollowUpCandidates().find((item) => item.id === id) ?? null;
  }

  protected paymentNextInstallment(item: CrmOportunidad): OpportunityPaymentRecord | null {
    return (
      [...this.opportunityPaymentPlan(item).pendingInstallments].sort(
        (a, b) => Date.parse(a.fecha || '') - Date.parse(b.fecha || ''),
      )[0] ?? null
    );
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

  public scheduleRemainingInstallments(item: CrmOportunidad): void {
    const plan = this.opportunityPaymentPlan(item);
    if (!plan.isCredit) {
      this.errorMessage.set(
        'Esta venta esta registrada como contado. No requiere cuotas pendientes.',
      );
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
    const missingCount = Math.max(0, plan.cuotas - 1 - plan.pendingInstallments.length);
    if (missingCount <= 0 && plan.scheduledAmount + 0.01 >= plan.pendingAmount) {
      this.successMessage.set('Las cuotas pendientes ya estan programadas.');
      return;
    }
    const count = Math.max(1, missingCount);
    const amount = Math.round((plan.pendingAmount / count) * 100) / 100;
    const baseDate = new Date();
    const existingCount = plan.paidPayments.length + plan.pendingInstallments.length;
    const records = Array.from({ length: count }, (_, index): OpportunityPaymentRecord => {
      const dueDate = addMonths(baseDate, index + 1);
      const installmentNumber = existingCount + index + 1;
      return {
        id: `installment:${item.id}:${installmentNumber}:${toInputDate(dueDate)}`,
        oportunidadId: item.id,
        fecha: toInputDate(dueDate),
        tipo: 'CUOTA',
        monto:
          index === count - 1
            ? Math.round((plan.pendingAmount - amount * (count - 1)) * 100) / 100
            : amount,
        estado: 'PENDIENTE',
        metodo: 'Credito',
        observacion: `Cuota ${installmentNumber} de ${plan.cuotas} programada`,
        archivoNombre: '',
        archivoDataUrl: '',
        createdAt: new Date().toISOString(),
      };
    });
    forkJoin(
      records.map((record) =>
        this.crmOpportunities.createResource(item.id, 'PAGO', {
          clientKey: record.id,
          fecha: record.fecha,
          tipo: record.tipo,
          monto: record.monto,
          estado: record.estado,
          metodo: record.metodo,
          observacion: record.observacion,
        }),
      ),
    ).subscribe({
      next: (resources) => {
        const saved = resources.map((resource) => this.mapPaymentResource(resource));
        const byId = new Map(this.opportunityPaymentRecords().map((record) => [record.id, record]));
        saved.forEach((record) => byId.set(record.id, record));
        this.opportunityPaymentRecords.set([...byId.values()]);
        this.successMessage.set('Cuotas pendientes programadas para seguimiento de pagos.');
      },
      error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
    });
  }

  protected openPaymentFollowUpDetail(item: CrmOportunidad): void {
    this.openPipelineOpportunityDetail(item, 'GANADO');
    this.opportunityDetailTab.set('pagos');
  }

  public documentCategoryLabel(value: string | null | undefined): string {
    return (
      this.documentCategoryOptions.find((item) => item.value === value)?.label ||
      this.humanize(value || 'OTRO')
    );
  }

  public historyToneClass(value: OpportunityHistoryEvent['tone']): string {
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

  public responsibleName(value: string | null | undefined): string {
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

  public opportunityStatusTone(item: CrmOportunidad): 'active' | 'won' | 'lost' | 'neutral' {
    return resolveOpportunityStatusTone(item, this.isActiveOpportunity(item));
  }

  public quoteStatusValue(item: Cotizacion): string {
    return resolveQuoteStatusValue(item);
  }

  public quoteStatusLabel(item: Cotizacion): string {
    return resolveQuoteStatusLabel(item);
  }

  public quoteStatusTone(item: Cotizacion): 'pending' | 'accepted' | 'rejected' {
    return resolveQuoteStatusTone(item);
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
    return opportunity?.titulo || item.detalles?.[0]?.descripcion || 'Cotización comercial';
  }

  public quoteNextStep(item: Cotizacion): string {
    const status = this.quoteStatusValue(item);
    if (status === 'BORRADOR') {
      return 'Enviar cotización';
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
      return 'El cliente pidió un ajuste o mejores condiciones';
    }
    if (status === 'RECHAZADA') {
      return 'Cerrada rechazada';
    }
    return this.quoteStatusLabel(item);
  }

  public isQuotePdfDownloading(id: number): boolean {
    return this.quotations.isPdfDownloading(id);
  }

  private setQuotePdfDownloading(id: number, active: boolean): void {
    this.quotations.setPdfDownloading(id, active);
  }

  public downloadQuotePdf(
    item: Cotizacion,
    successMessage = 'Documento PDF generado.',
    clientValidated = false,
  ): void {
    const opportunity = this.opportunityForQuote(item) || this.selectedOpportunity();
    if (!clientValidated && opportunity) {
      this.clientCompletionQuote.set(item);
      if (this.requireClientCompletion(opportunity, 'QUOTE_PDF')) {
        return;
      }
      this.clientCompletionQuote.set(null);
    }
    this.setQuotePdfDownloading(item.id, true);
    this.actionId.set(item.id);
    this.crmQuotations
      .getPdf(item.id)
      .pipe(
        finalize(() => {
          this.setQuotePdfDownloading(item.id, false);
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: (file) => {
          const contentType = file.contentType || 'application/pdf';
          const fileName = file.fileName || `cotizacion-crm-${item.id}.pdf`;
          this.downloadGeneratedBase64(fileName, contentType, file.base64);
          if (successMessage) {
            this.successMessage.set(successMessage);
          }
          // Si la cotización aún estaba en borrador, registrar emisión/descarga en PDF
          // para cumplir el requisito y permitir avanzar a Cotizado
          if (item.estado === 'BORRADOR' || !item.estado) {
            this.sendQuote(item, 'PDF');
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public canSendQuoteByWhatsapp(item: Cotizacion): boolean {
    const opportunity = this.opportunityForQuote(item) || this.selectedOpportunity();
    return Boolean(
      opportunity?.prospectoId && this.onlyDigits(this.opportunityContactPhone(opportunity)),
    );
  }

  public sendQuoteByWhatsapp(item: Cotizacion, clientValidated = false): void {
    if (this.isQuoteWhatsappSending(item.id) || this.isQuoteWhatsappLocked(item)) {
      return;
    }
    const opportunity = this.opportunityForQuote(item) || this.selectedOpportunity();
    if (!clientValidated && opportunity) {
      this.clientCompletionQuote.set(item);
      if (this.requireClientCompletion(opportunity, 'QUOTE_WHATSAPP')) {
        return;
      }
      this.clientCompletionQuote.set(null);
    }
    const prospectId = Number(opportunity?.prospectoId || 0);
    if (
      !prospectId ||
      !this.onlyDigits(opportunity ? this.opportunityContactPhone(opportunity) : null)
    ) {
      this.errorMessage.set(
        'La cotización necesita una oportunidad vinculada a un prospecto con teléfono.',
      );
      return;
    }
    this.setQuoteWhatsappSending(item.id, true);
    this.errorMessage.set(null);
    this.api
      .sendCrmWhatsappQuote(prospectId, item.id, this.quoteShareMessage(item))
      .pipe(finalize(() => this.setQuoteWhatsappSending(item.id, false)))
      .subscribe({
        next: ({ cotizacion }) => {
          const saved = opportunity
            ? this.withQuoteOpportunity(cotizacion, opportunity.id)
            : cotizacion;
          this.upsertQuote(saved);
          if (opportunity) {
            this.refreshOpportunityQuotes(opportunity.id);
          }
          this.successMessage.set(
            'Cotización PDF enviada por el canal de WhatsApp configurado en Azurion.',
          );
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public isQuoteWhatsappSending(id: number): boolean {
    return this.quotations.isWhatsappSending(id);
  }

  public isQuoteWhatsappSent(item: Cotizacion): boolean {
    return item.whatsappSendStatus === 'SENT';
  }

  public isQuoteWhatsappLocked(item: Cotizacion): boolean {
    return ['SENT', 'SENDING', 'UNKNOWN'].includes(item.whatsappSendStatus || '');
  }

  public isQuoteWhatsappProcessing(item: Cotizacion): boolean {
    return this.isQuoteWhatsappSending(item.id) || item.whatsappSendStatus === 'SENDING';
  }

  public quoteWhatsappActionLabel(item: Cotizacion): string {
    if (this.isQuoteWhatsappProcessing(item)) {
      return 'Enviando por WhatsApp...';
    }
    if (item.whatsappSendStatus === 'SENT') {
      return 'Enviado por WhatsApp';
    }
    if (item.whatsappSendStatus === 'UNKNOWN') {
      return 'Verificar envío';
    }
    return 'WhatsApp';
  }

  private setQuoteWhatsappSending(id: number, active: boolean): void {
    this.quotations.setWhatsappSending(id, active);
  }

  public canSendQuoteByEmail(item: Cotizacion): boolean {
    return Boolean(this.quoteContactEmail(item));
  }

  public isQuoteEmailSending(id: number): boolean {
    return this.quotations.isEmailSending(id);
  }

  private setQuoteEmailSending(id: number, active: boolean): void {
    this.quotations.setEmailSending(id, active);
  }

  public sendQuoteByEmail(item: Cotizacion, clientValidated = false): void {
    if (this.isQuoteEmailSending(item.id)) {
      return;
    }
    const opportunity = this.opportunityForQuote(item) || this.selectedOpportunity();
    if (!clientValidated && opportunity) {
      this.clientCompletionQuote.set(item);
      if (this.requireClientCompletion(opportunity, 'QUOTE_EMAIL')) {
        return;
      }
      this.clientCompletionQuote.set(null);
    }
    if (!this.quoteContactEmail(item)) {
      this.errorMessage.set('El contacto no tiene correo electrónico para enviar la cotización.');
      return;
    }
    const opportunityId =
      Number(item.crmOportunidadId ?? this.selectedOpportunity()?.id ?? 0) || null;
    this.errorMessage.set(null);
    this.setQuoteEmailSending(item.id, true);
    this.api
      .sendCotizacionEmail(item.id)
      .pipe(finalize(() => this.setQuoteEmailSending(item.id, false)))
      .subscribe({
        next: ({ cotizacion, destinatario }) => {
          const saved = opportunityId
            ? this.withQuoteOpportunity(cotizacion, opportunityId)
            : cotizacion;
          this.upsertQuote(saved);
          if (saved.crmOportunidadId) {
            this.refreshOpportunityQuotes(Number(saved.crmOportunidadId));
          }
          this.successMessage.set(`Cotización enviada correctamente a ${destinatario}.`);
          this.crmOpportunities.list().subscribe({
            next: (oportunidades) => {
              this.oportunidades.set(oportunidades);
              const currentId = this.selectedOpportunity()?.id;
              const updated = currentId
                ? oportunidades.find((opportunity) => Number(opportunity.id) === Number(currentId))
                : null;
              if (updated) {
                this.selectedOpportunity.set(updated);
              }
            },
            error: () => undefined,
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected sendQuote(item: Cotizacion, canalEnvio = 'WHATSAPP'): void {
    this.updateQuoteFlow(
      item,
      {
        estado: 'ENVIADA',
        canalEnvio,
      },
      'Cotización marcada como enviada.',
    );
  }

  public followQuote(item: Cotizacion): void {
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(10, 0, 0, 0);
    this.updateQuoteFlow(
      item,
      {
        estado: 'EN_SEGUIMIENTO',
        canalEnvio: item.canalEnvio || 'WHATSAPP',
        proximoSeguimientoEn: next.toISOString(),
      },
      'Cotización en seguimiento.',
    );
  }

  public acceptQuoteToNegotiation(item: Cotizacion): void {
    this.updateQuoteFlow(
      item,
      {
        estado: 'NEGOCIACION',
        decisionSiguiente: 'NEGOCIACION',
      },
      'El cliente no aceptó la propuesta tal como está. La oportunidad pasó a negociación.',
      'NEGOCIACION',
    );
  }

  public acceptQuoteToSale(item: Cotizacion): void {
    this.updateQuoteFlow(
      item,
      {
        estado: 'ACEPTADA',
        decisionSiguiente: 'VENTA',
      },
      'El cliente aceptó las condiciones. La oportunidad pasó a negociación para confirmar el cierre.',
      'NEGOCIACION',
    );
  }

  public rejectQuote(item: Cotizacion): void {
    this.updateQuoteFlow(
      item,
      {
        estado: 'RECHAZADA',
        motivoRechazo: 'Rechazada desde CRM',
      },
      'Cotización rechazada.',
    );
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
    const client = item.clienteId
      ? this.clientes().find((cliente) => cliente.id === item.clienteId)
      : null;
    return client?.telefono || '';
  }

  private quoteContactEmail(item: Cotizacion): string {
    const opportunity = this.opportunityForQuote(item);
    if (opportunity) {
      return this.opportunityContactEmail(opportunity);
    }
    const client = item.clienteId
      ? this.clientes().find((cliente) => cliente.id === item.clienteId)
      : null;
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
    const observation = item.observacion ? `\n\nObservación: ${item.observacion}` : '';
    const currencySymbol = this.catalogCurrencyPrefix(item.moneda);
    return `Hola ${contactName}, te comparto la cotización ${quoteCode(item.id)} por ${opportunityTitle}. Total: ${currencySymbol} ${amount}.${dueDate}${observation}`;
  }

  protected savePromotion(): void {
    const codigo = this.promotionForm.codigo.trim();
    const nombre = this.promotionForm.nombre.trim();
    if (!codigo || !nombre) {
      this.errorMessage.set('Indica el código y el nombre de la promoción.');
      return;
    }
    if (Number(this.promotionForm.valor || 0) < 0) {
      this.errorMessage.set('El valor de la promoción no puede ser negativo.');
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
          this.promocionesCotizacion.set([
            saved,
            ...this.promocionesCotizacion().filter((item) => item.id !== saved.id),
          ]);
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
      [
        'Oportunidad',
        'Contacto',
        'Empresa',
        'Etapa',
        'Valor estimado',
        'Interes',
        'Fecha estimada',
        'Responsable',
        'Estado',
      ],
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
      [
        'Cliente',
        'Empresa',
        'Producto comprado',
        'Valor compra',
        'Monto pagado',
        'Deuda pendiente',
        'Documentos',
        'Fecha cierre',
        'Responsable',
      ],
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

  public opportunityContactName(item: CrmOportunidad): string {
    return item.clienteNombre || item.prospectoNombre || 'Sin contacto';
  }

  public opportunityCompanyLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    const cliente = this.clientForOpportunity(item);
    if (cliente) {
      return this.normalizeClientDocumentType(cliente.tipoDocumento) === '6'
        ? cliente.nombre
        : 'Persona natural';
    }
    const personType = this.normalizeProspectPersonType(prospect?.tipoPersona);
    if (!prospect || personType === 'SIN_DEFINIR') {
      return (
        prospect?.razonSocial || prospect?.nombreComercial || 'Persona o empresa por confirmar'
      );
    }
    if (personType === 'JURIDICA') {
      return prospect.razonSocial || prospect.nombreComercial || 'Empresa sin identificar';
    }
    return 'Persona natural';
  }

  protected opportunityCampaignLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    return prospect?.campania?.trim() || '';
  }

  protected opportunityOriginLabel(item: CrmOportunidad): string {
    const prospect = this.prospectForOpportunity(item);
    if (prospect) {
      return this.humanize(prospect.canalIngreso || prospect.origen || 'WEB');
    }
    return item.clienteId ? 'Cliente existente' : 'Manual';
  }

  protected opportunityContactPhone(item: CrmOportunidad): string {
    return (
      this.prospectForOpportunity(item)?.telefono || this.clientForOpportunity(item)?.telefono || ''
    );
  }

  protected opportunityContactEmail(item: CrmOportunidad): string {
    return (
      this.prospectForOpportunity(item)?.correo || this.clientForOpportunity(item)?.email || ''
    );
  }

  public opportunityTags(item: CrmOportunidad): string[] {
    const tags = [this.opportunityTypeLabel(item.tipoOportunidad), this.stageName(item.etapa)];
    const catalogo = this.catalogoItems().find((catalog) => catalog.id === item.catalogoItemId);
    if (catalogo?.nombre) {
      tags.push(catalogo.nombre);
    }
    return tags.filter(Boolean).slice(0, 4);
  }

  private defaultRequirementForOpportunity(item: CrmOportunidad): OpportunityRequirementRecord {
    const catalogo = this.opportunityCatalogItem(item);
    const name =
      catalogo?.nombre ||
      item.descripcion ||
      item.titulo ||
      this.opportunityTypeLabel(item.tipoOportunidad);
    // El precio nace del producto registrado; el monto de la oportunidad solo
    // aplica cuando la oferta no tiene precio referencial.
    const amount = Number(catalogo?.precioReferencial || item.montoEstimado || 0);
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
    const record = {
      ...this.defaultRequirementForOpportunity(item),
      id: this.createLocalId('req'),
    };
    this.crmOpportunities
      .createResource(item.id, 'REQUISITO', {
        clientKey: record.id,
        catalogoItemId: record.catalogoItemId,
        nombre: record.nombre,
        cantidad: record.cantidad,
        precioUnitario: record.precioUnitario,
        observacion: record.observacion,
      })
      .subscribe({
        next: (resource) => {
          this.opportunityRequirementRecords.set([
            ...this.opportunityRequirementRecords(),
            this.mapRequirementResource(resource),
          ]);
          this.refreshOpportunityAfterEstimateChange(item.id);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
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
    return (
      this.actividades()
        .filter((activity) => activity.oportunidadId === item.id && activity.estado === 'PENDIENTE')
        .sort(
          (a, b) => Date.parse(a.fechaProgramada || '') - Date.parse(b.fechaProgramada || ''),
        )[0] ?? null
    );
  }

  private hasOpportunityActivity(
    item: CrmOportunidad,
    predicate?: (activity: CrmActividad) => boolean,
  ): boolean {
    return this.actividades().some((activity) => {
      const linked =
        activity.oportunidadId === item.id ||
        (!!item.prospectoId && activity.prospectoId === item.prospectoId);
      return linked && (!predicate || predicate(activity));
    });
  }

  private hasOpportunityQuoteContext(item: CrmOportunidad): boolean {
    return this.cotizaciones().some((quote) => quote.crmOportunidadId === item.id);
  }

  private hasOpportunitySentQuote(item: CrmOportunidad): boolean {
    return this.cotizaciones().some(
      (quote) =>
        quote.crmOportunidadId === item.id &&
        ['ENVIADA', 'EN_SEGUIMIENTO', 'ACEPTADA'].includes(this.quoteStatusValue(quote)),
    );
  }

  private defaultStageObjective(stage: string | null | undefined): string {
    return this.stages.defaultObjective(stage);
  }

  private defaultStageProbability(stage: string | null | undefined): number {
    return this.stages.defaultProbability(stage);
  }

  private defaultStageValidationMode(stage: string | null | undefined): StageValidationMode {
    return this.stages.defaultValidationMode(stage);
  }

  private stageChecklistFor(
    item: CrmOportunidad,
    stage: string | null | undefined,
  ): PipelineChecklistItem[] {
    const code = String(stage || '').toUpperCase();
    const hasActivity = this.hasOpportunityActivity(item);
    const hasCompletedContact = this.hasOpportunityActivity(
      item,
      (activity) =>
        activity.estado === 'REALIZADA' &&
        ['LLAMADA', 'WHATSAPP', 'CORREO', 'REUNION', 'VISITA'].includes(activity.tipoActividad),
    );
    const hasConfirmedInterest = this.hasOpportunityActivity(
      item,
      (activity) =>
        activity.estado === 'REALIZADA' &&
        (['INTERESADO', 'COTIZACION_SOLICITADA'].includes(
          String(activity.resultadoContacto || ''),
        ) ||
          ['MEDIO', 'CALIENTE'].includes(String(activity.nivelInteres || '').toUpperCase())),
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
          [
            'ACTIVIDAD_REALIZADA',
            'Actividad de contacto cumplida',
            'Marca una llamada, WhatsApp, correo, reunion o visita como realizada para confirmar que hubo contacto.',
            true,
            hasCompletedContact,
            'activity',
          ],
          [
            'RESPONSABLE',
            'Responsable asignado',
            'Debe existir un usuario responsable del siguiente contacto.',
            true,
            !!item.responsableId,
            'detail',
          ],
          [
            'PROXIMA_ACCION',
            'Proxima actividad definida',
            'Agenda el siguiente paso para no perder el seguimiento.',
            false,
            hasFutureActivity,
            'activity',
          ],
        ]);
      case 'INTERESADO':
        return make([
          [
            'CLIENTE_DEFINIDO',
            'Cliente definido',
            'La oportunidad debe estar asociada a un prospecto o cliente identificable.',
            true,
            !!this.opportunityContactName(item),
            'detail',
          ],
          [
            'INTERES_CONFIRMADO',
            'Interés confirmado',
            'Debe existir interés real o una actividad que confirme la necesidad.',
            true,
            hasConfirmedInterest || hasMediumInterest || hasOffer,
            'activity',
          ],
          [
            'REQUERIMIENTO',
            'Requerimiento registrado',
            'Completa curso, producto, servicio o paquete solicitado por el cliente.',
            true,
            this.selectedOpportunityRequirements().some(
              (requirement) => !!requirement.nombre.trim(),
            ),
            'detail',
          ],
          [
            'PRESUPUESTO',
            'Presupuesto estimado',
            'Ayuda al vendedor a priorizar la oportunidad.',
            false,
            hasBudget,
            'detail',
          ],
        ]);
      case 'COTIZADO':
        return make([
          [
            'COTIZACION_CREADA',
            'Crear cotización',
            'Genera una cotización desde la oportunidad antes de moverla a cotizado.',
            true,
            hasQuote,
            'quote',
          ],
          [
            'COTIZACION_ENVIADA',
            'Cotización enviada',
            'Marca la cotización como enviada por WhatsApp o correo para confirmar el pase a Cotizado.',
            true,
            hasSentQuote,
            'quote',
          ],
          [
            'SEGUIMIENTO_COTIZACION',
            'Programar seguimiento de cotización',
            'Agenda una llamada o mensaje posterior al envío.',
            false,
            hasFutureActivity,
            'activity',
          ],
        ]);
      case 'NEGOCIACION':
        return make([
          [
            'COTIZACION_PREVIA',
            'Cotización o propuesta previa',
            'La negociación debe partir de una propuesta enviada.',
            true,
            hasQuote,
            'quote',
          ],
          [
            'OBJECIONES',
            'Registrar objeciones o condiciones',
            'Anota el precio, el pago, la garantía o el alcance que se está negociando.',
            false,
            !!item.descripcion,
            'detail',
          ],
          [
            'FECHA_CIERRE',
            'Fecha probable de cierre',
            'Define cuándo se espera cerrar la negociación.',
            true,
            hasCloseDate,
            'detail',
          ],
          [
            'PROXIMA_ACCION',
            'Próxima acción comercial',
            'Mantener una actividad futura evita oportunidades abandonadas.',
            true,
            hasFutureActivity,
            'activity',
          ],
        ]);
      case 'GANADO':
        return make([
          [
            'ACUERDO_FINAL',
            'Acuerdo final registrado',
            'Registra las condiciones finales aceptadas por el cliente.',
            true,
            hasFinalAgreement,
            'detail',
          ],
          [
            'EVIDENCIA_CIERRE',
            'Pago o comprobante registrado',
            'Adjunta voucher, contrato, comprobante o registra pago si aplica.',
            true,
            hasClosingEvidence,
            'detail',
          ],
          [
            'VALOR_CIERRE',
            'Valor de cierre definido',
            'El monto estimado debe estar registrado.',
            true,
            hasBudget,
            'detail',
          ],
          [
            'CONFIRMACION_CIERRE',
            'Confirmación de cierre',
            'Usa «Marcar ganado» cuando el cierre ya esté confirmado.',
            false,
            item.estado === 'GANADA',
            'quote',
          ],
        ]);
      case 'PERDIDO':
        return make([
          [
            'MOTIVO_PERDIDA',
            'Motivo de pérdida',
            'Registra el precio, la competencia, la falta de presupuesto u otra razón.',
            true,
            hasLossReason,
            'lost',
          ],
          [
            'OBSERVACION_FINAL',
            'Observación final',
            'Guarda el aprendizaje comercial del caso.',
            false,
            !!item.motivoPerdida || !!item.descripcion,
            'lost',
          ],
        ]);
      default:
        return make([
          [
            'REVISION_INFO',
            'Revisar información del prospecto',
            'Valida contacto, empresa y oferta.',
            true,
            !!this.opportunityContactName(item),
            'detail',
          ],
          [
            'RESPONSABLE',
            'Asignar responsable',
            'Toda oportunidad necesita un responsable claro.',
            true,
            !!item.responsableId,
            'detail',
          ],
          [
            'PRIMERA_ACTIVIDAD',
            'Programar primera actividad',
            'Agenda una acción inicial de seguimiento.',
            false,
            hasFutureActivity || hasActivity,
            'activity',
          ],
        ]);
    }
  }

  private buildStageMoveReview(item: CrmOportunidad, target: PipelineStageOption): StageMoveReview {
    const mode = this.stageValidationMode(target);
    const checklist = this.stageChecklistFor(item, target.value);
    const missing = checklist.filter((check) => check.required && !check.done);
    const risks = this.opportunityRiskBadges(item);
    const errors = mode === 'STRICT' ? missing.map((check) => check.label) : [];
    const warnings = [...(mode === 'STRICT' ? [] : missing.map((check) => check.label)), ...risks];
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

  public opportunityWhatsappAvailable(item: CrmOportunidad): boolean {
    return Boolean(item.prospectoId && this.onlyDigits(this.opportunityContactPhone(item)));
  }

  private pipelineStageIcon(stage: string): string {
    const icons: Record<string, string> = {
      NUEVO: 'pi pi-sparkles',
      CONTACTADO: 'pi pi-phone',
      INTERESADO: 'pi pi-users',
      COTIZADO: 'pi pi-file',
      NEGOCIACION: 'pi pi-comments',
    };
    return icons[String(stage || '').toUpperCase()] || 'pi pi-flag';
  }

  private pipelineActivityTone(
    activity: CrmActividad | null,
  ): 'danger' | 'warning' | 'normal' | 'muted' {
    if (!activity) {
      return 'muted';
    }
    if (this.isOverdue(activity.fechaProgramada)) {
      return 'danger';
    }
    if (this.isToday(activity.fechaProgramada)) {
      return 'warning';
    }
    return 'normal';
  }

  private pipelinePriorityLabel(item: CrmOportunidad): string | null {
    if (item.fechaCierreEstimada && this.isOverdue(item.fechaCierreEstimada)) {
      return 'En riesgo';
    }
    if (item.fechaCierreEstimada && this.isToday(item.fechaCierreEstimada)) {
      return 'Vence hoy';
    }
    if (Number(item.probabilidad || 0) >= 75) {
      return 'Alta prioridad';
    }
    return null;
  }

  private pipelinePriorityTone(
    item: CrmOportunidad,
  ): 'danger' | 'warning' | 'success' | 'info' | null {
    if (item.fechaCierreEstimada && this.isOverdue(item.fechaCierreEstimada)) {
      return 'danger';
    }
    if (item.fechaCierreEstimada && this.isToday(item.fechaCierreEstimada)) {
      return 'warning';
    }
    if (Number(item.probabilidad || 0) >= 75) {
      return 'info';
    }
    return null;
  }

  public isOpportunityWhatsappSending(id: number): boolean {
    return this.sendingOpportunityWhatsappIds().has(id);
  }

  public sendOpportunityByWhatsapp(
    item: CrmOportunidad,
    template?: OpportunityMessageTemplate,
  ): void {
    if (this.isOpportunityWhatsappSending(item.id)) {
      return;
    }
    const prospectId = Number(item.prospectoId || 0);
    if (!prospectId || !this.onlyDigits(this.opportunityContactPhone(item))) {
      this.errorMessage.set('La oportunidad no tiene un prospecto con teléfono para WhatsApp.');
      return;
    }
    this.sendingOpportunityWhatsappIds.update((current) => new Set(current).add(item.id));
    this.actionId.set(item.id);
    this.errorMessage.set(null);
    this.api
      .sendCrmWhatsappMessage(prospectId, {
        mensaje: this.renderOpportunityMessage(template, item),
        previewUrl: true,
      })
      .pipe(
        finalize(() => {
          this.sendingOpportunityWhatsappIds.update((current) => {
            const next = new Set(current);
            next.delete(item.id);
            return next;
          });
          this.actionId.set(null);
        }),
      )
      .subscribe({
        next: () =>
          this.successMessage.set(
            'Mensaje enviado por el canal de WhatsApp configurado en Azurion.',
          ),
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  public opportunityEmailAvailable(item: CrmOportunidad): boolean {
    return Boolean(this.opportunityContactEmail(item));
  }

  public isOpportunityEmailSending(id: number): boolean {
    return this.sendingOpportunityEmailIds().has(id);
  }

  public sendOpportunityByEmail(item: CrmOportunidad, template?: OpportunityMessageTemplate): void {
    if (this.isOpportunityEmailSending(item.id)) {
      return;
    }
    if (!this.opportunityEmailAvailable(item)) {
      this.errorMessage.set('La oportunidad no tiene un prospecto o cliente con correo.');
      return;
    }
    const subject = template?.title || `Seguimiento: ${item.titulo}`;
    const message = this.renderOpportunityMessage(template, item);
    this.sendingOpportunityEmailIds.update((current) => new Set(current).add(item.id));
    this.errorMessage.set(null);
    this.api
      .sendCrmOpportunityEmail(item.id, subject, message)
      .pipe(
        finalize(() =>
          this.sendingOpportunityEmailIds.update((current) => {
            const next = new Set(current);
            next.delete(item.id);
            return next;
          }),
        ),
      )
      .subscribe({
        next: (response) => {
          this.successMessage.set(`Correo enviado desde Azurion a ${response.destinatario}.`);
          this.crmFollowups.pageActivities({ page: 0, size: CRM_INITIAL_PAGE_SIZE }).subscribe({
            next: (page) => this.actividades.set(page.content),
            error: () => undefined,
          });
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private renderOpportunityMessage(
    template: OpportunityMessageTemplate | undefined,
    item: CrmOportunidad,
  ): string {
    const base =
      template?.body ||
      'Hola {{cliente}}, te escribo por la oportunidad {{oportunidad}}. El valor estimado es {{monto}} y podemos coordinar el siguiente paso.';
    const replacements: Record<string, string> = {
      cliente: this.opportunityContactName(item),
      oportunidad: item.titulo,
      monto: `${this.catalogCurrencyPrefix(item.moneda)} ${this.formatCompactAmount(Number(item.montoEstimado || 0))}`,
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
    const price = Number(catalogo?.precioReferencial || item.montoEstimado || 0);
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
    const source = requirements.length
      ? requirements
      : [this.defaultRequirementForOpportunity(item)];
    const lines = source
      .filter(
        (requirement) => requirement.nombre.trim() || Number(requirement.precioUnitario || 0) > 0,
      )
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
      catalogoItemId:
        detail.catalogoItemId ??
        this.catalogoItems().find((item) =>
          (detail.catalogoNombre || detail.descripcion || detail.productoNombre || '')
            .toLowerCase()
            .includes(item.nombre.toLowerCase()),
        )?.id ??
        null,
      productoId: detail.productoId ?? null,
      promocionId: detail.promocionId ?? null,
      descripcion:
        detail.catalogoNombre ||
        detail.descripcion ||
        detail.productoNombre ||
        'Ajuste de cotizacion',
      cantidad: this.normalizeQuoteQuantity(detail.cantidad),
      precioUnitario: Math.max(0, Number(detail.precioUnitario || 0)),
      descuento: Math.max(0, Number(detail.descuento || 0)),
    }));
    return lines.length
      ? lines
      : [
          {
            catalogoItemId: null,
            productoId: null,
            promocionId: null,
            descripcion: `Ajuste de ${quoteCode(quote.id)}`,
            cantidad: 1,
            precioUnitario: Math.max(0, Number(quote.total || 0)),
            descuento: 0,
          },
        ];
  }

  private defaultQuoteSucursalId(): number | null {
    return (
      this.auth.currentSession()?.sucursales?.[0]?.id ??
      this.sucursales().find((item) => item.activo)?.id ??
      this.sucursales()[0]?.id ??
      null
    );
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
    return item.prospectoId
      ? (this.prospectos().find((prospect) => prospect.id === item.prospectoId) ?? null)
      : null;
  }

  private clientForOpportunity(item: CrmOportunidad): Cliente | null {
    return item.clienteId
      ? (this.clientes().find((cliente) => cliente.id === item.clienteId) ?? null)
      : null;
  }

  private opportunityForQuote(item: Cotizacion): CrmOportunidad | null {
    return item.crmOportunidadId
      ? (this.oportunidades().find((opportunity) => opportunity.id === item.crmOportunidadId) ??
          null)
      : null;
  }

  private defaultOpportunityActivitySubject(item: CrmOportunidad, tipoActividad: string): string {
    const action = this.humanize(tipoActividad).toLowerCase();
    return `${action.charAt(0).toUpperCase()}${action.slice(1)} por ${item.titulo}`;
  }

  private sumOpportunityAmount(items: readonly CrmOportunidad[], preferReal = false): number {
    return items.reduce((sum, item) => sum + this.opportunityAmountInBase(item, preferReal), 0);
  }

  /** Normalizes mixed-currency opportunity amounts before using them in aggregate KPIs. */
  private opportunityAmountInBase(item: CrmOportunidad, preferReal = false): number {
    const amount = Number(
      (preferReal ? item.montoReal : item.montoEstimado) ?? item.montoEstimado ?? 0,
    );
    const sourceCurrency = (item.moneda || this.tenantBaseCurrencyCode()).toUpperCase();
    if (sourceCurrency === this.tenantBaseCurrencyCode()) {
      return amount;
    }
    const rate = this.quoteExchangeRate(sourceCurrency);
    return rate === null ? 0 : this.roundMoney(amount * rate);
  }

  private averageProbability(items: readonly CrmOportunidad[]): number {
    if (!items.length) {
      return 0;
    }
    return Math.round(
      items.reduce((sum, item) => sum + Number(item.probabilidad || 0), 0) / items.length,
    );
  }

  private countThisMonth(items: CrmOportunidad[]): number {
    return items.filter((item) =>
      this.isThisMonth(
        item.fechaCierreReal || item.fechaCierreEstimada || item.updatedAt || item.createdAt,
      ),
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

  private goalMonthLabel(month: number): string {
    return [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ][Math.max(0, Math.min(11, Number(month || 1) - 1))];
  }

  private formatCompactAmount(value: number): string {
    return formatCompactAmount(value);
  }

  private matchesOpportunityQuery(item: CrmOportunidad, query: string): boolean {
    return (
      !query ||
      `${item.titulo} ${item.prospectoNombre ?? ''} ${item.clienteNombre ?? ''} ${item.tipoOportunidad} ${item.etapa} ${item.estado}`
        .toLowerCase()
        .includes(query)
    );
  }

  /** Texto de la oportunidad asociada, para que el store pueda buscar por el. */
  private quoteOpportunityContext(item: Cotizacion): string {
    const opportunity = this.opportunityForQuote(item);
    if (!opportunity) {
      return '';
    }
    return `${opportunity.titulo ?? ''} ${this.opportunityContactName(opportunity)}`;
  }

  private updateQuoteFlow(
    item: Cotizacion,
    request: {
      estado: string;
      canalEnvio?: string | null;
      proximoSeguimientoEn?: string | null;
      motivoRechazo?: string | null;
      decisionSiguiente?: string | null;
    },
    successMessage: string,
    targetStage?: string,
  ): void {
    const selectedOpportunityId = this.selectedOpportunity()?.id ?? null;
    const oportunidadId = Number(item.crmOportunidadId ?? selectedOpportunityId ?? 0) || null;
    this.actionId.set(item.id);
    this.crmQuotations
      .updateStatus(item.id, request)
      .pipe(
        switchMap((saved) => {
          const linkedSaved = oportunidadId
            ? this.withQuoteOpportunity(saved, oportunidadId)
            : saved;
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
              `Movimiento automático por cotización ${quoteCode(linkedSaved.id)}: ${this.quoteStatusLabel(linkedSaved)}`,
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
            this.crmOpportunities.list().subscribe({
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

  public opportunityTypeLabel(type: string | null | undefined): string {
    return this.opportunityTypeMeta(this.normalizeOpportunityType(type)).label;
  }

  protected statusSeverity(
    status: string | boolean,
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
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

  private normalizeOpportunityType(value: string | null | undefined): OpportunityType {
    const allowed = this.opportunityTypeOptions.map((item) => item.value);
    return allowed.includes(value as OpportunityType) ? (value as OpportunityType) : 'PRODUCTO';
  }

  private buildOpportunityDescription(): string | null {
    const lines: string[] = [];
    const catalogo = this.catalogoItems().find(
      (item) => item.id === this.opportunityForm.catalogoItemId,
    );
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
      previous = this.catalogoForm.metadataJson
        ? (JSON.parse(this.catalogoForm.metadataJson) as Record<string, unknown>)
        : {};
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
      moneda: this.catalogoForm.moneda,
      atributos,
      source: 'crm-catalogo',
    });
  }

  private extractCatalogAttributes(
    metadataJson: string | null | undefined,
  ): Record<string, string | number | null> {
    if (!metadataJson) {
      return {};
    }
    try {
      const parsed = JSON.parse(metadataJson) as {
        atributos?: Record<string, string | number | null>;
      };
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

  public activityEffectiveDate(item: CrmActividad): string {
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
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  private isOverdue(dateValue: string | null | undefined): boolean {
    const date = this.toValidDate(dateValue);
    return !!date && date.getTime() < Date.now();
  }

  private paymentFollowUpPriority(item: CrmOportunidad): number {
    const plan = this.opportunityPaymentPlan(item);
    return (plan.overdueInstallments.length ? 1_000_000 : 0) + Math.round(plan.pendingAmount * 100);
  }

  private toValidDate(dateValue: string | null | undefined): Date | null {
    const timestamp = Date.parse(dateValue || '');
    return Number.isFinite(timestamp) ? new Date(timestamp) : null;
  }

  private onlyDigits(value: string | null | undefined): string {
    return (value || '').replace(/\D/g, '');
  }

  private deltaLabel(current: number, previous: number, decimal = false): string {
    return deltaLabel(current, previous, decimal);
  }

  private followUpPriority(
    nextActivity?: CrmActividad,
    lastActivity?: CrmActividad,
  ): CommercialInboxCard['priority'] {
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
    const currentTypes = [item.nextActivity?.tipoActividad, item.lastActivity?.tipoActividad].map(
      (type) => (type || '').toUpperCase(),
    );
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
    score += ['ALTO', 'CALIENTE'].includes(interes)
      ? 30
      : ['MEDIO', 'TIBIO'].includes(interes)
        ? 20
        : 0;
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

  protected qualificationTemperature(
    scoreOrValue: number | string | null | undefined,
  ): FollowUpQualification['temperatura'] {
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
      missing.push('interés medio o alto');
    }
    return missing;
  }

  public qualificationTemperatureLabel(value: number | string | null | undefined): string {
    return this.humanize(this.qualificationTemperature(value));
  }

  public qualificationNeedLabel(prospecto: CrmProspecto): string {
    return prospecto.necesidadIdentificada ? 'Sí' : 'Pendiente';
  }

  public qualificationInterestLabel(prospecto: CrmProspecto): string {
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
    const nivel = (
      prospecto.interesReal ||
      prospecto.temperatura ||
      prospecto.nivelInteres ||
      ''
    ).toUpperCase();
    if (nivel === 'CALIENTE' || nivel === 'ALTO') {
      return 'Alto';
    }
    if (nivel === 'MEDIO' || nivel === 'TIBIO') {
      return 'Medio';
    }
    if (nivel === 'FRIO' || nivel === 'BAJO') {
      return 'Bajo';
    }
    if (
      oportunidad?.etapa === 'NEGOCIACION' ||
      Number(oportunidad?.probabilidad || 0) >= 70 ||
      prospecto.estado === 'CALIFICADO'
    ) {
      return 'Alto';
    }
    if (prospecto.estado === 'CONTACTADO' || Number(prospecto.presupuestoEstimado || 0) > 0) {
      return 'Medio';
    }
    return 'Bajo';
  }

  private prospectInterestTone(
    prospecto: CrmProspecto,
    oportunidad?: CrmOportunidad,
  ): CommercialInboxCard['interestTone'] {
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
    const preserved = Object.entries(this.catalogoForm.atributos).reduce<
      Record<string, string | number>
    >((acc, [key, value]) => {
      if (value === null || value === undefined || String(value).trim() === '') {
        return acc;
      }
      acc[key] = typeof value === 'number' ? value : String(value).trim();
      return acc;
    }, {});
    return this.catalogFields().reduce<Record<string, string | number>>((acc, field) => {
      const value = this.catalogoForm.atributos[field.key];
      if (value === null || value === undefined || value === '') {
        delete acc[field.key];
        return acc;
      }
      acc[field.key] = field.type === 'number' ? Number(value || 0) : String(value).trim();
      return acc;
    }, preserved);
  }

  private migrateCatalogAttributes(
    type: OpportunityType,
    attributes: Record<string, string | number | null>,
  ): Record<string, string | number | null> {
    const aliases: Partial<Record<OpportunityType, Record<string, string>>> = {
      SERVICIO: { servicio: 'tipoServicio' },
      INMUEBLE: { area: 'areaM2' },
      TURISMO: { personas: 'personasBase', dias: 'diasNoches', fechaViaje: 'fechaDisponible' },
      CONSULTORIA: { tema: 'area' },
      HOSPITALIDAD: { personas: 'capacidad', fechaReserva: 'fechaDisponible' },
      TELECOMUNICACION: { direccionInstalacion: 'cobertura' },
    };
    return Object.entries(aliases[type] ?? {}).reduce<Record<string, string | number | null>>(
      (result, [legacyKey, currentKey]) => {
        if (
          (result[currentKey] === null ||
            result[currentKey] === undefined ||
            result[currentKey] === '') &&
          result[legacyKey] !== undefined
        ) {
          result[currentKey] = result[legacyKey];
        }
        return result;
      },
      { ...attributes },
    );
  }

  private catalogAttributeIsEmpty(key: string): boolean {
    const value = this.catalogAttribute(key);
    return value === null || value === undefined || String(value).trim() === '';
  }

  private toCatalogSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/g, '');
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
        moneda: item.moneda || this.tenantBaseCurrencyCode(),
        ...extra,
      },
      null,
      2,
    );
  }

  private emptyProspectForm(): ProspectForm {
    return createProspectForm(this.defaultProspectCountryCode(), this.currentUserKey());
  }

  private emptyCatalogoForm(): CatalogoForm {
    return createCatalogForm(this.tenantBaseCurrencyCode());
  }

  private emptyOpportunityForm(): OpportunityForm {
    return createOpportunityForm(
      this.currentUserKey(),
      this.defaultOpportunityCloseDate(),
      this.defaultOpportunityNextActionDate(),
    );
  }

  private applyProspectToOpportunityForm(prospecto: CrmProspecto, overwriteTitle = false): void {
    const catalogo = this.catalogoItems().find((item) => item.id === prospecto.catalogoItemId);
    this.opportunityForm.prospectoId = prospecto.id;
    this.opportunityForm.clienteId = null;
    this.opportunityForm.tipoOportunidad = this.normalizeOpportunityType(
      prospecto.tipoInteres || catalogo?.tipoItem,
    );
    this.opportunityForm.catalogoItemId =
      prospecto.catalogoItemId ?? this.opportunityForm.catalogoItemId;
    this.opportunityForm.detallePrincipal =
      catalogo?.nombre || prospecto.interesPrincipal || this.opportunityForm.detallePrincipal;
    this.opportunityForm.detalleSecundario =
      catalogo?.descripcion || prospecto.interesDetalle || this.opportunityForm.detalleSecundario;
    // El monto refleja el precio original del producto en su moneda; el
    // presupuesto del prospecto solo aplica cuando no hay oferta vinculada.
    this.opportunityForm.montoEstimado = Number(
      catalogo?.precioReferencial ||
        prospecto.presupuestoEstimado ||
        this.opportunityForm.montoEstimado ||
        0,
    );
    this.opportunityForm.fechaObjetivo = prospecto.fechaInteres || '';
    this.opportunityForm.descripcion =
      prospecto.mensaje || prospecto.observacion || this.opportunityForm.descripcion;
    this.opportunityForm.responsableId =
      prospecto.responsableId || this.opportunityForm.responsableId || this.currentUserKey();
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

  private defaultOpportunityNextActionDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  private loadCrmLocalConfig(): CrmLocalConfig {
    return this.crmLocalStorage.loadCrmLocalConfig(this.crmLocalConfigStorageKey());
  }

  private persistCrmLocalConfig(config: CrmLocalConfig): void {
    this.crmLocalStorage.persistCrmLocalConfig(this.crmLocalConfigStorageKey(), config);
  }

  private crmLocalConfigStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.config`;
  }

  private emptyActivityForm(): ActivityForm {
    return createActivityForm(this.currentUserKey());
  }

  private prepareNextActivityDefaults(item?: CrmActividad): void {
    const title =
      item?.oportunidadTitulo ||
      item?.prospectoNombre ||
      this.selectedOpportunity()?.titulo ||
      'este contacto';
    this.activityForm.siguienteTipoActividad = nextActivityType(
      item?.tipoActividad || this.activityForm.tipoActividad,
    );
    this.activityForm.siguienteFechaProgramada = nextBusinessActivityDate();
    this.activityForm.siguienteAsunto = `Siguiente paso con ${title}`;
    this.activityForm.siguienteDescripcion = '';
  }

  private emptyQuoteForm(currency?: string | null): QuoteForm {
    return createQuoteForm(currency || this.tenantBaseCurrencyCode());
  }

  private emptyPromotionForm(): PromotionForm {
    return createPromotionForm();
  }

  private emptyOpportunityRequirementForm(
    item: CrmOportunidad | null = this.selectedOpportunity(),
  ): OpportunityRequirementForm {
    const base = item ? this.defaultRequirementForOpportunity(item) : null;
    return createOpportunityRequirementForm(base);
  }

  private emptyOpportunityNegotiationForm(): OpportunityNegotiationForm {
    return createOpportunityNegotiationForm();
  }

  private emptyOpportunityPaymentForm(): OpportunityPaymentForm {
    return createOpportunityPaymentForm();
  }

  private emptyClientCompletionForm(): CrmClientCompletionDraft {
    return createClientCompletionForm();
  }

  private emptyOpportunityDocumentForm(): OpportunityDocumentForm {
    return createOpportunityDocumentForm();
  }

  private legacyOpportunityRecords(): LegacyOpportunityRecords {
    return {
      requirements: this.loadOpportunityRecords<OpportunityRequirementRecord>(
        this.opportunityRequirementStorageKey(),
      ),
      payments: this.loadOpportunityRecords<OpportunityPaymentRecord>(
        this.opportunityPaymentStorageKey(),
      ),
      documents: this.loadOpportunityRecords<OpportunityDocumentRecord>(
        this.opportunityDocumentStorageKey(),
      ),
      closures: this.loadOpportunityRecords<OpportunityClosureRecord>(
        this.opportunityClosureStorageKey(),
      ),
    };
  }

  private applyOpportunityResources(resources: readonly CrmOportunidadRecurso[]): void {
    const unique = [...new Map(resources.map((resource) => [resource.id, resource])).values()];
    this.opportunityRequirementRecords.set(
      unique
        .filter((resource) => resource.tipo === 'REQUISITO')
        .map((resource) => this.mapRequirementResource(resource)),
    );
    this.opportunityPaymentRecords.set(
      unique
        .filter((resource) => resource.tipo === 'PAGO')
        .map((resource) => this.mapPaymentResource(resource)),
    );
    this.opportunityDocumentRecords.set(
      unique
        .filter((resource) => resource.tipo === 'DOCUMENTO')
        .map((resource) => this.mapDocumentResource(resource)),
    );
    this.opportunityClosureRecords.set(
      unique
        .filter((resource) => resource.tipo === 'CIERRE')
        .map((resource) => this.mapClosureResource(resource)),
    );
  }

  private mapRequirementResource(resource: CrmOportunidadRecurso): OpportunityRequirementRecord {
    const data = resource.data;
    return {
      id: String(resource.id),
      oportunidadId: resource.oportunidadId,
      catalogoItemId: data['catalogoItemId'] == null ? null : Number(data['catalogoItemId']),
      nombre: String(data['nombre'] || ''),
      cantidad: Number(data['cantidad'] || 0),
      precioUnitario: Number(data['precioUnitario'] || 0),
      observacion: String(data['observacion'] || ''),
      createdAt: resource.createdAt || new Date().toISOString(),
    };
  }

  private mapPaymentResource(resource: CrmOportunidadRecurso): OpportunityPaymentRecord {
    const data = resource.data;
    return {
      id: String(resource.id),
      oportunidadId: resource.oportunidadId,
      fecha: String(data['fecha'] || ''),
      tipo: String(data['tipo'] || 'OTRO') as OpportunityPaymentRecord['tipo'],
      monto: Number(data['monto'] || 0),
      estado: String(data['estado'] || 'PENDIENTE') as OpportunityPaymentRecord['estado'],
      metodo: String(data['metodo'] || ''),
      observacion: String(data['observacion'] || ''),
      archivoNombre: resource.archivoNombre || '',
      archivoDataUrl: resource.hasArchivo ? String(resource.id) : '',
      createdAt: resource.createdAt || new Date().toISOString(),
    };
  }

  private mapDocumentResource(resource: CrmOportunidadRecurso): OpportunityDocumentRecord {
    const data = resource.data;
    return {
      id: String(resource.id),
      oportunidadId: resource.oportunidadId,
      categoria: String(data['categoria'] || 'OTRO') as OpportunityDocumentRecord['categoria'],
      nombre: String(data['nombre'] || ''),
      descripcion: String(data['descripcion'] || ''),
      archivoNombre: resource.archivoNombre || '',
      archivoDataUrl: resource.hasArchivo ? String(resource.id) : '',
      mimeType: resource.archivoMimeType || '',
      createdAt: resource.createdAt || new Date().toISOString(),
    };
  }

  private mapClosureResource(resource: CrmOportunidadRecurso): OpportunityClosureRecord {
    return {
      id: String(resource.id),
      oportunidadId: resource.oportunidadId,
      closedAt: String(resource.data['closedAt'] || resource.createdAt || new Date().toISOString()),
      closedBy: String(resource.data['closedBy'] || resource.createdBy || 'Usuario'),
    };
  }

  private migrateLegacyOpportunityRecords(legacy: LegacyOpportunityRecords): void {
    if (this.legacyOpportunityMigrationStarted) {
      return;
    }
    type LegacyKind = keyof LegacyOpportunityRecords;
    type MigrationResult = { kind: LegacyKind; key: string; migrated: boolean };
    const operations: Observable<MigrationResult>[] = [];
    const addOperation = (
      kind: LegacyKind,
      record: { id: string; oportunidadId: number },
      operation: Observable<CrmOportunidadRecurso>,
    ): void => {
      const key = this.legacyRecordKey(record);
      operations.push(
        operation.pipe(
          map(() => ({ kind, key, migrated: true })),
          catchError(() => of({ kind, key, migrated: false })),
        ),
      );
    };

    for (const record of legacy.requirements) {
      addOperation(
        'requirements',
        record,
        this.crmOpportunities.createResource(record.oportunidadId, 'REQUISITO', {
          clientKey: record.id,
          catalogoItemId: record.catalogoItemId,
          nombre: record.nombre,
          cantidad: record.cantidad,
          precioUnitario: record.precioUnitario,
          observacion: record.observacion,
        }),
      );
    }
    for (const record of legacy.payments) {
      addOperation(
        'payments',
        record,
        this.crmOpportunities.createResource(
          record.oportunidadId,
          'PAGO',
          {
            clientKey: record.id,
            fecha: record.fecha,
            tipo: record.tipo,
            monto: record.monto,
            estado: record.estado,
            metodo: record.metodo,
            observacion: record.observacion,
          },
          this.fileFromDataUrl(record.archivoDataUrl, record.archivoNombre),
        ),
      );
    }
    for (const record of legacy.documents) {
      addOperation(
        'documents',
        record,
        this.crmOpportunities.createResource(
          record.oportunidadId,
          'DOCUMENTO',
          {
            clientKey: record.id,
            categoria: record.categoria,
            nombre: record.nombre,
            descripcion: record.descripcion,
          },
          this.fileFromDataUrl(record.archivoDataUrl, record.archivoNombre, record.mimeType),
        ),
      );
    }
    for (const record of legacy.closures) {
      addOperation(
        'closures',
        record,
        this.crmOpportunities.createResource(record.oportunidadId, 'CIERRE', {
          clientKey: record.id,
          closedAt: record.closedAt,
          closedBy: record.closedBy,
        }),
      );
    }

    const legacyCount =
      legacy.requirements.length +
      legacy.payments.length +
      legacy.documents.length +
      legacy.closures.length;
    if (!legacyCount) {
      return;
    }
    if (!operations.length) {
      return;
    }

    this.legacyOpportunityMigrationStarted = true;
    forkJoin(operations).subscribe({
      next: (results) => {
        const failed = new Map<LegacyKind, Set<string>>();
        for (const result of results.filter((item) => !item.migrated)) {
          const keys = failed.get(result.kind) ?? new Set<string>();
          keys.add(result.key);
          failed.set(result.kind, keys);
        }
        this.saveRemainingLegacyRecords(legacy, failed);
        this.crmOpportunities.listResources().subscribe({
          next: (resources) => this.applyOpportunityResources(resources),
          error: () => undefined,
        });
        this.legacyOpportunityMigrationStarted = false;
        const failedCount = results.filter((item) => !item.migrated).length;
        if (failedCount) {
          this.errorMessage.set(
            `${results.length - failedCount} registro(s) locales migrados; ${failedCount} se conservaron localmente porque requieren revision.`,
          );
        } else {
          this.successMessage.set('Los registros locales del CRM se migraron al servidor.');
        }
      },
    });
  }

  private saveRemainingLegacyRecords(
    legacy: LegacyOpportunityRecords,
    failed: ReadonlyMap<keyof LegacyOpportunityRecords, ReadonlySet<string>>,
  ): void {
    const remaining = <T extends { id: string; oportunidadId: number }>(
      kind: keyof LegacyOpportunityRecords,
      records: readonly T[],
    ): T[] =>
      records.filter((record) => failed.get(kind)?.has(this.legacyRecordKey(record)) ?? false);

    this.crmLocalStorage.replaceMigrationRecords(
      this.opportunityRequirementStorageKey(),
      remaining('requirements', legacy.requirements),
    );
    this.crmLocalStorage.replaceMigrationRecords(
      this.opportunityPaymentStorageKey(),
      remaining('payments', legacy.payments),
    );
    this.crmLocalStorage.replaceMigrationRecords(
      this.opportunityDocumentStorageKey(),
      remaining('documents', legacy.documents),
    );
    this.crmLocalStorage.replaceMigrationRecords(
      this.opportunityClosureStorageKey(),
      remaining('closures', legacy.closures),
    );
  }

  private legacyRecordKey(record: { id: string; oportunidadId: number }): string {
    return `${record.oportunidadId}:${record.id}`;
  }

  private fileFromDataUrl(
    dataUrl: string,
    name: string,
    fallbackMime = 'application/octet-stream',
  ): File | null {
    if (!dataUrl?.startsWith('data:') || typeof atob === 'undefined') {
      return null;
    }
    try {
      const [header, encoded] = dataUrl.split(',', 2);
      const mime = /^data:([^;]+);base64$/i.exec(header)?.[1] || fallbackMime;
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return new File([bytes], name || 'archivo', { type: mime });
    } catch {
      return null;
    }
  }

  private downloadGeneratedBase64(name: string, mimeType: string, base64: string): void {
    if (!base64 || typeof document === 'undefined' || typeof atob === 'undefined') {
      return;
    }
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      const objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: mimeType || 'application/octet-stream' }),
      );
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = name || 'archivo';
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      this.errorMessage.set('No se pudo preparar el archivo para descargar.');
    }
  }

  private loadOpportunityRecords<T>(key: string): T[] {
    return this.crmLocalStorage.loadRecords<T>(key);
  }

  private opportunityRequirementStorageKey(): string {
    return `${this.opportunityStoragePrefix()}.requirements`;
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
    return this.crmLocalStorage.opportunityStoragePrefix(this.crmStorageCompany());
  }

  private createLocalId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.round(Math.random() * 100000)}`;
  }

  private readSmallFile(
    event: Event,
    maxBytes: number,
    assign: (file: File, dataUrl: string) => void,
  ): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (file.size > maxBytes) {
      this.errorMessage.set(
        `El archivo debe pesar ${Math.round(maxBytes / 1_000_000)} MB como maximo.`,
      );
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => assign(file, String(reader.result || ''));
    reader.readAsDataURL(file);
  }

  private crmStorageCompany(): CrmStorageCompanyIdentity | undefined {
    return this.auth.currentSession()?.empresa as CrmStorageCompanyIdentity | undefined;
  }

  private upsertProspect(item: CrmProspecto): void {
    const items = this.prospectos();
    this.prospectos.set(
      items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [item, ...items],
    );
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
    this.catalog.upsert(item);
  }

  private upsertOpportunity(item: CrmOportunidad, message?: string): void {
    const items = this.oportunidades();
    this.oportunidades.set(
      items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [item, ...items],
    );
    if (message) {
      this.successMessage.set(message);
    }
  }

  private upsertQuote(item: Cotizacion): void {
    this.quotations.upsert(item);
  }

  private withQuoteOpportunity(item: Cotizacion, oportunidadId: number): Cotizacion {
    return Number(item.crmOportunidadId) === Number(oportunidadId)
      ? item
      : { ...item, crmOportunidadId: oportunidadId };
  }

  private mapNegotiationRecord(item: CrmNegociacion): OpportunityNegotiationRecord {
    const result = ['ACEPTA', 'RECHAZA'].includes(String(item.resultado))
      ? (String(item.resultado) as 'ACEPTA' | 'RECHAZA')
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
    this.opportunityNegotiationRecords.set(
      items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [item, ...items],
    );
  }

  private refreshOpportunityQuotes(oportunidadId: number): void {
    this.crmQuotations.list(oportunidadId).subscribe({
      next: (quotes) => {
        const normalized = quotes.map((quote) => this.withQuoteOpportunity(quote, oportunidadId));
        const externalQuotes = this.cotizaciones().filter(
          (quote) => Number(quote.crmOportunidadId) !== Number(oportunidadId),
        );
        this.cotizaciones.set([...normalized, ...externalQuotes]);
      },
      error: () => undefined,
    });
  }

  private refreshOpportunityNegotiations(oportunidadId: number): void {
    this.crmOpportunities.listNegotiations(oportunidadId).subscribe({
      next: (items) => {
        const normalized = items.map((item) => this.mapNegotiationRecord(item));
        const external = this.opportunityNegotiationRecords().filter(
          (item) => Number(item.oportunidadId) !== Number(oportunidadId),
        );
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
      plan.map((item) =>
        this.crmFollowups.createActivity({
          prospectoId: prospecto.id,
          oportunidadId: null,
          clienteId: null,
          tipoActividad: item.tipoActividad,
          asunto: item.asunto,
          descripcion: item.descripcion,
          fechaProgramada: this.followUpScheduleDate(item.dayOffset, item.hour),
          usuarioId: userId,
        }),
      ),
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
    this.actividades.set(
      items.some((current) => current.id === item.id)
        ? items.map((current) => (current.id === item.id ? item : current))
        : [item, ...items],
    );
    if (message) {
      this.successMessage.set(message);
    }
  }

  private currentUserKey(): string {
    const session = this.auth.currentSession();
    return String(session?.userId ?? session?.username ?? 'system');
  }

  private resolveError(error: unknown): string {
    return this.feedback.resolveError(error);
  }

  private resolveWhatsappEndpointError(error: unknown): string {
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      Number((error as { status?: number }).status) === 404
    ) {
      return 'La funcion solicitada no esta disponible en este momento.';
    }
    return this.resolveError(error);
  }
}

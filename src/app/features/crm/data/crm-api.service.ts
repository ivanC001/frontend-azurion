import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { ApiCacheService } from '@core/api/api-cache.service';
import { ApiResponse } from '@core/api/api-response';
import { CatalogApiService } from '@core/api/catalog-api.service';
import { CotizacionApiService } from '@core/api/cotizacion-api.service';
import { ApiUrlService } from '@core/api/api-url.service';
import { AuthSessionService } from '@core/auth/auth-session.service';

import type {
  ConvertCotizacionVentaRequest,
  Cotizacion,
  CreateCotizacionRequest,
  CreatePromocionCotizacionRequest,
  UpdateCotizacionEstadoRequest,
} from '@core/api/cotizacion-api.types';
import type {
  Cliente,
  PageResponse,
  TenantScopedOptions,
  UpdateClienteRequest,
} from '@core/api/catalog-api.types';
import type {
  CreateCrmActividadRequest,
  CreateCrmCatalogoItemRequest,
  CreateCrmEtapaPipelineRequest,
  CreateCrmNegociacionRequest,
  CreateCrmOportunidadRequest,
  CreateCrmProspectoRequest,
  CrmActividad,
  CrmActividadPageRequest,
  CrmCanalTokenConfig,
  CrmCatalogoItem,
  CrmCurrencyConfig,
  CrmCurrencyOption,
  CrmDashboard,
  CrmEtapaPipeline,
  CrmGoal,
  CrmInboxChannelAvailability,
  CrmLandingConfig,
  CrmLeadAssignmentConfig,
  CrmNegociacion,
  CrmOportunidad,
  CrmOportunidadHistorial,
  CrmOportunidadPageRequest,
  CrmOportunidadRecurso,
  CrmOportunidadRecursoTipo,
  CrmPipelineColumn,
  CrmProspecto,
  CrmProspectoPageRequest,
  CrmReporteBucket,
  CrmReportes,
  CrmResponsableOption,
  CrmResultadosResumen,
  CrmSentEmail,
  CrmWhatsappConversation,
  CrmWhatsappConversationFilters,
  CrmWhatsappMessage,
  CrmWhatsappTemplate,
  GenerarCotizacionDesdeOportunidadRequest,
  RealizarCrmActividadRequest,
  RepartirCrmProspectosRequest,
  RepartirCrmProspectosResponse,
  SaveCrmGoalRequest,
  SaveCrmLandingConfigRequest,
  SaveWhatsappQuickReplyRequest,
  SendCrmOpportunityEmailResponse,
  SendCrmWhatsappMessageRequest,
  SendCrmWhatsappQuoteResponse,
  SendCrmWhatsappTemplateRequest,
  UpdateCrmCanalTokenConfigRequest,
  UpdateCrmCatalogoItemRequest,
  UpdateCrmCurrencyConfigRequest,
  UpdateCrmEtapaPipelineRequest,
  UpdateCrmLeadAssignmentConfigRequest,
  UpdateCrmOportunidadRequest,
  UpdateCrmProspectoRequest,
  UpdateWhatsappAutoReplyConfigRequest,
  WhatsappAutoReplyConfig,
  WhatsappConnectionStatus,
  WhatsappFailedSend,
  WhatsappQuickReply,
  WhatsappReengagementGuide,
  WhatsappUnreadSummary,
  WhatsappVerifyTokenResponse,
} from '@features/crm/data/crm-api.types';

/**
 * Cliente HTTP del modulo CRM.
 *
 * Estos 90 metodos vivian dentro de AdminSaasApiService, lo que obligaba a la
 * feature de CRM a importar el servicio de admin: una dependencia entre
 * features que las reglas del proyecto prohiben expresamente.
 */
@Injectable({ providedIn: 'root' })
export class CrmApiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = inject(ApiUrlService);

  private readonly session = inject(AuthSessionService);

  private readonly cache = inject(ApiCacheService);

  private readonly catalogApi = inject(CatalogApiService);

  private readonly cotizacionApi = inject(CotizacionApiService);

  listCrmCatalogo(tipoItem?: string | null) {
    return this.http
      .get<ApiResponse<CrmCatalogoItem[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/catalogo'), {
        headers: this.session.apiHeaders(),
        params: tipoItem ? { tipoItem } : undefined,
      })
      .pipe(map((response) => response.data));
  }

  listCrmIntegraciones() {
    return this.http
      .get<ApiResponse<CrmCanalTokenConfig[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/integraciones'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCrmLandingConfigurations() {
    return this.http
      .get<ApiResponse<CrmLandingConfig[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/landings'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  createCrmLandingConfiguration(request: SaveCrmLandingConfigRequest) {
    return this.http
      .post<ApiResponse<CrmLandingConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/landings'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmLandingConfiguration(id: number, request: SaveCrmLandingConfigRequest) {
    return this.http
      .put<ApiResponse<CrmLandingConfig>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/configuracion/landings/${id}`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  regenerateCrmLandingKey(id: number) {
    return this.http
      .post<ApiResponse<CrmLandingConfig>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/configuracion/landings/${id}/regenerar-key`),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  regenerateCrmLandingRelaySecret(id: number) {
    return this.http
      .post<ApiResponse<CrmLandingConfig>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/configuracion/landings/${id}/regenerar-relay-secret`,
        ),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmInboxChannels() {
    return this.http
      .get<ApiResponse<CrmInboxChannelAvailability[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/bandeja/canales'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  pageCrmSentEmails(query = '', page = 0, size = 20) {
    let params = new HttpParams()
      .set('page', Math.max(0, page))
      .set('size', Math.min(100, Math.max(1, size)));
    if (query.trim()) {
      params = params.set('query', query.trim());
    }
    return this.http
      .get<ApiResponse<PageResponse<CrmSentEmail>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/bandeja/correo/enviados'),
        { headers: this.session.apiHeaders(), params },
      )
      .pipe(map((response) => response.data));
  }

  saveCrmIntegracion(request: UpdateCrmCanalTokenConfigRequest) {
    return this.http
      .put<ApiResponse<CrmCanalTokenConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/integraciones'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  generateCrmWhatsappVerifyToken() {
    return this.http
      .post<ApiResponse<WhatsappVerifyTokenResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/verify-token'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  testCrmWhatsappConnection() {
    return this.http
      .post<ApiResponse<WhatsappConnectionStatus>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/probar'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  subscribeCrmWhatsappApp() {
    return this.http
      .post<ApiResponse<WhatsappConnectionStatus>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/suscribir'),
        null,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappConnectionStatus() {
    return this.http
      .get<ApiResponse<WhatsappConnectionStatus>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/estado'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappAutoReplyConfig() {
    return this.http
      .get<ApiResponse<WhatsappAutoReplyConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/respuesta-automatica'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappAutoReplyConfig(request: UpdateWhatsappAutoReplyConfigRequest) {
    return this.http
      .put<ApiResponse<WhatsappAutoReplyConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/configuracion/respuesta-automatica'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappQuickReplies() {
    return this.http
      .get<ApiResponse<WhatsappQuickReply[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/respuestas-rapidas'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  createCrmWhatsappQuickReply(request: SaveWhatsappQuickReplyRequest) {
    return this.http
      .post<ApiResponse<WhatsappQuickReply>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/respuestas-rapidas'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappQuickReply(id: number, request: SaveWhatsappQuickReplyRequest) {
    return this.http
      .put<ApiResponse<WhatsappQuickReply>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/respuestas-rapidas/${id}`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCrmWhatsappQuickReply(id: number) {
    return this.http.delete<ApiResponse<void>>(
      this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/respuestas-rapidas/${id}`),
      { headers: this.session.apiHeaders() },
    );
  }

  listCrmWhatsappConversations(filters: CrmWhatsappConversationFilters = {}) {
    let params = new HttpParams();
    if (filters.query?.trim()) {
      params = params.set('query', filters.query.trim());
    }
    if (filters.estado?.trim()) {
      params = params.set('estado', filters.estado.trim());
    }
    if (filters.soloNoLeidas) {
      params = params.set('soloNoLeidas', true);
    }
    if (filters.soloMias) {
      params = params.set('soloMias', true);
    }

    return this.http
      .get<ApiResponse<CrmWhatsappConversation[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/conversaciones'),
        { headers: this.session.apiHeaders(), params },
      )
      .pipe(map((response) => response.data));
  }

  markCrmWhatsappConversationRead(prospectoId: number) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/leer`),
        {},
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappConversationStatus(
    prospectoId: number,
    estado: 'ABIERTA' | 'RESUELTA' | 'ARCHIVADA',
  ) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/estado`),
        { estado },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  assignCrmWhatsappConversation(prospectoId: number, responsableId: string | null) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/asignacion`,
        ),
        { responsableId },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappConversationNote(prospectoId: number, nota: string | null) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/nota`),
        { nota },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  createCrmWhatsappConversationNote(prospectoId: number, nota: string) {
    return this.http
      .post<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/notas`),
        { nota },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmWhatsappSavedNote(prospectoId: number, noteId: number, nota: string) {
    return this.http
      .put<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/notas/${noteId}`,
        ),
        { nota },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCrmWhatsappSavedNote(prospectoId: number, noteId: number) {
    return this.http
      .delete<ApiResponse<CrmWhatsappConversation>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/whatsapp/conversaciones/${prospectoId}/notas/${noteId}`,
        ),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappMessages(prospectoId: number) {
    return this.http
      .get<ApiResponse<CrmWhatsappMessage[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/mensajes`),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmWhatsappMessage(prospectoId: number, request: SendCrmWhatsappMessageRequest) {
    return this.http
      .post<ApiResponse<CrmWhatsappMessage>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/mensajes`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappFailedSends() {
    return this.http
      .get<ApiResponse<WhatsappFailedSend[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/envios-fallidos'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappReengagementGuide() {
    return this.http
      .get<ApiResponse<WhatsappReengagementGuide>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/reenganches/guia'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappTemplates() {
    return this.http
      .get<ApiResponse<CrmWhatsappTemplate[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/plantillas'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmWhatsappTemplate(prospectoId: number, request: SendCrmWhatsappTemplateRequest) {
    return this.http
      .post<ApiResponse<CrmWhatsappMessage>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/plantillas`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmWhatsappQuotes(prospectoId: number) {
    return this.http
      .get<ApiResponse<Cotizacion[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/cotizaciones`),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmWhatsappQuote(prospectoId: number, quoteId: number, mensaje?: string | null) {
    return this.http
      .post<ApiResponse<SendCrmWhatsappQuoteResponse>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/prospectos/${prospectoId}/whatsapp/cotizaciones/${quoteId}/enviar`,
        ),
        { mensaje: mensaje?.trim() || null },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmCurrencyConfig() {
    return this.http
      .get<ApiResponse<CrmCurrencyConfig[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/monedas'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listAvailableCrmCurrencies() {
    return this.http
      .get<ApiResponse<CrmCurrencyOption[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/monedas/disponibles'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  saveCrmCurrencyConfig(request: UpdateCrmCurrencyConfigRequest) {
    return this.http
      .put<ApiResponse<CrmCurrencyConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/configuracion/monedas'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCrmCatalogoItem(request: CreateCrmCatalogoItemRequest) {
    return this.http
      .post<ApiResponse<CrmCatalogoItem>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/catalogo'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmCatalogoItem(id: number, request: UpdateCrmCatalogoItemRequest) {
    return this.http
      .put<ApiResponse<CrmCatalogoItem>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/catalogo/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCrmProspectos() {
    return this.http
      .get<ApiResponse<CrmProspecto[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmProspectosPage(request: CrmProspectoPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmProspecto>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/page'),
        {
          headers: this.session.apiHeaders(),
          params: this.buildQueryParams(request),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmProspecto(id: number) {
    return this.http
      .get<ApiResponse<CrmProspecto>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCrmProspecto(request: CreateCrmProspectoRequest) {
    return this.http
      .post<ApiResponse<CrmProspecto>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmProspecto(id: number, request: UpdateCrmProspectoRequest) {
    return this.http
      .put<ApiResponse<CrmProspecto>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  repartirCrmProspectos(request: RepartirCrmProspectosRequest) {
    return this.http
      .post<ApiResponse<RepartirCrmProspectosResponse>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/repartir'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmWhatsappUnreadSummary() {
    return this.http
      .get<ApiResponse<WhatsappUnreadSummary>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/whatsapp/notificaciones'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmLeadAssignmentConfig() {
    return this.http
      .get<ApiResponse<CrmLeadAssignmentConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/reparto-configuracion'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmLeadAssignmentConfig(request: UpdateCrmLeadAssignmentConfigRequest) {
    return this.http
      .put<ApiResponse<CrmLeadAssignmentConfig>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/prospectos/reparto-configuracion'),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCrmProspecto(id: number) {
    return this.http.delete<ApiResponse<null>>(
      this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}`),
      { headers: this.session.apiHeaders() },
    );
  }

  convertirCrmProspectoCliente(id: number) {
    return this.http
      .post<ApiResponse<Cliente>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}/convertir-cliente`),
        null,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(
        map((response) => response.data),
        tap(() => this.invalidateCache('clientes')),
      );
  }

  listCrmEtapas() {
    return this.http
      .get<ApiResponse<CrmEtapaPipeline[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/etapas'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  createCrmEtapa(request: CreateCrmEtapaPipelineRequest) {
    return this.http
      .post<ApiResponse<CrmEtapaPipeline>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/etapas'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmEtapa(id: number, request: UpdateCrmEtapaPipelineRequest) {
    return this.http
      .put<ApiResponse<CrmEtapaPipeline>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/etapas/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmPipeline() {
    return this.http
      .get<ApiResponse<CrmPipelineColumn[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/pipeline'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmOportunidades() {
    return this.http
      .get<ApiResponse<CrmOportunidad[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCrmOportunidadesPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades/page'),
        {
          headers: this.session.apiHeaders(),
          params: this.buildQueryParams(request),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCrmResultadosPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/resultados/page'),
        {
          headers: this.session.apiHeaders(),
          params: this.buildQueryParams(request),
        },
      )
      .pipe(map((response) => response.data));
  }

  listCrmSeguimientoPagosPage(request: CrmOportunidadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmOportunidad>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/pagos/seguimiento/page'),
        {
          headers: this.session.apiHeaders(),
          params: this.buildQueryParams(request),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmOportunidad(id: number) {
    return this.http
      .get<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCrmOportunidad(request: CreateCrmOportunidadRequest) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmOportunidad(id: number, request: UpdateCrmOportunidadRequest) {
    return this.http
      .put<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}`),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  moverCrmOportunidadEtapa(id: number, etapaId: number, observacion?: string | null) {
    return this.http
      .put<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/etapa`),
        { etapaId, observacion },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmOportunidadHistorial(id: number) {
    return this.http
      .get<ApiResponse<CrmOportunidadHistorial[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/historial`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  marcarCrmOportunidadGanada(id: number) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/marcar-ganada`),
        null,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  marcarCrmOportunidadPerdida(id: number, motivo: string) {
    return this.http
      .post<ApiResponse<CrmOportunidad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/marcar-perdida`),
        { motivo },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  generarCotizacionDesdeCrmOportunidad(
    id: number,
    request: GenerarCotizacionDesdeOportunidadRequest,
  ) {
    return this.http
      .post<ApiResponse<Cotizacion>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/generar-cotizacion`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmNegociaciones(oportunidadId: number) {
    return this.http
      .get<ApiResponse<CrmNegociacion[]>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/negociaciones`),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCrmNegociacion(oportunidadId: number, request: CreateCrmNegociacionRequest) {
    return this.http
      .post<ApiResponse<CrmNegociacion>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/negociaciones`),
        request,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  listCrmActividades() {
    return this.http
      .get<ApiResponse<CrmActividad[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/actividades'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmOportunidadRecursos() {
    return this.http
      .get<ApiResponse<CrmOportunidadRecurso[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/oportunidades/recursos'),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  createCrmOportunidadRecurso(
    oportunidadId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    const formData = this.crmResourceFormData(tipo, data, file);
    return this.http
      .post<ApiResponse<CrmOportunidadRecurso>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${oportunidadId}/recursos`),
        formData,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  updateCrmOportunidadRecurso(
    oportunidadId: number,
    resourceId: number,
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ) {
    const formData = this.crmResourceFormData(tipo, data, file);
    return this.http
      .put<ApiResponse<CrmOportunidadRecurso>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}`,
        ),
        formData,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  deleteCrmOportunidadRecurso(oportunidadId: number, resourceId: number) {
    return this.http
      .delete<ApiResponse<string>>(
        this.apiUrl.url(
          'saasCore',
          `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}`,
        ),
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  downloadCrmOportunidadRecurso(oportunidadId: number, resourceId: number, inline = false) {
    return this.http.get(
      this.apiUrl.url(
        'saasCore',
        `/v1/saas/crm/oportunidades/${oportunidadId}/recursos/${resourceId}/archivo`,
      ),
      {
        headers: this.session.apiHeaders(),
        params: new HttpParams().set('inline', inline),
        responseType: 'blob',
      },
    );
  }

  listCrmActividadesPage(request: CrmActividadPageRequest = {}) {
    return this.http
      .get<ApiResponse<PageResponse<CrmActividad>>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/actividades/page'),
        {
          headers: this.session.apiHeaders(),
          params: this.buildQueryParams(request),
        },
      )
      .pipe(map((response) => response.data));
  }

  createCrmActividad(request: CreateCrmActividadRequest) {
    return this.http
      .post<ApiResponse<CrmActividad>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/actividades'),
        request,
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  realizarCrmActividad(id: number, request?: string | RealizarCrmActividadRequest | null) {
    const body = typeof request === 'string' ? { resultado: request } : (request ?? {});
    return this.http
      .put<ApiResponse<CrmActividad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/actividades/${id}/realizar`),
        body,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  cancelarCrmActividad(id: number, request?: string | RealizarCrmActividadRequest | null) {
    const body = typeof request === 'string' ? { resultado: request } : (request ?? {});
    return this.http
      .put<ApiResponse<CrmActividad>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/actividades/${id}/cancelar`),
        body,
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  getCrmDashboard() {
    return this.http
      .get<ApiResponse<CrmDashboard>>(this.apiUrl.url('saasCore', '/v1/saas/crm/dashboard'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  listCrmGoals(anio: number, mes: number) {
    const params = new HttpParams().set('anio', anio).set('mes', mes);
    return this.http
      .get<ApiResponse<CrmGoal[]>>(this.apiUrl.url('saasCore', '/v1/saas/crm/metas'), {
        headers: this.session.apiHeaders(),
        params,
      })
      .pipe(map((response) => response.data));
  }

  saveCrmGoal(request: SaveCrmGoalRequest) {
    return this.http
      .post<ApiResponse<CrmGoal>>(this.apiUrl.url('saasCore', '/v1/saas/crm/metas'), request, {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  deleteCrmGoal(id: number) {
    return this.http.delete<void>(this.apiUrl.url('saasCore', `/v1/saas/crm/metas/${id}`), {
      headers: this.session.apiHeaders(),
    });
  }

  getCrmReportes() {
    return this.http
      .get<ApiResponse<CrmReportes>>(this.apiUrl.url('saasCore', '/v1/saas/crm/reportes'), {
        headers: this.session.apiHeaders(),
      })
      .pipe(map((response) => response.data));
  }

  getCrmReporteOportunidadesEtapa() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/oportunidades-etapa'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmReporteOportunidadesVendedor() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/oportunidades-vendedor'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmReporteResponsables() {
    return this.http
      .get<ApiResponse<CrmResponsableOption[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/responsables'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmReporteProspectosOrigen() {
    return this.http
      .get<ApiResponse<CrmReporteBucket[]>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/prospectos-origen'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  getCrmReporteGanadasPerdidas() {
    return this.http
      .get<ApiResponse<CrmResultadosResumen>>(
        this.apiUrl.url('saasCore', '/v1/saas/crm/reportes/ganadas-perdidas'),
        {
          headers: this.session.apiHeaders(),
        },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmOpportunityEmail(id: number, asunto: string, mensaje: string) {
    return this.http
      .post<ApiResponse<SendCrmOpportunityEmailResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/oportunidades/${id}/correo`),
        { asunto, mensaje },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  sendCrmProspectEmail(id: number, asunto: string, mensaje: string) {
    return this.http
      .post<ApiResponse<SendCrmOpportunityEmailResponse>>(
        this.apiUrl.url('saasCore', `/v1/saas/crm/prospectos/${id}/correo`),
        { asunto, mensaje },
        { headers: this.session.apiHeaders() },
      )
      .pipe(map((response) => response.data));
  }

  /**
   * Convierte un objeto plano en query params, descartando vacios y valores
   * no escalares.
   */
  private buildQueryParams(values: object): HttpParams | undefined {
    let params = new HttpParams();
    Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        return;
      }
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params = params.set(key, String(value));
      }
    });
    return params.keys().length ? params : undefined;
  }

  /**
   * Multipart de un recurso de oportunidad: los metadatos van como blob JSON
   * para que el backend los reciba tipados junto al fichero opcional.
   */
  private crmResourceFormData(
    tipo: CrmOportunidadRecursoTipo,
    data: Readonly<Record<string, unknown>>,
    file?: File | null,
  ): FormData {
    const formData = new FormData();
    formData.set(
      'metadata',
      new Blob([JSON.stringify({ tipo, data })], { type: 'application/json' }),
      'metadata.json',
    );
    if (file) {
      formData.set('file', file, file.name);
    }
    return formData;
  }

  /** La conversion de prospecto a cliente invalida el catalogo de clientes. */
  private invalidateCache(...prefixes: string[]): void {
    this.cache.invalidate(...prefixes);
  }

  // --- Recursos compartidos ------------------------------------------------
  // Catalogos maestros y cotizaciones viven en core porque los consumen varias
  // features. Se exponen aqui para no cambiar las llamadas existentes.

  listClientes(options: TenantScopedOptions = {}) {
    return this.catalogApi.listClientes(options);
  }

  updateCliente(id: number, request: UpdateClienteRequest, options: TenantScopedOptions = {}) {
    return this.catalogApi.updateCliente(id, request, options);
  }

  listAllProductos(almacenId?: number) {
    return this.catalogApi.listAllProductos(almacenId);
  }

  listSucursales(options: TenantScopedOptions = {}) {
    return this.catalogApi.listSucursales(options);
  }

  listUsuarios(options: TenantScopedOptions = {}) {
    return this.catalogApi.listUsuarios(options);
  }

  listCotizaciones(crmOportunidadId?: number | null) {
    return this.cotizacionApi.listCotizaciones(crmOportunidadId);
  }

  listPromocionesCotizacion() {
    return this.cotizacionApi.listPromocionesCotizacion();
  }

  createPromocionCotizacion(request: CreatePromocionCotizacionRequest) {
    return this.cotizacionApi.createPromocionCotizacion(request);
  }

  createCotizacion(request: CreateCotizacionRequest) {
    return this.cotizacionApi.createCotizacion(request);
  }

  updateCotizacionEstado(id: number, request: string | UpdateCotizacionEstadoRequest) {
    return this.cotizacionApi.updateCotizacionEstado(id, request);
  }

  getCotizacionPdf(id: number) {
    return this.cotizacionApi.getCotizacionPdf(id);
  }

  sendCotizacionEmail(id: number) {
    return this.cotizacionApi.sendCotizacionEmail(id);
  }

  convertCotizacionVenta(id: number, request: ConvertCotizacionVentaRequest) {
    return this.cotizacionApi.convertCotizacionVenta(id, request);
  }
}

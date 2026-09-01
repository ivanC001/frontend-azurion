/**
 * Contratos de datos del modulo CRM.
 *
 * Estaban en admin-saas-api.types.ts, lo que obligaba a toda la feature de CRM
 * a importar tipos desde la feature de admin. Ahora viven junto al servicio que
 * los produce.
 */

import type { Cotizacion, CreateCotizacionRequest } from '@core/api/cotizacion-api.types';

export interface CrmPageRequest {
  readonly query?: string | null;
  readonly estado?: string | null;
  readonly responsableId?: string | null;
  readonly page?: number | null;
  readonly size?: number | null;
}

export interface CrmProspectoPageRequest extends CrmPageRequest {
  readonly origen?: string | null;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

export interface CrmOportunidadPageRequest extends CrmPageRequest {
  readonly etapaId?: number | null;
  readonly etapa?: string | null;
  readonly cierreDesde?: string | null;
  readonly cierreHasta?: string | null;
}

export interface CrmActividadPageRequest extends CrmPageRequest {
  readonly tipoActividad?: string | null;
  readonly usuarioId?: string | null;
  readonly prospectoId?: number | null;
  readonly oportunidadId?: number | null;
  readonly fechaDesde?: string | null;
  readonly fechaHasta?: string | null;
}

export interface CrmProspecto {
  readonly id: number;
  readonly tipoPersona: 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA' | string;
  readonly paisCodigo?: string | null;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly razonSocial?: string | null;
  readonly nombreComercial?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen: string;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly landingUrl?: string | null;
  readonly landingKey?: string | null;
  readonly mensaje?: string | null;
  readonly tipoInteres?: string | null;
  readonly interesPrincipal?: string | null;
  readonly interesDetalle?: string | null;
  readonly presupuestoEstimado?: number | null;
  readonly presupuestoMoneda?: string | null;
  readonly fechaInteres?: string | null;
  readonly catalogoItemId?: number | null;
  readonly productoPendiente?: boolean | null;
  readonly metadataJson?: string | null;
  readonly estado: string;
  readonly nivelInteres?: string | null;
  readonly necesidadIdentificada?: boolean | null;
  readonly interesReal?: string | null;
  readonly presupuestoDefinido?: string | null;
  readonly tomadorDecision?: string | null;
  readonly fechaEstimadaCompra?: string | null;
  readonly scoreCalificacion?: number | null;
  readonly temperatura?: string | null;
  readonly motivoEspera?: string | null;
  readonly fechaProximoContacto?: string | null;
  readonly motivoPerdida?: string | null;
  readonly observacionPerdida?: string | null;
  readonly oportunidadId?: number | null;
  readonly responsableId: string;
  readonly observacion?: string | null;
  readonly clienteId?: number | null;
  readonly fechaConversion?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmProspectoRequest {
  readonly tipoPersona: 'SIN_DEFINIR' | 'NATURAL' | 'JURIDICA' | string;
  readonly paisCodigo?: string | null;
  readonly tipoDocumento?: string | null;
  readonly numeroDocumento?: string | null;
  readonly nombre: string;
  readonly razonSocial?: string | null;
  readonly nombreComercial?: string | null;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen: string;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly landingUrl?: string | null;
  readonly mensaje?: string | null;
  readonly tipoInteres?: string | null;
  readonly interesPrincipal?: string | null;
  readonly interesDetalle?: string | null;
  readonly presupuestoEstimado?: number | null;
  readonly fechaInteres?: string | null;
  readonly catalogoItemId?: number | null;
  readonly metadataJson?: string | null;
  readonly estado?: string | null;
  readonly nivelInteres?: string | null;
  readonly necesidadIdentificada?: boolean | null;
  readonly interesReal?: string | null;
  readonly presupuestoDefinido?: string | null;
  readonly tomadorDecision?: string | null;
  readonly fechaEstimadaCompra?: string | null;
  readonly motivoEspera?: string | null;
  readonly fechaProximoContacto?: string | null;
  readonly motivoPerdida?: string | null;
  readonly observacionPerdida?: string | null;
  readonly responsableId?: string | null;
  readonly observacion?: string | null;
}

export type UpdateCrmProspectoRequest = Partial<CreateCrmProspectoRequest>;

export interface RepartirCrmProspectosRequest {
  readonly prospectoIds: readonly number[];
  readonly responsableIds: readonly string[];
  readonly soloNuevos?: boolean | null;
}

export interface RepartirCrmProspectosResponse {
  readonly totalAsignados: number;
  readonly asignadosPorResponsable: Record<string, number>;
  readonly prospectos: CrmProspecto[];
}

export interface CrmCatalogoItem {
  readonly id: number;
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial: number;
  readonly moneda: string;
  readonly estado: string;
  readonly metadataJson?: string | null;
  readonly publicToken?: string | null;
  readonly publicEnabled?: boolean | null;
  readonly landingSlug?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
  readonly prospectosCount: number;
  readonly oportunidadesCount: number;
  readonly landingsCount: number;
}

export interface CreateCrmCatalogoItemRequest {
  readonly tipoItem: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly precioReferencial?: number | null;
  readonly moneda?: string | null;
  readonly estado?: string | null;
  readonly metadataJson?: string | null;
  readonly publicEnabled?: boolean | null;
  readonly landingSlug?: string | null;
}

export type UpdateCrmCatalogoItemRequest = Partial<CreateCrmCatalogoItemRequest>;

export interface CrmOportunidad {
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly prospectoNombre?: string | null;
  readonly clienteId?: number | null;
  readonly clienteNombre?: string | null;
  readonly tipoOportunidad?: string | null;
  readonly catalogoItemId?: number | null;
  readonly titulo: string;
  readonly descripcion?: string | null;
  readonly montoEstimado: number;
  readonly montoReal?: number | null;
  readonly moneda?: string | null;
  readonly probabilidad: number;
  readonly etapaId?: number | null;
  readonly etapa: string;
  readonly etapaNombre?: string | null;
  readonly etapaColor?: string | null;
  readonly fechaCierreEstimada?: string | null;
  readonly responsableId: string;
  readonly estado: string;
  readonly motivoPerdida?: string | null;
  readonly fechaCierreReal?: string | null;
  readonly fechaUltimaActualizacion?: string | null;
  readonly fechaGanada?: string | null;
  readonly fechaPerdida?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmNegociacion {
  readonly id: number;
  readonly oportunidadId: number;
  readonly cotizacionId?: number | null;
  readonly codigoCotizacion?: string | null;
  readonly estado: string;
  readonly solicitudCliente: string;
  readonly precioOriginal: number;
  readonly descuento: number;
  readonly precioFinal: number;
  readonly formaPago?: string | null;
  readonly cuotas: number;
  readonly fechaInicio?: string | null;
  readonly fechaEntrega?: string | null;
  readonly observacion?: string | null;
  readonly resultado: string;
  readonly usuarioId?: string | null;
  readonly usuarioNombre?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmNegociacionRequest {
  readonly cotizacionId?: number | null;
  readonly estado?: string | null;
  readonly solicitudCliente?: string | null;
  readonly precioOriginal?: number | null;
  readonly descuento?: number | null;
  readonly precioFinal?: number | null;
  readonly formaPago?: string | null;
  readonly cuotas?: number | null;
  readonly fechaInicio?: string | null;
  readonly fechaEntrega?: string | null;
  readonly observacion?: string | null;
  readonly resultado?: string | null;
}

export interface CreateCrmOportunidadRequest {
  readonly prospectoId?: number | null;
  readonly clienteId?: number | null;
  readonly tipoOportunidad?: string | null;
  readonly catalogoItemId: number;
  readonly titulo: string;
  readonly descripcion?: string | null;
  readonly montoEstimado: number;
  readonly probabilidad: number;
  readonly etapa?: string | null;
  readonly fechaCierreEstimada: string;
  readonly responsableId: string;
  readonly proximaAccion: string;
  readonly fechaProximaAccion: string;
}

export interface UpdateCrmOportunidadRequest extends Partial<CreateCrmOportunidadRequest> {
  readonly estado?: string | null;
  readonly motivoPerdida?: string | null;
}

export interface CrmActividad {
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly prospectoNombre?: string | null;
  readonly oportunidadId?: number | null;
  readonly oportunidadTitulo?: string | null;
  readonly clienteId?: number | null;
  readonly clienteNombre?: string | null;
  readonly tipoActividad: string;
  readonly asunto: string;
  readonly descripcion?: string | null;
  readonly fechaProgramada: string;
  readonly fechaRealizada?: string | null;
  readonly estado: string;
  readonly usuarioId: string;
  readonly resultado?: string | null;
  readonly resultadoContacto?: string | null;
  readonly nivelInteres?: string | null;
  readonly estadoProspectoResultado?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CreateCrmActividadRequest {
  readonly prospectoId?: number | null;
  readonly oportunidadId?: number | null;
  readonly clienteId?: number | null;
  readonly tipoActividad: string;
  readonly asunto: string;
  readonly descripcion?: string | null;
  readonly fechaProgramada: string;
  readonly usuarioId?: string | null;
}

export interface CrmEtapaResumen {
  readonly etapa: string;
  readonly cantidad: number;
  readonly monto: number;
}

export interface CrmEtapaPipeline {
  readonly id: number;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly orden: number;
  readonly probabilidadDefault?: number | null;
  readonly color: string;
  readonly icono?: string | null;
  readonly ganado: boolean;
  readonly perdido: boolean;
  readonly requiereValidacion?: boolean | null;
  readonly modoValidacion?: 'STRICT' | 'WARNING' | 'FREE' | string | null;
  readonly activo: boolean;
}

export interface CreateCrmEtapaPipelineRequest {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion?: string | null;
  readonly orden?: number | null;
  readonly probabilidadDefault?: number | null;
  readonly color?: string | null;
  readonly icono?: string | null;
  readonly ganado?: boolean | null;
  readonly perdido?: boolean | null;
  readonly requiereValidacion?: boolean | null;
  readonly modoValidacion?: string | null;
  readonly activo?: boolean | null;
}

export type UpdateCrmEtapaPipelineRequest = Partial<CreateCrmEtapaPipelineRequest>;

export interface CrmPipelineColumn {
  readonly etapa: CrmEtapaPipeline;
  readonly cantidad: number;
  readonly monto: number;
  readonly oportunidades: CrmOportunidad[];
}

export interface CrmOportunidadHistorial {
  readonly id: number;
  readonly oportunidadId: number;
  readonly etapaOrigenId?: number | null;
  readonly etapaOrigenCodigo?: string | null;
  readonly etapaOrigenNombre?: string | null;
  readonly etapaDestinoId: number;
  readonly etapaDestinoCodigo: string;
  readonly etapaDestinoNombre: string;
  readonly usuarioId: string;
  readonly observacion?: string | null;
  readonly fechaCambio: string;
}

export interface CrmReporteBucket {
  readonly codigo: string;
  readonly nombre: string;
  readonly cantidad: number;
  readonly monto: number;
}

export interface CrmResponsableOption {
  readonly id: string;
  readonly username: string;
  readonly nombre: string;
}

export interface CrmDashboard {
  readonly prospectosNuevos: number;
  readonly prospectosConvertidos: number;
  readonly oportunidadesAbiertas: number;
  readonly oportunidadesGanadas: number;
  readonly oportunidadesPerdidas: number;
  readonly actividadesPendientes: number;
  readonly actividadesVencidas: number;
  readonly leadsAutomaticos: number;
  readonly leadsManuales: number;
  readonly montoPipeline: number;
  readonly embudo: CrmEtapaResumen[];
}

export type CrmGoalScope = 'EQUIPO' | 'ASESOR';

export interface CrmGoal {
  readonly id: number;
  readonly anio: number;
  readonly mes: number;
  readonly alcance: CrmGoalScope;
  readonly responsableId?: string | null;
  readonly responsableNombre: string;
  readonly moneda: string;
  readonly metaIngresos: number;
  readonly metaOportunidadesGanadas: number;
  readonly metaProspectosNuevos: number;
  readonly metaActividadesRealizadas: number;
  readonly metaConversion: number;
  readonly actualIngresos: number;
  readonly actualOportunidadesGanadas: number;
  readonly actualProspectosNuevos: number;
  readonly actualActividadesRealizadas: number;
  readonly actualConversion: number;
  readonly progresoIngresos: number;
  readonly progresoOportunidadesGanadas: number;
  readonly progresoProspectosNuevos: number;
  readonly progresoActividadesRealizadas: number;
  readonly progresoConversion: number;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmReportes {
  readonly oportunidadesPorEtapa: CrmEtapaResumen[];
  readonly actividadesPendientes: number;
  readonly actividadesRealizadas: number;
  readonly prospectosConvertidos: number;
  readonly prospectosDescartados: number;
}

export type CrmOportunidadRecursoTipo = 'REQUISITO' | 'PAGO' | 'DOCUMENTO' | 'CIERRE';

export interface CrmOportunidadRecurso {
  readonly id: number;
  readonly oportunidadId: number;
  readonly tipo: CrmOportunidadRecursoTipo;
  readonly data: Readonly<Record<string, unknown>>;
  readonly hasArchivo: boolean;
  readonly archivoNombre?: string | null;
  readonly archivoMimeType?: string | null;
  readonly archivoSize?: number | null;
  readonly createdBy: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmResultadosResumen {
  readonly ganadas: number;
  readonly perdidas: number;
  readonly montoGanado: number;
  readonly montoPerdido: number;
}

export interface CrmCanalTokenConfig {
  readonly id?: number | null;
  readonly canal: 'WEB' | 'WHATSAPP' | 'INSTAGRAM' | 'FACEBOOK' | string;
  readonly nombre: string;
  readonly accessToken?: string | null;
  readonly verifyToken?: string | null;
  readonly webhookUrl?: string | null;
  readonly appId?: string | null;
  readonly appSecret?: string | null;
  readonly phoneNumberId?: string | null;
  readonly wabaId?: string | null;
  readonly accessTokenConfigured?: boolean;
  readonly verifyTokenConfigured?: boolean;
  readonly appSecretConfigured?: boolean;
  readonly webhookVerifiedAt?: string | null;
  readonly lastConnectionTestAt?: string | null;
  readonly lastConnectionOk?: boolean | null;
  readonly lastConnectionMessage?: string | null;
  readonly wabaSubscribed?: boolean | null;
  readonly metaDisplayPhoneNumber?: string | null;
  readonly metaVerifiedName?: string | null;
  readonly metaQualityRating?: string | null;
  readonly metaTokenExpiresAt?: string | null;
  readonly activo: boolean;
  readonly metadataJson?: string | null;
}

export interface SendCrmOpportunityEmailResponse {
  readonly destinatario: string;
  readonly asunto: string;
  readonly enviadoEn: string;
}

export type CrmLandingProductMode = 'REQUERIDO' | 'OPCIONAL' | 'SIN_CATALOGO';

export type CrmLandingDuplicatePolicy = 'TELEFONO_CORREO' | 'TELEFONO' | 'CORREO' | 'NINGUNO';

export interface CrmLandingConfig {
  readonly id: number;
  readonly nombre: string;
  readonly landingKey: string;
  readonly campania?: string | null;
  readonly canalIngreso: string;
  readonly activa: boolean;
  readonly recibirLeads: boolean;
  readonly modoProducto: CrmLandingProductMode;
  readonly crearActividadInicial: boolean;
  readonly responsableId?: string | null;
  readonly validarDuplicadosPor: CrmLandingDuplicatePolicy;
  readonly catalogoItemIds: readonly number[];
  readonly relaySecret?: string | null;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmLeadAssignmentConfig {
  readonly automatico: boolean;
  readonly estrategia: 'MENOR_CARGA' | string;
  readonly responsableIds: readonly string[];
}

export interface UpdateCrmLeadAssignmentConfigRequest {
  readonly automatico: boolean;
  readonly responsableIds: readonly string[];
}

export interface CrmInboxChannelAvailability {
  readonly canal: 'WHATSAPP' | 'FACEBOOK' | 'INSTAGRAM' | 'CORREO' | string;
  readonly nombre: string;
  readonly activo: boolean;
}

export interface CrmSentEmail {
  readonly cotizacionId: number;
  readonly oportunidadId?: number | null;
  readonly destinatarioNombre: string;
  readonly destinatarioCorreo?: string | null;
  readonly asunto: string;
  readonly moneda: string;
  readonly total: number;
  readonly estado: string;
  readonly enviadoPor: string;
  readonly enviadoEn: string;
}

export interface UpdateCrmCanalTokenConfigRequest {
  readonly canal: string;
  readonly nombre?: string | null;
  readonly accessToken?: string | null;
  readonly verifyToken?: string | null;
  readonly webhookUrl?: string | null;
  readonly appId?: string | null;
  readonly appSecret?: string | null;
  readonly phoneNumberId?: string | null;
  readonly wabaId?: string | null;
  readonly activo?: boolean | null;
  readonly metadataJson?: string | null;
}

export interface WhatsappVerifyTokenResponse {
  readonly verifyToken: string;
  readonly generadoEn: string;
}

export interface WhatsappConnectionStatus {
  readonly activo: boolean;
  readonly configuracionCompleta: boolean;
  readonly accesoMetaValido: boolean;
  readonly wabaSuscrita: boolean;
  readonly webhookVerificado: boolean;
  readonly conectado: boolean;
  readonly displayPhoneNumber?: string | null;
  readonly verifiedName?: string | null;
  readonly qualityRating?: string | null;
  readonly tokenExpiresAt?: string | null;
  readonly permissions: string[];
  readonly message?: string | null;
  readonly testedAt?: string | null;
  readonly webhookVerifiedAt?: string | null;
  readonly lastWebhookAt?: string | null;
  readonly lastInboundMessageAt?: string | null;
}

export interface WhatsappAutoReplySchedule {
  readonly diaSemana: number;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly activo: boolean;
}

export interface WhatsappAutoReplyConfig {
  readonly activo: boolean;
  readonly modo: 'SIEMPRE' | 'HORARIO';
  readonly mensaje: string;
  readonly cooldownMinutos: number;
  readonly zonaHoraria: string;
  readonly horarios: WhatsappAutoReplySchedule[];
}

export interface WhatsappQuickReply {
  readonly id: number;
  readonly slot: number;
  readonly titulo: string;
  readonly mensaje: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmWhatsappMessage {
<<<<<<< HEAD
  readonly plantillaNombre?: string | null;
  readonly plantillaIdioma?: string | null;
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
  readonly id: number;
  readonly prospectoId?: number | null;
  readonly metaMessageId: string;
  readonly direccion: 'ENTRANTE' | 'SALIENTE' | string;
  readonly remitente?: string | null;
  readonly destinatario?: string | null;
  readonly tipoMensaje: string;
  readonly contenido?: string | null;
  readonly estado: string;
  readonly mensajeEn?: string | null;
  readonly leidoEn?: string | null;
  readonly enviadoPorUsuarioId?: string | null;
  readonly enviadoPorNombre?: string | null;
  readonly errorCodigo?: string | null;
  readonly errorDetalle?: string | null;
  readonly createdAt?: string | null;
}

export interface CrmWhatsappInternalNote {
  readonly id: number;
  readonly slot: number;
  readonly contenido: string;
  readonly createdAt?: string | null;
  readonly updatedAt?: string | null;
}

export interface CrmWhatsappConversation {
  readonly id: number;
  readonly prospectoId: number;
  readonly nombre: string;
  readonly telefono?: string | null;
  readonly correo?: string | null;
  readonly direccion?: string | null;
  readonly origen?: string | null;
  readonly canalIngreso?: string | null;
  readonly campania?: string | null;
  readonly interesPrincipal?: string | null;
  readonly estadoProspecto?: string | null;
  readonly nivelInteres?: string | null;
  readonly responsableId?: string | null;
  readonly estadoConversacion: 'ABIERTA' | 'RESUELTA' | 'ARCHIVADA' | string;
  readonly noLeidos: number;
  readonly ultimoMensaje?: string | null;
  readonly ultimaDireccion?: string | null;
  readonly ultimoMensajeEn?: string | null;
  readonly ultimoEntranteEn?: string | null;
  readonly ventanaAtencionHasta?: string | null;
  readonly ventanaAtencionAbierta: boolean;
  readonly notaInterna?: string | null;
  readonly notasInternas: CrmWhatsappInternalNote[];
}

export interface CrmWhatsappConversationFilters {
  readonly query?: string | null;
  readonly estado?: string | null;
  readonly soloNoLeidas?: boolean;
  readonly soloMias?: boolean;
}

export interface WhatsappUnreadSummary {
  readonly mensajesNoLeidos: number;
  readonly conversacionesNoLeidas: number;
  readonly ultimoProspectoId?: number | null;
  readonly ultimoContacto?: string | null;
  readonly ultimoMensaje?: string | null;
  readonly ultimoMensajeEn?: string | null;
}

export interface SendCrmWhatsappMessageRequest {
  readonly mensaje: string;
  readonly previewUrl?: boolean | null;
}

export interface CrmWhatsappTemplate {
<<<<<<< HEAD
  readonly id?: string | null;
  readonly estado?: string;
  readonly disponible?: boolean;
  readonly motivoNoDisponible?: string | null;
  readonly componentes?: readonly CrmWhatsappTemplateComponent[];
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
  readonly nombre: string;
  readonly idioma: string;
  readonly categoria: string;
  readonly cuerpo: string;
  readonly cantidadParametros: number;
}

<<<<<<< HEAD
export interface CrmWhatsappTemplateComponent {
  readonly tipo: string;
  readonly texto: string;
  readonly parametros: readonly string[];
}

=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
export interface SendCrmWhatsappTemplateRequest {
  readonly nombre: string;
  readonly idioma: string;
  readonly parametros: string[];
}

export interface SendCrmWhatsappQuoteResponse {
  readonly mensaje: CrmWhatsappMessage;
  readonly cotizacion: Cotizacion;
}

export interface CrmCurrencyConfig {
  readonly id?: number | null;
  readonly moneda: 'USD' | 'EUR' | string;
  readonly nombre: string;
  readonly simbolo: string;
  readonly tipoCambioBase: number;
  readonly margenConversionPorcentaje: number;
  readonly tipoCambioVenta: number;
  readonly activo: boolean;
}

export interface CrmCurrencyOption {
  readonly moneda: string;
  readonly nombre: string;
  readonly simbolo: string;
}

export interface UpdateCrmCurrencyConfigRequest {
  readonly moneda: string;
  readonly nombre?: string | null;
  readonly simbolo?: string | null;
  readonly tipoCambioBase?: number | null;
  readonly margenConversionPorcentaje?: number | null;
  readonly activo?: boolean | null;
}
export interface RealizarCrmActividadRequest {
  readonly resultado?: string | null;
  readonly resultadoContacto?: string | null;
  readonly nivelInteres?: string | null;
  readonly estadoProspecto?: string | null;
}

export interface SaveCrmGoalRequest {
  readonly anio: number;
  readonly mes: number;
  readonly alcance: CrmGoalScope;
  readonly responsableId?: string | null;
  readonly metaIngresos: number;
  readonly metaOportunidadesGanadas: number;
  readonly metaProspectosNuevos: number;
  readonly metaActividadesRealizadas: number;
  readonly metaConversion: number;
}

export interface SaveCrmLandingConfigRequest {
  readonly nombre: string;
  readonly campania?: string | null;
  readonly modoProducto: CrmLandingProductMode;
  readonly activa: boolean;
  readonly recibirLeads: boolean;
  readonly crearActividadInicial: boolean;
  readonly responsableId?: string | null;
  readonly validarDuplicadosPor: CrmLandingDuplicatePolicy;
  readonly catalogoItemIds: readonly number[];
}

export interface UpdateWhatsappAutoReplyConfigRequest {
  readonly activo: boolean;
  readonly modo: 'SIEMPRE' | 'HORARIO';
  readonly mensaje: string;
  readonly cooldownMinutos: number;
  readonly horarios: WhatsappAutoReplySchedule[];
}

export interface SaveWhatsappQuickReplyRequest {
  readonly titulo: string;
  readonly mensaje: string;
}

export interface GenerarCotizacionDesdeOportunidadRequest extends CreateCotizacionRequest {}

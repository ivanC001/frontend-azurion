import type {
  ActivityForm,
  CatalogoForm,
  CrmClientCompletionDraft,
  OpportunityDocumentForm,
  OpportunityForm,
  OpportunityNegotiationForm,
  OpportunityPaymentForm,
  OpportunityRequirementForm,
  PromotionForm,
  ProspectForm,
  QuoteForm,
} from '../models';
import { prospectPhoneDialCode } from '../models/prospect-identification.model';

type OpportunityRequirementSeed = Pick<
  OpportunityRequirementForm,
  'catalogoItemId' | 'nombre' | 'cantidad' | 'precioUnitario' | 'observacion'
>;

export function createProspectForm(defaultCountryCode: string, userKey: string): ProspectForm {
  return {
    id: null,
    tipoPersona: 'SIN_DEFINIR',
    paisCodigo: defaultCountryCode,
    tipoDocumento: '',
    numeroDocumento: '',
    nombre: '',
    razonSocial: '',
    nombreComercial: '',
    telefonoPaisCodigo: defaultCountryCode,
    telefonoCodigoPais: prospectPhoneDialCode(defaultCountryCode),
    telefono: '',
    correo: '',
    direccion: '',
    origen: 'WHATSAPP',
    canalIngreso: 'MANUAL',
    campania: 'Ingreso manual',
    landingUrl: '',
    mensaje: '',
    estado: 'NUEVO',
    responsableId: userKey,
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

export function createCatalogForm(defaultCurrency = 'PEN'): CatalogoForm {
  return {
    id: null,
    tipoItem: 'PRODUCTO',
    nombre: '',
    descripcion: '',
    precioReferencial: 0,
    moneda: defaultCurrency,
    estado: 'ACTIVO',
    metadataJson: '',
    publicEnabled: true,
    landingSlug: '',
    atributos: {},
  };
}

export function createOpportunityForm(
  userKey: string,
  closeDate: string,
  nextActionDate: string,
): OpportunityForm {
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
    fechaCierreEstimada: closeDate,
    responsableId: userKey,
    proximaAccion: 'Llamada inicial',
    fechaProximaAccion: nextActionDate,
  };
}

export function createActivityForm(
  userKey: string,
  nextActivityDate = nextBusinessActivityDate(),
  now = new Date(),
): ActivityForm {
  const scheduledAt = new Date(now);
  scheduledAt.setMinutes(scheduledAt.getMinutes() - scheduledAt.getTimezoneOffset() + 60);
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
    fechaProgramada: scheduledAt.toISOString().slice(0, 16),
    usuarioId: userKey,
    programarSiguiente: false,
    siguienteTipoActividad: 'LLAMADA',
    siguienteFechaProgramada: nextActivityDate,
    siguienteAsunto: '',
    siguienteDescripcion: '',
  };
}

export function createQuoteForm(defaultCurrency = 'PEN'): QuoteForm {
  return {
    oportunidadId: null,
    clienteId: null,
    sucursalId: null,
    moneda: defaultCurrency,
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

export function createPromotionForm(): PromotionForm {
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

export function createOpportunityRequirementForm(
  base: OpportunityRequirementSeed | null = null,
): OpportunityRequirementForm {
  return {
    id: null,
    catalogoItemId: base?.catalogoItemId ?? null,
    nombre: base?.nombre ?? '',
    cantidad: base?.cantidad ?? 1,
    precioUnitario: base?.precioUnitario ?? 0,
    observacion: base?.observacion ?? '',
  };
}

export function createOpportunityNegotiationForm(): OpportunityNegotiationForm {
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

export function createOpportunityPaymentForm(now = new Date()): OpportunityPaymentForm {
  return {
    id: null,
    cuotaKey: '',
    fecha: now.toISOString().slice(0, 10),
    tipo: 'CUOTA',
    monto: 0,
    estado: 'PAGADO',
    metodo: 'Efectivo',
    observacion: '',
    archivoNombre: '',
    archivoDataUrl: '',
  };
}

export function createClientCompletionForm(): CrmClientCompletionDraft {
  return {
    paisCodigo: 'PE',
    tipoPersona: 'SIN_DEFINIR',
    tipoDocumento: '',
    numeroDocumento: '',
    nombre: '',
    razonSocial: '',
    nombreComercial: '',
    telefono: '',
    correo: '',
    direccion: '',
  };
}

export function createOpportunityDocumentForm(): OpportunityDocumentForm {
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

export function toInputDateTime(value?: string | null): string {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function toInputDate(value?: string | Date | null): string {
  const date = value ? new Date(value) : new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

export function addMonths(value: Date, months: number): Date {
  const date = new Date(value);
  date.setMonth(date.getMonth() + months);
  return date;
}

export function nextBusinessActivityDate(now = new Date()): string {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export function nextActivityType(currentType: string | null | undefined): string {
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

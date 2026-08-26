export enum ProspectStatus {
  Nuevo = 'NUEVO',
  Contactado = 'CONTACTADO',
  EnEspera = 'EN_ESPERA',
  Calificado = 'CALIFICADO',
  Perdido = 'PERDIDO',
  Convertido = 'CONVERTIDO',
}

export enum FollowupStatus {
  Nuevo = 'NUEVO',
  Pendiente = 'PENDIENTE',
  Contactado = 'CONTACTADO',
  Calificado = 'CALIFICADO',
  SinActividad = 'SIN_ACTIVIDAD',
}

export enum OpportunityStage {
  Interesado = 'INTERESADO',
  Cotizado = 'COTIZADO',
  Negociacion = 'NEGOCIACION',
  Ganado = 'GANADO',
  Perdido = 'PERDIDO',
}

export enum OpportunityStatus {
  Abierta = 'ABIERTA',
  Ganada = 'GANADA',
  Perdida = 'PERDIDA',
}

export enum PaymentStatus {
  Pendiente = 'PENDIENTE',
  Parcial = 'PARCIAL',
  Pagado = 'PAGADO',
  Vencido = 'VENCIDO',
}

export enum PaymentMethod {
  Contado = 'CONTADO',
  Credito = 'CREDITO',
  Transferencia = 'TRANSFERENCIA',
  Efectivo = 'EFECTIVO',
  Yape = 'YAPE',
  Plin = 'PLIN',
  Tarjeta = 'TARJETA',
  Otro = 'OTRO',
}

export enum ActivityType {
  Llamada = 'LLAMADA',
  Whatsapp = 'WHATSAPP',
  Correo = 'CORREO',
  Reunion = 'REUNION',
  Visita = 'VISITA',
  Tarea = 'TAREA',
}

export enum ActivityStatus {
  Pendiente = 'PENDIENTE',
  Realizada = 'REALIZADA',
  Cancelada = 'CANCELADA',
}

export const CRM_OPPORTUNITY_FLOW = [
  OpportunityStage.Interesado,
  OpportunityStage.Cotizado,
  OpportunityStage.Negociacion,
  OpportunityStage.Ganado,
  OpportunityStage.Perdido,
] as const;

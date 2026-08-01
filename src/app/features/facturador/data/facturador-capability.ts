export interface FacturadorCapabilitySource {
  readonly paisCodigo?: string | null;
  readonly facturadorStatus?: string | null;
  readonly facturadorDocumentMode?: string | null;
  readonly facturadorFiscalStatus?: string | null;
  readonly facturadorSunatMode?: string | null;
}

export function canIssueElectronicDocuments(
  capability: FacturadorCapabilitySource | null | undefined,
): boolean {
  if (!capability) {
    return false;
  }

  return (
    normalize(capability.paisCodigo) === 'PE' &&
    normalize(capability.facturadorStatus) === 'PROVISIONADO' &&
    normalize(capability.facturadorDocumentMode) === 'ELECTRONIC' &&
    normalize(capability.facturadorFiscalStatus) === 'ACTIVE' &&
    ['BETA', 'PRODUCTION'].includes(normalize(capability.facturadorSunatMode))
  );
}

export function facturadorCapabilityMessage(
  capability: FacturadorCapabilitySource | null | undefined,
): string {
  if (!capability) {
    return 'No se pudo obtener la capacidad de emision de la empresa.';
  }
  if (normalize(capability.paisCodigo) !== 'PE') {
    return 'Esta empresa puede emitir tickets internos. La emision SUNAT solo esta disponible para empresas de Peru.';
  }

  const status = normalize(capability.facturadorStatus);
  if (!['PROVISIONADO', ''].includes(status)) {
    return status === 'ERROR'
      ? 'El facturador no pudo aprovisionarse. Solicita un reintento desde la configuracion del tenant.'
      : 'El facturador se esta aprovisionando. Mientras tanto puedes emitir tickets internos.';
  }

  if (!canIssueElectronicDocuments(capability)) {
    return 'Puedes emitir tickets internos. Completa la configuracion fiscal para habilitar boletas y facturas.';
  }

  return 'Tickets, boletas y facturas estan habilitados para esta empresa.';
}

function normalize(value: string | null | undefined): string {
  return (value ?? '').trim().toUpperCase();
}

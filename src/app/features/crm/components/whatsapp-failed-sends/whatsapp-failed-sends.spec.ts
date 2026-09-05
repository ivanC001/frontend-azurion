import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import type { WhatsappFailedSend } from '@features/crm/data/crm-api.types';

import { WhatsappFailedSendsComponent } from './whatsapp-failed-sends';

describe('WhatsappFailedSendsComponent', () => {
  const failure = (extra: Partial<WhatsappFailedSend> = {}): WhatsappFailedSend => ({
    mensajeId: 29,
    prospectoId: 11,
    prospectoNombre: 'Carlos Flores',
    tipoMensaje: 'template',
    plantillaNombre: 'seguimiento_prospecto',
    codigo: '131042',
    causa: 'La cuenta de WhatsApp Business no tiene metodo de pago.',
    solucion: 'Cargalo en el Administrador comercial de Meta, en Facturacion.',
    detalle: 'Message failed to send because no payment method is set up.',
    ocurrioEn: '2026-09-03T01:37:47Z',
    ...extra,
  });

  const setup = (api: Partial<CrmApiService>) => {
    TestBed.configureTestingModule({
      imports: [WhatsappFailedSendsComponent],
      providers: [{ provide: CrmApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(WhatsappFailedSendsComponent);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  };

  it('avisa cuando no hay ningun envio fallido', () => {
    const text = setup({ getCrmWhatsappFailedSends: () => of([]) } as Partial<CrmApiService>);

    expect(text).toContain('Sin fallos');
    expect(text).toContain('Ningun envio fallido');
  });

  it('muestra la causa traducida y el siguiente paso', () => {
    const text = setup({
      getCrmWhatsappFailedSends: () => of([failure()]),
    } as Partial<CrmApiService>);

    expect(text).toContain('1 fallidos');
    expect(text).toContain('no tiene metodo de pago');
    expect(text).toContain('Administrador comercial');
    expect(text).toContain('Meta 131042');
    expect(text).toContain('Carlos Flores');
  });

  it('agrupa el aviso cuando todos los fallos comparten la misma causa', () => {
    const text = setup({
      getCrmWhatsappFailedSends: () =>
        of([failure(), failure({ mensajeId: 28 }), failure({ mensajeId: 27 })]),
    } as Partial<CrmApiService>);

    expect(text).toContain('Todos los fallos tienen la misma causa');
  });

  it('no agrupa cuando los codigos son distintos', () => {
    const text = setup({
      getCrmWhatsappFailedSends: () =>
        of([failure(), failure({ mensajeId: 28, codigo: '131026', causa: 'Otro motivo.' })]),
    } as Partial<CrmApiService>);

    expect(text).not.toContain('Todos los fallos tienen la misma causa');
    expect(text).toContain('Otro motivo.');
  });

  it('muestra un error con reintento cuando el registro no carga', () => {
    const text = setup({
      getCrmWhatsappFailedSends: () =>
        throwError(() => ({ error: { message: 'WhatsApp no esta configurado.' } })),
    } as Partial<CrmApiService>);

    expect(text).toContain('WhatsApp no esta configurado.');
    expect(text).toContain('Reintentar');
  });
});

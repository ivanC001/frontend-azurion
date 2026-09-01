import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import type { WhatsappReengagementGuide } from '@features/crm/data/crm-api.types';

import { WhatsappReengagementGuideComponent } from './whatsapp-reengagement-guide';

describe('WhatsappReengagementGuideComponent', () => {
  const guide = (extra: Partial<WhatsappReengagementGuide> = {}): WhatsappReengagementGuide => ({
    listoParaProgramar: true,
    resumen: 'Listo: hay 1 plantilla aprobada para reenganchar.',
    pasos: ['Programa el reenganche desde la ficha del prospecto.'],
    advertencias: [],
    plantillaSugerida: {
      categoria: 'UTILITY',
      motivoCategoria: 'Utility entrega mejor y cuesta menos.',
      cuerpo: 'Hola {{1}}, tu cotizacion #{{2}} vence el {{5}}.',
      botones: ['Deseo continuar', 'Ahora no'],
      variables: ['{{1}} nombre del prospecto'],
    },
    plantillasUtilizables: [],
    ...extra,
  });

  const setup = (api: Partial<CrmApiService>) => {
    TestBed.configureTestingModule({
      imports: [WhatsappReengagementGuideComponent],
      providers: [{ provide: CrmApiService, useValue: api }],
    });
    const fixture = TestBed.createComponent(WhatsappReengagementGuideComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('se muestra plegado cuando ya esta todo listo y no hay avisos', () => {
    const fixture = setup({
      getCrmWhatsappReengagementGuide: () => of(guide()),
    } as Partial<CrmApiService>);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Listo');
    // El cuerpo plegado no pinta los pasos.
    expect(text).not.toContain('Programa el reenganche desde la ficha');
  });

  it('se abre solo cuando hay algo que resolver', () => {
    const fixture = setup({
      getCrmWhatsappReengagementGuide: () =>
        of(
          guide({
            listoParaProgramar: false,
            resumen: 'Todavia no hay ninguna plantilla aprobada.',
            advertencias: ['La plantilla de ejemplo "hello_world" solo corre en numeros de prueba.'],
          }),
        ),
    } as Partial<CrmApiService>);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Falta configurar');
    expect(text).toContain('hello_world');
    expect(text).toContain('Programa el reenganche desde la ficha');
  });

  it('muestra un error accionable cuando la guia no carga', () => {
    const fixture = setup({
      getCrmWhatsappReengagementGuide: () =>
        throwError(() => ({ error: { message: 'WhatsApp no esta configurado.' } })),
    } as Partial<CrmApiService>);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('WhatsApp no esta configurado.');
    expect(text).toContain('Reintentar');
  });
});

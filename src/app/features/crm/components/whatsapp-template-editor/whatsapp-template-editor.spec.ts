import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import type { CreateWhatsappTemplateRequest } from '@features/crm/data/crm-api.types';

import { WhatsappTemplateEditorComponent } from './whatsapp-template-editor';

/** Acceso a los miembros protegidos, que es donde vive la logica del editor. */
type Editor = WhatsappTemplateEditorComponent & {
  nombre: { set: (v: string) => void };
  cuerpo: () => string;
  pie: { set: (v: string) => void };
  ejemploCuerpo: () => string[];
  botones: () => unknown[];
  variablesCuerpo: () => string[];
  problema: () => string | null;
  preview: () => { cuerpo: string; botones: string[] };
  result: () => { mensaje: string } | null;
  error: () => string;
  setCuerpo: (v: string) => void;
  setEjemplo: (d: 'encabezado' | 'cuerpo', i: number, v: string) => void;
  agregarVariable: (d: 'encabezado' | 'cuerpo') => void;
  agregarBoton: () => void;
  actualizarBoton: (i: number, campo: string, v: unknown) => void;
  enviar: () => void;
};

describe('WhatsappTemplateEditorComponent', () => {
  const crear = (api: Partial<CrmApiService> = {}) => {
    TestBed.configureTestingModule({
      imports: [WhatsappTemplateEditorComponent],
      providers: [{ provide: CrmApiService, useValue: api }],
    });
    return TestBed.createComponent(WhatsappTemplateEditorComponent)
      .componentInstance as unknown as Editor;
  };

  /** Borrador minimo valido. */
  const completar = (editor: Editor) => {
    editor.nombre.set('seguir_cotizacion');
    editor.setCuerpo('Hola {{1}}, vence el {{2}}.');
    editor.setEjemplo('cuerpo', 0, 'Carlos');
    editor.setEjemplo('cuerpo', 1, '15/09/2026');
  };

  it('crea un campo de ejemplo por cada variable que se escribe', () => {
    const editor = crear();
    editor.setCuerpo('Hola {{1}} y {{2}}');

    expect(editor.variablesCuerpo()).toEqual(['1', '2']);
    expect(editor.ejemploCuerpo().length).toBe(2);
  });

  it('numera sola la variable que se agrega con el boton', () => {
    const editor = crear();
    editor.setCuerpo('Hola ');
    editor.agregarVariable('cuerpo');
    editor.agregarVariable('cuerpo');

    expect(editor.cuerpo()).toBe('Hola {{1}}{{2}}');
  });

  it('exige nombre en minusculas sin espacios', () => {
    const editor = crear();
    editor.nombre.set('Seguir Cotizacion');
    editor.setCuerpo('Hola');

    expect(editor.problema()).toContain('minusculas');
  });

  it('exige que las variables vayan numeradas en orden', () => {
    const editor = crear();
    editor.nombre.set('seguir');
    editor.setCuerpo('Hola {{1}} y {{3}}');
    editor.setEjemplo('cuerpo', 0, 'a');
    editor.setEjemplo('cuerpo', 1, 'b');

    expect(editor.problema()).toContain('orden');
  });

  it('exige un ejemplo por variable', () => {
    const editor = crear();
    editor.nombre.set('seguir');
    editor.setCuerpo('Hola {{1}}');

    expect(editor.problema()).toContain('ejemplo');
  });

  it('no admite variables en el pie', () => {
    const editor = crear();
    completar(editor);
    editor.pie.set('Enviado por {{1}}');

    expect(editor.problema()).toContain('pie');
  });

  it('rechaza un boton de enlace con variables', () => {
    const editor = crear();
    completar(editor);
    editor.agregarBoton();
    editor.actualizarBoton(0, 'tipo', 'URL');
    editor.actualizarBoton(0, 'texto', 'Ver');
    editor.actualizarBoton(0, 'url', 'https://azurion.tech/{{1}}');

    expect(editor.problema()).toContain('variables');
  });

  it('arma la vista previa reemplazando las variables por los ejemplos', () => {
    const editor = crear();
    completar(editor);

    expect(editor.preview().cuerpo).toBe('Hola Carlos, vence el 15/09/2026.');
  });

  it('manda el borrador y muestra que quedo en revision', () => {
    let enviado: CreateWhatsappTemplateRequest | null = null;
    const editor = crear({
      createCrmWhatsappTemplate: (request: CreateWhatsappTemplateRequest) => {
        enviado = request;
        return of({
          id: '1',
          nombre: 'seguir_cotizacion',
          idioma: 'es',
          categoria: 'UTILITY',
          estado: 'PENDING',
          mensaje: 'La plantilla quedo en revision.',
        });
      },
    } as Partial<CrmApiService>);

    completar(editor);
    expect(editor.problema()).toBeNull();
    editor.enviar();

    expect(enviado!.nombre).toBe('seguir_cotizacion');
    expect(enviado!.ejemploCuerpo).toEqual(['Carlos', '15/09/2026']);
    expect(editor.result()?.mensaje).toContain('revision');
    // El formulario queda limpio para la siguiente.
    expect(editor.cuerpo()).toBe('');
  });

  it('muestra el motivo cuando Meta rechaza el borrador', () => {
    const editor = crear({
      createCrmWhatsappTemplate: () =>
        throwError(() => ({ error: { message: 'Meta no acepto la plantilla: nombre duplicado.' } })),
    } as Partial<CrmApiService>);

    completar(editor);
    editor.enviar();

    expect(editor.error()).toContain('nombre duplicado');
  });
});

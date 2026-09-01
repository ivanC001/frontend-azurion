import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WritableSignal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { CrmApiService } from '../../data/crm-api.service';
import {
  CrmWhatsappConversation,
  CrmWhatsappMessage,
  CrmWhatsappTemplate,
} from '../../data/crm-api.types';
import { WhatsappInboxPage } from './whatsapp-inbox-page';

interface InboxState {
  conversations: WritableSignal<CrmWhatsappConversation[]>;
  selectedProspectId: WritableSignal<number | null>;
  templates: WritableSignal<CrmWhatsappTemplate[]>;
  templateParameters: WritableSignal<string[]>;
  messages: WritableSignal<CrmWhatsappMessage[]>;
  loadingList: WritableSignal<boolean>;
  templateError: WritableSignal<string>;
  selectTemplate(key: string): void;
  sendSelectedTemplate(): void;
  reloadTemplates(): void;
  canSendTemplate(): boolean;
}

const contact: CrmWhatsappConversation = {
  id: 1,
  prospectoId: 10,
  nombre: 'Ivan Flores',
  interesPrincipal: 'Curso Python',
  telefono: '51999888777',
  estadoConversacion: 'ABIERTA',
  noLeidos: 0,
  notasInternas: [],
  ventanaAtencionAbierta: false,
};
const template: CrmWhatsappTemplate = {
  nombre: 'seguimiento_prospecto',
  idioma: 'es_PE',
  categoria: 'MARKETING',
  cuerpo: 'Hola {{1}}, tu solicitud sobre {{2}}.',
  cantidadParametros: 2,
  disponible: true,
  componentes: [
    { tipo: 'BODY', texto: 'Hola {{1}}, tu solicitud sobre {{2}}.', parametros: ['1', '2'] },
  ],
};
const sent: CrmWhatsappMessage = {
  id: 20,
  prospectoId: 10,
  metaMessageId: 'wamid.unit-test',
  direccion: 'SALIENTE',
  tipoMensaje: 'template',
  estado: 'ENVIADO',
  contenido: 'Hola Ivan Flores, tu solicitud sobre Curso Python.',
  plantillaNombre: template.nombre,
  plantillaIdioma: template.idioma,
};

describe('WhatsApp inbox template composer', () => {
  let fixture: ComponentFixture<WhatsappInboxPage>;
  let state: InboxState;
  const api = {
    listCrmWhatsappQuickReplies: vi.fn(() => of([])),
    sendCrmWhatsappTemplate: vi.fn(),
    listCrmWhatsappTemplates: vi.fn(),
    listCrmWhatsappConversations: vi.fn(),
  };

  beforeEach(async () => {
    vi.spyOn(WhatsappInboxPage.prototype, 'ngOnInit').mockImplementation(() => {});
    api.sendCrmWhatsappTemplate.mockReturnValue(of(sent));
    api.listCrmWhatsappTemplates.mockReturnValue(of([template]));
    api.listCrmWhatsappConversations.mockReturnValue(of([contact]));
    await TestBed.configureTestingModule({
      imports: [WhatsappInboxPage],
      providers: [
        provideRouter([]),
        { provide: CrmApiService, useValue: api },
        {
          provide: AuthSessionService,
          useValue: { currentSession: () => ({ username: 'advisor', nombres: 'Ana' }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WhatsappInboxPage);
    state = fixture.componentInstance as unknown as InboxState;
    state.conversations.set([contact]);
    state.loadingList.set(false);
  });

  afterEach(() => {
    fixture.destroy();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('does not select the first conversation on entry', () => {
    fixture.detectChanges();
    expect(state.selectedProspectId()).toBeNull();
    expect(fixture.nativeElement.querySelector('.template-composer')).toBeNull();
  });

  function select() {
    state.selectedProspectId.set(10);
    state.templates.set([template]);
    state.selectTemplate('seguimiento_prospecto::es_PE');
    fixture.detectChanges();
  }

  it('renders editable suggested variables, preview and the send button', () => {
    select();
    const inputs = fixture.nativeElement.querySelectorAll(
      '.template-parameters input',
    ) as NodeListOf<HTMLInputElement>;
    expect([...inputs].map((input) => input.value)).toEqual(['Ivan Flores', 'Curso Python']);
    expect(fixture.nativeElement.querySelector('.template-preview').textContent).toContain(
      'Hola Ivan Flores, tu solicitud sobre Curso Python.',
    );
    const button = fixture.nativeElement.querySelector(
      '.template-composer > footer button',
    ) as HTMLButtonElement;
    expect(button.textContent).toContain('Enviar plantilla');
    expect(button.disabled).toBe(false);
    inputs[1].value = '';
    inputs[1].dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('.template-validation').textContent).toContain(
      '{{2}}',
    );
  });

  it('sends the edited values, appends the message and keeps the window closed', () => {
    select();
    state.templateParameters.set(['Ivan', 'Otro curso']);
    state.sendSelectedTemplate();
    fixture.detectChanges();
    expect(api.sendCrmWhatsappTemplate).toHaveBeenCalledWith(10, {
      nombre: template.nombre,
      idioma: template.idioma,
      parametros: ['Ivan', 'Otro curso'],
    });
    expect(state.messages()).toEqual([sent]);
    expect(state.conversations()[0].ventanaAtencionAbierta).toBe(false);
    expect(fixture.nativeElement.querySelector('.message-type').textContent).toContain(
      'seguimiento_prospecto',
    );
  });

  it('does not append a delayed response into another contact chat', () => {
    select();
    const result = new Subject<CrmWhatsappMessage>();
    api.sendCrmWhatsappTemplate.mockReturnValue(result);
    state.sendSelectedTemplate();
    state.conversations.set([contact, { ...contact, id: 2, prospectoId: 11, nombre: 'Otro' }]);
    state.selectedProspectId.set(11);
    api.listCrmWhatsappConversations.mockReturnValue(of(state.conversations()));
    result.next(sent);
    expect(state.messages()).toEqual([]);
  });

  it('refreshes from the API and resets parameters for a changed template', () => {
    select();
    state.reloadTemplates();
    expect(api.listCrmWhatsappTemplates).toHaveBeenCalledOnce();
    expect(state.templateParameters()).toEqual([]);
    expect(state.canSendTemplate()).toBe(false);
  });

  it('does not add a successful message when the API rejects the send', () => {
    select();
    api.sendCrmWhatsappTemplate.mockReturnValue(
      throwError(() => ({ error: { message: 'Meta: plantilla pausada' } })),
    );
    state.sendSelectedTemplate();
    expect(state.messages()).toEqual([]);
    expect(state.templateError()).not.toBe('');
    expect(state.templateParameters()).toEqual(['Ivan Flores', 'Curso Python']);
  });
});

import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, concatMap, forkJoin, from, map, of, timer, toArray } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { WhatsappQuickRepliesComponent } from '../../components/whatsapp-quick-replies/whatsapp-quick-replies';
<<<<<<< HEAD
import {
  renderTemplate,
  templateVariables,
  templateParameterError,
} from '../../utils/whatsapp-template.utils';
import { CrmApiService } from '@features/crm/data/crm-api.service';
import { Cotizacion } from '@core/api/cotizacion-api.types';
import { quoteCode } from '@shared/utils/quote-code';
=======
import { CrmApiService } from '@features/crm/data/crm-api.service';
import { Cotizacion } from '@core/api/cotizacion-api.types';
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
import { UsuarioTenant } from '@core/api/catalog-api.types';
import {
  CrmActividad,
  CrmWhatsappConversation,
  CrmWhatsappInternalNote,
  CrmWhatsappMessage,
  CrmWhatsappTemplate,
  SendCrmWhatsappQuoteResponse,
  WhatsappConnectionStatus,
} from '@features/crm/data/crm-api.types';

type InboxFilter = 'TODAS' | 'NO_LEIDAS' | 'MIAS';

interface QuoteSendOutcome {
  quoteId: number;
  result?: SendCrmWhatsappQuoteResponse;
  error?: unknown;
}

@Component({
  selector: 'app-whatsapp-inbox-page',
  standalone: true,
  imports: [DatePipe, FormsModule, WhatsappQuickRepliesComponent],
  templateUrl: './whatsapp-inbox-page.html',
  styleUrl: './whatsapp-inbox-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappInboxPage implements OnInit {
<<<<<<< HEAD
  protected readonly quoteCode = quoteCode;

=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
  private readonly api = inject(CrmApiService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly messageScroller = viewChild<ElementRef<HTMLDivElement>>('messageScroller');
  private queryTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly conversations = signal<CrmWhatsappConversation[]>([]);
  protected readonly messages = signal<CrmWhatsappMessage[]>([]);
  protected readonly users = signal<UsuarioTenant[]>([]);
  protected readonly activities = signal<CrmActividad[]>([]);
  protected readonly connectionStatus = signal<WhatsappConnectionStatus | null>(null);
  protected readonly selectedProspectId = signal<number | null>(null);
  protected readonly activeFilter = signal<InboxFilter>('TODAS');
  protected readonly statusFilter = signal('');
  protected readonly query = signal('');
  protected readonly draft = signal('');
  protected readonly noteDraft = signal('');
  protected readonly selectedNoteId = signal<number | null>(null);
  protected readonly quotes = signal<Cotizacion[]>([]);
  protected readonly selectedQuoteIds = signal<ReadonlySet<number>>(new Set<number>());
  protected readonly quotePickerOpen = signal(false);
  protected readonly loadingQuotes = signal(false);
  protected readonly sendingQuotes = signal(false);
  protected readonly loadingList = signal(true);
  protected readonly loadingMessages = signal(false);
  protected readonly sending = signal(false);
  protected readonly templates = signal<CrmWhatsappTemplate[]>([]);
  protected readonly selectedTemplateKey = signal('');
  protected readonly templateParameters = signal<string[]>([]);
  protected readonly loadingTemplates = signal(false);
  protected readonly sendingTemplate = signal(false);
  protected readonly templateError = signal('');
  protected readonly savingAction = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly mobilePanel = signal<'LIST' | 'CHAT' | 'DETAIL'>('LIST');

  protected readonly selectedConversation = computed(
    () =>
      this.conversations().find((item) => item.prospectoId === this.selectedProspectId()) ?? null,
  );
  protected readonly selectedNotes = computed(
    () => this.selectedConversation()?.notasInternas ?? [],
  );
  protected readonly selectedQuoteCount = computed(() => this.selectedQuoteIds().size);
  protected readonly unreadTotal = computed(() =>
    this.conversations().reduce((total, item) => total + Number(item.noLeidos || 0), 0),
  );
  protected readonly mineTotal = computed(() => {
    const username = this.session.currentSession()?.username;
    return this.conversations().filter((item) => item.responsableId === username).length;
  });
  protected readonly openConversationTotal = computed(
    () => this.conversations().filter((item) => item.estadoConversacion !== 'RESUELTA').length,
  );
  protected readonly currentResponderName = computed(() => {
    const current = this.session.currentSession();
    return current?.nombres?.trim() || current?.username || 'Usuario CRM';
  });
  protected readonly serviceWindowOpen = computed(
    () => this.selectedConversation()?.ventanaAtencionAbierta === true,
  );
  protected readonly selectedTemplate = computed(() => {
    const key = this.selectedTemplateKey();
    return this.templates().find((template) => this.templateKey(template) === key) ?? null;
  });
  protected readonly templatePreview = computed(() => {
    const selected = this.selectedTemplate();
<<<<<<< HEAD
    return selected ? renderTemplate(selected, this.templateParameters()) : '';
  });
  protected readonly templateVariables = computed(() => {
    const selected = this.selectedTemplate();
    return selected ? templateVariables(selected, this.selectedConversation()) : [];
  });
  protected readonly templateValidationError = computed(() => {
    for (const [index, variable] of this.templateVariables().entries()) {
      const error = templateParameterError(variable, this.templateParameters()[index] ?? '');
      if (error) return error;
    }
    return '';
=======
    if (!selected) {
      return '';
    }
    return this.templateParameters().reduce(
      (text, value, index) =>
        text.replaceAll(`{{${index + 1}}}`, value.trim() || `{{${index + 1}}}`),
      selected.cuerpo,
    );
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
  });
  protected readonly selectedActivities = computed(() => {
    const prospectId = this.selectedProspectId();
    if (!prospectId) {
      return [];
    }
    return this.activities()
      .filter((item) => item.prospectoId === prospectId && item.estado !== 'REALIZADA')
      .sort((left, right) => Date.parse(left.fechaProgramada) - Date.parse(right.fechaProgramada))
      .slice(0, 3);
  });
  protected readonly currentAdvisorName = computed(() => {
    const responsableId = this.selectedConversation()?.responsableId;
    if (!responsableId) {
      return 'Sin asignar';
    }
    return this.users().find((item) => item.username === responsableId)?.nombres || responsableId;
  });

  ngOnInit(): void {
    this.loadSupportData();
    timer(0, 15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (typeof document !== 'undefined' && document.hidden) {
          return;
        }
        this.loadConversations(this.conversations().length > 0);
        if (this.selectedProspectId()) {
          this.loadMessages(true);
        }
      });
  }

  protected setInboxFilter(filter: InboxFilter): void {
    if (this.activeFilter() === filter) {
      return;
    }
    this.activeFilter.set(filter);
    this.loadConversations();
  }

  protected onStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.loadConversations();
  }

  protected onQueryChange(value: string): void {
    this.query.set(value);
    if (this.queryTimer) {
      clearTimeout(this.queryTimer);
    }
    this.queryTimer = setTimeout(() => this.loadConversations(), 300);
  }

  protected selectConversation(conversation: CrmWhatsappConversation): void {
    const changed = this.selectedProspectId() !== conversation.prospectoId;
    this.selectedProspectId.set(conversation.prospectoId);
    this.selectedNoteId.set(null);
    this.noteDraft.set('');
    this.quotes.set([]);
    this.selectedQuoteIds.set(new Set<number>());
    this.quotePickerOpen.set(false);
    this.selectedTemplateKey.set('');
    this.templateParameters.set([]);
<<<<<<< HEAD
    this.templateError.set('');
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
    this.mobilePanel.set('CHAT');
    if (changed) {
      this.messages.set([]);
      this.loadMessages();
      this.loadQuotes();
    }
    if (conversation.noLeidos > 0) {
      this.api.markCrmWhatsappConversationRead(conversation.prospectoId).subscribe({
        next: (updated) => this.replaceConversation(updated),
        error: () => undefined,
      });
    }
  }

  protected sendMessage(): void {
    const prospectId = this.selectedProspectId();
    const content = this.draft().trim();
    if (!prospectId || !content || this.sending()) {
      return;
    }
    if (!this.serviceWindowOpen()) {
      this.errorMessage.set(
        'La ventana de 24 horas terminó. Usa una plantilla aprobada por Meta para volver a contactar.',
      );
      return;
    }

    this.sending.set(true);
    this.clearFeedback();
    this.api.sendCrmWhatsappMessage(prospectId, { mensaje: content, previewUrl: true }).subscribe({
      next: (message) => {
        this.messages.update((items) => [...items, message]);
        this.draft.set('');
        this.sending.set(false);
        this.successMessage.set(
          'Meta aceptó el mensaje. El estado se actualizará cuando sea entregado.',
        );
        this.scrollMessagesToBottom();
        this.loadConversations(true);
      },
      error: (error) => {
        this.sending.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo enviar el mensaje.'));
      },
    });
  }

  protected templateKey(template: CrmWhatsappTemplate): string {
    return `${template.nombre}::${template.idioma}`;
  }

  protected selectTemplate(value: string): void {
    this.selectedTemplateKey.set(value);
    const selected = this.templates().find((template) => this.templateKey(template) === value);
    this.templateParameters.set(
<<<<<<< HEAD
      selected
        ? templateVariables(selected, this.selectedConversation()).map(
            (variable) => variable.suggestedValue,
          )
        : [],
=======
      Array.from({ length: selected?.cantidadParametros ?? 0 }, () => ''),
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
    );
    this.templateError.set('');
  }

  protected updateTemplateParameter(index: number, value: string): void {
    this.templateParameters.update((parameters) =>
      parameters.map((current, currentIndex) => (currentIndex === index ? value : current)),
    );
  }

  protected canSendTemplate(): boolean {
    const selected = this.selectedTemplate();
    return (
      !!selected &&
<<<<<<< HEAD
      !!this.selectedConversation() &&
      selected.disponible !== false &&
      !this.loadingTemplates() &&
      !this.sendingTemplate() &&
      this.templateParameters().length === selected.cantidadParametros &&
      !this.templateValidationError()
=======
      !this.sendingTemplate() &&
      this.templateParameters().length === selected.cantidadParametros &&
      this.templateParameters().every((value) => !!value.trim())
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
    );
  }

  protected sendSelectedTemplate(): void {
    const prospectId = this.selectedProspectId();
    const selected = this.selectedTemplate();
    if (!prospectId || !selected || !this.canSendTemplate()) {
      this.templateError.set('Selecciona una plantilla y completa todas sus variables.');
      return;
    }
    this.sendingTemplate.set(true);
    this.clearFeedback();
    this.templateError.set('');
    this.api
      .sendCrmWhatsappTemplate(prospectId, {
        nombre: selected.nombre,
        idioma: selected.idioma,
        parametros: this.templateParameters().map((value) => value.trim()),
      })
      .subscribe({
        next: (message) => {
<<<<<<< HEAD
          this.sendingTemplate.set(false);
          if (this.selectedProspectId() === prospectId) {
            this.messages.update((items) =>
              items.some((item) => item.metaMessageId === message.metaMessageId)
                ? items
                : [...items, message],
            );
            this.selectedTemplateKey.set('');
            this.templateParameters.set([]);
            this.successMessage.set(
              'Meta aceptó la plantilla. Espera la respuesta del cliente para enviar texto libre.',
            );
            this.scrollMessagesToBottom();
          }
=======
          this.messages.update((items) => [...items, message]);
          this.sendingTemplate.set(false);
          this.selectedTemplateKey.set('');
          this.templateParameters.set([]);
          this.successMessage.set(
            'Meta aceptó la plantilla. Su estado se actualizará al entregarse.',
          );
          this.scrollMessagesToBottom();
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
          this.loadConversations(true);
        },
        error: (error) => {
          this.sendingTemplate.set(false);
<<<<<<< HEAD
          if (this.selectedProspectId() === prospectId) {
            this.templateError.set(
              this.readError(error, 'No se pudo enviar la plantilla de WhatsApp.'),
            );
          }
=======
          this.templateError.set(
            this.readError(error, 'No se pudo enviar la plantilla de WhatsApp.'),
          );
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
        },
      });
  }

  protected reloadTemplates(): void {
    this.loadTemplates();
  }

  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected toggleResolved(): void {
    const conversation = this.selectedConversation();
    if (!conversation || this.savingAction()) {
      return;
    }
    const status = conversation.estadoConversacion === 'RESUELTA' ? 'ABIERTA' : 'RESUELTA';
    this.savingAction.set(true);
    this.clearFeedback();
    this.api.updateCrmWhatsappConversationStatus(conversation.prospectoId, status).subscribe({
      next: (updated) => {
        this.replaceConversation(updated);
        this.savingAction.set(false);
        this.successMessage.set(
          status === 'RESUELTA' ? 'Conversación resuelta.' : 'Conversación reabierta.',
        );
      },
      error: (error) => {
        this.savingAction.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo actualizar la conversación.'));
      },
    });
  }

  protected assignConversation(value: string): void {
    const prospectId = this.selectedProspectId();
    if (!prospectId) {
      return;
    }
    this.savingAction.set(true);
    this.clearFeedback();
    this.api.assignCrmWhatsappConversation(prospectId, value || null).subscribe({
      next: (updated) => {
        this.replaceConversation(updated);
        this.savingAction.set(false);
        this.successMessage.set(value ? 'Asesor asignado.' : 'Conversación sin asignar.');
      },
      error: (error) => {
        this.savingAction.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo asignar el asesor.'));
      },
    });
  }

  protected saveInternalNote(): void {
    const prospectId = this.selectedProspectId();
    const content = this.noteDraft().trim();
    const noteId = this.selectedNoteId();
    if (!prospectId || !content || this.savingAction()) {
      return;
    }
    if (noteId === null && this.selectedNotes().length >= 3) {
      this.errorMessage.set('Solo puedes guardar hasta 3 notas internas por conversación.');
      return;
    }
    this.savingAction.set(true);
    this.clearFeedback();
    const request =
      noteId === null
        ? this.api.createCrmWhatsappConversationNote(prospectId, content)
        : this.api.updateCrmWhatsappSavedNote(prospectId, noteId, content);
    request.subscribe({
      next: (updated) => {
        this.replaceConversation(updated);
        const saved =
          updated.notasInternas.find((item) =>
            noteId === null ? item.contenido === content : item.id === noteId,
          ) ?? updated.notasInternas.at(-1);
        this.selectedNoteId.set(saved?.id ?? null);
        this.noteDraft.set(saved?.contenido ?? '');
        this.savingAction.set(false);
        this.successMessage.set('Nota interna guardada.');
      },
      error: (error) => {
        this.savingAction.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo guardar la nota.'));
      },
    });
  }

  protected selectInternalNote(note: CrmWhatsappInternalNote): void {
    this.selectedNoteId.set(note.id);
    this.noteDraft.set(note.contenido);
  }

  protected newInternalNote(): void {
    if (this.selectedNotes().length >= 3) {
      return;
    }
    this.selectedNoteId.set(null);
    this.noteDraft.set('');
  }

  protected useNoteAsReply(note: CrmWhatsappInternalNote): void {
    this.draft.set(note.contenido);
    this.mobilePanel.set('CHAT');
    this.focusReplyComposer();
    this.successMessage.set(`Nota ${note.slot} cargada como respuesta. Revísala antes de enviar.`);
  }

  protected useQuickReply(message: string): void {
    this.draft.set(message);
    this.mobilePanel.set('CHAT');
    this.focusReplyComposer();
    this.successMessage.set('Respuesta rapida cargada. Revisala antes de enviar.');
  }

  protected sendQuickReply(message: string): void {
    if (!this.serviceWindowOpen()) {
      this.errorMessage.set('La ventana de 24 horas termino. Usa una plantilla aprobada por Meta.');
      return;
    }
    this.draft.set(message);
    this.sendMessage();
  }

  protected focusReplyComposer(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById('whatsapp-reply-composer')?.focus();
  }

  protected openSavedNotes(): void {
    if (typeof document === 'undefined') {
      return;
    }
    document.getElementById('whatsapp-quick-replies')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }

  protected deleteInternalNote(note: CrmWhatsappInternalNote, event: Event): void {
    event.stopPropagation();
    const prospectId = this.selectedProspectId();
    if (!prospectId || this.savingAction()) {
      return;
    }
    this.savingAction.set(true);
    this.clearFeedback();
    this.api.deleteCrmWhatsappSavedNote(prospectId, note.id).subscribe({
      next: (updated) => {
        this.replaceConversation(updated);
        if (this.selectedNoteId() === note.id) {
          this.selectedNoteId.set(null);
          this.noteDraft.set('');
        }
        this.savingAction.set(false);
        this.successMessage.set('Nota interna eliminada.');
      },
      error: (error) => {
        this.savingAction.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo eliminar la nota.'));
      },
    });
  }

  protected toggleQuotePicker(): void {
    this.quotePickerOpen.update((visible) => !visible);
  }

  protected toggleQuote(quoteId: number): void {
    if (this.isQuoteWhatsappLocked(this.quotes().find((quote) => quote.id === quoteId))) {
      return;
    }
    this.selectedQuoteIds.update((current) => {
      const updated = new Set(current);
      if (updated.has(quoteId)) {
        updated.delete(quoteId);
      } else {
        updated.add(quoteId);
      }
      return updated;
    });
  }

  protected sendSelectedQuotes(): void {
    const prospectId = this.selectedProspectId();
    const alreadySent = new Set(
      this.quotes()
        .filter((quote) => this.isQuoteWhatsappLocked(quote))
        .map((quote) => quote.id),
    );
    const quoteIds = [...this.selectedQuoteIds()].filter((quoteId) => !alreadySent.has(quoteId));
    if (!prospectId || quoteIds.length === 0 || this.sendingQuotes()) {
      if (prospectId && quoteIds.length === 0 && this.selectedQuoteIds().size > 0) {
        this.errorMessage.set('Las cotizaciones seleccionadas ya fueron enviadas por WhatsApp.');
      }
      return;
    }
    if (!this.serviceWindowOpen()) {
      this.errorMessage.set(
        'No puedes enviar archivos fuera de la ventana de atención de 24 horas.',
      );
      return;
    }
    const caption = this.draft().trim();
    if (caption.length > 1024) {
      this.errorMessage.set(
        'El mensaje que acompaña la cotización no puede superar 1024 caracteres.',
      );
      return;
    }
    this.sendingQuotes.set(true);
    this.clearFeedback();
    from(quoteIds)
      .pipe(
        concatMap((quoteId, index) =>
          this.api.sendCrmWhatsappQuote(prospectId, quoteId, index === 0 ? caption : null).pipe(
            map((result) => ({ quoteId, result }) as QuoteSendOutcome),
            catchError((error) => of({ quoteId, error } as QuoteSendOutcome)),
          ),
        ),
        toArray(),
      )
      .subscribe({
        next: (outcomes) => {
          const responses = outcomes.flatMap((item) => (item.result ? [item.result] : []));
          const failedIds = outcomes.filter((item) => item.error).map((item) => item.quoteId);
          this.messages.update((items) => [...items, ...responses.map((item) => item.mensaje)]);
          const updatedQuotes = new Map(
            responses.map((item) => [item.cotizacion.id, item.cotizacion]),
          );
          this.quotes.update((items) => items.map((item) => updatedQuotes.get(item.id) ?? item));
          this.selectedQuoteIds.set(new Set(failedIds));
          this.quotePickerOpen.set(failedIds.length > 0);
          if (caption && responses.length > 0) {
            this.draft.set('');
          }
          this.sendingQuotes.set(false);
          if (failedIds.length > 0) {
            this.errorMessage.set(
              responses.length > 0
                ? `${responses.length} cotización(es) enviada(s); ${failedIds.length} no se pudieron enviar.`
                : 'No se pudo enviar ninguna cotización por WhatsApp.',
            );
          } else {
            this.successMessage.set(
              responses.length === 1
                ? 'Cotización enviada por WhatsApp.'
                : `${responses.length} cotizaciones enviadas por WhatsApp.`,
            );
          }
          this.scrollMessagesToBottom();
          this.loadConversations(true);
        },
      });
  }

  protected isQuoteWhatsappLocked(quote: Cotizacion | undefined): boolean {
    return ['SENT', 'SENDING', 'UNKNOWN'].includes(quote?.whatsappSendStatus || '');
  }

  protected quoteWhatsappStatusLabel(quote: Cotizacion): string {
    switch (quote.whatsappSendStatus) {
      case 'SENT':
        return 'Enviada por WhatsApp';
      case 'SENDING':
        return 'Envio en proceso';
      case 'UNKNOWN':
        return 'Envio por verificar';
      default:
        return quote.estado;
    }
  }

  protected createQuote(): void {
    const prospectId = this.selectedProspectId();
    void this.router.navigate(['/admin/crm/cotizaciones'], {
      queryParams: prospectId ? { prospectoId: prospectId } : undefined,
    });
  }

  protected formatQuoteTotal(quote: Cotizacion): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: quote.moneda || 'PEN',
    }).format(Number(quote.total || 0));
  }

  protected openProspect(): void {
    const prospectId = this.selectedProspectId();
    void this.router.navigate(['/admin/crm/prospectos'], {
      queryParams: prospectId ? { prospectoId: prospectId } : undefined,
    });
  }

  protected openFollowUp(): void {
    const prospectId = this.selectedProspectId();
    void this.router.navigate(['/admin/crm/seguimiento'], {
      queryParams: prospectId ? { prospectoId: prospectId } : undefined,
    });
  }

  protected showDetail(): void {
    this.mobilePanel.set('DETAIL');
  }

  protected backToList(): void {
    this.mobilePanel.set('LIST');
  }

  protected backToChat(): void {
    this.mobilePanel.set('CHAT');
  }

  protected initials(name?: string | null): string {
    const parts = (name ?? 'Contacto').trim().split(/\s+/).filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('') || 'C'
    );
  }

  protected timeLabel(value?: string | null): string {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(date);
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    return new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short' }).format(date);
  }

  protected messageTime(value?: string | null): string {
    if (!value) {
      return '';
    }
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(
      new Date(value),
    );
  }

  protected messageTrack(_: number, message: CrmWhatsappMessage): string | number {
    return message.metaMessageId || message.id;
  }

  protected messageSenderLabel(message: CrmWhatsappMessage): string {
    if (message.direccion !== 'SALIENTE') {
      return '';
    }
    return message.enviadoPorNombre?.trim() || message.enviadoPorUsuarioId?.trim() || 'Sistema';
  }

  protected messageStatusLabel(message: CrmWhatsappMessage): string {
    switch ((message.estado || '').toUpperCase()) {
      case 'LEIDO':
      case 'READ':
        return 'Leído';
      case 'ENTREGADO':
      case 'DELIVERED':
        return 'Entregado';
      case 'FALLIDO':
      case 'FAILED':
        return 'No entregado';
      case 'ENVIADO':
      case 'SENT':
        return 'Enviado a Meta';
      default:
        return message.estado || 'Pendiente';
    }
  }

  protected messageStatusIcon(message: CrmWhatsappMessage): string {
    switch ((message.estado || '').toUpperCase()) {
      case 'LEIDO':
      case 'READ':
        return 'pi pi-check-circle';
      case 'ENTREGADO':
      case 'DELIVERED':
        return 'pi pi-check';
      case 'FALLIDO':
      case 'FAILED':
        return 'pi pi-exclamation-circle';
      default:
        return 'pi pi-clock';
    }
  }

  protected isFailedMessage(message: CrmWhatsappMessage): boolean {
    return ['FALLIDO', 'FAILED'].includes((message.estado || '').toUpperCase());
  }

  protected serviceWindowLabel(): string {
    const until = this.selectedConversation()?.ventanaAtencionHasta;
    if (!until) {
      return 'Sin conversación iniciada por el cliente';
    }
    const expiration = new Date(until);
    if (!Number.isFinite(expiration.getTime()) || expiration.getTime() <= Date.now()) {
      return 'Ventana de 24 horas finalizada';
    }
    return `Texto libre disponible hasta ${new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(expiration)}`;
  }

  private loadConversations(silent = false): void {
    if (!silent) {
      this.loadingList.set(true);
    }
    const filter = this.activeFilter();
    this.api
      .listCrmWhatsappConversations({
        query: this.query(),
        estado: this.statusFilter(),
        soloNoLeidas: filter === 'NO_LEIDAS',
        soloMias: filter === 'MIAS',
      })
      .subscribe({
        next: (conversations) => {
          this.conversations.set(conversations);
          this.loadingList.set(false);
          const selectedId = this.selectedProspectId();
          const stillVisible = conversations.some((item) => item.prospectoId === selectedId);
          if (selectedId && !stillVisible) {
            this.clearConversationSelection();
          }
        },
        error: (error) => {
          this.loadingList.set(false);
          if (!silent) {
            this.errorMessage.set(
              this.readError(error, 'No se pudo cargar la bandeja de WhatsApp.'),
            );
          }
        },
      });
  }

  private clearConversationSelection(): void {
    this.selectedProspectId.set(null);
    this.messages.set([]);
    this.quotes.set([]);
    this.selectedQuoteIds.set(new Set<number>());
    this.quotePickerOpen.set(false);
    this.selectedNoteId.set(null);
    this.noteDraft.set('');
    this.draft.set('');
    this.mobilePanel.set('LIST');
  }

  private loadMessages(silent = false): void {
    const prospectId = this.selectedProspectId();
    if (!prospectId) {
      return;
    }
    if (!silent) {
      this.loadingMessages.set(true);
    }
    this.api.listCrmWhatsappMessages(prospectId).subscribe({
      next: (messages) => {
        if (this.selectedProspectId() !== prospectId) {
          return;
        }
        const changed =
          this.messages().length !== messages.length ||
          this.messages().at(-1)?.estado !== messages.at(-1)?.estado;
        this.messages.set(messages);
        this.loadingMessages.set(false);
        if (changed || !silent) {
          this.scrollMessagesToBottom();
        }
      },
      error: (error) => {
        this.loadingMessages.set(false);
        if (!silent) {
          this.errorMessage.set(this.readError(error, 'No se pudo cargar la conversación.'));
        }
      },
    });
  }

  private loadQuotes(): void {
    const prospectId = this.selectedProspectId();
    if (!prospectId) {
      this.quotes.set([]);
      return;
    }
    this.loadingQuotes.set(true);
    this.api.listCrmWhatsappQuotes(prospectId).subscribe({
      next: (quotes) => {
        if (this.selectedProspectId() === prospectId) {
          this.quotes.set(quotes);
        }
        this.loadingQuotes.set(false);
      },
      error: () => {
        this.loadingQuotes.set(false);
        this.quotes.set([]);
      },
    });
  }

  private loadSupportData(): void {
    forkJoin({
      users: this.api.listUsuarios(),
      activities: this.api.listCrmActividadesPage({ page: 0, size: 100 }),
    }).subscribe({
      next: ({ users, activities }) => {
        this.users.set(users.filter((item) => item.activo));
        this.activities.set(activities.content ?? []);
      },
      error: () => undefined,
    });
    this.api.getCrmWhatsappConnectionStatus().subscribe({
      next: (status) => this.connectionStatus.set(status),
      error: () => this.connectionStatus.set(null),
    });
    this.loadTemplates();
  }

  private loadTemplates(): void {
<<<<<<< HEAD
    if (this.loadingTemplates() || this.sendingTemplate()) return;
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
    this.loadingTemplates.set(true);
    this.templateError.set('');
    this.api.listCrmWhatsappTemplates().subscribe({
      next: (templates) => {
        this.templates.set(templates);
        this.loadingTemplates.set(false);
<<<<<<< HEAD
        // A refreshed template can have different variables even with the same name and language.
        this.selectedTemplateKey.set('');
        this.templateParameters.set([]);
=======
        if (
          this.selectedTemplateKey() &&
          !templates.some((template) => this.templateKey(template) === this.selectedTemplateKey())
        ) {
          this.selectedTemplateKey.set('');
          this.templateParameters.set([]);
        }
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
      },
      error: (error) => {
        this.loadingTemplates.set(false);
        this.templates.set([]);
<<<<<<< HEAD
        this.selectedTemplateKey.set('');
        this.templateParameters.set([]);
=======
>>>>>>> b50118bff6d4d47a3981a187eab708420ee804bc
        this.templateError.set(
          this.readError(error, 'No se pudieron consultar las plantillas aprobadas.'),
        );
      },
    });
  }

  private replaceConversation(updated: CrmWhatsappConversation): void {
    this.conversations.update((items) =>
      items.map((item) => (item.prospectoId === updated.prospectoId ? updated : item)),
    );
  }

  private scrollMessagesToBottom(): void {
    setTimeout(() => {
      const element = this.messageScroller()?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private clearFeedback(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; error?: string } };
    return candidate?.error?.message || candidate?.error?.error || fallback;
  }
}

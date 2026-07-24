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
import {
  AdminSaasApiService,
  Cotizacion,
  CrmActividad,
  CrmWhatsappConversation,
  CrmWhatsappInternalNote,
  CrmWhatsappMessage,
  SendCrmWhatsappQuoteResponse,
  UsuarioTenant,
  WhatsappConnectionStatus,
} from '../../../../data/admin-saas-api.service';

type InboxFilter = 'TODAS' | 'NO_LEIDAS' | 'MIAS';

interface QuoteSendOutcome {
  quoteId: number;
  result?: SendCrmWhatsappQuoteResponse;
  error?: unknown;
}

@Component({
  selector: 'app-whatsapp-inbox-page',
  standalone: true,
  imports: [DatePipe, FormsModule],
  templateUrl: './whatsapp-inbox-page.html',
  styleUrl: './whatsapp-inbox-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappInboxPage implements OnInit {
  private readonly api = inject(AdminSaasApiService);
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
  protected readonly savingAction = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly mobilePanel = signal<'LIST' | 'CHAT' | 'DETAIL'>('LIST');

  protected readonly selectedConversation = computed(() =>
    this.conversations().find((item) => item.prospectoId === this.selectedProspectId()) ?? null,
  );
  protected readonly selectedNotes = computed(() => this.selectedConversation()?.notasInternas ?? []);
  protected readonly selectedQuoteCount = computed(() => this.selectedQuoteIds().size);
  protected readonly unreadTotal = computed(() =>
    this.conversations().reduce((total, item) => total + Number(item.noLeidos || 0), 0),
  );
  protected readonly mineTotal = computed(() => {
    const username = this.session.currentSession()?.username;
    return this.conversations().filter((item) => item.responsableId === username).length;
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
    timer(0, 5000)
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

    this.sending.set(true);
    this.clearFeedback();
    this.api.sendCrmWhatsappMessage(prospectId, { mensaje: content, previewUrl: true }).subscribe({
      next: (message) => {
        this.messages.update((items) => [...items, message]);
        this.draft.set('');
        this.sending.set(false);
        this.successMessage.set('Mensaje enviado por WhatsApp.');
        this.scrollMessagesToBottom();
        this.loadConversations(true);
      },
      error: (error) => {
        this.sending.set(false);
        this.errorMessage.set(this.readError(error, 'No se pudo enviar el mensaje.'));
      },
    });
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
        this.successMessage.set(status === 'RESUELTA' ? 'Conversación resuelta.' : 'Conversación reabierta.');
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
    const request = noteId === null
      ? this.api.createCrmWhatsappConversationNote(prospectId, content)
      : this.api.updateCrmWhatsappSavedNote(prospectId, noteId, content);
    request.subscribe({
      next: (updated) => {
        this.replaceConversation(updated);
        const saved = updated.notasInternas.find((item) =>
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
    this.successMessage.set(`Nota ${note.slot} cargada como respuesta. Revísala antes de enviar.`);
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
    const quoteIds = [...this.selectedQuoteIds()];
    if (!prospectId || quoteIds.length === 0 || this.sendingQuotes()) {
      return;
    }
    const caption = this.draft().trim();
    if (caption.length > 1024) {
      this.errorMessage.set('El mensaje que acompaña la cotización no puede superar 1024 caracteres.');
      return;
    }
    this.sendingQuotes.set(true);
    this.clearFeedback();
    from(quoteIds)
      .pipe(
        concatMap((quoteId, index) =>
          this.api
            .sendCrmWhatsappQuote(prospectId, quoteId, index === 0 ? caption : null)
            .pipe(
              map((result) => ({ quoteId, result }) as QuoteSendOutcome),
              catchError((error) => of({ quoteId, error } as QuoteSendOutcome)),
            ),
        ),
        toArray(),
      )
      .subscribe({
        next: (outcomes) => {
          const responses = outcomes.flatMap((item) => item.result ? [item.result] : []);
          const failedIds = outcomes.filter((item) => item.error).map((item) => item.quoteId);
          this.messages.update((items) => [...items, ...responses.map((item) => item.mensaje)]);
          const updatedQuotes = new Map(responses.map((item) => [item.cotizacion.id, item.cotizacion]));
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
    return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'C';
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
    return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  }

  protected messageTrack(_: number, message: CrmWhatsappMessage): string | number {
    return message.metaMessageId || message.id;
  }

  private loadConversations(silent = false): void {
    if (!silent) {
      this.loadingList.set(true);
    }
    const filter = this.activeFilter();
    this.api.listCrmWhatsappConversations({
      query: this.query(),
      estado: this.statusFilter(),
      soloNoLeidas: filter === 'NO_LEIDAS',
      soloMias: filter === 'MIAS',
    }).subscribe({
      next: (conversations) => {
        this.conversations.set(conversations);
        this.loadingList.set(false);
        const selectedId = this.selectedProspectId();
        const stillVisible = conversations.some((item) => item.prospectoId === selectedId);
        if (selectedId && !stillVisible) {
          this.selectedProspectId.set(null);
          this.messages.set([]);
          this.quotes.set([]);
          this.selectedQuoteIds.set(new Set<number>());
          this.quotePickerOpen.set(false);
          this.mobilePanel.set('LIST');
        }
      },
      error: (error) => {
        this.loadingList.set(false);
        if (!silent) {
          this.errorMessage.set(this.readError(error, 'No se pudo cargar la bandeja de WhatsApp.'));
        }
      },
    });
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
        const changed = this.messages().length !== messages.length ||
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
    forkJoin({ users: this.api.listUsuarios(), activities: this.api.listCrmActividades() }).subscribe({
      next: ({ users, activities }) => {
        this.users.set(users.filter((item) => item.activo));
        this.activities.set(activities);
      },
      error: () => undefined,
    });
    this.api.getCrmWhatsappConnectionStatus().subscribe({
      next: (status) => this.connectionStatus.set(status),
      error: () => this.connectionStatus.set(null),
    });
  }

  private replaceConversation(updated: CrmWhatsappConversation): void {
    this.conversations.update((items) =>
      items.map((item) => item.prospectoId === updated.prospectoId ? updated : item),
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

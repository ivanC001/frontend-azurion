import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import {
  SaveWhatsappQuickReplyRequest,
  WhatsappQuickReply,
} from '@features/crm/data/crm-api.types';

@Component({
  selector: 'app-whatsapp-quick-replies',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './whatsapp-quick-replies.html',
  styleUrl: './whatsapp-quick-replies.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappQuickRepliesComponent implements OnInit {
  private readonly api = inject(CrmApiService);

  readonly canSend = input(false);
  readonly useReply = output<string>();
  readonly sendReply = output<string>();

  protected readonly replies = signal<WhatsappQuickReply[]>([]);
  protected readonly editingId = signal<number | null>(null);
  protected readonly title = signal('');
  protected readonly message = signal('');
  protected readonly editorOpen = signal(false);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly deletingId = signal<number | null>(null);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.load();
  }

  protected startNew(): void {
    if (this.replies().length >= 3) {
      return;
    }
    this.editingId.set(null);
    this.title.set('');
    this.message.set('');
    this.editorOpen.set(true);
    this.error.set('');
  }

  protected edit(reply: WhatsappQuickReply): void {
    this.editingId.set(reply.id);
    this.title.set(reply.titulo);
    this.message.set(reply.mensaje);
    this.editorOpen.set(true);
    this.error.set('');
  }

  protected cancelEdit(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    this.title.set('');
    this.message.set('');
  }

  protected save(): void {
    const request: SaveWhatsappQuickReplyRequest = {
      titulo: this.title().trim(),
      mensaje: this.message().trim(),
    };
    if (!request.titulo || !request.mensaje || this.saving()) {
      this.error.set('Completa el titulo y el mensaje.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const id = this.editingId();
    const operation =
      id === null
        ? this.api.createCrmWhatsappQuickReply(request)
        : this.api.updateCrmWhatsappQuickReply(id, request);
    operation.subscribe({
      next: (saved) => {
        this.replies.update((items) =>
          [...items.filter((item) => item.id !== saved.id), saved].sort((a, b) => a.slot - b.slot),
        );
        this.saving.set(false);
        this.cancelEdit();
      },
      error: (error) => {
        this.saving.set(false);
        this.error.set(this.readError(error, 'No se pudo guardar la respuesta.'));
      },
    });
  }

  protected remove(reply: WhatsappQuickReply): void {
    if (this.deletingId() !== null) {
      return;
    }
    this.deletingId.set(reply.id);
    this.error.set('');
    this.api.deleteCrmWhatsappQuickReply(reply.id).subscribe({
      next: () => {
        this.replies.update((items) => items.filter((item) => item.id !== reply.id));
        this.deletingId.set(null);
        if (this.editingId() === reply.id) {
          this.cancelEdit();
        }
      },
      error: (error) => {
        this.deletingId.set(null);
        this.error.set(this.readError(error, 'No se pudo eliminar la respuesta.'));
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.listCrmWhatsappQuickReplies().subscribe({
      next: (items) => {
        this.replies.set(items);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.error.set(this.readError(error, 'No se pudieron cargar tus respuestas.'));
      },
    });
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; detail?: string } };
    return candidate.error?.message || candidate.error?.detail || fallback;
  }
}

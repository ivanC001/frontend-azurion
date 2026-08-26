import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

import {
  InboxMessage,
  PlatformMessagingService,
} from '@features/platform/data/platform-messaging.service';

@Injectable({ providedIn: 'root' })
export class InternalMessageNotificationService {
  private readonly api = inject(PlatformMessagingService);
  private readonly inboxState = signal<InboxMessage[]>([]);
  private readonly unreadState = signal(0);
  private readonly loadingState = signal(false);

  readonly inboxPreview = this.inboxState.asReadonly();
  readonly unreadCount = this.unreadState.asReadonly();
  readonly hasUnread = computed(() => this.unreadState() > 0);

  refresh(): void {
    if (this.loadingState()) {
      return;
    }
    this.loadingState.set(true);
    forkJoin({
      messages: this.api.inbox(5),
      unread: this.api.unreadCount(),
    })
      .pipe(finalize(() => this.loadingState.set(false)))
      .subscribe({
        next: ({ messages, unread }) => {
          this.inboxState.set(messages);
          this.unreadState.set(unread);
        },
        error: () => undefined,
      });
  }

  updateMessage(message: InboxMessage): void {
    this.inboxState.update((items) =>
      items.map((item) => (item.recipientId === message.recipientId ? message : item)),
    );
    if (message.leido) {
      this.unreadState.update((count) => Math.max(0, count - 1));
    }
  }

  clearUnread(): void {
    this.inboxState.update((items) => items.map((item) => ({ ...item, leido: true })));
    this.unreadState.set(0);
  }
}

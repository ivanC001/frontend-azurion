import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

import { UiToastService } from '@core/services/ui-toast.service';

@Injectable({ providedIn: 'root' })
export class AlertToastBridgeService {
  private readonly document = inject(DOCUMENT);
  private readonly toast = inject(UiToastService);
  private readonly selector = '.alert, .banner';
  private readonly hiddenClass = 'az-toast-bridge-hidden';
  private readonly signatures = new WeakMap<Element, string>();
  private observer: MutationObserver | null = null;

  start(root: ParentNode = this.document.body): void {
    if (this.observer) {
      return;
    }

    this.scan(root);
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          const element = mutation.target.parentElement;
          if (element) {
            this.scan(element);
          }
          continue;
        }

        if (mutation.type === 'attributes' && mutation.target instanceof Element) {
          this.syncElement(mutation.target);
        }

        for (const node of mutation.addedNodes) {
          this.scan(node);
        }
      }
    });

    this.observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
  }

  private scan(node: Node | ParentNode): void {
    if (
      !(node instanceof Element) &&
      !(node instanceof Document) &&
      !(node instanceof DocumentFragment)
    ) {
      return;
    }

    if (node instanceof Element) {
      this.syncElement(node);
    }

    node.querySelectorAll?.(this.selector).forEach((element) => this.syncElement(element));
  }

  private syncElement(element: Element): void {
    if (!element.matches(this.selector)) {
      return;
    }

    const htmlElement = element as HTMLElement;
    if (htmlElement.classList.contains(this.hiddenClass)) {
      return;
    }

    const text = this.normalizeText(htmlElement.innerText || htmlElement.textContent || '');
    if (!text) {
      this.signatures.delete(element);
      return;
    }

    const computedStyle = this.document.defaultView?.getComputedStyle(htmlElement);
    if (
      !computedStyle ||
      computedStyle.display === 'none' ||
      computedStyle.visibility === 'hidden'
    ) {
      return;
    }

    const signature = text;
    if (this.signatures.get(element) === signature) {
      return;
    }

    this.signatures.set(element, signature);
    element.classList.add(this.hiddenClass);
    this.emitToast(element.className, text);
  }

  private emitToast(className: string, detail: string): void {
    if (className.includes('alert--success') || className.includes('banner--success')) {
      this.toast.success(detail, 'Operacion completada');
      return;
    }

    if (className.includes('banner--info')) {
      this.toast.info(detail, 'Informacion');
      return;
    }

    if (className.includes('alert--warn') || className.includes('banner--warn')) {
      this.toast.warn(detail, 'Atencion');
      return;
    }

    this.toast.error(detail, 'No se pudo completar');
  }

  private normalizeText(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
  }
}

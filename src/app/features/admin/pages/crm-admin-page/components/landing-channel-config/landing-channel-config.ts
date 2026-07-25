import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';

import { ApiUrlService } from '@core/api/api-url.service';
import {
  AdminSaasApiService,
  CrmCatalogoItem,
  CrmLandingConfig,
  CrmLandingProductMode,
  SaveCrmLandingConfigRequest,
} from '../../../../data/admin-saas-api.service';

interface LandingConfigForm {
  nombre: string;
  campania: string;
  modoProducto: CrmLandingProductMode;
  activa: boolean;
  recibirLeads: boolean;
  crearActividadInicial: boolean;
  responsableId: string;
  catalogoItemIds: number[];
}

interface ResponsibleOption {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'app-landing-channel-config',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './landing-channel-config.html',
  styleUrl: './landing-channel-config.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingChannelConfig implements OnInit {
  readonly canManage = input(false);
  readonly catalogItems = input<readonly CrmCatalogoItem[]>([]);
  readonly responsables = input<readonly ResponsibleOption[]>([]);

  private readonly api = inject(AdminSaasApiService);
  private readonly apiUrl = inject(ApiUrlService);

  protected readonly configurations = signal<CrmLandingConfig[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly creating = signal(false);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly rotating = signal(false);
  protected readonly rotatingSecret = signal(false);
  protected readonly integrationMode = signal<'BROWSER' | 'SERVER'>('BROWSER');
  protected readonly message = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected readonly selected = computed(() =>
    this.configurations().find((configuration) => configuration.id === this.selectedId()) ?? null,
  );
  protected readonly publicCatalogItems = computed(() =>
    this.catalogItems().filter((item) => item.estado === 'ACTIVO' && Boolean(item.publicEnabled)),
  );

  protected form: LandingConfigForm = this.emptyForm();

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.api.listCrmLandingConfigurations()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (configurations) => {
          this.configurations.set(configurations);
          if (configurations.length) {
            this.selectConfiguration(configurations[0]);
          } else {
            this.startCreate();
          }
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected startCreate(): void {
    this.creating.set(true);
    this.selectedId.set(null);
    this.form = this.emptyForm();
    this.clearMessages();
  }

  protected selectConfiguration(configuration: CrmLandingConfig): void {
    this.creating.set(false);
    this.selectedId.set(configuration.id);
    this.form = this.toForm(configuration);
    this.clearMessages();
  }

  protected save(): void {
    this.clearMessages();
    if (!this.canManage()) {
      this.error.set('No tienes permisos para configurar landings.');
      return;
    }
    if (!this.form.nombre.trim()) {
      this.error.set('Escribe un nombre para identificar la landing.');
      return;
    }
    if (this.form.modoProducto === 'REQUERIDO' && !this.form.catalogoItemIds.length) {
      this.error.set('Selecciona al menos un producto permitido o cambia el producto a opcional.');
      return;
    }

    const request: SaveCrmLandingConfigRequest = {
      nombre: this.form.nombre.trim(),
      campania: this.form.campania.trim() || null,
      modoProducto: this.form.modoProducto,
      activa: this.form.activa,
      recibirLeads: this.form.recibirLeads,
      crearActividadInicial: this.form.crearActividadInicial,
      responsableId: this.form.responsableId || null,
      catalogoItemIds: this.form.modoProducto === 'SIN_CATALOGO' ? [] : this.form.catalogoItemIds,
    };

    const current = this.selected();
    const operation = current
      ? this.api.updateCrmLandingConfiguration(current.id, request)
      : this.api.createCrmLandingConfiguration(request);

    this.saving.set(true);
    operation.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (saved) => {
        this.upsertConfiguration(saved);
        this.selectConfiguration(saved);
        this.message.set(current ? 'Configuracion de landing actualizada.' : 'Landing creada. La clave ya esta lista para copiar.');
      },
      error: (error: unknown) => this.error.set(this.resolveError(error)),
    });
  }

  protected regenerateKey(): void {
    const current = this.selected();
    if (!current || this.rotating()) {
      return;
    }
    const confirmed = window.confirm(
      'La clave anterior dejara de funcionar inmediatamente. Tendras que actualizarla en la landing publicada. ¿Continuar?',
    );
    if (!confirmed) {
      return;
    }
    this.clearMessages();
    this.rotating.set(true);
    this.api.regenerateCrmLandingKey(current.id)
      .pipe(finalize(() => this.rotating.set(false)))
      .subscribe({
        next: (saved) => {
          this.upsertConfiguration(saved);
          this.selectConfiguration(saved);
          this.message.set('Landing key regenerada. Actualiza la clave en tu formulario antes de volver a enviar leads.');
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected regenerateRelaySecret(): void {
    const current = this.selected();
    if (!current || this.rotatingSecret()) {
      return;
    }
    const confirmed = window.confirm(
      'El secreto anterior dejara de validar envios servidor-a-servidor. Tendras que actualizarlo en el backend de la landing. ¿Continuar?',
    );
    if (!confirmed) {
      return;
    }
    this.clearMessages();
    this.rotatingSecret.set(true);
    this.api.regenerateCrmLandingRelaySecret(current.id)
      .pipe(finalize(() => this.rotatingSecret.set(false)))
      .subscribe({
        next: (saved) => {
          this.upsertConfiguration(saved);
          this.selectConfiguration(saved);
          this.integrationMode.set('SERVER');
          this.message.set('Secreto del relay regenerado. El secreto anterior ya no es valido.');
        },
        error: (error: unknown) => this.error.set(this.resolveError(error)),
      });
  }

  protected toggleCatalogItem(itemId: number, checked: boolean): void {
    const selected = new Set(this.form.catalogoItemIds);
    checked ? selected.add(itemId) : selected.delete(itemId);
    this.form.catalogoItemIds = [...selected];
  }

  protected isCatalogItemSelected(itemId: number): boolean {
    return this.form.catalogoItemIds.includes(itemId);
  }

  protected browserEndpoint(): string {
    const sourceKey = this.selected()?.landingKey || 'SOURCE_KEY';
    return new URL(
      this.apiUrl.url('saasCore', `/v1/public/forms/${encodeURIComponent(sourceKey)}/submissions`),
      window.location.origin,
    ).toString();
  }

  protected relayEndpoint(): string {
    return new URL(
      this.apiUrl.url('saasCore', '/v1/public/crm/leads/relay'),
      window.location.origin,
    ).toString();
  }

  protected jsonExample(): string {
    const selectedProduct = this.publicCatalogItems().find((item) => this.form.catalogoItemIds.includes(item.id));
    const payload: Record<string, unknown> = {
      nombre: 'Juan Perez',
      email: 'juan@perez.com',
      telefono: '999999999',
      mensaje: 'Deseo recibir informacion',
      landingUrl: 'https://tu-landing.com/contacto',
      website: '',
      metadataJson: JSON.stringify({
        utm_source: 'facebook',
        utm_medium: 'ads',
        utm_campaign: this.form.campania.trim() || 'campania-web',
      }),
    };
    if (selectedProduct) {
      payload['catalogoItemId'] = selectedProduct.id;
      payload['catalogoToken'] = selectedProduct.publicToken || 'TOKEN_PUBLICO_DEL_PRODUCTO';
    } else if (this.form.modoProducto === 'REQUERIDO') {
      payload['catalogoItemId'] = 1;
      payload['catalogoToken'] = 'TOKEN_PUBLICO_DEL_PRODUCTO';
    }
    return JSON.stringify(payload, null, 2);
  }

  protected fetchExample(): string {
    return `const payload = ${this.jsonExample()};\n\nfetch('${this.browserEndpoint()}', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'X-Idempotency-Key': crypto.randomUUID()\n  },\n  body: JSON.stringify(payload)\n})\n  .then(async response => {\n    const result = await response.json();\n    if (!response.ok) throw new Error(result.message || 'No se pudo enviar');\n    return result.data;\n  })\n  .then(receipt => console.log('Lead recibido:', receipt.receiptId));`;
  }

  protected serverExample(): string {
    const secret = this.selected()?.relaySecret || 'RELAY_SECRET';
    const sourceKey = this.selected()?.landingKey || 'SOURCE_KEY';
    return `import crypto from 'node:crypto';\n\nconst payload = ${this.jsonExample()};\nconst body = JSON.stringify(payload);\nconst timestamp = Math.floor(Date.now() / 1000).toString();\nconst idempotencyKey = crypto.randomUUID();\nconst signature = crypto\n  .createHmac('sha256', '${secret}')\n  .update(\`\${timestamp}.\${idempotencyKey}.\${body}\`)\n  .digest('hex');\n\nconst response = await fetch('${this.relayEndpoint()}', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    'X-Azurion-Source-Key': '${sourceKey}',\n    'X-Azurion-Timestamp': timestamp,\n    'X-Azurion-Signature': \`sha256=\${signature}\`,\n    'X-Idempotency-Key': idempotencyKey\n  },\n  body\n});\n\nif (!response.ok) throw new Error('Azurion rechazo el envio');\nconsole.log((await response.json()).data);`;
  }

  protected copy(value: string, label: string): void {
    void navigator.clipboard.writeText(value).then(
      () => this.message.set(`${label} copiado.`),
      () => this.error.set(`No se pudo copiar ${label.toLowerCase()}.`),
    );
  }

  private upsertConfiguration(saved: CrmLandingConfig): void {
    const current = this.configurations();
    const index = current.findIndex((item) => item.id === saved.id);
    this.configurations.set(index < 0
      ? [saved, ...current]
      : current.map((item) => item.id === saved.id ? saved : item));
  }

  private toForm(configuration: CrmLandingConfig): LandingConfigForm {
    return {
      nombre: configuration.nombre,
      campania: configuration.campania || '',
      modoProducto: configuration.modoProducto || 'OPCIONAL',
      activa: configuration.activa,
      recibirLeads: configuration.recibirLeads,
      crearActividadInicial: configuration.crearActividadInicial,
      responsableId: configuration.responsableId || '',
      catalogoItemIds: [...(configuration.catalogoItemIds || [])],
    };
  }

  private emptyForm(): LandingConfigForm {
    return {
      nombre: 'Landing principal',
      campania: '',
      modoProducto: 'OPCIONAL',
      activa: true,
      recibirLeads: true,
      crearActividadInicial: true,
      responsableId: '',
      catalogoItemIds: [],
    };
  }

  private clearMessages(): void {
    this.message.set(null);
    this.error.set(null);
  }

  private resolveError(error: unknown): string {
    const candidate = error as { error?: { message?: string; error?: string }; message?: string };
    return candidate?.error?.message || candidate?.error?.error || candidate?.message || 'No se pudo completar la operacion.';
  }
}

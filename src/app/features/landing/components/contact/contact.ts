import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { PublicCrmApiService } from '../../data/public-crm-api.service';

const DEFAULT_LANDING_CAMPAIGN = 'municipios';
const DEFAULT_LANDING_CATALOGO_ITEM_ID = 2;
const DEFAULT_LANDING_CATALOGO_TOKEN = '17PpDlCo06aCju4Z6iptGGvxzLbMMv9k';
const DEFAULT_LANDING_TENANT = '20000000012';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-contact',
  imports: [FormsModule, ButtonModule, InputTextModule, TextareaModule],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class ContactComponent {
  private readonly crmApi = inject(PublicCrmApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly saving = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly form = {
    tenantId: this.route.snapshot.queryParamMap.get('tenant') || DEFAULT_LANDING_TENANT,
    catalogoItemId: Number(this.route.snapshot.queryParamMap.get('catalogoItemId')) || DEFAULT_LANDING_CATALOGO_ITEM_ID,
    catalogoToken: this.route.snapshot.queryParamMap.get('token') || this.route.snapshot.queryParamMap.get('catalogoToken') || DEFAULT_LANDING_CATALOGO_TOKEN,
    landingKey: this.route.snapshot.queryParamMap.get('landingKey') || '',
    campania: this.route.snapshot.queryParamMap.get('campania') || DEFAULT_LANDING_CAMPAIGN,
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  };

  protected readonly channels = [
    { icon: 'pi-envelope', label: 'ventas@azurios.com' },
    { icon: 'pi-phone', label: '+51 900 000 000' },
    { icon: 'pi-map-marker', label: 'Lima, Peru' },
  ];

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.form.tenantId.trim()) {
      this.errorMessage.set('Indica el tenant destino para registrar el lead.');
      return;
    }
    if (!this.form.name.trim()) {
      this.errorMessage.set('Indica tu nombre para contactarte.');
      return;
    }
    if (!this.form.email.trim() || !this.form.phone.trim()) {
      this.errorMessage.set('Indica correo y telefono para registrar el lead.');
      return;
    }

    this.saving.set(true);
    this.crmApi
      .captureLead({
        tenantId: this.form.tenantId.trim(),
        Ruc_tenant: this.form.tenantId.trim(),
        landingKey: this.form.landingKey.trim() || null,
        catalogoItemId: this.form.catalogoItemId,
        catalogoToken: this.form.catalogoToken.trim(),
        tipoPersona: this.form.company.trim() ? 'JURIDICA' : 'NATURAL',
        nombre: this.form.name.trim(),
        empresa: this.form.company.trim() || null,
        correo: this.form.email.trim() || null,
        telefono: this.form.phone.trim() || null,
        origen: 'WEB',
        canalIngreso: 'LANDING',
        campania: this.form.campania,
        landingUrl: typeof location !== 'undefined' ? location.href : null,
        mensaje: this.form.message.trim() || null,
        website: '',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Solicitud registrada. El equipo comercial te contactara.');
          this.form.name = '';
          this.form.company = '';
          this.form.email = '';
          this.form.phone = '';
          this.form.message = '';
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo registrar la solicitud.';
    }
    return 'No se pudo registrar la solicitud.';
  }
}

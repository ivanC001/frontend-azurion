import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

import { PublicCrmApiService } from '../../data/public-crm-api.service';

const DEFAULT_LANDING_CAMPAIGN = 'web-azurion-demo';

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
  private pendingSubmissionKey: string | null = null;
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = {
    tenantId: this.route.snapshot.queryParamMap.get('tenant') || '',
    catalogoItemId: Number(this.route.snapshot.queryParamMap.get('catalogoItemId')) || 0,
    catalogoToken:
      this.route.snapshot.queryParamMap.get('token') ||
      this.route.snapshot.queryParamMap.get('catalogoToken') ||
      '',
    landingKey: this.route.snapshot.queryParamMap.get('landingKey') || '',
    campania: this.route.snapshot.queryParamMap.get('campania') || DEFAULT_LANDING_CAMPAIGN,
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
  };

  protected readonly contactChannels = [
    {
      icon: 'pi-whatsapp',
      title: 'WhatsApp Comercial',
      value: '+51 987 654 321',
      action:
        'https://wa.me/51987654321?text=Hola%20Azurion,%20deseo%20solicitar%20una%20demostraci%C3%B3n%20del%20sistema.',
      actionLabel: 'Chatear con un asesor',
    },
    {
      icon: 'pi-envelope',
      title: 'Correo Electrónico',
      value: 'contacto@azurion.pe',
      action: 'mailto:contacto@azurion.pe',
      actionLabel: 'Enviar correo',
    },
    {
      icon: 'pi-clock',
      title: 'Horario de Atención',
      value: 'Lunes a Sábado &bull; 8:00 AM - 7:00 PM',
      action: null,
      actionLabel: null,
    },
  ];

  protected submit(): void {
    if (this.saving()) {
      return;
    }
    this.errorMessage.set(null);
    this.successMessage.set(null);

    if (!this.form.name.trim()) {
      this.errorMessage.set('Por favor, ingresa tu nombre completo.');
      return;
    }
    if (!this.form.email.trim() || !this.form.phone.trim()) {
      this.errorMessage.set('Indica tu correo electrónico y número de teléfono celular.');
      return;
    }

    this.pendingSubmissionKey ??= this.crmApi.createSubmissionKey();
    this.saving.set(true);

    this.crmApi
      .captureLead(
        {
          tenantId: this.form.tenantId.trim() || null,
          Ruc_tenant: this.form.tenantId.trim() || null,
          landingKey: this.form.landingKey.trim() || null,
          catalogoItemId: this.form.catalogoItemId || null,
          catalogoToken: this.form.catalogoToken.trim() || null,
          tipoPersona: 'SIN_DEFINIR',
          nombre: this.form.name.trim(),
          empresa: this.form.company.trim() || null,
          correo: this.form.email.trim() || null,
          telefono: this.form.phone.trim() || null,
          origen: 'WEB',
          canalIngreso: 'LANDING',
          campania: this.form.campania,
          landingUrl: typeof location !== 'undefined' ? location.href : null,
          mensaje: this.form.message.trim() || 'Solicitud de demostración desde landing',
          website: '',
        },
        this.pendingSubmissionKey,
      )
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.pendingSubmissionKey = null;
          this.successMessage.set(
            '¡Solicitud recibida con éxito! Un asesor comercial de Azurion te contactará a la brevedad para coordinar la demo.',
          );
          this.form.name = '';
          this.form.company = '';
          this.form.email = '';
          this.form.phone = '';
          this.form.message = '';
        },
        error: (error: unknown) => {
          this.errorMessage.set(this.resolveError(error));
        },
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return (
        apiError?.details?.[0] ||
        apiError?.message ||
        'No se pudo enviar la solicitud. Puedes escribirnos directamente por WhatsApp.'
      );
    }
    return 'No se pudo registrar la solicitud. Por favor intenta nuevamente o contáctanos por WhatsApp.';
  }
}

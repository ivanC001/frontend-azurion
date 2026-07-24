import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

import { PublicCrmApiService, PublicCrmCatalogoItem } from '../../data/public-crm-api.service';

const DEFAULT_LANDING_CAMPAIGN = 'Landing CRM';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crm-lead-page',
  imports: [FormsModule, RouterLink, ButtonModule, InputTextModule, SelectModule, TextareaModule],
  templateUrl: './crm-lead-page.html',
  styleUrl: './crm-lead-page.scss',
})
export class CrmLeadPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly crmApi = inject(PublicCrmApiService);

  protected readonly saving = signal(false);
  protected readonly loadingCatalog = signal(false);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly catalogoItem = signal<PublicCrmCatalogoItem | null>(null);
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly campaignLabel = this.route.snapshot.queryParamMap.get('campania') || DEFAULT_LANDING_CAMPAIGN;
  protected readonly form = {
    tenantId: this.route.snapshot.queryParamMap.get('tenant')
      || this.route.snapshot.queryParamMap.get('Ruc_tenant')
      || this.route.snapshot.queryParamMap.get('rucTenant')
      || '',
    catalogoItemId: this.parseNumberParam('catalogoItemId'),
    catalogoToken: this.route.snapshot.queryParamMap.get('token') || this.route.snapshot.queryParamMap.get('catalogoToken') || '',
    landingKey: this.route.snapshot.queryParamMap.get('landingKey') || '',
    tipoInteres: this.route.snapshot.queryParamMap.get('tipoInteres') || 'PRODUCTO',
    interesPrincipal: this.route.snapshot.queryParamMap.get('interes') || '',
    presupuestoEstimado: this.parseNumberParam('precio') || this.parseNumberParam('presupuesto') || 0,
    fechaInteres: this.route.snapshot.queryParamMap.get('fechaInteres') || this.today,
    tipoPersona: this.route.snapshot.queryParamMap.get('tipoPersona') || 'NATURAL',
    tipoDocumento: this.route.snapshot.queryParamMap.get('tipoDocumento') || 'DNI',
    numeroDocumento: this.route.snapshot.queryParamMap.get('numeroDocumento') || this.route.snapshot.queryParamMap.get('documento') || '',
    nombre: this.route.snapshot.queryParamMap.get('nombre') || '',
    empresa: this.route.snapshot.queryParamMap.get('empresa') || '',
    correo: this.route.snapshot.queryParamMap.get('correo') || '',
    telefono: this.route.snapshot.queryParamMap.get('telefono') || '',
    direccion: this.route.snapshot.queryParamMap.get('direccion') || '',
    necesidad: this.route.snapshot.queryParamMap.get('mensaje') || this.route.snapshot.queryParamMap.get('necesidad') || '',
    website: '',
  };

  protected readonly personTypeOptions = [
    { label: 'Persona natural', value: 'NATURAL' },
    { label: 'Empresa', value: 'JURIDICA' },
  ];

  protected readonly documentTypeOptions = [
    { label: 'DNI', value: 'DNI' },
    { label: 'RUC', value: 'RUC' },
    { label: 'CE', value: 'CE' },
    { label: 'Pasaporte', value: 'PASAPORTE' },
  ];

  protected readonly hasValidLandingContext = computed(() =>
    !!this.form.tenantId.trim() && !!this.form.catalogoItemId && !!this.form.catalogoToken.trim() && !!this.catalogoItem(),
  );

  protected readonly offerBadges = computed(() => {
    const item = this.catalogoItem();
    const badges = [
      { icon: 'pi pi-shield', label: 'Oferta validada' },
      { icon: 'pi pi-bolt', label: 'Respuesta comercial rapida' },
      { icon: 'pi pi-check-circle', label: 'Registro directo al CRM' },
    ];
    if (item?.precioReferencial) {
      badges.unshift({ icon: 'pi pi-wallet', label: `Desde S/ ${this.formatMoney(item.precioReferencial)}` });
    }
    return badges;
  });

  protected readonly tipoInteresOptions = [
    'PRODUCTO',
    'SERVICIO',
    'VEHICULO',
    'INMUEBLE',
    'PROYECTO',
    'CURSO',
    'SEGURO',
    'SOFTWARE',
    'MARKETING',
    'CLINICA',
    'JURIDICO',
    'TURISMO',
    'MAQUINARIA',
    'FINANCIERO',
    'EDUCACION',
    'HOSPITALIDAD',
    'MANUFACTURA',
    'TELECOMUNICACION',
    'ENERGIA',
    'AGRICULTURA',
    'CONSULTORIA',
    'OTRO',
  ].map((value) => ({ label: this.humanize(value), value }));

  ngOnInit(): void {
    this.loadCatalogoContext();
  }

  protected submit(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    if (!this.form.tenantId.trim() || !this.form.nombre.trim() || !this.form.correo.trim() || !this.form.telefono.trim() || !this.campaignLabel.trim()) {
      this.errorMessage.set('Completa tenant, nombre, correo, telefono y campania para registrar el lead.');
      return;
    }
    if (!this.hasValidLandingContext()) {
      this.errorMessage.set('Esta landing no tiene una oferta CRM valida. Solicita un enlace actualizado.');
      return;
    }

    this.saving.set(true);
    this.crmApi
      .captureLead({
        tenantId: this.form.tenantId.trim(),
        Ruc_tenant: this.form.tenantId.trim(),
        landingKey: this.form.landingKey.trim() || null,
        tipoPersona: this.form.tipoPersona,
        tipoDocumento: this.form.tipoDocumento || null,
        numeroDocumento: this.form.numeroDocumento.trim() || null,
        nombre: this.form.nombre.trim(),
        empresa: this.form.empresa.trim() || null,
        correo: this.form.correo.trim() || null,
        telefono: this.form.telefono.trim() || null,
        direccion: this.form.direccion.trim() || null,
        origen: 'WEB',
        canalIngreso: 'LANDING',
        campania: this.campaignLabel,
        landingUrl: typeof location !== 'undefined' ? location.href : null,
        mensaje: this.form.necesidad.trim() || null,
        tipoInteres: null,
        interesPrincipal: null,
        interesDetalle: this.form.necesidad.trim() || null,
        presupuestoEstimado: null,
        fechaInteres: this.form.fechaInteres || null,
        catalogoItemId: this.form.catalogoItemId,
        catalogoToken: this.form.catalogoToken.trim(),
        website: this.form.website.trim() || null,
        metadataJson: JSON.stringify({
          source: 'azurion-crm-lead-page',
          catalogoItemId: this.form.catalogoItemId,
          oferta: this.catalogoItem(),
          ofertaSnapshot: this.querySnapshot(),
          query: typeof location !== 'undefined' ? location.search : '',
        }),
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set('Tu solicitud fue registrada correctamente.');
          this.form.nombre = '';
          this.form.empresa = '';
          this.form.correo = '';
          this.form.telefono = '';
          this.form.numeroDocumento = '';
          this.form.direccion = '';
          this.form.necesidad = '';
          this.form.fechaInteres = this.today;
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'error' in error) {
      const apiError = (error as { error?: { message?: string; details?: string[] } }).error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo registrar el lead.';
    }
    return 'No se pudo registrar el lead.';
  }

  private loadCatalogoContext(): void {
    if (!this.form.tenantId.trim() || !this.form.catalogoItemId || !this.form.catalogoToken.trim()) {
      this.errorMessage.set('Landing no configurada: falta tenant, catalogoItemId o token.');
      return;
    }
    this.loadingCatalog.set(true);
    this.crmApi.getCatalogoItem(this.form.tenantId.trim(), this.form.catalogoItemId, this.form.catalogoToken.trim())
      .pipe(finalize(() => this.loadingCatalog.set(false)))
      .subscribe({
        next: (item) => {
          this.catalogoItem.set(item);
          this.form.tipoInteres = item.tipoItem;
          this.form.interesPrincipal = item.nombre;
          this.form.presupuestoEstimado = Number(item.precioReferencial || 0);
          if (!this.route.snapshot.queryParamMap.get('mensaje') && !this.route.snapshot.queryParamMap.get('necesidad')) {
            this.form.necesidad = `Hola, deseo recibir informacion sobre ${item.nombre}.`;
          }
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected humanize(value: string): string {
    return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private parseNumberParam(name: string): number {
    const value = this.route.snapshot.queryParamMap.get(name);
    return value ? Number(value) || 0 : 0;
  }

  private querySnapshot(): Record<string, string> {
    if (typeof location === 'undefined') {
      return {};
    }
    const reserved = new Set([
      'tenant',
      'catalogoItemId',
      'tipoInteres',
      'interes',
      'precio',
      'presupuesto',
      'fechaInteres',
      'campania',
    ]);
    const snapshot: Record<string, string> = {};
    new URLSearchParams(location.search).forEach((value, key) => {
      if (!reserved.has(key)) {
        snapshot[key] = value;
      }
    });
    return snapshot;
  }

  private formatMoney(value: number): string {
    return Number(value || 0).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
}

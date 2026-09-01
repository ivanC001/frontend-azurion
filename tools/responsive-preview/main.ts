// Isolated visual QA entry point. It never connects to an API or uses a real session.
import { Component, signal, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { HttpBackend, provideHttpClient } from '@angular/common/http';
import { RouterLink, RouterOutlet, provideRouter } from '@angular/router';
import { EMPTY, throwError } from 'rxjs';
import Aura from '@primeuix/themes/aura';
import { providePrimeNG } from 'primeng/config';
import { MessageService, ConfirmationService } from 'primeng/api';
import { APP_SETTINGS, appSettings } from '../../src/app/core/config/app-settings';
import { AuthSessionService } from '../../src/app/core/auth/auth-session.service';
import { CrmPage } from '../../src/app/features/crm/crm-page';
import { CompanySettingsPage } from '../../src/app/features/company/pages/company-settings-page/company-settings-page';
import { CompanyRolesPermissionsPage } from '../../src/app/features/company/pages/company-roles-permissions-page/company-roles-permissions-page';
import { BranchesAdminPage } from '../../src/app/features/admin/pages/branches-admin-page/branches-admin-page';
import { UsersAdminPage } from '../../src/app/features/admin/pages/users-admin-page/users-admin-page';
import { CrmLiveUpdateService } from '../../src/app/features/crm/services/crm-live-update.service';
import { CrmLocalStorageService } from '../../src/app/features/crm/services/crm-local-storage.service';

const company = {
  id: 1,
  tenantId: 'visual_qa',
  razonSocial: 'Empresa de demostración para pruebas de pantalla',
  nombreComercial: 'Demostración',
  paisCodigo: 'PE',
  monedaCodigo: 'PEN',
  monedaSimbolo: 'S/',
  modulos: ['CRM', 'ERP'],
};
const session = signal({
  username: 'demo',
  nombres: 'Usuario de prueba',
  tenantId: 'visual_qa',
  adminEmpresa: true,
  adminGeneral: false,
  empresa: company,
  roles: ['ADMIN_EMPRESA'],
  permisos: [],
  sucursales: [],
});
const opportunity = {
  id: 1,
  titulo: 'Oportunidad de demostración con un nombre largo para celular',
  estado: 'ABIERTA',
  etapa: 'INTERESADO',
  montoEstimado: 1250,
  moneda: 'PEN',
  probabilidad: 50,
  prospectoId: 1,
  responsableId: 1,
  fechaCierreEstimada: '2026-09-30',
  createdAt: '2026-08-31T10:00:00',
};
const prospect = {
  id: 1,
  nombre: 'Cliente de demostración con apellidos largos',
  nombres: 'Cliente',
  apellidos: 'Demostración',
  estado: 'CALIFICADO',
  canalOrigen: 'MANUAL',
  telefono: '+51900000000',
  email: 'demo@example.invalid',
  responsableId: 1,
};
const advisor = {
  id: 1,
  username: 'demo',
  nombres: 'Asesor de demostración con apellidos largos',
  email: 'demostracion@example.invalid',
  activo: true,
  roles: ['CRM_VENDEDOR'],
  sucursalIds: [1],
};
const branch = {
  id: 1,
  codigo: 'SUC-PRINCIPAL',
  nombre: 'Sucursal principal de demostración',
  direccion: 'Dirección ficticia para pruebas de visualización',
  activo: true,
  principal: true,
};
const role = {
  id: 1,
  codigo: 'CRM_VENDEDOR',
  nombre: 'Vendedor de demostración',
  descripcion: 'Gestión y seguimiento de oportunidades comerciales',
  ambito: 'CRM',
  activo: true,
  permisoIds: [1],
  permisos: ['CRM_READ'],
};

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  template: `
    <details class="qa-controls">
      <summary>Prueba visual aislada · sin conexión a datos reales</summary>
      <nav aria-label="Pantallas de prueba">
        @for (item of pages; track item.path) {
          <a [routerLink]="item.path">{{ item.label }}</a>
        }
      </nav>
      <nav aria-label="Modales de prueba">
        @for (item of dialogs; track item.value) {
          <button (click)="open(item.value)">{{ item.label }}</button>
        }
      </nav>
    </details>
    <main class="admin-content"><router-outlet (activate)="activate($event)" /></main>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .admin-content {
      padding: 12px;
      min-width: 0;
    }
    .qa-controls {
      padding: 8px;
      background: #e0f2fe;
      font: 12px system-ui;
    }
    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }
    nav a,
    nav button {
      padding: 8px;
    }
  `,
})
class ResponsivePreview {
  current: any;
  readonly pages = [
    { path: '/general', label: 'General' },
    { path: '/catalogo', label: 'Productos CRM' },
    { path: '/canales', label: 'Canales' },
    { path: '/correo', label: 'Correo' },
    { path: '/monedas', label: 'Monedas' },
    { path: '/promociones', label: 'Promociones' },
    { path: '/empresa', label: 'Empresa' },
    { path: '/sucursales', label: 'Sucursales' },
    { path: '/usuarios', label: 'Usuarios' },
    { path: '/seguridad', label: 'Seguridad Empresa' },
    { path: '/pipeline', label: 'Pipeline' },
  ];
  readonly dialogs = [
    { value: 'oportunidad', label: 'Oportunidad' },
    { value: 'detalle', label: 'Detalle' },
    { value: 'actividad', label: 'Actividad' },
    { value: 'completarActividad', label: 'Completar actividad' },
    { value: 'cotizacion', label: 'Cotización' },
    { value: 'negociacion', label: 'Negociación' },
    { value: 'requerimiento', label: 'Requerimiento' },
    { value: 'documento', label: 'Documento' },
    { value: 'producto', label: 'Producto' },
    { value: 'prospecto', label: 'Prospecto' },
    { value: 'pago', label: 'Pago' },
    { value: 'cliente', label: 'Datos del cliente' },
    { value: 'etapa', label: 'Cambio de etapa' },
    { value: 'perdido', label: 'Marcar perdido' },
  ];
  activate(page: any) {
    this.current = page;
    if (page.constructor === CrmPage) {
      page.errorMessage.set(null);
      (page as any).prospectos.set([prospect]);
      (page as any).oportunidades.set([opportunity]);
      (page as any).usuarios.set([advisor]);
      (page as any).catalog.setItems([
        {
          id: 1,
          codigo: 'CRM-DEMO',
          nombre: 'Curso de demostración con nombre extenso',
          tipo: 'CURSO',
          tipoRegistro: 'CURSO',
          activo: true,
          precioReferencial: 1250,
          moneda: 'PEN',
        },
      ]);
      page.selectedOpportunity.set(opportunity as any);
    }
    if (page.constructor === UsersAdminPage) {
      (page as any).usuarios.set([advisor]);
      (page as any).roles.set([role]);
      (page as any).sucursales.set([branch]);
    }
    if (page.constructor === BranchesAdminPage) (page as any).sucursales.set([branch]);
    if (page.constructor === CompanyRolesPermissionsPage) {
      (page as any).roles.set([role]);
      (page as any).permisos.set([
        {
          id: 1,
          codigo: 'CRM_READ',
          nombre: 'Consultar oportunidades comerciales',
          modulo: 'CRM',
          descripcion: 'Permiso de consulta de demostración',
        },
      ]);
    }
  }
  open(value: string) {
    const page = this.current;
    if (page?.constructor !== CrmPage) return;
    page.selectedOpportunity.set(opportunity as any);
    if (value === 'detalle') {
      (page as any).openOpportunityDetail(opportunity);
      return;
    }
    if (value === 'producto') {
      page.openCreateCatalogo();
      return;
    }
    if (value === 'negociacion') {
      page.opportunityNegotiationDialogOpen.set(true);
      return;
    }
    if (value === 'requerimiento') {
      page.opportunityRequirementDialogOpen.set(true);
      return;
    }
    if (value === 'documento') {
      page.opportunityDocumentDialogOpen.set(true);
      return;
    }
    if (value === 'pago') {
      (page as any).opportunityPaymentDialogOpen.set(true);
      return;
    }
    if (value === 'cliente') {
      (page as any).clientCompletionDialogOpen.set(true);
      return;
    }
    if (value === 'perdido') {
      page.lossDialog.set({ type: 'OPORTUNIDAD', oportunidad: opportunity } as any);
      return;
    }
    if (value === 'etapa') {
      page.stageMoveReview.set({
        opportunity,
        target: { value: 'COTIZADO', label: 'Cotizado', color: '#2563eb' },
        objective: 'Completar la cotización de la oportunidad',
        mode: 'STRICT',
        checklist: [],
        errors: ['Falta registrar la cotización'],
        warnings: [],
        canContinue: false,
      } as any);
      return;
    }
    if (value === 'prospecto') {
      page.activeDialog.set('prospecto');
      return;
    }
    if (value === 'actividad' || value === 'completarActividad') {
      page.openOpportunityActivity(opportunity as any, 'LLAMADA');
      if (value === 'completarActividad') page.activityForm.id = 1;
      return;
    }
    page.activeDialog.set(value as any);
  }
}

bootstrapApplication(ResponsivePreview, {
  providers: [
    provideZonelessChangeDetection(),
    providePrimeNG({ theme: { preset: Aura, options: { darkModeSelector: '.dark' } } }),
    MessageService,
    ConfirmationService,
    { provide: APP_SETTINGS, useValue: appSettings },
    provideRouter([
      ...[
        ['general', 'administracionGeneral'],
        ['catalogo', 'catalogo'],
        ['canales', 'administracionCanales'],
        ['correo', 'administracionCorreo'],
        ['monedas', 'administracionMonedas'],
        ['promociones', 'administracionPromociones'],
        ['pipeline', 'embudo'],
      ].map(([path, initialTab]) => ({ path, component: CrmPage, data: { initialTab } })),
      { path: 'empresa', component: CompanySettingsPage },
      { path: 'sucursales', component: BranchesAdminPage },
      { path: 'usuarios', component: UsersAdminPage },
      { path: 'seguridad', component: CompanyRolesPermissionsPage },
      { path: '**', redirectTo: 'general' },
    ]),
    provideHttpClient(),
    {
      provide: HttpBackend,
      useValue: { handle: () => throwError(() => new Error('Sin API: prueba visual aislada')) },
    },
    {
      provide: AuthSessionService,
      useValue: {
        currentSession: session,
        apiHeaders: () => ({}),
        hasPermission: () => true,
        hasModule: () => true,
        hasRole: () => true,
        isAuthenticated: () => true,
      },
    },
    { provide: CrmLiveUpdateService, useValue: { watch: () => EMPTY } },
    {
      provide: CrmLocalStorageService,
      useValue: {
        loadCrmLocalConfig: () => ({ cierreEstimadoDias: 15 }),
        loadRecords: () => [],
        loadMessageTemplates: (_: unknown, fallback: unknown) => fallback,
        opportunityStoragePrefix: () => 'qa',
        opportunityTemplatesKey: () => 'qa',
        persistCrmLocalConfig: () => {},
      },
    },
  ],
}).catch(console.error);

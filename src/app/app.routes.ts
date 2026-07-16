import { Routes } from '@angular/router';

import { authRequiredGuard } from '@core/auth/guards/auth-required.guard';
import { generalAdminGuard } from '@core/auth/guards/general-admin.guard';
import { permissionGuard } from '@core/auth/guards/permission.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('@layouts/public-layout/public-layout').then((component) => component.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('@features/landing/pages/landing-page/landing-page').then(
            (component) => component.LandingPage,
          ),
      },
      {
        path: 'inicio',
        loadComponent: () =>
          import('@features/landing/pages/landing-page/landing-page').then(
            (component) => component.LandingPage,
          ),
      },
      {
        path: 'crm-lead',
        loadComponent: () =>
          import('@features/landing/pages/crm-lead-page/crm-lead-page').then(
            (component) => component.CrmLeadPage,
          ),
      },
    ],
  },
  {
    path: 'auth',
    loadComponent: () =>
      import('@layouts/auth-layout/auth-layout').then((component) => component.AuthLayout),
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('@features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('@features/auth/pages/register-page/register-page').then(
            (component) => component.RegisterPage,
          ),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
    ],
  },
  {
    path: 'login',
    pathMatch: 'full',
    redirectTo: 'auth/login',
  },
  {
    path: 'register',
    pathMatch: 'full',
    redirectTo: 'auth/register',
  },
  {
    path: 'dashboard',
    pathMatch: 'full',
    redirectTo: 'admin/dashboard',
  },
  {
    path: 'admin',
    canActivate: [authRequiredGuard],
    loadComponent: () =>
      import('@layouts/app-layout/app-layout').then((component) => component.AppLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('@features/admin/pages/admin-entry-page/admin-entry-page').then(
            (component) => component.AdminEntryPage,
          ),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('@features/admin/pages/admin-dashboard-page/admin-dashboard-page').then(
            (component) => component.AdminDashboardPage,
          ),
      },
      {
        path: 'empresas',
        loadComponent: () =>
          import('@features/admin/pages/companies-admin-page/companies-admin-page').then(
            (component) => component.CompaniesAdminPage,
          ),
      },
      {
        path: 'planes',
        loadComponent: () =>
          import('@features/platform/pages/platform-plans-page/platform-plans-page').then(
            (component) => component.PlatformPlansPage,
          ),
      },
      {
        path: 'control-empresas',
        loadComponent: () =>
          import('@features/platform/pages/platform-control-page/platform-control-page').then(
            (component) => component.PlatformControlPage,
          ),
      },
      {
        path: 'configuracion-empresa',
        data: { settingsView: 'tenant' },
        loadComponent: () =>
          import('@features/company/pages/company-settings-page/company-settings-page').then(
            (component) => component.CompanySettingsPage,
          ),
      },
      {
        path: 'configuracion-facturador',
        canActivate: [permissionGuard],
        data: {
          permission: 'CONFIGURACION_WRITE',
          module: 'FACTURACION',
          settingsView: 'facturador',
        },
        loadComponent: () =>
          import('@features/company/pages/company-settings-page/company-settings-page').then(
            (component) => component.CompanySettingsPage,
          ),
      },
      {
        path: 'configuracion-tributaria',
        canActivate: [permissionGuard],
        data: { permission: 'TRIBUTACION_READ' },
        loadComponent: () =>
          import('@features/admin/pages/tax-settings-page/tax-settings-page').then(
            (component) => component.TaxSettingsPage,
          ),
      },
      {
        path: 'seguridad-plataforma',
        canActivate: [generalAdminGuard],
        data: { securityScope: 'platform' },
        loadComponent: () =>
          import('@features/company/pages/company-roles-permissions-page/company-roles-permissions-page').then(
            (component) => component.CompanyRolesPermissionsPage,
          ),
      },
      {
        path: 'seguridad-empresa',
        canActivate: [permissionGuard],
        data: { securityScope: 'company', permission: 'ROLES_READ' },
        loadComponent: () =>
          import('@features/company/pages/company-roles-permissions-page/company-roles-permissions-page').then(
            (component) => component.CompanyRolesPermissionsPage,
          ),
      },
      {
        path: 'roles-permisos',
        redirectTo: 'seguridad-empresa',
        pathMatch: 'full',
      },
      {
        path: 'almacenes',
        loadComponent: () =>
          import('@features/admin/pages/warehouses-admin-page/warehouses-admin-page').then(
            (component) => component.WarehousesAdminPage,
          ),
      },
      {
        path: 'caja',
        loadComponent: () =>
          import('@features/admin/pages/cash-admin-page/cash-admin-page').then(
            (component) => component.CashAdminPage,
          ),
      },
      {
        path: 'ventas/nota-credito',
        loadComponent: () =>
          import('@features/admin/pages/sales-credit-note-page/sales-credit-note-page').then(
            (component) => component.SalesCreditNotePage,
          ),
      },
      {
        path: 'ventas/nota-debito',
        loadComponent: () =>
          import('@features/admin/pages/sales-debit-note-page/sales-debit-note-page').then(
            (component) => component.SalesDebitNotePage,
          ),
      },
      {
        path: 'ventas/guia-remision',
        loadComponent: () =>
          import('@features/admin/pages/sales-remission-guide-page/sales-remission-guide-page').then(
            (component) => component.SalesRemissionGuidePage,
          ),
      },
      {
        path: 'ventas/cotizaciones',
        loadComponent: () =>
          import('@features/admin/pages/sales-quotes-page/sales-quotes-page').then(
            (component) => component.SalesQuotesPage,
          ),
      },
      {
        path: 'crm/prospectos',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'captacion' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/seguimiento',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'seguimiento' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/pipeline',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'embudo' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/oportunidades',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'oportunidades' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/cotizaciones',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'oportunidades' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/negociacion',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'oportunidades' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/clientes',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'clientes' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/seguimiento-pagos',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'seguimientoPagos' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/productos',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CATALOG_MANAGE', module: 'CRM', initialTab: 'catalogo' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/administracion',
        redirectTo: 'crm/administracion/general',
        pathMatch: 'full',
      },
      {
        path: 'crm/administracion/general',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CONFIG_MANAGE', module: 'CRM', initialTab: 'administracionGeneral' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/administracion/canales',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CONFIG_MANAGE', module: 'CRM', initialTab: 'administracionCanales' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/administracion/correo',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CONFIG_MANAGE', module: 'CRM', initialTab: 'administracionCorreo' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/administracion/monedas',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CONFIG_MANAGE', module: 'CRM', initialTab: 'administracionMonedas' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/administracion/promociones',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_CONFIG_MANAGE', module: 'CRM', initialTab: 'administracionPromociones' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm',
        canActivate: [permissionGuard],
        data: { permission: 'CRM_READ', module: 'CRM', initialTab: 'dashboard' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'ventas/nueva',
        loadComponent: () =>
          import('@features/admin/pages/sales-pos-page/sales-pos-page').then(
            (component) => component.SalesPosPage,
          ),
      },
      {
        path: 'ventas',
        loadComponent: () =>
          import('@features/admin/pages/sales-admin-page/sales-admin-page').then(
            (component) => component.SalesAdminPage,
          ),
      },
      {
        path: 'productos',
        loadComponent: () =>
          import('@features/admin/pages/products-admin-page/products-admin-page').then(
            (component) => component.ProductsAdminPage,
          ),
      },
      {
        path: 'inventarios',
        loadComponent: () =>
          import('@features/admin/pages/inventory-admin-page/inventory-admin-page').then(
            (component) => component.InventoryAdminPage,
          ),
      },
      {
        path: 'reportes',
        loadComponent: () =>
          import('@features/admin/pages/reports-admin-page/reports-admin-page').then(
            (component) => component.ReportsAdminPage,
          ),
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('@features/admin/pages/users-admin-page/users-admin-page').then(
            (component) => component.UsersAdminPage,
          ),
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('@features/admin/pages/customers-admin-page/customers-admin-page').then(
            (component) => component.CustomersAdminPage,
          ),
      },
      {
        path: 'sucursales',
        loadComponent: () =>
          import('@features/admin/pages/branches-admin-page/branches-admin-page').then(
            (component) => component.BranchesAdminPage,
          ),
      },
      {
        path: 'facturador',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/facturador/pages/facturador-companies-page/facturador-companies-page').then(
            (component) => component.FacturadorCompaniesPage,
          ),
      },
      {
        path: 'facturador/configuracion',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/facturador/pages/facturador-config-page/facturador-config-page').then(
            (component) => component.FacturadorConfigPage,
          ),
      },
      {
        path: 'facturador/empresas',
        redirectTo: 'facturador',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];

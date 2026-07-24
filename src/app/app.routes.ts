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
      {
        path: 'politica-de-privacidad',
        loadComponent: () =>
          import('@features/landing/pages/privacy-policy-page/privacy-policy-page').then(
            (component) => component.PrivacyPolicyPage,
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
        path: '',
        pathMatch: 'full',
        data: { loginMode: 'tenant' },
        loadComponent: () =>
          import('@features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage,
          ),
      },
      {
        path: 'login',
        data: { loginMode: 'general' },
        loadComponent: () =>
          import('@features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage,
          ),
      },
      {
        path: 'empresa/login',
        data: { loginMode: 'tenant' },
        loadComponent: () =>
          import('@features/auth/pages/login-page/login-page').then(
            (component) => component.LoginPage,
          ),
      },
      {
        path: 'register',
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
    redirectTo: 'auth/login',
  },
  {
    path: 'login-empresa',
    pathMatch: 'full',
    redirectTo: 'auth',
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
        canActivate: [permissionGuard],
        data: { module: 'ERP' },
        loadComponent: () =>
          import('@features/admin/pages/admin-dashboard-page/admin-dashboard-page').then(
            (component) => component.AdminDashboardPage,
          ),
      },
      {
        path: 'empresas',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/admin/pages/companies-admin-page/companies-admin-page').then(
            (component) => component.CompaniesAdminPage,
          ),
      },
      {
        path: 'planes',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/platform/pages/platform-plans-page/platform-plans-page').then(
            (component) => component.PlatformPlansPage,
          ),
      },
      {
        path: 'control-empresas',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/platform/pages/platform-control-page/platform-control-page').then(
            (component) => component.PlatformControlPage,
          ),
      },
      {
        path: 'configuracion-empresa',
        canActivate: [permissionGuard],
        data: { permission: 'CONFIGURACION_WRITE', settingsView: 'tenant' },
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
          module: ['ERP', 'FACTURACION'],
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
        data: { permission: 'TRIBUTACION_READ', module: ['ERP', 'FACTURACION'] },
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
        path: 'correo-azurion',
        canActivate: [generalAdminGuard],
        loadComponent: () =>
          import('@features/platform/pages/platform-email-page/platform-email-page').then(
            (component) => component.PlatformEmailPage,
          ),
      },
      {
        path: 'mensajes',
        loadComponent: () =>
          import('@features/platform/pages/platform-messages-page/platform-messages-page').then(
            (component) => component.PlatformMessagesPage,
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
        canActivate: [permissionGuard],
        data: { permission: 'INVENTORY_READ', module: ['ERP', 'INVENTARIO'] },
        loadComponent: () =>
          import('@features/admin/pages/warehouses-admin-page/warehouses-admin-page').then(
            (component) => component.WarehousesAdminPage,
          ),
      },
      {
        path: 'caja',
        canActivate: [permissionGuard],
        data: { permission: 'CAJA_READ', module: ['ERP', 'CAJA'] },
        loadComponent: () =>
          import('@features/admin/pages/cash-admin-page/cash-admin-page').then(
            (component) => component.CashAdminPage,
          ),
      },
      {
        path: 'ventas/nota-credito',
        canActivate: [permissionGuard],
        data: { permission: 'NOTA_CREDITO_CREATE', module: ['ERP', 'FACTURACION'] },
        loadComponent: () =>
          import('@features/admin/pages/sales-credit-note-page/sales-credit-note-page').then(
            (component) => component.SalesCreditNotePage,
          ),
      },
      {
        path: 'ventas/nota-debito',
        canActivate: [permissionGuard],
        data: { permission: 'NOTA_DEBITO_CREATE', module: ['ERP', 'FACTURACION'] },
        loadComponent: () =>
          import('@features/admin/pages/sales-debit-note-page/sales-debit-note-page').then(
            (component) => component.SalesDebitNotePage,
          ),
      },
      {
        path: 'ventas/guia-remision',
        canActivate: [permissionGuard],
        data: { permission: 'GUIA_REMISION_CREATE', module: ['ERP', 'FACTURACION'] },
        loadComponent: () =>
          import('@features/admin/pages/sales-remission-guide-page/sales-remission-guide-page').then(
            (component) => component.SalesRemissionGuidePage,
          ),
      },
      {
        path: 'ventas/cotizaciones',
        canActivate: [permissionGuard],
        data: { permission: 'COTIZACIONES_READ', module: 'COTIZACIONES' },
        loadComponent: () =>
          import('@features/admin/pages/sales-quotes-page/sales-quotes-page').then(
            (component) => component.SalesQuotesPage,
          ),
      },
      {
        path: 'crm/whatsapp',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'], module: 'CRM' },
        loadComponent: () =>
          import(
            '@features/admin/pages/crm-admin-page/pages/whatsapp-inbox-page/whatsapp-inbox-page'
          ).then((component) => component.WhatsappInboxPage),
      },
      {
        path: 'crm/bandeja/facebook',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
          module: 'CRM',
          inboxChannel: 'FACEBOOK',
        },
        loadComponent: () =>
          import(
            '@features/admin/pages/crm-admin-page/pages/channel-inbox-page/channel-inbox-page'
          ).then((component) => component.ChannelInboxPage),
      },
      {
        path: 'crm/bandeja/instagram',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
          module: 'CRM',
          inboxChannel: 'INSTAGRAM',
        },
        loadComponent: () =>
          import(
            '@features/admin/pages/crm-admin-page/pages/channel-inbox-page/channel-inbox-page'
          ).then((component) => component.ChannelInboxPage),
      },
      {
        path: 'crm/bandeja/correo',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
          module: 'CRM',
          inboxChannel: 'CORREO',
        },
        loadComponent: () =>
          import(
            '@features/admin/pages/crm-admin-page/pages/channel-inbox-page/channel-inbox-page'
          ).then((component) => component.ChannelInboxPage),
      },
      {
        path: 'crm/prospectos',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_LEADS_READ'], module: 'CRM', initialTab: 'captacion' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/seguimiento',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_ACTIVITIES_READ'], module: 'CRM', initialTab: 'seguimiento' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/pipeline',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_PIPELINE_READ', 'CRM_PIPELINE_VIEW', 'CRM_OPPORTUNITIES_READ'],
          module: 'CRM',
          initialTab: 'embudo',
        },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/oportunidades',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_OPPORTUNITIES_READ'], module: 'CRM', initialTab: 'oportunidades' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/cotizaciones',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_OPPORTUNITIES_READ', 'CRM_QUOTES_CREATE'],
          module: 'CRM',
          initialTab: 'oportunidades',
        },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/negociacion',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_OPPORTUNITIES_READ'], module: 'CRM', initialTab: 'oportunidades' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/clientes',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_OPPORTUNITIES_READ'], module: 'CRM', initialTab: 'clientes' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/seguimiento-pagos',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_OPPORTUNITIES_READ'], module: 'CRM', initialTab: 'seguimientoPagos' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'crm/resultados',
        canActivate: [permissionGuard],
        data: {
          anyPermission: ['CRM_OPPORTUNITIES_READ', 'CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'],
          module: 'CRM',
        },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/pages/crm-outcomes-page/crm-outcomes-page').then(
            (component) => component.CrmOutcomesPage,
          ),
      },
      {
        path: 'crm/reportes',
        canActivate: [permissionGuard],
        data: { anyPermission: ['CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'], module: 'CRM' },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/pages/crm-reports-page/crm-reports-page').then(
            (component) => component.CrmReportsPage,
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
        data: {
          anyPermission: ['CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'],
          module: 'CRM',
          initialTab: 'dashboard',
        },
        loadComponent: () =>
          import('@features/admin/pages/crm-admin-page/crm-admin-page').then(
            (component) => component.CrmAdminPage,
          ),
      },
      {
        path: 'ventas/nueva',
        canActivate: [permissionGuard],
        data: { permission: 'VENTAS_CREATE', module: ['ERP', 'VENTAS'] },
        loadComponent: () =>
          import('@features/admin/pages/sales-pos-page/sales-pos-page').then(
            (component) => component.SalesPosPage,
          ),
      },
      {
        path: 'ventas',
        canActivate: [permissionGuard],
        data: { permission: 'VENTAS_READ', module: ['ERP', 'VENTAS'] },
        loadComponent: () =>
          import('@features/admin/pages/sales-admin-page/sales-admin-page').then(
            (component) => component.SalesAdminPage,
          ),
      },
      {
        path: 'productos',
        canActivate: [permissionGuard],
        data: { permission: 'PRODUCTOS_READ', module: ['ERP', 'INVENTARIO'] },
        loadComponent: () =>
          import('@features/admin/pages/products-admin-page/products-admin-page').then(
            (component) => component.ProductsAdminPage,
          ),
      },
      {
        path: 'inventarios',
        canActivate: [permissionGuard],
        data: { permission: 'INVENTORY_READ', module: ['ERP', 'INVENTARIO'] },
        loadComponent: () =>
          import('@features/admin/pages/inventory-admin-page/inventory-admin-page').then(
            (component) => component.InventoryAdminPage,
          ),
      },
      {
        path: 'reportes',
        canActivate: [permissionGuard],
        data: {
          permission: 'REPORTES_READ',
          allPermissions: ['REPORTES_READ'],
          module: ['ERP', 'REPORTES'],
        },
        loadComponent: () =>
          import('@features/admin/pages/reports-admin-page/reports-admin-page').then(
            (component) => component.ReportsAdminPage,
          ),
      },
      {
        path: 'usuarios',
        canActivate: [permissionGuard],
        data: { permission: 'USUARIOS_READ' },
        loadComponent: () =>
          import('@features/admin/pages/users-admin-page/users-admin-page').then(
            (component) => component.UsersAdminPage,
          ),
      },
      {
        path: 'clientes',
        canActivate: [permissionGuard],
        data: { permission: 'CLIENTES_READ', module: 'CLIENTES' },
        loadComponent: () =>
          import('@features/admin/pages/customers-admin-page/customers-admin-page').then(
            (component) => component.CustomersAdminPage,
          ),
      },
      {
        path: 'sucursales',
        canActivate: [permissionGuard],
        data: { permission: 'SUCURSALES_READ' },
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

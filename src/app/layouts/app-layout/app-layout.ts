import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthSessionService } from '@core/auth/auth-session.service';
import { SessionModuleSyncService } from '@core/auth/session-module-sync.service';
import { UiToastService } from '@core/services/ui-toast.service';
import { LowStockAlertService } from '@core/services/low-stock-alert.service';

interface NavLinkItem {
  label: string;
  route?: string;
  icon?: string;
  groupId?: string;
  permission?: string;
  module?: string | readonly string[];
  anyModule?: readonly string[];
  children?: NavLinkItem[];
}

interface NavSection {
  label: string;
  items: NavLinkItem[];
  groupTitle?: string;
  groupIcon?: string;
}

interface SearchableRoute {
  label: string;
  route: string;
  section: string;
}

interface HeaderActionItem {
  title: string;
  detail: string;
  icon: string;
  route?: string;
  tone: 'info' | 'success' | 'warn' | 'danger';
}

type ThemeMode = 'light' | 'dark';
type WorkspaceMode = 'erp' | 'crm';

interface AccountMenuItem {
  label: string;
  icon: string;
  action: 'profile' | 'settings' | 'logout';
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './app-layout.html',
  styleUrl: './app-layout.css',
})
export class AppLayout {
  private readonly authSession = inject(AuthSessionService);
  private readonly sessionModuleSync = inject(SessionModuleSyncService);
  private readonly router = inject(Router);
  private readonly toast = inject(UiToastService);
  private readonly lowStockAlerts = inject(LowStockAlertService);
  private readonly erpModules = [
    'VENTAS',
    'COTIZACIONES',
    'CLIENTES',
    'CAJA',
    'INVENTARIO',
    'PRODUCTOS',
    'REPORTES',
    'FACTURACION',
  ] as const;

  protected readonly sidebarCollapsed = signal(false);
  protected readonly sidebarHovered = signal(false);
  protected readonly mobileSidebarOpen = signal(false);
  protected readonly isDesktop = signal(this.resolveDesktopViewport());
  protected readonly searchQuery = signal('');
  protected readonly themeMode = signal<ThemeMode>(this.resolveThemeMode());
  protected readonly notificationsPanelOpen = signal(false);
  protected readonly accountPanelOpen = signal(false);
  protected readonly activeWorkspace = signal<WorkspaceMode>(this.resolveInitialWorkspace());

  private readonly expandedGroups = signal<Record<string, boolean>>({
    'crm-captacion': true,
    'crm-comercial': true,
    'crm-dashboard': true,
    ventas: true,
  });

  protected readonly session = this.authSession.currentSession;
  protected readonly isGeneralAdmin = computed(() => {
    const session = this.session();
    if (session?.adminGeneral) {
      return true;
    }

    const roles = session?.roles ?? [];
    return roles.some((role) => role === 'ROLE_ADMIN_GENERAL' || role === 'ROLE_PLATFORM_ADMIN');
  });

  protected readonly sidebarExpanded = computed(() =>
    this.isDesktop() ? !this.sidebarCollapsed() || this.sidebarHovered() : this.mobileSidebarOpen(),
  );

  protected readonly availableWorkspaces = computed(() => {
    const workspaces: { label: string; value: WorkspaceMode; icon: string }[] = [];
    if (this.hasWorkspaceAccess('erp')) {
      workspaces.push({ label: 'ERP', value: 'erp', icon: 'pi-box' });
    }
    if (this.hasWorkspaceAccess('crm')) {
      workspaces.push({ label: 'CRM', value: 'crm', icon: 'pi-chart-line' });
    }
    return workspaces;
  });

  protected readonly selectedWorkspace = computed<WorkspaceMode>(() => {
    const available = this.availableWorkspaces();
    const requested = this.activeWorkspace();
    if (available.some((workspace) => workspace.value === requested)) {
      return requested;
    }
    return available[0]?.value ?? 'erp';
  });

  protected readonly homeRoute = computed(() =>
    this.selectedWorkspace() === 'crm' ? '/admin/crm' : '/admin/dashboard',
  );

  protected readonly navSections = computed<NavSection[]>(() => {
    if (this.isGeneralAdmin()) {
      return [
        {
          label: 'Plataforma',
          items: [
            { label: 'Dashboard', route: '/admin/dashboard', icon: 'pi-chart-line' },
            { label: 'Empresas', route: '/admin/empresas', icon: 'pi-building' },
            { label: 'Planes', route: '/admin/planes', icon: 'pi-wallet' },
            { label: 'Control Empresas', route: '/admin/control-empresas', icon: 'pi-sitemap' },
          ],
        },
        {
          label: 'Gestion',
          items: [
            { label: 'Usuarios Tenant', route: '/admin/usuarios', icon: 'pi-users' },
            { label: 'Clientes', route: '/admin/clientes', icon: 'pi-id-card' },
            {
              label: 'Seguridad Plataforma',
              route: '/admin/seguridad-plataforma',
              icon: 'pi-shield',
            },
          ],
        },
        {
          label: 'Facturacion',
          items: [
            { label: 'Facturador', route: '/admin/facturador', icon: 'pi-send' },
            {
              label: 'Config Facturador',
              route: '/admin/facturador/configuracion',
              icon: 'pi-cog',
            },
          ],
        },
      ];
    }

    const sections =
      this.selectedWorkspace() === 'crm' ? this.crmMenuSections() : this.erpMenuSections();
    return this.filterNavSections(sections);
  });

  protected readonly searchableRoutes = computed<SearchableRoute[]>(() =>
    this.navSections().flatMap((section) =>
      section.items.flatMap((item) => {
        if (item.children?.length) {
          return item.children
            .filter((child): child is NavLinkItem & { route: string } => !!child.route)
            .map((child) => ({
              label: child.label,
              route: child.route,
              section: `${section.label} / ${item.label}`,
            }));
        }

        if (!item.route) {
          return [];
        }

        return [
          {
            label: item.label,
            route: item.route,
            section: section.label,
          },
        ];
      }),
    ),
  );

  protected readonly profile = computed(() => {
    const session = this.session();
    const username = session?.username || 'Usuario';
    const roles = session?.roles || [];
    const role = roles[0] ? roles[0].replace('ROLE_', '').replaceAll('_', ' ') : 'Sin rol';
    const tenantId = session?.tenantId || 'default';
    const sucursales = session?.sucursales ?? [];
    const primaryBranch = sucursales[0] ?? null;

    const initials = username
      .split(/[.\s_-]+/)
      .filter((part) => part.length > 0)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    return {
      username,
      displayName: session?.nombres?.trim() || username,
      email: session?.email || null,
      role,
      initials: initials || 'US',
      empresaNombre: session?.empresa?.razonSocial || null,
      empresaRuc: session?.empresa?.ruc || null,
      logoPanelUrl: session?.empresa?.logoPanelUrl || null,
      panelTitle: this.isGeneralAdmin() ? 'Panel General' : 'Panel Empresa',
      tenantId,
      tenantLabel: session?.empresa?.razonSocial || `Operacion ${tenantId}`,
      roles,
      branchLabel: primaryBranch
        ? `${primaryBranch.nombre}${sucursales.length > 1 ? ` +${sucursales.length - 1}` : ''}`
        : this.isGeneralAdmin()
          ? 'Administracion general'
          : 'Sin sucursal asignada',
    };
  });

  protected readonly isDarkTheme = computed(() => this.themeMode() === 'dark');
  protected readonly themeButtonLabel = computed(() =>
    this.isDarkTheme() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );
  protected readonly themeButtonIcon = computed(() => (this.isDarkTheme() ? 'pi-sun' : 'pi-moon'));

  protected readonly notificationItems = computed<HeaderActionItem[]>(() =>
    this.lowStockAlerts.alerts().map((alert) => ({
      title: alert.title,
      detail: alert.detail,
      icon: alert.critical
        ? 'pi-exclamation-circle'
        : alert.type === 'EXPIRY'
          ? 'pi-clock'
          : 'pi-box',
      route: `/admin/inventarios?productoId=${alert.productId}`,
      tone: alert.critical ? 'danger' : 'warn',
    })),
  );

  protected readonly accountMenuItems = computed<AccountMenuItem[]>(() => [
    {
      label: 'Profile',
      icon: 'pi-user',
      action: 'profile',
    },
    {
      label: 'Settings',
      icon: 'pi-cog',
      action: 'settings',
    },
    {
      label: 'Log out',
      icon: 'pi-sign-out',
      action: 'logout',
    },
  ]);

  constructor() {
    this.sessionModuleSync.syncCurrentTenantModules();
    this.applyThemeMode(this.themeMode());
    if (!this.isGeneralAdmin()) {
      this.lowStockAlerts.refresh(true);
    }
  }

  @HostListener('window:resize')
  protected onWindowResize(): void {
    const desktop = this.resolveDesktopViewport();
    this.isDesktop.set(desktop);
    if (desktop) {
      this.mobileSidebarOpen.set(false);
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      this.closeHeaderPanels();
      return;
    }

    if (target.closest('.header-actions-shell')) {
      return;
    }

    this.closeHeaderPanels();
  }

  protected toggleThemeMode(): void {
    this.setThemeMode(this.isDarkTheme() ? 'light' : 'dark');
  }

  protected toggleGroup(groupId: string): void {
    const current = this.expandedGroups();
    this.expandedGroups.set({
      ...current,
      [groupId]: !current[groupId],
    });
  }

  protected selectWorkspace(workspace: WorkspaceMode): void {
    if (this.selectedWorkspace() === workspace) {
      return;
    }
    this.activeWorkspace.set(workspace);
    void this.router.navigateByUrl(workspace === 'crm' ? '/admin/crm' : '/admin/dashboard');
    this.closeMobileSidebar();
  }

  protected toggleSidebar(): void {
    if (this.isDesktop()) {
      this.sidebarCollapsed.set(!this.sidebarCollapsed());
      return;
    }

    this.mobileSidebarOpen.set(!this.mobileSidebarOpen());
  }

  protected closeMobileSidebar(): void {
    if (!this.isDesktop()) {
      this.mobileSidebarOpen.set(false);
    }
  }

  protected setSidebarHover(value: boolean): void {
    if (!this.isDesktop() || !this.sidebarCollapsed()) {
      return;
    }
    this.sidebarHovered.set(value);
  }

  protected isGroupExpanded(groupId: string): boolean {
    return !!this.expandedGroups()[groupId];
  }

  protected groupHasActiveRoute(item: NavLinkItem): boolean {
    if (!item.children?.length) {
      return false;
    }
    return item.children.some((child) => this.isRouteActive(child.route));
  }

  protected isRouteActive(route?: string): boolean {
    if (!route) {
      return false;
    }
    const currentUrl = this.router.url;
    return currentUrl === route || currentUrl.startsWith(route + '/');
  }

  protected handleNavSelection(route?: string): void {
    if (!route) {
      return;
    }

    this.closeHeaderPanels();
    this.searchQuery.set('');
    this.closeMobileSidebar();
  }

  protected runQuickSearch(): void {
    const query = this.searchQuery().trim().toLowerCase();
    if (!query) {
      this.toast.info('Escribe el nombre del modulo que deseas abrir.', 'Busqueda rapida');
      return;
    }

    const match = this.searchableRoutes().find((item) => item.label.toLowerCase().includes(query));
    if (!match) {
      this.toast.warn(
        `No encontre un modulo relacionado con "${this.searchQuery().trim()}".`,
        'Busqueda rapida',
      );
      return;
    }

    this.searchQuery.set('');
    this.closeMobileSidebar();
    void this.router.navigate([match.route]);
    this.toast.info(`${match.label} abierto desde ${match.section}.`, 'Busqueda rapida');
  }

  protected showNotificationsHint(): void {
    this.notificationsPanelOpen.set(!this.notificationsPanelOpen());
    this.accountPanelOpen.set(false);
  }

  protected showAppearanceHint(): void {
    this.closeHeaderPanels();
    this.toast.info('Usa el boton de sol o luna para cambiar el modo del panel.', 'Apariencia');
  }

  protected toggleAccountPanel(): void {
    this.accountPanelOpen.set(!this.accountPanelOpen());
    this.notificationsPanelOpen.set(false);
  }

  protected closeHeaderPanels(): void {
    this.notificationsPanelOpen.set(false);
    this.accountPanelOpen.set(false);
  }

  protected openHeaderItem(item: HeaderActionItem): void {
    if (item.route) {
      this.closeHeaderPanels();
      void this.router.navigateByUrl(item.route);
      return;
    }

    this.toast.info(item.detail, item.title);
  }

  protected openAccountItem(item: AccountMenuItem): void {
    this.closeHeaderPanels();
    switch (item.action) {
      case 'profile':
        void this.router.navigate(['/admin/configuracion-empresa']);
        break;
      case 'settings':
        void this.router.navigate(['/admin/configuracion-empresa']);
        break;
      case 'logout':
        this.logout();
        break;
    }
  }

  protected markAllNotificationsRead(): void {
    this.lowStockAlerts.clear();
    this.toast.success('Notificaciones marcadas como leidas.', 'Notificaciones');
    this.notificationsPanelOpen.set(false);
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected logout(): void {
    this.closeHeaderPanels();
    this.authSession.clearSession();
    void this.router.navigate(['/auth/login']);
  }

  private setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    this.applyThemeMode(mode);
  }

  private applyThemeMode(mode: ThemeMode): void {
    if (typeof document === 'undefined') {
      return;
    }

    const isDark = mode === 'dark';
    const htmlElement = document.documentElement;

    htmlElement.classList.toggle('dark', isDark);
    htmlElement.setAttribute('data-theme', mode);
    document.body.setAttribute('data-theme', mode);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('azurion.theme', mode);
    }
  }

  private resolveThemeMode(): ThemeMode {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('azurion.theme');
      if (saved === 'dark' || saved === 'light') {
        return saved;
      }
    }

    if (
      typeof globalThis.matchMedia === 'function' &&
      globalThis.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }

    return 'light';
  }

  private resolveDesktopViewport(): boolean {
    return typeof globalThis !== 'undefined' ? globalThis.innerWidth >= 1200 : true;
  }

  private erpMenuSections(): NavSection[] {
    return [
      ...this.erpCoreMenuSections(),
      ...this.tenantConfigurationSections(),
      ...this.billingConfigurationSections(),
    ];
  }

  private erpCoreMenuSections(): NavSection[] {
    return [
      {
        label: 'General',
        groupTitle: 'ERP',
        groupIcon: 'pi-box',
        items: [
          {
            label: 'Dashboard',
            route: '/admin/dashboard',
            icon: 'pi-home',
            anyModule: this.erpModules,
          },
          {
            label: 'Reportes',
            route: '/admin/reportes',
            icon: 'pi-chart-bar',
            permission: 'REPORTES_READ',
            module: 'REPORTES',
          },
          {
            label: 'Cotizaciones',
            route: '/admin/ventas/cotizaciones',
            icon: 'pi-file-edit',
            module: 'COTIZACIONES',
          },
          {
            label: 'Clientes',
            route: '/admin/clientes',
            icon: 'pi-id-card',
            module: 'CLIENTES',
          },
        ],
      },
      {
        label: 'Ventas',
        items: [
          {
            label: 'Punto de venta',
            route: '/admin/ventas/nueva',
            icon: 'pi-shopping-cart',
            permission: 'VENTAS_CREATE',
            module: 'VENTAS',
          },
          {
            label: 'Historial de ventas',
            route: '/admin/ventas',
            icon: 'pi-receipt',
            permission: 'VENTAS_READ',
            module: 'VENTAS',
          },
          {
            label: 'Caja',
            route: '/admin/caja',
            icon: 'pi-credit-card',
            permission: 'CAJA_READ',
            module: 'CAJA',
          },
          {
            label: 'Nota de credito',
            route: '/admin/ventas/nota-credito',
            icon: 'pi-minus-circle',
            permission: 'NOTA_CREDITO_CREATE',
            module: 'FACTURACION',
          },
          {
            label: 'Nota de debito',
            route: '/admin/ventas/nota-debito',
            icon: 'pi-plus-circle',
            permission: 'NOTA_DEBITO_CREATE',
            module: 'FACTURACION',
          },
          {
            label: 'Guia de remision',
            route: '/admin/ventas/guia-remision',
            icon: 'pi-truck',
            permission: 'GUIA_REMISION_CREATE',
            module: 'FACTURACION',
          },
        ],
      },
      {
        label: 'Inventario',
        items: [
          {
            label: 'Almacenes',
            route: '/admin/almacenes',
            icon: 'pi-shop',
            permission: 'INVENTORY_READ',
            module: 'INVENTARIO',
          },
          {
            label: 'Productos',
            route: '/admin/productos',
            icon: 'pi-box',
            permission: 'PRODUCTOS_READ',
            module: 'INVENTARIO',
          },
          {
            label: 'Inventarios',
            route: '/admin/inventarios',
            icon: 'pi-database',
            permission: 'INVENTORY_READ',
            module: 'INVENTARIO',
          },
        ],
      },
    ];
  }

  private crmMenuSections(): NavSection[] {
    return [
      {
        label: 'General',
        groupTitle: 'CRM',
        groupIcon: 'pi-chart-line',
        items: [
          {
            label: 'Dashboard',
            route: '/admin/crm',
            icon: 'pi-chart-pie',
            permission: 'CRM_READ',
            module: 'CRM',
          },
          {
            label: 'Reportes CRM',
            route: '/admin/reportes',
            icon: 'pi-chart-bar',
            anyModule: ['REPORTES', 'CRM'],
          },
        ],
      },
      {
        label: 'Captacion',
        items: [
          {
            label: 'Prospectos',
            route: '/admin/crm/prospectos',
            icon: 'pi-address-book',
            permission: 'CRM_READ',
            module: 'CRM',
          },
          {
            label: 'Seguimiento',
            route: '/admin/crm/seguimiento',
            icon: 'pi-comments',
            permission: 'CRM_READ',
            module: 'CRM',
          },
        ],
      },
      {
        label: 'Comercial',
        items: [
          {
            label: 'Pipeline',
            route: '/admin/crm/pipeline',
            icon: 'pi-chart-line',
            permission: 'CRM_READ',
            module: 'CRM',
          },
          {
            label: 'Oportunidades',
            route: '/admin/crm/oportunidades',
            icon: 'pi-briefcase',
            permission: 'CRM_READ',
            module: 'CRM',
          },
          {
            label: 'Cotizaciones CRM',
            route: '/admin/ventas/cotizaciones',
            icon: 'pi-file-edit',
            anyModule: ['COTIZACIONES', 'CRM'],
          },
        ],
      },
      {
        label: 'Postventa',
        items: [
          {
            label: 'Clientes',
            route: '/admin/crm/clientes',
            icon: 'pi-users',
            permission: 'CRM_READ',
            module: 'CRM',
          },
          {
            label: 'Seguimiento de pagos',
            route: '/admin/crm/seguimiento-pagos',
            icon: 'pi-credit-card',
            permission: 'CRM_READ',
            module: 'CRM',
          },
        ],
      },
      {
        label: 'Configuracion',
        items: [
          {
            label: 'Configuracion CRM',
            route: '/admin/crm/administracion/general',
            icon: 'pi-cog',
            groupId: 'crm-configuracion',
            permission: 'CRM_CONFIG_MANAGE',
            module: 'CRM',
            children: [
              {
                label: 'Productos CRM',
                route: '/admin/crm/productos',
                icon: 'pi-tags',
                permission: 'CRM_CATALOG_MANAGE',
                module: 'CRM',
              },
              {
                label: 'General',
                route: '/admin/crm/administracion/general',
                icon: 'pi-sliders-h',
                permission: 'CRM_CONFIG_MANAGE',
                module: 'CRM',
              },
              {
                label: 'Canales',
                route: '/admin/crm/administracion/canales',
                icon: 'pi-link',
                permission: 'CRM_CONFIG_MANAGE',
                module: 'CRM',
              },
              {
                label: 'Correo',
                route: '/admin/crm/administracion/correo',
                icon: 'pi-envelope',
                permission: 'CRM_CONFIG_MANAGE',
                module: 'CRM',
              },
              {
                label: 'Monedas',
                route: '/admin/crm/administracion/monedas',
                icon: 'pi-dollar',
                permission: 'CRM_CONFIG_MANAGE',
                module: 'CRM',
              },
              {
                label: 'Promociones',
                route: '/admin/crm/administracion/promociones',
                icon: 'pi-ticket',
                permission: 'CRM_CONFIG_MANAGE',
                module: 'CRM',
              },
            ],
          },
        ],
      },
    ];
  }

  private tenantConfigurationSections(): NavSection[] {
    return [
      {
        label: 'Administracion',
        groupTitle: 'Configuracion del tenant',
        groupIcon: 'pi-building',
        items: [
          {
            label: 'Empresa',
            route: '/admin/configuracion-empresa',
            icon: 'pi-cog',
            permission: 'CONFIGURACION_WRITE',
          },
          {
            label: 'Sucursales',
            route: '/admin/sucursales',
            icon: 'pi-building',
            permission: 'SUCURSALES_READ',
          },
          {
            label: 'Usuarios',
            route: '/admin/usuarios',
            icon: 'pi-users',
            permission: 'USUARIOS_READ',
          },
          {
            label: 'Seguridad Empresa',
            route: '/admin/seguridad-empresa',
            icon: 'pi-shield',
            permission: 'ROLES_READ',
          },
        ],
      },
    ];
  }

  private billingConfigurationSections(): NavSection[] {
    return [
      {
        label: 'Configuracion',
        groupTitle: 'Facturador',
        groupIcon: 'pi-file-check',
        items: [
          {
            label: 'Configuracion tributaria',
            route: '/admin/configuracion-tributaria',
            icon: 'pi-percentage',
            permission: 'TRIBUTACION_READ',
            module: 'FACTURACION',
          },
          {
            label: 'Configuracion facturador',
            route: '/admin/configuracion-facturador',
            icon: 'pi-sliders-h',
            permission: 'CONFIGURACION_WRITE',
            module: 'FACTURACION',
          },
        ],
      },
    ];
  }

  private resolveInitialWorkspace(): WorkspaceMode {
    return this.router.url.startsWith('/admin/crm') ? 'crm' : 'erp';
  }

  private filterNavSections(sections: NavSection[]): NavSection[] {
    return sections
      .map((section) => ({
        ...section,
        items: section.items
          .map((item) => ({
            ...item,
            children: item.children?.filter(
              (child) => this.canAccessMenuItem(child),
            ),
          }))
          .filter((item) => {
            if (item.children) {
              return item.children.length > 0;
            }
            return this.canAccessMenuItem(item);
          }),
      }))
      .filter((section) => section.items.length > 0);
  }

  private canAccessMenuItem(item: NavLinkItem): boolean {
    const hasPermission = !item.permission || this.authSession.hasPermission(item.permission);
    const hasModule = !item.module || this.authSession.hasModule(item.module);
    const hasAnyModule = !item.anyModule || this.hasAnyModule(item.anyModule);
    return hasPermission && hasModule && hasAnyModule;
  }

  private hasAnyModule(modules: readonly string[]): boolean {
    return modules.some((moduleCode) => this.authSession.hasModule(moduleCode));
  }

  private hasWorkspaceAccess(workspace: WorkspaceMode): boolean {
    const sections = workspace === 'crm' ? this.crmMenuSections() : this.erpCoreMenuSections();
    return this.filterNavSections(sections).length > 0;
  }
}

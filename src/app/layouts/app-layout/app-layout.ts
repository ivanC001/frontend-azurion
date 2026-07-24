import {
  afterNextRender,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
  DestroyRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IsActiveMatchOptions,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { finalize, timer } from 'rxjs';

import { AuthApiService } from '@core/auth/auth-api.service';
import { AuthSessionService } from '@core/auth/auth-session.service';
import { SessionModuleSyncService } from '@core/auth/session-module-sync.service';
import { UiToastService } from '@core/services/ui-toast.service';
import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import { CrmWhatsappNotificationService } from '@core/services/crm-whatsapp-notification.service';
import { InternalMessageNotificationService } from '@core/services/internal-message-notification.service';
import { CrmInboxChannelStateService } from '@features/admin/pages/crm-admin-page/services/crm-inbox-channel-state.service';

interface NavLinkItem {
  label: string;
  route?: string;
  icon?: string;
  groupId?: string;
  permission?: string;
  anyPermission?: readonly string[];
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
  key: string;
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
  private readonly sidebarNav = viewChild<ElementRef<HTMLElement>>('sidebarNav');
  private readonly authSession = inject(AuthSessionService);
  private readonly authApi = inject(AuthApiService);
  private readonly sessionModuleSync = inject(SessionModuleSyncService);
  private readonly router = inject(Router);
  private readonly toast = inject(UiToastService);
  private readonly lowStockAlerts = inject(LowStockAlertService);
  private readonly whatsappNotifications = inject(CrmWhatsappNotificationService);
  private readonly internalMessages = inject(InternalMessageNotificationService);
  private readonly crmInboxChannels = inject(CrmInboxChannelStateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly erpModules = ['ERP'] as const;
  private readonly sidebarScrollStoragePrefix = 'azurion.sidebar.scroll';

  protected readonly sidebarCollapsed = signal(false);
  protected readonly sidebarHovered = signal(false);
  protected readonly mobileSidebarOpen = signal(false);
  protected readonly isDesktop = signal(this.resolveDesktopViewport());
  protected readonly searchQuery = signal('');
  protected readonly themeMode = signal<ThemeMode>(this.resolveThemeMode());
  protected readonly notificationsPanelOpen = signal(false);
  protected readonly accountPanelOpen = signal(false);
  protected readonly activeWorkspace = signal<WorkspaceMode>(this.resolveInitialWorkspace());
  private readonly failedBrandLogoUrl = signal<string | null>(null);

  protected readonly exactRouteMatchOptions: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  private readonly expandedGroups = signal<Record<string, boolean>>({
    'crm-bandeja': true,
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
    this.selectedWorkspace() === 'crm' ? this.resolveCrmHomeRoute() : '/admin/dashboard',
  );

  protected readonly navSections = computed<NavSection[]>(() => {
    if (this.isGeneralAdmin()) {
      return [
        {
          label: 'Plataforma',
          items: [
            { label: 'Resumen plataforma', route: '/admin/control-empresas', icon: 'pi-chart-pie' },
            { label: 'Empresas', route: '/admin/empresas', icon: 'pi-building' },
            { label: 'Planes', route: '/admin/planes', icon: 'pi-wallet' },
          ],
        },
        {
          label: 'Administracion',
          items: [
            { label: 'Usuarios Tenant', route: '/admin/usuarios', icon: 'pi-users' },
            {
              label: 'Mensajes',
              route: '/admin/mensajes',
              icon: 'pi-inbox',
            },
            {
              label: 'Correo y avisos',
              route: '/admin/correo-azurion',
              icon: 'pi-envelope',
            },
            {
              label: 'Seguridad y accesos',
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
    return [
      {
        label: 'Comunicacion',
        items: [{ label: 'Mis mensajes', route: '/admin/mensajes', icon: 'pi-inbox' }],
      },
      ...this.filterNavSections(sections),
    ];
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

  protected readonly brandLogoSrc = computed(() => {
    const logoUrl = this.profile().logoPanelUrl;
    return logoUrl && this.failedBrandLogoUrl() !== logoUrl ? logoUrl : 'assets/logosinfondo.png';
  });

  protected readonly isDarkTheme = computed(() => this.themeMode() === 'dark');
  protected readonly themeButtonLabel = computed(() =>
    this.isDarkTheme() ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro',
  );
  protected readonly themeButtonIcon = computed(() => (this.isDarkTheme() ? 'pi-sun' : 'pi-moon'));

  protected readonly notificationItems = computed<HeaderActionItem[]>(() => {
    const items: HeaderActionItem[] = this.lowStockAlerts.alerts().map((alert) => ({
      key: `stock-${alert.productId}-${alert.type}`,
      title: alert.title,
      detail: alert.detail,
      icon: alert.critical
        ? 'pi-exclamation-circle'
        : alert.type === 'EXPIRY'
          ? 'pi-clock'
          : 'pi-box',
      route: `/admin/inventarios?productoId=${alert.productId}`,
      tone: alert.critical ? 'danger' : 'warn',
    }));
    const whatsapp = this.whatsappNotifications.summary();
    if (whatsapp.mensajesNoLeidos > 0) {
      items.unshift({
        key: 'whatsapp-unread',
        title: `${whatsapp.mensajesNoLeidos} mensaje(s) nuevo(s) en WhatsApp`,
        detail: whatsapp.ultimoContacto
          ? `${whatsapp.ultimoContacto}: ${whatsapp.ultimoMensaje || 'Mensaje pendiente de lectura'}`
          : `${whatsapp.conversacionesNoLeidas} conversacion(es) pendientes de lectura.`,
        icon: 'pi-whatsapp',
        route: '/admin/crm/whatsapp',
        tone: 'success',
      });
    }
    const internal = this.internalMessages.inboxPreview()
      .filter((message) => !message.leido)
      .slice(0, 3)
      .map<HeaderActionItem>((message) => ({
        key: `internal-${message.recipientId}`,
        title: message.asunto,
        detail: message.contenido,
        icon: message.prioridad === 'CRITICAL' ? 'pi-exclamation-triangle' : 'pi-envelope',
        route: '/admin/mensajes',
        tone:
          message.prioridad === 'CRITICAL'
            ? 'danger'
            : message.prioridad === 'WARNING'
              ? 'warn'
              : 'info',
      }));
    items.unshift(...internal);
    return items;
  });
  protected readonly notificationBadgeCount = computed(() =>
    this.lowStockAlerts.alerts().length +
    this.whatsappNotifications.unreadCount() +
    this.internalMessages.unreadCount(),
  );
  protected readonly hasWhatsappNotifications = this.whatsappNotifications.hasUnread;
  protected readonly hasInternalMessages = this.internalMessages.hasUnread;
  protected readonly notificationActionLabel = computed(() => {
    if (this.hasInternalMessages()) {
      return 'Abrir mensajes';
    }
    return this.hasWhatsappNotifications() ? 'Abrir WhatsApp' : 'Marcar leidas';
  });

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
    afterNextRender(() => this.restoreSidebarScroll());
    this.sessionModuleSync.syncCurrentTenantModules();
    this.applyThemeMode(this.themeMode());
    this.internalMessages.refresh();
    timer(30_000, 30_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (typeof document === 'undefined' || !document.hidden) {
          this.internalMessages.refresh();
        }
      });
    if (!this.isGeneralAdmin()) {
      this.lowStockAlerts.refresh(true);
      if (this.authSession.hasModule('CRM')) {
        this.crmInboxChannels.refresh();
        this.whatsappNotifications.refresh(false);
        timer(10_000, 10_000)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(() => {
            if (typeof document === 'undefined' || !document.hidden) {
              this.whatsappNotifications.refresh(true);
            }
          });
      }
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

  protected handleBrandLogoError(): void {
    const logoUrl = this.profile().logoPanelUrl;
    if (logoUrl) {
      this.failedBrandLogoUrl.set(logoUrl);
    }
  }

  protected toggleGroup(groupId: string): void {
    const current = this.expandedGroups();
    this.expandedGroups.set({
      ...current,
      [groupId]: !current[groupId],
    });
  }

  protected rememberSidebarScroll(event: Event): void {
    const nav = event.currentTarget;
    if (!(nav instanceof HTMLElement) || typeof sessionStorage === 'undefined') {
      return;
    }

    sessionStorage.setItem(this.sidebarScrollStorageKey(), String(nav.scrollTop));
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
    if (this.internalMessages.hasUnread()) {
      this.notificationsPanelOpen.set(false);
      void this.router.navigate(['/admin/mensajes']);
      return;
    }
    this.lowStockAlerts.clear();
    if (this.whatsappNotifications.hasUnread()) {
      this.notificationsPanelOpen.set(false);
      void this.router.navigate(['/admin/crm/whatsapp']);
      return;
    }
    this.toast.success('Notificaciones marcadas como leidas.', 'Notificaciones');
    this.notificationsPanelOpen.set(false);
  }

  private restoreSidebarScroll(): void {
    const nav = this.sidebarNav()?.nativeElement;
    if (!nav) {
      return;
    }

    const savedValue =
      typeof sessionStorage !== 'undefined'
        ? sessionStorage.getItem(this.sidebarScrollStorageKey())
        : null;
    const savedScrollTop = savedValue === null ? Number.NaN : Number(savedValue);

    globalThis.requestAnimationFrame(() => {
      if (Number.isFinite(savedScrollTop)) {
        nav.scrollTop = savedScrollTop;
        return;
      }

      nav.querySelector<HTMLElement>('.active-link')?.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    });
  }

  private sidebarScrollStorageKey(): string {
    const tenantId = this.session()?.tenantId || 'platform';
    return `${this.sidebarScrollStoragePrefix}.${tenantId}.${this.selectedWorkspace()}`;
  }

  protected updateSearchQuery(value: string): void {
    this.searchQuery.set(value);
  }

  protected logout(): void {
    this.closeHeaderPanels();
    const loginUrl = this.authSession.currentSession()?.adminGeneral ? '/auth/login' : '/auth';
    this.authApi
      .logout()
      .pipe(
        finalize(() => {
          this.authSession.clearSession();
          void this.router.navigate([loginUrl]);
        }),
      )
      .subscribe({ error: () => undefined });
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
            module: ['ERP', 'REPORTES'],
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
            module: ['ERP', 'VENTAS'],
          },
          {
            label: 'Historial de ventas',
            route: '/admin/ventas',
            icon: 'pi-receipt',
            permission: 'VENTAS_READ',
            module: ['ERP', 'VENTAS'],
          },
          {
            label: 'Caja',
            route: '/admin/caja',
            icon: 'pi-credit-card',
            permission: 'CAJA_READ',
            module: ['ERP', 'CAJA'],
          },
          {
            label: 'Nota de credito',
            route: '/admin/ventas/nota-credito',
            icon: 'pi-minus-circle',
            permission: 'NOTA_CREDITO_CREATE',
            module: ['ERP', 'FACTURACION'],
          },
          {
            label: 'Nota de debito',
            route: '/admin/ventas/nota-debito',
            icon: 'pi-plus-circle',
            permission: 'NOTA_DEBITO_CREATE',
            module: ['ERP', 'FACTURACION'],
          },
          {
            label: 'Guia de remision',
            route: '/admin/ventas/guia-remision',
            icon: 'pi-truck',
            permission: 'GUIA_REMISION_CREATE',
            module: ['ERP', 'FACTURACION'],
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
            module: ['ERP', 'INVENTARIO'],
          },
          {
            label: 'Productos',
            route: '/admin/productos',
            icon: 'pi-box',
            permission: 'PRODUCTOS_READ',
            module: ['ERP', 'INVENTARIO'],
          },
          {
            label: 'Inventarios',
            route: '/admin/inventarios',
            icon: 'pi-database',
            permission: 'INVENTORY_READ',
            module: ['ERP', 'INVENTARIO'],
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
            anyPermission: ['CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'],
            module: 'CRM',
          },
          {
            label: 'Reportes CRM',
            route: '/admin/crm/reportes',
            icon: 'pi-chart-bar',
            anyPermission: ['CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'],
            module: 'CRM',
          },
        ],
      },
      {
        label: 'Captacion',
        items: [
          {
            label: 'Bandeja',
            icon: 'pi-inbox',
            groupId: 'crm-bandeja',
            anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
            module: 'CRM',
            children: this.crmInboxMenuItems(),
          },
          {
            label: 'Prospectos',
            route: '/admin/crm/prospectos',
            icon: 'pi-address-book',
            anyPermission: ['CRM_LEADS_READ'],
            module: 'CRM',
          },
          {
            label: 'Seguimiento',
            route: '/admin/crm/seguimiento',
            icon: 'pi-comments',
            anyPermission: ['CRM_ACTIVITIES_READ'],
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
            anyPermission: ['CRM_PIPELINE_READ', 'CRM_PIPELINE_VIEW', 'CRM_OPPORTUNITIES_READ'],
            module: 'CRM',
          },
          {
            label: 'Oportunidades',
            route: '/admin/crm/oportunidades',
            icon: 'pi-briefcase',
            anyPermission: ['CRM_OPPORTUNITIES_READ'],
            module: 'CRM',
          },
          {
            label: 'Ganadas y perdidas',
            route: '/admin/crm/resultados',
            icon: 'pi-flag',
            anyPermission: ['CRM_OPPORTUNITIES_READ', 'CRM_REPORTS_READ', 'CRM_REPORTS_TEAM'],
            module: 'CRM',
          },
          {
            label: 'Cotizaciones CRM',
            route: '/admin/crm/cotizaciones',
            icon: 'pi-file-edit',
            anyPermission: ['CRM_OPPORTUNITIES_READ', 'CRM_QUOTES_CREATE'],
            module: 'CRM',
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
            anyPermission: ['CRM_OPPORTUNITIES_READ'],
            module: 'CRM',
          },
          {
            label: 'Seguimiento de pagos',
            route: '/admin/crm/seguimiento-pagos',
            icon: 'pi-credit-card',
            anyPermission: ['CRM_OPPORTUNITIES_READ'],
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
      ...this.tenantConfigurationSections(),
    ];
  }

  private crmInboxMenuItems(): NavLinkItem[] {
    const activeChannels = this.crmInboxChannels.activeChannelCodes();
    const items: Array<NavLinkItem & { channel: string }> = [
      {
        channel: 'WHATSAPP',
        label: 'WhatsApp',
        route: '/admin/crm/whatsapp',
        icon: 'pi-whatsapp',
        anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
        module: 'CRM',
      },
      {
        channel: 'FACEBOOK',
        label: 'Facebook',
        route: '/admin/crm/bandeja/facebook',
        icon: 'pi-facebook',
        anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
        module: 'CRM',
      },
      {
        channel: 'INSTAGRAM',
        label: 'Instagram',
        route: '/admin/crm/bandeja/instagram',
        icon: 'pi-instagram',
        anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
        module: 'CRM',
      },
      {
        channel: 'CORREO',
        label: 'Correo',
        route: '/admin/crm/bandeja/correo',
        icon: 'pi-envelope',
        anyPermission: ['CRM_LEADS_READ', 'CRM_ACTIVITIES_READ'],
        module: 'CRM',
      },
    ];
    return items
      .filter((item) => activeChannels.has(item.channel))
      .map(({ channel: _channel, ...item }) => item);
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
            module: ['ERP', 'FACTURACION'],
          },
          {
            label: 'Configuracion facturador',
            route: '/admin/configuracion-facturador',
            icon: 'pi-sliders-h',
            permission: 'CONFIGURACION_WRITE',
            module: ['ERP', 'FACTURACION'],
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
    const hasAnyPermission =
      !item.anyPermission || item.anyPermission.some((code) => this.authSession.hasPermission(code));
    const hasModule = !item.module || this.authSession.hasModule(item.module);
    const hasAnyModule = !item.anyModule || this.hasAnyModule(item.anyModule);
    return hasPermission && hasAnyPermission && hasModule && hasAnyModule;
  }

  private hasAnyModule(modules: readonly string[]): boolean {
    return modules.some((moduleCode) => this.authSession.hasModule(moduleCode));
  }

  private hasWorkspaceAccess(workspace: WorkspaceMode): boolean {
    return this.authSession.hasModule(workspace === 'crm' ? 'CRM' : 'ERP');
  }

  private resolveCrmHomeRoute(): string {
    if (
      this.authSession.hasPermission('CRM_REPORTS_READ') ||
      this.authSession.hasPermission('CRM_REPORTS_TEAM')
    ) {
      return '/admin/crm';
    }
    if (this.authSession.hasPermission('CRM_LEADS_READ')) {
      return '/admin/crm/prospectos';
    }
    if (this.authSession.hasPermission('CRM_ACTIVITIES_READ')) {
      return '/admin/crm/seguimiento';
    }
    return '/admin/crm/pipeline';
  }
}

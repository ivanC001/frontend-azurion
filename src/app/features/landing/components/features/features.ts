import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';

type IconItem = {
  icon: string;
  title: string;
  description: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-features',
  imports: [RouterLink, TagModule],
  templateUrl: './features.html',
  styleUrl: './features.scss',
})
export class FeaturesComponent {
  protected readonly newCapabilities: readonly IconItem[] = [
    {
      icon: 'pi-megaphone',
      title: 'Captación multicanal',
      description: 'Recibe leads de landings, WhatsApp y redes con campania, producto y origen.',
    },
    {
      icon: 'pi-comments',
      title: 'Seguimiento comercial en vivo',
      description: 'Centraliza llamadas, mensajes, reuniones, responsables y proximas acciones.',
    },
    {
      icon: 'pi-chart-line',
      title: 'Pipeline con reglas de avance',
      description: 'Gestiona Interesado, Cotizado, Negociación, Ganado y Perdido con trazabilidad.',
    },
    {
      icon: 'pi-file-edit',
      title: 'Cotizaciones y negociación',
      description: 'Versiona propuestas, registra ajustes, acuerdos y condiciones de cierre.',
    },
    {
      icon: 'pi-credit-card',
      title: 'Seguimiento de pagos',
      description: 'Controla cuotas, vencimientos, comprobantes y saldos pendientes por cliente.',
    },
    {
      icon: 'pi-chart-bar',
      title: 'Reportes CRM detallados',
      description: 'Analiza prospectos, seguimiento, oportunidades, ganancias y pérdidas.',
    },
  ];

  protected readonly modules: readonly IconItem[] = [
    {
      icon: 'pi-users',
      title: 'CRM y Pipeline',
      description: 'Leads, actividades, oportunidades, negociacion, clientes y postventa.',
    },
    {
      icon: 'pi-shopping-cart',
      title: 'Ventas y Cotizaciones',
      description: 'Pedidos, precios, comprobantes, pagos y documentos conectados al cliente.',
    },
    {
      icon: 'pi-box',
      title: 'Inventario y Compras',
      description: 'Stock por sucursal, almacenes, movimientos, proveedores y abastecimiento.',
    },
    {
      icon: 'pi-wallet',
      title: 'Caja y Cobranza',
      description: 'Flujo de efectivo, medios de pago, cuotas, saldos y conciliaciones.',
    },
    {
      icon: 'pi-file-check',
      title: 'Facturacion SUNAT',
      description: 'Facturas, boletas, notas, XML, PDF y CDR dentro de la misma operación.',
    },
    {
      icon: 'pi-chart-bar',
      title: 'Reportes y Monedas',
      description: 'Indicadores paginados, exportacion Excel/CSV y conversion de monedas.',
    },
  ];

  protected readonly controls: readonly IconItem[] = [
    {
      icon: 'pi-building',
      title: 'Multiempresa',
      description: 'Cada tenant opera con sus propios datos y configuración.',
    },
    {
      icon: 'pi-sitemap',
      title: 'Multisucursal',
      description: 'Sedes y almacenes conectados sin perder control local.',
    },
    {
      icon: 'pi-shield',
      title: 'Seguridad por rol',
      description: 'Accesos separados para ERP, CRM y facturacion.',
    },
    {
      icon: 'pi-bolt',
      title: 'Datos escalables',
      description: 'Paginación de servidor y filtros preparados para alto volumen.',
    },
  ];

  protected readonly invoiceItems = [
    'Facturas',
    'Boletas',
    'Notas de crédito',
    'Notas de debito',
    'Guias de remision',
    'XML',
    'PDF',
    'CDR',
  ];

  protected readonly flow = [
    { icon: 'pi-megaphone', title: 'Lead' },
    { icon: 'pi-comments', title: 'Seguimiento' },
    { icon: 'pi-file-edit', title: 'Cotización' },
    { icon: 'pi-chart-line', title: 'Negociación' },
    { icon: 'pi-trophy', title: 'Cliente' },
    { icon: 'pi-credit-card', title: 'Cobranza' },
  ];

  protected readonly teams: readonly IconItem[] = [
    {
      icon: 'pi-users',
      title: 'Equipo comercial',
      description:
        'Prioriza leads, cumple actividades y cierra oportunidades con contexto completo.',
    },
    {
      icon: 'pi-briefcase',
      title: 'Administracion',
      description: 'Conecta ventas, pagos, comprobantes, stock y documentos del cliente.',
    },
    {
      icon: 'pi-chart-line',
      title: 'Gerencia',
      description:
        'Consulta conversion, pipeline, cobranza y resultados sin consolidaciones manuales.',
    },
  ];
}

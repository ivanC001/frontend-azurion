import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';

type IconItem = {
  icon: string;
  title: string;
  description: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-features',
  imports: [CardModule, RouterLink, TagModule],
  templateUrl: './features.html',
  styleUrl: './features.scss',
})
export class FeaturesComponent {
  protected readonly benefits: readonly IconItem[] = [
    {
      icon: 'pi-building',
      title: 'Operacion centralizada',
      description: 'Unifica sedes, usuarios, comprobantes y reportes en una sola vista.',
    },
    {
      icon: 'pi-sitemap',
      title: 'Procesos conectados',
      description: 'Ventas, compras, inventario y caja trabajan sobre la misma informacion.',
    },
    {
      icon: 'pi-shield',
      title: 'Seguridad empresarial',
      description: 'Roles, permisos y auditoria para controlar cada accion critica.',
    },
    {
      icon: 'pi-file-check',
      title: 'SUNAT integrado',
      description: 'Facturas, boletas, notas, XML, PDF y CDR conectados al facturador.',
    },
    {
      icon: 'pi-chart-line',
      title: 'Gestion con indicadores',
      description: 'Dashboards en tiempo real para vender, comprar y decidir mejor.',
    },
    {
      icon: 'pi-cloud',
      title: 'SaaS escalable',
      description: 'Crece por modulos y sucursales sin perder orden operativo.',
    },
  ];

  protected readonly modules: readonly IconItem[] = [
    {
      icon: 'pi-shopping-cart',
      title: 'Ventas y Cotizaciones',
      description: 'Gestiona tus oportunidades, pedidos, comprobantes y facturacion de manera eficiente.',
    },
    {
      icon: 'pi-box',
      title: 'Inventario Inteligente',
      description: 'Controla tu stock en tiempo real, multiples almacenes, lotes y movimientos.',
    },
    {
      icon: 'pi-briefcase',
      title: 'Compras y Proveedores',
      description: 'Administra proveedores, ordenes de compra, recepciones y control de gastos.',
    },
    {
      icon: 'pi-wallet',
      title: 'Caja y Bancos',
      description: 'Controla flujo de efectivo, cuentas bancarias, metodos de pago y conciliaciones.',
    },
    {
      icon: 'pi-chart-line',
      title: 'Reportes y Analytics',
      description: 'Dashboards en tiempo real para tomar decisiones basadas en datos.',
    },
  ];

  protected readonly invoiceItems = [
    'Facturas',
    'Boletas',
    'Notas de Credito',
    'Notas de Debito',
    'Guias de Remision',
    'XML',
    'PDF',
    'CDR',
    'SUNAT',
  ];

  protected readonly flow = [
    { icon: 'pi-building', title: 'Empresa' },
    { icon: 'pi-shopping-cart', title: 'Venta' },
    { icon: 'pi-file-check', title: 'Factura Electronica' },
    { icon: 'pi-cloud-upload', title: 'SUNAT' },
    { icon: 'pi-folder-open', title: 'PDF/XML/CDR' },
  ];

  protected readonly testimonials = [
    {
      quote: 'Centralizamos ventas, stock y comprobantes sin friccion entre sedes.',
      name: 'Mariana Torres',
      role: 'Gerente de Operaciones, Grupo Andino',
    },
    {
      quote: 'El equipo comercial factura mas rapido y gerencia ve indicadores al instante.',
      name: 'Luis Paredes',
      role: 'Director Comercial, Nova Retail',
    },
    {
      quote: 'La integracion SUNAT nos dio estabilidad incluso en campanas de alto volumen.',
      name: 'Claudia Rivera',
      role: 'CFO, Industrias Lima',
    },
  ];
}

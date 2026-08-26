import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

export type Plan = {
  name: string;
  badge?: string;
  monthlyPrice: string;
  annualPrice: string;
  period: string;
  description: string;
  highlighted: boolean;
  features: readonly string[];
  ctaLabel: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pricing',
  imports: [RouterLink],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class PricingComponent {
  protected readonly isAnnual = signal(true);

  protected readonly plans: readonly Plan[] = [
    {
      name: 'Emprendedor',
      monthlyPrice: 'S/ 149',
      annualPrice: 'S/ 119',
      period: '/ mes',
      description:
        'Ideal para pequeños negocios y comercios que buscan emitir comprobantes y ordenar su inventario.',
      highlighted: false,
      features: [
        '1 Empresa (RUC) & 1 Sucursal',
        'Facturación SUNAT ilimitada',
        'Punto de Venta POS & Arqueo de caja',
        'Control de Stock e Inventario',
        'Consulta RUC y DNI en vivo',
        'Soporte estándar por correo y chat',
      ],
      ctaLabel: 'Elegir Emprendedor',
    },
    {
      name: 'Pyme Comercial',
      badge: 'Más Elegido',
      monthlyPrice: 'S/ 329',
      annualPrice: 'S/ 259',
      period: '/ mes',
      description:
        'Para empresas en crecimiento que requieren CRM activo, cotizaciones avanzadas y multialmacén.',
      highlighted: true,
      features: [
        'Hasta 3 Sucursales & Almacenes',
        'CRM Comercial & Embudo de Ventas',
        'Cotizaciones profesionales en PDF',
        'Seguimiento de Pagos & Cobranza',
        'Traslados entre almacenes y Kardex',
        'Exportación a Excel & Reportes BI',
        'Soporte prioritario por WhatsApp',
      ],
      ctaLabel: 'Comenzar con Pyme Comercial',
    },
    {
      name: 'Corporativo Enterprise',
      monthlyPrice: 'A Medida',
      annualPrice: 'A Medida',
      period: '',
      description:
        'Para grupos empresariales con múltiples empresas, alto volumen de ventas y requerimientos a medida.',
      highlighted: false,
      features: [
        'Multiempresa & Sedes ilimitadas',
        'Roles y permisos avanzados por usuario',
        'Integración API REST & Webhooks',
        'Capacitación para tu equipo comercial',
        'Migración de datos asistida',
        'Gerente de cuenta dedicado 24/7',
      ],
      ctaLabel: 'Contactar a Ventas',
    },
  ];

  protected toggleBilling(annual: boolean): void {
    this.isAnnual.set(annual);
  }
}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';

type Plan = {
  name: string;
  price: string;
  description: string;
  highlighted: boolean;
  features: readonly string[];
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-pricing',
  imports: [ButtonModule, CardModule],
  templateUrl: './pricing.html',
  styleUrl: './pricing.scss',
})
export class PricingComponent {
  protected readonly plans: readonly Plan[] = [
    {
      name: 'Starter',
      price: 'Desde S/ 149',
      description: 'Para negocios que empiezan a digitalizar ventas y comprobantes.',
      highlighted: false,
      features: ['1 empresa', '1 sucursal', 'Inventario base', 'Facturacion electronica'],
    },
    {
      name: 'Business',
      price: 'Desde S/ 349',
      description: 'Para equipos con operaciones multi sucursal y reportes gerenciales.',
      highlighted: true,
      features: [
        'Multi almacen',
        'Caja y ventas avanzadas',
        'Reportes en tiempo real',
        'Soporte prioritario',
      ],
    },
    {
      name: 'Enterprise',
      price: 'A medida',
      description: 'Para corporaciones con alto volumen, integraciones y control avanzado.',
      highlighted: false,
      features: [
        'Multiempresa',
        'API e integraciones',
        'Roles avanzados',
        'Acompanamiento dedicado',
      ],
    },
  ];
}

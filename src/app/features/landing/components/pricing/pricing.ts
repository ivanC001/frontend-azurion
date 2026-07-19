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
      description: 'Para negocios que empiezan a ordenar ventas, clientes y comprobantes.',
      highlighted: false,
      features: ['1 empresa', 'CRM esencial', 'Inventario base', 'Facturacion electronica'],
    },
    {
      name: 'Business',
      price: 'Desde S/ 349',
      description: 'Para equipos que necesitan CRM, ERP y cobranza trabajando juntos.',
      highlighted: true,
      features: [
        'Pipeline y seguimiento',
        'Multi almacen y caja',
        'Cobranza y reportes CRM',
        'Soporte prioritario',
      ],
    },
    {
      name: 'Enterprise',
      price: 'A medida',
      description: 'Para empresas con alto volumen, integraciones y gobierno por roles.',
      highlighted: false,
      features: [
        'Multiempresa',
        'API y captacion multicanal',
        'Roles avanzados',
        'Acompanamiento dedicado',
      ],
    },
  ];
}

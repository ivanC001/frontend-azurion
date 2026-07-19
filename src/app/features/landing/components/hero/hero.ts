import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

type PlatformArea = {
  icon: string;
  label: string;
  detail: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero',
  imports: [ButtonModule, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  protected readonly platformAreas: readonly PlatformArea[] = [
    { icon: 'pi-megaphone', label: 'Captacion', detail: 'Leads y campanas' },
    { icon: 'pi-chart-line', label: 'Pipeline', detail: 'Ventas y oportunidades' },
    { icon: 'pi-wallet', label: 'Cobranza', detail: 'Cuotas y vencimientos' },
    { icon: 'pi-file-check', label: 'SUNAT', detail: 'Facturacion electronica' },
  ];
}

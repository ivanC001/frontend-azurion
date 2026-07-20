import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';

import { FooterComponent } from '../../components/footer/footer';
import { NavbarComponent } from '../../components/navbar/navbar';

type PolicySection = {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-privacy-policy-page',
  imports: [FooterComponent, NavbarComponent, RouterLink],
  templateUrl: './privacy-policy-page.html',
  styleUrl: './privacy-policy-page.scss',
})
export class PrivacyPolicyPage {
  private readonly title = inject(Title);

  protected readonly updatedAt = '19 de julio de 2026';
  protected readonly sections: readonly PolicySection[] = [
    { id: 'alcance', label: 'Alcance y responsables', icon: 'pi-building' },
    { id: 'datos', label: 'Datos que tratamos', icon: 'pi-database' },
    { id: 'finalidades', label: 'Para qué los usamos', icon: 'pi-compass' },
    { id: 'whatsapp', label: 'WhatsApp y Meta', icon: 'pi-whatsapp' },
    { id: 'comparticion', label: 'Proveedores y transferencias', icon: 'pi-share-alt' },
    { id: 'conservacion', label: 'Conservación y seguridad', icon: 'pi-shield' },
    { id: 'derechos', label: 'Tus derechos', icon: 'pi-user-edit' },
    { id: 'contacto', label: 'Contacto y cambios', icon: 'pi-envelope' },
  ];

  constructor() {
    this.title.setTitle('Política de Privacidad | AZURION');
  }

  protected printPolicy(): void {
    window.print();
  }
}

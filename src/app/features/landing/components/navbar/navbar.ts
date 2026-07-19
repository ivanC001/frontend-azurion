import { Component, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

type NavItem = {
  label: string;
  fragment: string;
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-navbar',
  imports: [ButtonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  protected isScrolled = false;
  protected isMenuOpen = false;

  protected readonly navItems: readonly NavItem[] = [
    { label: 'Inicio', fragment: 'inicio' },
    { label: 'Plataforma', fragment: 'novedades' },
    { label: 'CRM', fragment: 'crm' },
    { label: 'ERP', fragment: 'modulos' },
    { label: 'Facturacion', fragment: 'facturacion' },
    { label: 'Planes', fragment: 'planes' },
    { label: 'Contacto', fragment: 'contacto' },
  ];

  @HostListener('window:scroll')
  protected onWindowScroll(): void {
    this.isScrolled = window.scrollY > 18;
  }

  protected toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  protected closeMenu(): void {
    this.isMenuOpen = false;
  }
}

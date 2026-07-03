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
    { label: 'Funciones', fragment: 'funciones' },
    { label: 'Modulos', fragment: 'modulos' },
    { label: 'Beneficios', fragment: 'beneficios' },
    { label: 'Precios', fragment: 'planes' },
    { label: 'Recursos', fragment: 'facturacion' },
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

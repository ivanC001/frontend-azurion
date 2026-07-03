import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-hero',
  imports: [ButtonModule, RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class HeroComponent {
  protected readonly benefits = [
    {
      icon: 'pi-cloud',
      title: '100% en la nube',
      description: 'Accede desde cualquier lugar',
    },
    {
      icon: 'pi-shield',
      title: 'Seguro y confiable',
      description: 'Proteccion de datos empresarial',
    },
    {
      icon: 'pi-bolt',
      title: 'Facil de usar',
      description: 'Interfaz intuitiva y moderna',
    },
    {
      icon: 'pi-chart-line',
      title: 'Escalable',
      description: 'Crece junto a tu negocio',
    },
  ];

  protected readonly metrics = [
    { label: 'Ventas del dia', value: 'S/ 25,430.00', trend: '12.5% vs ayer', positive: true },
    { label: 'Ventas del mes', value: 'S/ 254,430.00', trend: '18.2% vs mes pasado', positive: true },
    { label: 'Clientes activos', value: '1,250', trend: '8.4% vs mes pasado', positive: true },
    { label: 'Productos', value: '3,458', trend: '2.1% vs mes pasado', positive: false },
  ];

  protected readonly menuItems = [
    'Dashboard',
    'Ventas',
    'Compras',
    'Inventario',
    'Clientes',
    'Caja y Bancos',
    'Reportes',
    'Usuarios',
  ];

  protected readonly activities = [
    { icon: 'pi-shopping-cart', title: 'Nueva venta realizada', code: 'P001-000124', amount: 'S/ 1,250.00' },
    { icon: 'pi-wallet', title: 'Pago recibido de Tech Solutions', code: 'P001-005', amount: 'S/ 3,500.00' },
    { icon: 'pi-user-plus', title: 'Nuevo cliente registrado', code: 'Innova Corp SAC', amount: 'Hace 1 hora' },
  ];
}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';

type FooterLink = {
  label: string;
  href?: string;
  route?: string;
};

type FooterGroup = {
  title: string;
  links: readonly FooterLink[];
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class FooterComponent {
  protected readonly groups: readonly FooterGroup[] = [
    {
      title: 'Producto',
      links: [
        { label: 'CRM y Pipeline', href: '#crm' },
        { label: 'ERP SaaS', href: '#modulos' },
        { label: 'Facturacion Electronica', href: '#facturacion' },
        { label: 'Seguimiento de pagos', href: '#novedades' },
        { label: 'Reportes', href: '#novedades' },
      ],
    },
    {
      title: 'Empresa',
      links: [
        { label: 'Nosotros', href: '#nosotros' },
        { label: 'Contacto', href: '#contacto' },
        { label: 'Soporte', href: '#contacto' },
        { label: 'Solicitar Demo', href: '#contacto' },
      ],
    },
    {
      title: 'Recursos',
      links: [
        { label: 'Documentacion', href: '#contacto' },
        { label: 'API', href: '#contacto' },
        { label: 'Centro de Ayuda', href: '#contacto' },
        { label: 'Preguntas frecuentes', href: '#contacto' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terminos y Condiciones', href: '#contacto' },
        { label: 'Politica de Privacidad', route: '/politica-de-privacidad' },
      ],
    },
    {
      title: 'Contacto',
      links: [
        { label: 'ventas@azurios.com', href: 'mailto:ventas@azurios.com' },
        { label: '+51 900 000 000', href: 'tel:+51900000000' },
        { label: 'Facebook', href: 'https://www.facebook.com' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com' },
        { label: 'Instagram', href: 'https://www.instagram.com' },
      ],
    },
  ];
}

import { Component, ChangeDetectionStrategy } from '@angular/core';

import { ContactComponent } from '../../components/contact/contact';
import { FeaturesComponent } from '../../components/features/features';
import { FooterComponent } from '../../components/footer/footer';
import { HeroComponent } from '../../components/hero/hero';
import { NavbarComponent } from '../../components/navbar/navbar';
import { PricingComponent } from '../../components/pricing/pricing';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-landing-page',
  imports: [
    NavbarComponent,
    HeroComponent,
    FeaturesComponent,
    PricingComponent,
    ContactComponent,
    FooterComponent,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {}

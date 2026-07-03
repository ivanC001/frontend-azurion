import {
  AfterViewInit,
  Component,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

import { AlertToastBridgeService } from '@core/services/alert-toast-bridge.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit, OnDestroy {
  private readonly alertToastBridge = inject(AlertToastBridgeService);

  ngAfterViewInit(): void {
    this.alertToastBridge.start();
  }

  ngOnDestroy(): void {
    this.alertToastBridge.stop();
  }
}

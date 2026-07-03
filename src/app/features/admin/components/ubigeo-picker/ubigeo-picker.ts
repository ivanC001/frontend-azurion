import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';

import { AdminSaasApiService, Ubigeo } from '../../data/admin-saas-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-ubigeo-picker',
  imports: [FormsModule, ButtonModule, InputTextModule, SelectModule],
  templateUrl: './ubigeo-picker.html',
  styleUrl: './ubigeo-picker.scss',
})
export class UbigeoPickerComponent implements OnChanges, OnInit {
  private readonly api = inject(AdminSaasApiService);

  @Input() value: string | null = null;
  @Input() required = false;
  @Input() disabled = false;
  @Input() label = 'Ubigeo';
  @Input() searchLabel = 'Buscar ubigeo';
  @Input() name = 'ubigeo';
  @Input() placeholder = 'Codigo, distrito o provincia';
  @Output() valueChange = new EventEmitter<string | null>();
  @Output() ubigeoChange = new EventEmitter<Ubigeo | null>();

  protected readonly loading = signal(false);
  protected readonly options = signal<Ubigeo[]>([]);
  protected search = 'LIMA';

  ngOnInit(): void {
    if (!this.value) {
      this.searchUbigeos();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['value'] &&
      this.value &&
      !this.options().some((item) => item.codigo === this.value)
    ) {
      this.search = this.value;
      this.searchUbigeos();
    }
  }

  protected optionItems() {
    return this.options().map((ubigeo) => ({
      label: `${ubigeo.codigo} - ${ubigeo.distrito}, ${ubigeo.provincia}, ${ubigeo.departamento}`,
      value: ubigeo.codigo,
    }));
  }

  protected selectedUbigeo(): Ubigeo | null {
    return this.options().find((ubigeo) => ubigeo.codigo === this.value) ?? null;
  }

  protected setSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.search = input?.value ?? '';
  }

  protected searchUbigeos(): void {
    if (this.disabled) {
      return;
    }
    this.loading.set(true);
    this.api
      .listUbigeos(this.search)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (items) => {
          this.options.set(items);
          if (!this.value && items.length) {
            this.updateValue(items[0].codigo);
          } else {
            this.ubigeoChange.emit(this.selectedUbigeo());
          }
        },
        error: () => {
          this.options.set([]);
          this.ubigeoChange.emit(null);
        },
      });
  }

  protected updateValue(value: string | null): void {
    this.value = value;
    this.valueChange.emit(value);
    this.ubigeoChange.emit(this.selectedUbigeo());
  }
}

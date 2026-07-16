import { ChangeDetectionStrategy, Component, ViewEncapsulation, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';

import type { CrmAdminPage } from '../../crm-admin-page';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-mark-lost-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule, TableModule, TagModule, TextareaModule],
  templateUrl: './mark-lost-modal.html',
  encapsulation: ViewEncapsulation.None,
})
export class MarkLostModal {
  readonly host = input.required<CrmAdminPage>();
}

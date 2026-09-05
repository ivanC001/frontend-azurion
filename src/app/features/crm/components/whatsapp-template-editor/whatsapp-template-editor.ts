import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CrmApiService } from '@features/crm/data/crm-api.service';
import {
  CreateWhatsappTemplateButton,
  CrmWhatsappTemplateDraftResult,
} from '@features/crm/data/crm-api.types';

/** Misma forma que acepta el compositor al enviar: {{1}} o {{nombre}}. */
const VARIABLE = /\{\{([a-zA-Z_][a-zA-Z_0-9]*|[1-9][0-9]*)\}\}/g;

interface BotonBorrador {
  tipo: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  texto: string;
  url: string;
  telefono: string;
}

/**
 * Editor de plantillas de WhatsApp.
 *
 * Antes habia que crearlas en el Administrador de Meta, sin ninguna pista de que
 * componentes soporta el compositor: se podia aprobar una plantilla con encabezado de
 * imagen y descubrir recien al enviarla que el CRM no la podia usar. Aca solo se puede
 * componer lo que despues se va a poder enviar, y el backend revalida lo mismo antes
 * de mandarla a revision.
 */
@Component({
  selector: 'app-whatsapp-template-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './whatsapp-template-editor.html',
  styleUrl: './whatsapp-template-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WhatsappTemplateEditorComponent {
  private readonly api = inject(CrmApiService);

  protected readonly open = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly result = signal<CrmWhatsappTemplateDraftResult | null>(null);

  protected readonly nombre = signal('');
  protected readonly idioma = signal('es');
  protected readonly categoria = signal<'UTILITY' | 'MARKETING'>('UTILITY');
  protected readonly encabezado = signal('');
  protected readonly cuerpo = signal('');
  protected readonly pie = signal('');
  protected readonly ejemploEncabezado = signal<string[]>([]);
  protected readonly ejemploCuerpo = signal<string[]>([]);
  protected readonly botones = signal<BotonBorrador[]>([]);

  protected readonly variablesEncabezado = computed(() => this.variables(this.encabezado()));
  protected readonly variablesCuerpo = computed(() => this.variables(this.cuerpo()));

  /** Lo que le llegaria al cliente, con los ejemplos ya puestos. */
  protected readonly preview = computed(() => ({
    encabezado: this.render(this.encabezado(), this.ejemploEncabezado()),
    cuerpo: this.render(this.cuerpo(), this.ejemploCuerpo()),
    pie: this.pie().trim(),
    botones: this.botones().map((boton) => boton.texto.trim() || 'Boton'),
  }));

  /** El primer problema que impide enviar, o null si el borrador esta listo. */
  protected readonly problema = computed<string | null>(() => {
    const nombre = this.nombre().trim().toLowerCase();
    if (!nombre) {
      return 'Ponle un nombre a la plantilla.';
    }
    if (!/^[a-z0-9_]{1,512}$/.test(nombre)) {
      return 'El nombre solo admite minusculas, numeros y guion bajo, sin espacios ni tildes.';
    }
    if (!this.cuerpo().trim()) {
      return 'Escribe el cuerpo del mensaje.';
    }
    const encabezado = this.problemaDeComponente(
      this.encabezado(),
      this.variablesEncabezado(),
      this.ejemploEncabezado(),
      'encabezado',
    );
    if (encabezado) {
      return encabezado;
    }
    const cuerpo = this.problemaDeComponente(
      this.cuerpo(),
      this.variablesCuerpo(),
      this.ejemploCuerpo(),
      'cuerpo',
    );
    if (cuerpo) {
      return cuerpo;
    }
    if (VARIABLE.test(this.pie())) {
      VARIABLE.lastIndex = 0;
      return 'El pie de pagina no admite variables.';
    }
    for (const boton of this.botones()) {
      if (!boton.texto.trim()) {
        return 'Todos los botones necesitan un texto.';
      }
      if (boton.tipo === 'URL' && !boton.url.trim()) {
        return `El boton "${boton.texto.trim()}" necesita una direccion web.`;
      }
      if (boton.tipo === 'URL' && boton.url.includes('{{')) {
        return `El enlace del boton "${boton.texto.trim()}" no puede llevar variables.`;
      }
      if (boton.tipo === 'PHONE_NUMBER' && !boton.telefono.trim()) {
        return `El boton "${boton.texto.trim()}" necesita un numero de telefono.`;
      }
    }
    return null;
  });

  /** Angular no deja escribir llaves dobles literales en el template. */
  protected placeholder(variable: string): string {
    return `{{${variable}}}`;
  }

  protected toggle(): void {
    this.open.update((current) => !current);
  }

  protected setEncabezado(value: string): void {
    this.encabezado.set(value);
    this.ajustarEjemplos(this.ejemploEncabezado, this.variables(value).length);
  }

  protected setCuerpo(value: string): void {
    this.cuerpo.set(value);
    this.ajustarEjemplos(this.ejemploCuerpo, this.variables(value).length);
  }

  protected setEjemplo(destino: 'encabezado' | 'cuerpo', index: number, value: string): void {
    const signalRef = destino === 'cuerpo' ? this.ejemploCuerpo : this.ejemploEncabezado;
    signalRef.update((examples) => examples.map((item, i) => (i === index ? value : item)));
  }

  /** Agrega la siguiente variable numerada al final del texto. */
  protected agregarVariable(destino: 'encabezado' | 'cuerpo'): void {
    if (destino === 'cuerpo') {
      this.setCuerpo(`${this.cuerpo()}{{${this.variablesCuerpo().length + 1}}}`);
    } else {
      this.setEncabezado(`${this.encabezado()}{{${this.variablesEncabezado().length + 1}}}`);
    }
  }

  protected agregarBoton(): void {
    this.botones.update((current) => [
      ...current,
      { tipo: 'QUICK_REPLY', texto: '', url: '', telefono: '' },
    ]);
  }

  protected quitarBoton(index: number): void {
    this.botones.update((current) => current.filter((_, i) => i !== index));
  }

  protected actualizarBoton<K extends keyof BotonBorrador>(
    index: number,
    campo: K,
    value: BotonBorrador[K],
  ): void {
    this.botones.update((current) =>
      current.map((boton, i) => (i === index ? { ...boton, [campo]: value } : boton)),
    );
  }

  protected enviar(): void {
    if (this.problema() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set('');
    this.result.set(null);

    const botones: CreateWhatsappTemplateButton[] = this.botones().map((boton) => ({
      tipo: boton.tipo,
      texto: boton.texto.trim(),
      url: boton.tipo === 'URL' ? boton.url.trim() : null,
      telefono: boton.tipo === 'PHONE_NUMBER' ? boton.telefono.trim() : null,
    }));

    this.api
      .createCrmWhatsappTemplate({
        nombre: this.nombre().trim().toLowerCase(),
        idioma: this.idioma().trim(),
        categoria: this.categoria(),
        encabezado: this.encabezado().trim() || null,
        ejemploEncabezado: this.ejemploEncabezado(),
        cuerpo: this.cuerpo().trim(),
        ejemploCuerpo: this.ejemploCuerpo(),
        pie: this.pie().trim() || null,
        botones,
      })
      .subscribe({
        next: (result) => {
          this.saving.set(false);
          this.result.set(result);
          this.limpiar();
        },
        error: (error) => {
          this.saving.set(false);
          this.error.set(this.readError(error, 'No se pudo crear la plantilla.'));
        },
      });
  }

  private limpiar(): void {
    this.nombre.set('');
    this.encabezado.set('');
    this.cuerpo.set('');
    this.pie.set('');
    this.ejemploEncabezado.set([]);
    this.ejemploCuerpo.set([]);
    this.botones.set([]);
  }

  private variables(text: string): string[] {
    VARIABLE.lastIndex = 0;
    return [...text.matchAll(VARIABLE)].map((match) => match[1]);
  }

  /**
   * Meta numera las variables de cada componente por separado y arrancando en 1, y
   * exige un ejemplo por variable: sin eso rechaza la plantilla entera.
   */
  private problemaDeComponente(
    text: string,
    variables: string[],
    examples: string[],
    label: string,
  ): string | null {
    if (!text.trim()) {
      return null;
    }
    let remaining = text;
    for (const variable of variables) {
      remaining = remaining.split(`{{${variable}}}`).join('');
    }
    if (remaining.includes('{{') || remaining.includes('}}')) {
      return `Hay una variable mal escrita en el ${label}. Usa la forma {{1}}, sin espacios dentro de las llaves.`;
    }
    for (let index = 0; index < variables.length; index++) {
      if (variables[index] !== String(index + 1)) {
        return `Las variables del ${label} deben ir numeradas en orden y sin saltos: {{1}}, {{2}}, {{3}}...`;
      }
    }
    if (examples.slice(0, variables.length).some((example) => !example.trim())) {
      return `Completa el ejemplo de cada variable del ${label}.`;
    }
    return null;
  }

  private ajustarEjemplos(signalRef: { set: (value: string[]) => void; (): string[] }, size: number) {
    const current = signalRef();
    const next = Array.from({ length: size }, (_, index) => current[index] ?? '');
    signalRef.set(next);
  }

  private render(text: string, examples: string[]): string {
    let index = 0;
    VARIABLE.lastIndex = 0;
    return text.replace(VARIABLE, () => examples[index++] || '...');
  }

  private readError(error: unknown, fallback: string): string {
    const candidate = error as { error?: { message?: string; detail?: string } };
    return candidate.error?.message || candidate.error?.detail || fallback;
  }
}

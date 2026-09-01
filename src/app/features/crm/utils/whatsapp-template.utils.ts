import {
  CrmWhatsappConversation,
  CrmWhatsappTemplate,
  CrmWhatsappTemplateComponent,
} from '../data/crm-api.types';

export interface WhatsappTemplateVariable {
  readonly component: string;
  readonly name: string;
  readonly label: string;
  readonly suggestedValue: string;
}

export function templateComponents(
  template: CrmWhatsappTemplate,
): readonly CrmWhatsappTemplateComponent[] {
  return (
    template.componentes ?? [
      {
        tipo: 'BODY',
        texto: template.cuerpo,
        parametros: Array.from({ length: template.cantidadParametros }, (_, index) =>
          String(index + 1),
        ),
      },
    ]
  );
}

export function templateVariables(
  template: CrmWhatsappTemplate,
  contact: Pick<CrmWhatsappConversation, 'nombre' | 'interesPrincipal'> | null,
): WhatsappTemplateVariable[] {
  return templateComponents(template).flatMap((component) =>
    component.parametros.map((name) => {
      const token = `{{${name}}}`;
      const before = component.texto
        .slice(0, component.texto.indexOf(token))
        .slice(-90)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
      // Only suggest recognized contact fields; unrelated variables remain empty for review.
      const isName =
        /^(nombre|nombre_cliente|nombre_contacto|name|customer_name|contact_name)$/.test(name) ||
        /(?:hola|hello|hi|estimad[oa]|dear|ola)\s*$/.test(before);
      const isInterest =
        /^(interes|interes_principal|producto|curso|interest|product|course)$/.test(name) ||
        /(?:solicitud sobre|consulta sobre|interes en|interes por|interesado en|informacion sobre|request about|inquiry about|interest in)\s*$/.test(
          before,
        );
      const label = isName
        ? 'Nombre del contacto'
        : isInterest
          ? 'Interés del contacto'
          : 'Variable';
      const suggestedValue = isName ? contact?.nombre : isInterest ? contact?.interesPrincipal : '';
      return {
        component: component.tipo,
        name,
        label,
        suggestedValue: suggestedValue?.trim() ?? '',
      };
    }),
  );
}

export function renderTemplate(template: CrmWhatsappTemplate, values: readonly string[]): string {
  let index = 0;
  return templateComponents(template)
    .map((component) => {
      const replacements = new Map(
        component.parametros.map((name) => [name, values[index++]?.trim()]),
      );
      return component.texto.replace(
        /\{\{([a-zA-Z_][a-zA-Z_0-9]*|[1-9][0-9]*)}}/g,
        (token, name: string) => replacements.get(name) || token,
      );
    })
    .filter(Boolean)
    .join('\n\n');
}

export function templateParameterError(variable: WhatsappTemplateVariable, value: string): string {
  const reference = `{{${variable.name}}} · ${variable.label}`;
  if (!value.trim()) return `Falta ${reference}.`;
  if (value.trim().length > 1024 || /\{\{|}}|[\x00-\x1f\x7f-\x9f]/.test(value.trim())) {
    return `Revisa ${reference}: máximo 1024 caracteres, sin variables ni saltos de línea.`;
  }
  return '';
}

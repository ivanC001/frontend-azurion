import { describe, expect, it } from 'vitest';
import { CrmWhatsappTemplate } from '../data/crm-api.types';
import {
  renderTemplate,
  templateVariables,
  templateParameterError,
} from './whatsapp-template.utils';

const template: CrmWhatsappTemplate = {
  nombre: 'seguimiento_prospecto',
  idioma: 'es_PE',
  categoria: 'MARKETING',
  cantidadParametros: 2,
  cuerpo: 'Hola {{1}}\nQueremos dar seguimiento a tu solicitud sobre {{2}}.',
  disponible: true,
  componentes: [
    {
      tipo: 'BODY',
      texto: 'Hola {{1}}\nQueremos dar seguimiento a tu solicitud sobre {{2}}.',
      parametros: ['1', '2'],
    },
  ],
};

describe('WhatsApp template variables', () => {
  it('suggests contact and interest independently of the template name', () => {
    const variables = templateVariables(
      { ...template, nombre: 'cualquier_plantilla' },
      { nombre: 'Ivan Flores', interesPrincipal: 'Curso Python' },
    );
    expect(variables.map((variable) => variable.suggestedValue)).toEqual([
      'Ivan Flores',
      'Curso Python',
    ]);
    expect(variables.map((variable) => variable.label)).toEqual([
      'Nombre del contacto',
      'Interés del contacto',
    ]);
  });

  it('leaves missing data empty and names the required variable', () => {
    const variables = templateVariables(template, { nombre: 'Ivan', interesPrincipal: null });
    expect(variables[1].suggestedValue).toBe('');
    expect(templateParameterError(variables[1], '')).toBe('Falta {{2}} · Interés del contacto.');
  });

  it('does not guess unrelated variables from their numeric positions', () => {
    const variables = templateVariables(
      {
        ...template,
        componentes: [{ tipo: 'BODY', texto: 'Pedido {{1}} por {{2}}', parametros: ['1', '2'] }],
      },
      { nombre: 'Ivan', interesPrincipal: 'Python' },
    );
    expect(variables.map((variable) => variable.suggestedValue)).toEqual(['', '']);
  });

  it('renders edited values and handles replacement syntax literally', () => {
    expect(renderTemplate(template, ['Maria', 'Curso $& Python'])).toBe(
      'Hola Maria\nQueremos dar seguimiento a tu solicitud sobre Curso $& Python.',
    );
  });

  it('does not recursively replace tokens inserted by a parameter', () => {
    expect(renderTemplate(template, ['{{2}}', 'Curso'])).toContain('Hola {{2}}');
    expect(templateParameterError(templateVariables(template, null)[0], '{{2}}')).not.toBe('');
  });

  it('supports named variables, header parameters, footer and repeated variables', () => {
    const named = {
      ...template,
      componentes: [
        { tipo: 'HEADER', texto: 'Pedido {{1}}', parametros: ['1'] },
        { tipo: 'BODY', texto: 'Hola {{nombre}} / {{nombre}}', parametros: ['nombre'] },
        { tipo: 'FOOTER', texto: 'Gracias', parametros: [] },
      ],
    };
    expect(renderTemplate(named, ['123', 'Ana'])).toBe('Pedido 123\n\nHola Ana / Ana\n\nGracias');
  });

  it('keeps incomplete variables visible in the preview', () => {
    expect(renderTemplate(template, ['Ivan', ''])).toContain('{{2}}');
  });

  it('rejects control characters and oversized parameters', () => {
    const variable = templateVariables(template, null)[0];
    for (const value of ['x\ny', 'x\ty', 'x'.repeat(1025)]) {
      expect(templateParameterError(variable, value)).not.toBe('');
    }
    expect(templateParameterError(variable, ' Ivan ')).toBe('');
  });
});

import { isIdentifiedCustomer } from './customer-document-rules';

describe('isIdentifiedCustomer', () => {
  it('accepts a person identified with DNI', () => {
    expect(isIdentifiedCustomer('1', '12345678', 'Cliente Persona')).toBe(true);
  });

  it('accepts a company identified with RUC', () => {
    expect(isIdentifiedCustomer('6', '20123456789', 'Empresa SAC')).toBe(true);
  });

  it('rejects invalid documents or a missing customer name', () => {
    expect(isIdentifiedCustomer('1', '123', 'Cliente Persona')).toBe(false);
    expect(isIdentifiedCustomer('6', '20123456789', '   ')).toBe(false);
  });
});

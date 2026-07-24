import { routes } from './app.routes';

describe('authentication routes', () => {
  const authRoute = routes.find((route) => route.path === 'auth');

  it('uses /auth for tenant users', () => {
    const tenantLogin = authRoute?.children?.find((route) => route.path === '');

    expect(tenantLogin?.pathMatch).toBe('full');
    expect(tenantLogin?.data?.['loginMode']).toBe('tenant');
    expect(tenantLogin?.loadComponent).toBeTypeOf('function');
  });

  it('reserves /auth/login for platform administrators', () => {
    const administratorLogin = authRoute?.children?.find((route) => route.path === 'login');

    expect(administratorLogin?.data?.['loginMode']).toBe('general');
    expect(administratorLogin?.loadComponent).toBeTypeOf('function');
  });
});

describe('platform administration routes', () => {
  const adminRoute = routes.find((route) => route.path === 'admin');

  it('exposes the Azurion global email configuration as a lazy administrative view', () => {
    const emailRoute = adminRoute?.children?.find((route) => route.path === 'correo-azurion');

    expect(emailRoute?.canActivate?.length).toBeGreaterThan(0);
    expect(emailRoute?.loadComponent).toBeTypeOf('function');
  });

  it('exposes a shared authenticated message inbox', () => {
    const messagesRoute = adminRoute?.children?.find((route) => route.path === 'mensajes');

    expect(messagesRoute?.loadComponent).toBeTypeOf('function');
  });
});

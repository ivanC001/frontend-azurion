# CRM Admin Page

Este modulo esta entrando en una migracion gradual para que `crm-admin-page` quede como contenedor del CRM.

## Estructura objetivo

- `pages/`: vistas principales del CRM.
- `modals/`: modales grandes y flujos de captura.
- `components/`: piezas reutilizables de UI.
- `models/`: contratos TypeScript y enums del dominio CRM.
- `services/`: fachadas por dominio sobre `AdminSaasApiService`.
- `utils/`: reglas de etapas, constantes y formateadores.

## Regla de migracion

Mover una vista o modal por vez y compilar despues de cada movimiento.

## Avance aplicado

- Se eliminaron bloques legacy del template principal que estaban deshabilitados con condiciones permanentes `&& false`.
- Se elimino el dialogo legacy de prospecto que permanecia con `[visible]="false"` y duplicaba el formulario activo.
- Se encapsulo la persistencia temporal en navegador dentro de `services/crm-local-storage.service.ts`.
- `crm-admin-page.ts` conserva las mismas claves de almacenamiento y delega lectura/escritura al servicio, sin cambiar rutas ni endpoints.
- La compilacion `npm run build` pasa despues de estos cambios.

Advertencias pendientes de la compilacion actual:

- `crm-admin-page.scss` excede el presupuesto configurado por aproximadamente 30 kB.
- `exceljs` sigue reportado como dependencia CommonJS desde `excel-report.service.ts`.

Estas advertencias no bloquean la migracion, pero conviene reducir SCSS al extraer vistas y componentes.

Orden sugerido:

1. `payment-tracking-page`: extraer seguimiento de pagos, porque ya tiene una frontera visual clara.
2. `prospects-page`: mover tabla/lista de leads y reparto.
3. `followups-page`: mover seguimiento y modal de actividad cumplida.
4. `opportunities-page` y `pipeline-page`: separar lista de oportunidades de tablero pipeline.
5. `customers-page`: mover clientes y documentos de venta cerrada.
6. Modales de oportunidad, negociacion, pago, ganado y perdido.

Durante la migracion no se deben cambiar rutas principales, endpoints ni nombres publicos usados por templates existentes.

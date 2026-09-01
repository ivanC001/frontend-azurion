# Verificación visual responsive

Ejecutar desde la raíz del frontend:

```sh
npx ng serve --build-target azurion-frontend:build:responsive-preview --host 127.0.0.1 --port 4200
```

Abrir `http://127.0.0.1:4200/general`. El menú superior permite revisar las páginas de configuración y abrir los formularios reales del CRM con datos ficticios.

Este punto de entrada es exclusivo de pruebas: reemplaza la sesión, el almacenamiento CRM y el transporte HTTP. No usa credenciales, no conecta con la API y no guarda datos. El build normal de producción sigue usando `src/main.ts`.

Comprobar a 360, 390, 768 y 1280 píxeles:

- Configuración: General, Productos CRM, Canales, Correo, Monedas, Promociones, Empresa (sus tres pestañas), Sucursales, Usuarios y Seguridad Empresa.
- Pipeline: oportunidad, detalle, actividad, completar actividad, cotización, negociación, requerimiento, documento, producto, prospecto, pago, datos del cliente, cambio de etapa y pérdida.
- Los formularios no deben tener desplazamiento horizontal. Las tablas anchas conservan su desplazamiento dentro del contenedor, sin ampliar la página.
- Los campos mantienen sus etiquetas y las acciones finales se alcanzan desplazando el contenido del modal. Probar también ventanas de poca altura.
- No pulsar acciones de guardado esperando persistencia: la API está intencionadamente desconectada en esta vista.

Pruebas de lógica: `npm test -- --watch=false`. Compilación de producción: `npm run build`.

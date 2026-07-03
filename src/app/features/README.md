# Features

Modulos por dominio o flujo de negocio.

Cada feature puede tener:

- `pages`: componentes usados por rutas;
- `components`: piezas internas de la feature;
- `data-access`: servicios, facades y llamadas API propias;
- `models`: tipos especificos del dominio.

Una feature no debe depender de otra feature. Si algo se comparte, moverlo a `shared` o `core`.

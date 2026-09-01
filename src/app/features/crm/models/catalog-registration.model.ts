export type CatalogOpportunityType =
  | 'PRODUCTO'
  | 'SERVICIO'
  | 'VEHICULO'
  | 'INMUEBLE'
  | 'PROYECTO'
  | 'CURSO'
  | 'SEGURO'
  | 'SOFTWARE'
  | 'MARKETING'
  | 'CLINICA'
  | 'JURIDICO'
  | 'TURISMO'
  | 'MAQUINARIA'
  | 'FINANCIERO'
  | 'CONSULTORIA'
  | 'EDUCACION'
  | 'HOSPITALIDAD'
  | 'MANUFACTURA'
  | 'TELECOMUNICACION'
  | 'ENERGIA'
  | 'AGRICULTURA'
  | 'OTRO';

export type CatalogFieldType = 'text' | 'number' | 'date' | 'select' | 'textarea';

export interface CatalogField {
  readonly key: string;
  readonly label: string;
  readonly placeholder: string;
  readonly type?: CatalogFieldType;
  readonly required?: boolean;
  readonly options?: readonly string[];
  readonly help?: string;
  readonly min?: number;
  readonly step?: number;
  readonly wide?: boolean;
}

export interface CatalogRegistrationType {
  readonly value: CatalogOpportunityType;
  readonly label: string;
  readonly icon: string;
  readonly description: string;
  readonly group: CatalogTypeGroupCode;
  readonly nameLabel: string;
  readonly namePlaceholder: string;
  readonly priceLabel: string;
  readonly priceHelp: string;
  readonly descriptionPlaceholder: string;
  readonly fields: readonly CatalogField[];
}

export type CatalogTypeGroupCode =
  'BIENES' | 'SERVICIOS' | 'PERSONAS' | 'INFRAESTRUCTURA' | 'OTROS';

export interface CatalogTypeGroup {
  readonly code: CatalogTypeGroupCode;
  readonly label: string;
  readonly description: string;
}

export const CATALOG_TYPE_GROUPS: readonly CatalogTypeGroup[] = [
  {
    code: 'BIENES',
    label: 'Bienes y activos',
    description: 'Productos físicos, vehículos, inmuebles, equipos y producción.',
  },
  {
    code: 'SERVICIOS',
    label: 'Servicios y proyectos',
    description: 'Trabajo profesional, implementaciones y soluciones empresariales.',
  },
  {
    code: 'PERSONAS',
    label: 'Personas y experiencias',
    description: 'Formación, salud, viajes, hospitalidad y protección.',
  },
  {
    code: 'INFRAESTRUCTURA',
    label: 'Infraestructura y finanzas',
    description: 'Financiamiento, conectividad y soluciones energéticas.',
  },
  {
    code: 'OTROS',
    label: 'Otros rubros',
    description: 'Ofertas que todavía no encajan en una categoría específica.',
  },
] as const;

const yesNoOptions = ['Sí', 'No'] as const;
const modalityOptions = ['Presencial', 'Remoto', 'Híbrido', 'A domicilio'] as const;

export const CATALOG_REGISTRATION_TYPES: readonly CatalogRegistrationType[] = [
  {
    value: 'PRODUCTO',
    label: 'Producto',
    icon: 'pi pi-box',
    description: 'Mercadería, repuestos, alimentos, ropa o paquetes físicos.',
    group: 'BIENES',
    nameLabel: 'Nombre comercial del producto',
    namePlaceholder: 'Ej. Kit de mantenimiento preventivo',
    priceLabel: 'Precio unitario referencial',
    priceHelp: 'Usa 0 cuando el precio se determine mediante cotización.',
    descriptionPlaceholder:
      'Describe qué incluye el producto, sus beneficios y la presentación ofrecida.',
    fields: [
      {
        key: 'categoria',
        label: 'Categoría',
        placeholder: 'Repuesto, alimento, ropa...',
        required: true,
      },
      { key: 'marca', label: 'Marca', placeholder: 'Marca o fabricante' },
      { key: 'modelo', label: 'Modelo / versión', placeholder: 'Modelo, tamaño o versión' },
      { key: 'sku', label: 'SKU o código interno', placeholder: 'Código comercial único' },
      { key: 'presentacion', label: 'Presentación', placeholder: 'Caja x 12, bolsa de 1 kg...' },
      {
        key: 'unidadMedida',
        label: 'Unidad de venta',
        placeholder: 'Selecciona una unidad',
        type: 'select',
        required: true,
        options: ['Unidad', 'Caja', 'Paquete', 'Kilogramo', 'Litro', 'Metro', 'Otro'],
      },
    ],
  },
  {
    value: 'VEHICULO',
    label: 'Vehículo',
    icon: 'pi pi-car',
    description: 'Venta, alquiler, separación, financiamiento o prueba de manejo.',
    group: 'BIENES',
    nameLabel: 'Vehículo ofrecido',
    namePlaceholder: 'Ej. Toyota Hilux SRV 2024',
    priceLabel: 'Precio de venta o valor base',
    priceHelp: 'Indica el precio total; la cuota o inicial puede detallarse en la descripción.',
    descriptionPlaceholder:
      'Resume equipamiento, condición, garantía, disponibilidad y condiciones comerciales.',
    fields: [
      {
        key: 'operacion',
        label: 'Operación',
        placeholder: 'Selecciona la operación',
        type: 'select',
        required: true,
        options: ['Venta', 'Alquiler', 'Financiamiento', 'Separación'],
      },
      { key: 'marca', label: 'Marca', placeholder: 'Toyota, Hyundai, Nissan...', required: true },
      { key: 'modelo', label: 'Modelo', placeholder: 'Hilux, Tucson, Sentra...', required: true },
      { key: 'version', label: 'Versión', placeholder: 'SRV 4x4 AT, Limited...' },
      { key: 'anio', label: 'Año', placeholder: '2024', type: 'number', min: 1900 },
      { key: 'kilometraje', label: 'Kilometraje', placeholder: '0', type: 'number', min: 0 },
      {
        key: 'combustible',
        label: 'Combustible / energía',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Gasolina', 'Diésel', 'GLP', 'GNV', 'Híbrido', 'Eléctrico'],
      },
    ],
  },
  {
    value: 'INMUEBLE',
    label: 'Inmueble',
    icon: 'pi pi-building',
    description: 'Casas, departamentos, terrenos, oficinas o locales.',
    group: 'BIENES',
    nameLabel: 'Nombre del inmueble',
    namePlaceholder: 'Ej. Departamento de 3 dormitorios en Miraflores',
    priceLabel: 'Precio de venta o alquiler',
    priceHelp: 'Registra el valor total o la renta mensual según la operación.',
    descriptionPlaceholder:
      'Describe distribución, acabados, servicios, antigüedad y condiciones de la operación.',
    fields: [
      {
        key: 'operacion',
        label: 'Operación',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Venta', 'Alquiler', 'Anticresis', 'Alquiler temporal'],
      },
      {
        key: 'tipoInmueble',
        label: 'Tipo de inmueble',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Casa',
          'Departamento',
          'Terreno',
          'Oficina',
          'Local comercial',
          'Almacén',
          'Otro',
        ],
      },
      {
        key: 'ubicacion',
        label: 'Ubicación',
        placeholder: 'Distrito, ciudad o dirección',
        required: true,
        wide: true,
      },
      { key: 'areaM2', label: 'Área (m²)', placeholder: '120', type: 'number', min: 0, step: 0.01 },
      { key: 'dormitorios', label: 'Dormitorios', placeholder: '3', type: 'number', min: 0 },
      { key: 'banos', label: 'Baños', placeholder: '2', type: 'number', min: 0 },
    ],
  },
  {
    value: 'MAQUINARIA',
    label: 'Maquinaria',
    icon: 'pi pi-cog',
    description: 'Venta, alquiler o mantenimiento de equipos y maquinaria.',
    group: 'BIENES',
    nameLabel: 'Equipo o maquinaria',
    namePlaceholder: 'Ej. Excavadora CAT 320 GC',
    priceLabel: 'Precio de venta o tarifa base',
    priceHelp: 'Para alquiler indica la tarifa base y detalla la periodicidad.',
    descriptionPlaceholder:
      'Indica capacidad, accesorios, estado, garantía y condiciones de entrega u operación.',
    fields: [
      {
        key: 'operacion',
        label: 'Operación',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Venta', 'Alquiler', 'Mantenimiento', 'Repuesto'],
      },
      {
        key: 'equipo',
        label: 'Tipo de equipo',
        placeholder: 'Excavadora, compresora...',
        required: true,
      },
      { key: 'marca', label: 'Marca', placeholder: 'CAT, Komatsu, Volvo...' },
      { key: 'modelo', label: 'Modelo / serie', placeholder: 'Modelo o serie' },
      { key: 'capacidad', label: 'Capacidad', placeholder: 'Toneladas, potencia o alcance' },
      {
        key: 'condicion',
        label: 'Condición',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Nuevo', 'Seminuevo', 'Usado', 'Reacondicionado'],
      },
      { key: 'horasUso', label: 'Horas de uso', placeholder: '1200', type: 'number', min: 0 },
    ],
  },
  {
    value: 'MANUFACTURA',
    label: 'Manufactura',
    icon: 'pi pi-warehouse',
    description: 'Producción por pedido, insumos industriales o distribución.',
    group: 'BIENES',
    nameLabel: 'Producto manufacturado',
    namePlaceholder: 'Ej. Estructura metálica galvanizada',
    priceLabel: 'Precio base por unidad o lote',
    priceHelp: 'Indica el valor de referencia; especifica la unidad comercial.',
    descriptionPlaceholder:
      'Describe especificaciones, tolerancias, acabados y condiciones de fabricación.',
    fields: [
      {
        key: 'tipoProducto',
        label: 'Tipo de producto',
        placeholder: 'Pieza, lote, estructura...',
        required: true,
      },
      { key: 'material', label: 'Material principal', placeholder: 'Acero, plástico, tela...' },
      {
        key: 'unidadMedida',
        label: 'Unidad comercial',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Unidad', 'Lote', 'Kilogramo', 'Metro', 'Metro cuadrado', 'Tonelada'],
      },
      { key: 'cantidadMinima', label: 'Pedido mínimo', placeholder: '100', type: 'number', min: 1 },
      { key: 'tiempoProduccion', label: 'Tiempo de producción', placeholder: '15 días hábiles' },
      {
        key: 'personalizacion',
        label: 'Admite personalización',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'AGRICULTURA',
    label: 'Agricultura',
    icon: 'pi pi-sun',
    description: 'Insumos, cultivos, riego, equipos o servicios de campo.',
    group: 'BIENES',
    nameLabel: 'Oferta agrícola',
    namePlaceholder: 'Ej. Fertilizante orgánico para café',
    priceLabel: 'Precio por unidad o servicio',
    priceHelp: 'Indica el precio según la presentación o unidad de medida.',
    descriptionPlaceholder:
      'Describe aplicación, rendimiento, recomendaciones y cobertura geográfica.',
    fields: [
      {
        key: 'tipoOferta',
        label: 'Tipo de oferta',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Insumo',
          'Semilla',
          'Producto cosechado',
          'Riego',
          'Maquinaria',
          'Servicio técnico',
          'Otro',
        ],
      },
      { key: 'cultivo', label: 'Cultivo relacionado', placeholder: 'Arroz, palta, café...' },
      { key: 'presentacion', label: 'Presentación', placeholder: 'Saco de 50 kg, bandeja...' },
      {
        key: 'unidadMedida',
        label: 'Unidad de venta',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Unidad', 'Saco', 'Kilogramo', 'Tonelada', 'Hectárea', 'Servicio'],
      },
      {
        key: 'coberturaZona',
        label: 'Zona de cobertura',
        placeholder: 'Provincia, región o valle',
      },
      { key: 'temporada', label: 'Temporada / campaña', placeholder: 'Campaña 2026' },
    ],
  },
  {
    value: 'SERVICIO',
    label: 'Servicio',
    icon: 'pi pi-wrench',
    description: 'Mantenimiento, instalación, asesoría o trabajo técnico.',
    group: 'SERVICIOS',
    nameLabel: 'Nombre del servicio',
    namePlaceholder: 'Ej. Mantenimiento preventivo de aire acondicionado',
    priceLabel: 'Tarifa base del servicio',
    priceHelp: 'Puede ser por hora, visita o paquete; detállalo en la descripción.',
    descriptionPlaceholder:
      'Explica alcance, actividades incluidas, exclusiones y resultado esperado.',
    fields: [
      {
        key: 'tipoServicio',
        label: 'Tipo de servicio',
        placeholder: 'Instalación, mantenimiento...',
        required: true,
      },
      {
        key: 'modalidad',
        label: 'Modalidad',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: modalityOptions,
      },
      { key: 'duracion', label: 'Duración estimada', placeholder: '2 horas, 3 días, mensual' },
      {
        key: 'incluyeMateriales',
        label: 'Incluye materiales',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
      { key: 'cobertura', label: 'Cobertura geográfica', placeholder: 'Distritos, ciudad o país' },
    ],
  },
  {
    value: 'PROYECTO',
    label: 'Proyecto',
    icon: 'pi pi-sitemap',
    description: 'Implementaciones, obras, eventos o soluciones a medida.',
    group: 'SERVICIOS',
    nameLabel: 'Nombre del proyecto',
    namePlaceholder: 'Ej. Implementación de centro de distribución',
    priceLabel: 'Presupuesto base del proyecto',
    priceHelp:
      'Registra un monto inicial; el presupuesto final puede definirse tras el diagnóstico.',
    descriptionPlaceholder: 'Resume objetivo, alcance, fases, supuestos y criterios de aceptación.',
    fields: [
      {
        key: 'tipoProyecto',
        label: 'Tipo de proyecto',
        placeholder: 'Obra, implementación, evento...',
        required: true,
      },
      {
        key: 'alcance',
        label: 'Alcance principal',
        placeholder: 'Qué se ejecutará y hasta dónde',
        type: 'textarea',
        required: true,
        wide: true,
      },
      {
        key: 'entregable',
        label: 'Entregable principal',
        placeholder: 'Sistema operativo, obra terminada...',
      },
      { key: 'duracion', label: 'Duración estimada', placeholder: '3 meses' },
      { key: 'fechaInicio', label: 'Inicio estimado', placeholder: '', type: 'date' },
    ],
  },
  {
    value: 'SOFTWARE',
    label: 'Software',
    icon: 'pi pi-desktop',
    description: 'SaaS, licencias, implementación, soporte o desarrollo.',
    group: 'SERVICIOS',
    nameLabel: 'Solución de software',
    namePlaceholder: 'Ej. Sistema POS para 5 sucursales',
    priceLabel: 'Precio o mensualidad base',
    priceHelp: 'Indica la tarifa por plan; detalla si es mensual, anual o pago único.',
    descriptionPlaceholder:
      'Explica módulos, límites, soporte, implementación e integraciones incluidas.',
    fields: [
      {
        key: 'modalidad',
        label: 'Modelo comercial',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['SaaS', 'Licencia perpetua', 'Desarrollo a medida', 'Implementación', 'Soporte'],
      },
      {
        key: 'solucion',
        label: 'Solución / módulos',
        placeholder: 'CRM, POS, inventario...',
        required: true,
      },
      { key: 'usuarios', label: 'Usuarios incluidos', placeholder: '10', type: 'number', min: 1 },
      {
        key: 'periodicidad',
        label: 'Periodicidad',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Mensual', 'Trimestral', 'Anual', 'Pago único', 'Por proyecto'],
      },
      { key: 'plataforma', label: 'Plataforma', placeholder: 'Web, móvil, escritorio, API' },
      {
        key: 'incluyeImplementacion',
        label: 'Incluye implementación',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'MARKETING',
    label: 'Marketing',
    icon: 'pi pi-megaphone',
    description: 'Campañas, branding, publicidad y gestión digital.',
    group: 'SERVICIOS',
    nameLabel: 'Servicio o campaña',
    namePlaceholder: 'Ej. Gestión mensual de Meta Ads',
    priceLabel: 'Fee o presupuesto base',
    priceHelp: 'Aclara si incluye pauta publicitaria o solo honorarios.',
    descriptionPlaceholder:
      'Describe objetivos, canales, entregables, frecuencia de reportes y exclusiones.',
    fields: [
      {
        key: 'servicio',
        label: 'Tipo de servicio',
        placeholder: 'Ads, branding, contenidos...',
        required: true,
      },
      {
        key: 'canal',
        label: 'Canal principal',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Meta Ads',
          'Google Ads',
          'TikTok',
          'LinkedIn',
          'SEO',
          'Email',
          'Multicanal',
          'Otro',
        ],
      },
      { key: 'objetivo', label: 'Objetivo', placeholder: 'Leads, ventas, alcance...' },
      { key: 'duracion', label: 'Duración', placeholder: 'Mensual, campaña de 30 días' },
      {
        key: 'presupuestoPauta',
        label: 'Pauta sugerida',
        placeholder: '0.00',
        type: 'number',
        min: 0,
        step: 0.01,
      },
      {
        key: 'entregables',
        label: 'Entregables',
        placeholder: 'Piezas, campañas, reportes...',
        wide: true,
      },
    ],
  },
  {
    value: 'JURIDICO',
    label: 'Jurídico',
    icon: 'pi pi-briefcase',
    description: 'Consultas legales, contratos, procesos y asesorías.',
    group: 'SERVICIOS',
    nameLabel: 'Servicio legal',
    namePlaceholder: 'Ej. Asesoría laboral empresarial mensual',
    priceLabel: 'Honorario base',
    priceHelp: 'Indica si corresponde a consulta, etapa, mensualidad o proceso completo.',
    descriptionPlaceholder:
      'Describe alcance profesional, documentos incluidos, etapas y exclusiones.',
    fields: [
      {
        key: 'materia',
        label: 'Materia legal',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Civil',
          'Laboral',
          'Corporativo',
          'Tributario',
          'Penal',
          'Familia',
          'Administrativo',
          'Otro',
        ],
      },
      {
        key: 'tipoServicio',
        label: 'Tipo de servicio',
        placeholder: 'Consulta, contrato, proceso...',
        required: true,
      },
      { key: 'jurisdiccion', label: 'Jurisdicción', placeholder: 'Ciudad, país o entidad' },
      {
        key: 'modalidad',
        label: 'Modalidad',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Presencial', 'Remoto', 'Mixto'],
      },
      { key: 'plazoEstimado', label: 'Plazo estimado', placeholder: '15 días, por etapa...' },
      {
        key: 'incluyeRepresentacion',
        label: 'Incluye representación',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'CONSULTORIA',
    label: 'Consultoría',
    icon: 'pi pi-compass',
    description: 'Diagnóstico, auditoría, asesoría o mejora de procesos.',
    group: 'SERVICIOS',
    nameLabel: 'Servicio de consultoría',
    namePlaceholder: 'Ej. Diagnóstico y mejora del proceso comercial',
    priceLabel: 'Honorario o presupuesto base',
    priceHelp: 'Registra el valor del diagnóstico, paquete o proyecto completo.',
    descriptionPlaceholder: 'Explica problema abordado, metodología, entregables y acompañamiento.',
    fields: [
      {
        key: 'area',
        label: 'Área de consultoría',
        placeholder: 'Procesos, ventas, finanzas...',
        required: true,
      },
      {
        key: 'modalidad',
        label: 'Modalidad',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Presencial', 'Remoto', 'Híbrido'],
      },
      {
        key: 'alcance',
        label: 'Alcance',
        placeholder: 'Diagnóstico, diseño e implementación',
        type: 'textarea',
        required: true,
        wide: true,
      },
      { key: 'entregables', label: 'Entregables', placeholder: 'Informe, plan, talleres...' },
      { key: 'duracion', label: 'Duración', placeholder: '4 semanas' },
    ],
  },
  {
    value: 'CURSO',
    label: 'Curso',
    icon: 'pi pi-graduation-cap',
    description: 'Cursos, diplomados, talleres y capacitaciones.',
    group: 'PERSONAS',
    nameLabel: 'Curso o programa',
    namePlaceholder: 'Ej. Curso de Excel avanzado',
    priceLabel: 'Precio de matrícula o programa',
    priceHelp: 'Indica el costo total; las cuotas pueden detallarse en la descripción.',
    descriptionPlaceholder: 'Resume objetivos, contenido, público, materiales y certificación.',
    fields: [
      {
        key: 'area',
        label: 'Área temática',
        placeholder: 'Ofimática, ventas, tecnología...',
        required: true,
      },
      { key: 'duracion', label: 'Duración', placeholder: '40 horas, 3 meses', required: true },
      {
        key: 'modalidad',
        label: 'Modalidad',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Virtual', 'Presencial', 'Híbrido', 'Autoguiado'],
      },
      { key: 'horario', label: 'Horario', placeholder: 'Sábados, noche, flexible' },
      { key: 'fechaInicio', label: 'Fecha de inicio', placeholder: '', type: 'date' },
      {
        key: 'certificacion',
        label: 'Incluye certificación',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'EDUCACION',
    label: 'Educación',
    icon: 'pi pi-book',
    description: 'Admisiones, carreras, academias y programas educativos.',
    group: 'PERSONAS',
    nameLabel: 'Programa educativo',
    namePlaceholder: 'Ej. Diplomado en gestión comercial',
    priceLabel: 'Matrícula, pensión o precio base',
    priceHelp: 'Indica el importe principal y detalla periodicidad y cuotas.',
    descriptionPlaceholder:
      'Describe plan formativo, requisitos de ingreso, certificación y beneficios.',
    fields: [
      {
        key: 'programa',
        label: 'Tipo de programa',
        placeholder: 'Carrera, diplomado, academia...',
        required: true,
      },
      { key: 'nivel', label: 'Nivel', placeholder: 'Inicial, básico, avanzado...' },
      {
        key: 'modalidad',
        label: 'Modalidad',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Virtual', 'Presencial', 'Híbrido'],
      },
      { key: 'duracion', label: 'Duración', placeholder: '6 meses, 5 años' },
      { key: 'horario', label: 'Horario / turno', placeholder: 'Mañana, noche, flexible' },
      { key: 'fechaInicio', label: 'Próximo inicio', placeholder: '', type: 'date' },
    ],
  },
  {
    value: 'CLINICA',
    label: 'Clínica',
    icon: 'pi pi-heart',
    description: 'Consultas, tratamientos, evaluaciones y paquetes de salud.',
    group: 'PERSONAS',
    nameLabel: 'Servicio médico o paquete',
    namePlaceholder: 'Ej. Evaluación odontológica integral',
    priceLabel: 'Precio de consulta o tratamiento',
    priceHelp: 'Usa un valor referencial cuando el precio dependa de evaluación.',
    descriptionPlaceholder:
      'Describe qué incluye el servicio, duración, preparación y restricciones generales.',
    fields: [
      {
        key: 'especialidad',
        label: 'Especialidad',
        placeholder: 'Dental, dermatología...',
        required: true,
      },
      {
        key: 'tipoAtencion',
        label: 'Tipo de atención',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Consulta', 'Evaluación', 'Tratamiento', 'Procedimiento', 'Paquete', 'Control'],
      },
      {
        key: 'tratamiento',
        label: 'Tratamiento / servicio',
        placeholder: 'Nombre del procedimiento',
      },
      { key: 'sede', label: 'Sede', placeholder: 'Sede centro, norte...' },
      { key: 'duracion', label: 'Duración aproximada', placeholder: '45 minutos, 3 sesiones' },
      {
        key: 'requiereEvaluacion',
        label: 'Requiere evaluación previa',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'SEGURO',
    label: 'Seguro',
    icon: 'pi pi-shield',
    description: 'Pólizas, renovaciones, coberturas y evaluación de riesgo.',
    group: 'PERSONAS',
    nameLabel: 'Plan o póliza',
    namePlaceholder: 'Ej. Seguro vehicular todo riesgo',
    priceLabel: 'Prima referencial',
    priceHelp: 'Indica la prima del periodo; el valor final puede depender del riesgo.',
    descriptionPlaceholder: 'Resume coberturas, exclusiones, deducibles, asistencia y condiciones.',
    fields: [
      {
        key: 'tipoSeguro',
        label: 'Tipo de seguro',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Vehicular', 'Salud', 'Vida', 'Hogar', 'Empresarial', 'Viaje', 'Otro'],
      },
      {
        key: 'cobertura',
        label: 'Plan / cobertura',
        placeholder: 'Todo riesgo, básico, premium',
        required: true,
      },
      { key: 'vigencia', label: 'Vigencia', placeholder: 'Mensual, 1 año' },
      {
        key: 'sumaAsegurada',
        label: 'Suma asegurada referencial',
        placeholder: '0.00',
        type: 'number',
        min: 0,
        step: 0.01,
      },
      {
        key: 'requiereEvaluacion',
        label: 'Requiere evaluación de riesgo',
        placeholder: 'Selecciona',
        type: 'select',
        options: yesNoOptions,
      },
    ],
  },
  {
    value: 'TURISMO',
    label: 'Turismo',
    icon: 'pi pi-map',
    description: 'Paquetes, tours, reservas y experiencias de viaje.',
    group: 'PERSONAS',
    nameLabel: 'Paquete o experiencia',
    namePlaceholder: 'Ej. Cusco clásico 4 días / 3 noches',
    priceLabel: 'Precio por persona o paquete',
    priceHelp: 'Aclara la base del precio y la ocupación considerada.',
    descriptionPlaceholder:
      'Describe itinerario, alojamiento, traslados, comidas, entradas y exclusiones.',
    fields: [
      {
        key: 'tipoPaquete',
        label: 'Tipo de oferta',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Paquete', 'Tour', 'Hospedaje', 'Traslado', 'Experiencia', 'Circuito'],
      },
      { key: 'destino', label: 'Destino', placeholder: 'Cusco, Cancún, Europa...', required: true },
      { key: 'diasNoches', label: 'Duración', placeholder: '4 días / 3 noches' },
      {
        key: 'personasBase',
        label: 'Personas incluidas',
        placeholder: '2',
        type: 'number',
        min: 1,
      },
      { key: 'fechaDisponible', label: 'Fecha disponible', placeholder: '', type: 'date' },
      {
        key: 'incluye',
        label: 'Incluye',
        placeholder: 'Hotel, traslados, desayunos...',
        wide: true,
      },
    ],
  },
  {
    value: 'HOSPITALIDAD',
    label: 'Hospitalidad',
    icon: 'pi pi-building-columns',
    description: 'Hoteles, restaurantes, eventos y reservas.',
    group: 'PERSONAS',
    nameLabel: 'Servicio de hospitalidad',
    namePlaceholder: 'Ej. Salón corporativo para 80 personas',
    priceLabel: 'Tarifa de reserva o servicio',
    priceHelp: 'Indica la tarifa base por noche, persona, mesa o evento.',
    descriptionPlaceholder:
      'Describe capacidad, ambientes, alimentación, equipamiento y políticas de reserva.',
    fields: [
      {
        key: 'servicio',
        label: 'Tipo de servicio',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['Habitación', 'Restaurante', 'Evento', 'Salón', 'Catering', 'Experiencia'],
      },
      { key: 'categoria', label: 'Categoría / ambiente', placeholder: 'Suite, salón principal...' },
      { key: 'capacidad', label: 'Capacidad', placeholder: '20', type: 'number', min: 1 },
      { key: 'nochesMinimas', label: 'Noches mínimas', placeholder: '1', type: 'number', min: 1 },
      { key: 'fechaDisponible', label: 'Disponible desde', placeholder: '', type: 'date' },
      {
        key: 'incluye',
        label: 'Servicios incluidos',
        placeholder: 'Desayuno, equipos, estacionamiento...',
        wide: true,
      },
    ],
  },
  {
    value: 'FINANCIERO',
    label: 'Financiero',
    icon: 'pi pi-wallet',
    description: 'Créditos, inversiones, factoring y productos financieros.',
    group: 'INFRAESTRUCTURA',
    nameLabel: 'Producto financiero',
    namePlaceholder: 'Ej. Crédito empresarial capital de trabajo',
    priceLabel: 'Monto o comisión referencial',
    priceHelp: 'Usa este campo para el monto principal o comisión base y detállalo claramente.',
    descriptionPlaceholder:
      'Explica destino, perfil, condiciones, costos, evaluación y desembolso.',
    fields: [
      {
        key: 'productoFinanciero',
        label: 'Tipo de producto',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Crédito',
          'Factoring',
          'Leasing',
          'Inversión',
          'Cuenta',
          'Seguro financiero',
          'Otro',
        ],
      },
      {
        key: 'moneda',
        label: 'Moneda',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: ['PEN', 'USD', 'EUR', 'Otra'],
      },
      {
        key: 'montoMinimo',
        label: 'Monto mínimo',
        placeholder: '0.00',
        type: 'number',
        min: 0,
        step: 0.01,
      },
      {
        key: 'montoMaximo',
        label: 'Monto máximo',
        placeholder: '0.00',
        type: 'number',
        min: 0,
        step: 0.01,
      },
      { key: 'plazo', label: 'Plazo', placeholder: '12 meses' },
      {
        key: 'tasaReferencial',
        label: 'Tasa referencial (%)',
        placeholder: '0.00',
        type: 'number',
        min: 0,
        step: 0.01,
      },
      {
        key: 'requisitos',
        label: 'Requisitos principales',
        placeholder: 'Antigüedad, ventas, garantías...',
        type: 'textarea',
        wide: true,
      },
    ],
  },
  {
    value: 'TELECOMUNICACION',
    label: 'Telecomunicaciones',
    icon: 'pi pi-wifi',
    description: 'Internet, telefonía, enlaces, equipos y conectividad.',
    group: 'INFRAESTRUCTURA',
    nameLabel: 'Plan o servicio de telecomunicaciones',
    namePlaceholder: 'Ej. Internet empresarial fibra 500 Mbps',
    priceLabel: 'Renta mensual o precio base',
    priceHelp: 'Incluye solo la renta; instalación y equipos pueden detallarse aparte.',
    descriptionPlaceholder: 'Describe velocidad, SLA, instalación, equipos, soporte y permanencia.',
    fields: [
      {
        key: 'servicio',
        label: 'Tipo de servicio',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Internet',
          'Telefonía',
          'Enlace dedicado',
          'Central virtual',
          'Equipos',
          'Soporte',
        ],
      },
      {
        key: 'tecnologia',
        label: 'Tecnología',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Fibra óptica', 'Radioenlace', '4G/5G', 'Satelital', 'Cobre', 'Otra'],
      },
      { key: 'velocidad', label: 'Velocidad / capacidad', placeholder: '500 Mbps' },
      {
        key: 'cobertura',
        label: 'Zona de cobertura',
        placeholder: 'Dirección, ciudad o región',
        required: true,
      },
      { key: 'equipos', label: 'Equipos incluidos', placeholder: 'Router, teléfonos, antena...' },
      { key: 'permanencia', label: 'Permanencia', placeholder: '12 meses' },
    ],
  },
  {
    value: 'ENERGIA',
    label: 'Energía',
    icon: 'pi pi-bolt',
    description: 'Sistemas solares, eléctricos y eficiencia energética.',
    group: 'INFRAESTRUCTURA',
    nameLabel: 'Solución energética',
    namePlaceholder: 'Ej. Sistema solar on-grid de 10 kWp',
    priceLabel: 'Precio o presupuesto base',
    priceHelp: 'Registra el valor estimado de suministro e instalación.',
    descriptionPlaceholder:
      'Describe dimensionamiento, equipos, instalación, ahorro esperado y garantía.',
    fields: [
      {
        key: 'solucion',
        label: 'Tipo de solución',
        placeholder: 'Selecciona',
        type: 'select',
        required: true,
        options: [
          'Solar fotovoltaica',
          'Sistema eléctrico',
          'Mantenimiento',
          'Auditoría energética',
          'Respaldo / UPS',
          'Otro',
        ],
      },
      { key: 'tipoSistema', label: 'Configuración', placeholder: 'On-grid, off-grid, híbrido...' },
      { key: 'potencia', label: 'Potencia', placeholder: '10 kWp, 50 kVA' },
      { key: 'consumoObjetivo', label: 'Consumo objetivo', placeholder: 'kWh por mes' },
      {
        key: 'modalidad',
        label: 'Modalidad comercial',
        placeholder: 'Selecciona',
        type: 'select',
        options: ['Venta', 'Proyecto llave en mano', 'Servicio', 'Alquiler'],
      },
      { key: 'garantia', label: 'Garantía', placeholder: '5 años instalación, 25 paneles...' },
    ],
  },
  {
    value: 'OTRO',
    label: 'Otro',
    icon: 'pi pi-objects-column',
    description: 'Una oferta comercial que no encaja en los rubros anteriores.',
    group: 'OTROS',
    nameLabel: 'Nombre de la oferta',
    namePlaceholder: 'Ej. Solución comercial personalizada',
    priceLabel: 'Precio o monto referencial',
    priceHelp: 'Usa 0 cuando el valor se defina después de evaluar el requerimiento.',
    descriptionPlaceholder:
      'Describe claramente qué se vende, a quién está dirigido y qué incluye.',
    fields: [
      { key: 'categoria', label: 'Categoría', placeholder: 'Tipo de oferta', required: true },
      {
        key: 'modalidad',
        label: 'Modalidad de entrega',
        placeholder: 'Venta, alquiler, suscripción...',
      },
      {
        key: 'detalle',
        label: 'Características principales',
        placeholder: 'Información necesaria para vender esta oferta',
        type: 'textarea',
        required: true,
        wide: true,
      },
      { key: 'unidad', label: 'Unidad comercial', placeholder: 'Unidad, paquete, mensualidad...' },
      { key: 'plazo', label: 'Plazo o vigencia', placeholder: 'Entrega inmediata, 30 días...' },
    ],
  },
] as const;

export function catalogRegistrationType(type: CatalogOpportunityType): CatalogRegistrationType {
  return (
    CATALOG_REGISTRATION_TYPES.find((item) => item.value === type) ?? CATALOG_REGISTRATION_TYPES[0]
  );
}

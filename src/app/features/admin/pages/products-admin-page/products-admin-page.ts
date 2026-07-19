import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

import { LowStockAlertService } from '@core/services/low-stock-alert.service';
import {
  AdminSaasApiService,
  Almacen,
  CategoriaProducto,
  Producto,
} from '../../data/admin-saas-api.service';

interface ProductoForm {
  id: number | null;
  codigo: string;
  codigoBarras: string;
  sku: string;
  nombre: string;
  descripcion: string;
  categoriaId: number | null;
  marcaId: number | null;
  unidadMedidaId: number | null;
  tipoProducto: 'PRODUCTO' | 'SERVICIO';
  costoPromedio: number;
  afectoIgv: boolean;
  usaConfiguracionEmpresa: boolean;
  tipoAfectacionIgvId: string;
  tributoId: string;
  porcentajeImpuesto: number;
  stock: boolean;
  lotes: boolean;
  vencimiento: boolean;
  stockMinimo: number;
  foto: string;
  precio: number;
  almacenId: number | null;
  activo: boolean;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-products-admin-page',
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  templateUrl: './products-admin-page.html',
  styleUrl: './products-admin-page.scss',
})
export class ProductsAdminPage {
  private readonly api = inject(AdminSaasApiService);
  private readonly router = inject(Router);
  private readonly lowStockAlerts = inject(LowStockAlertService);

  protected readonly almacenes = signal<Almacen[]>([]);
  protected readonly productos = signal<Producto[]>([]);
  protected readonly categorias = signal<CategoriaProducto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly productSearch = signal('');
  protected readonly productDialogVisible = signal(false);
  protected readonly advancedFieldsVisible = signal(false);
  protected readonly selectedPhotoName = signal<string | null>(null);

  protected productForm: ProductoForm = {
    id: null,
    codigo: '',
    codigoBarras: '',
    sku: '',
    nombre: '',
    descripcion: '',
    categoriaId: null,
    marcaId: null,
    unidadMedidaId: null,
    tipoProducto: 'PRODUCTO',
    costoPromedio: 0,
    afectoIgv: true,
    usaConfiguracionEmpresa: true,
    tipoAfectacionIgvId: '10',
    tributoId: '1000',
    porcentajeImpuesto: 18,
    stock: true,
    lotes: false,
    vencimiento: false,
    stockMinimo: 5,
    foto: '',
    precio: 0,
    almacenId: null,
    activo: true,
  };

  protected readonly almacenOptions = computed(() =>
    this.almacenes().map((almacen) => ({
      label: `${almacen.codigo} - ${almacen.nombre}`,
      value: almacen.id,
    })),
  );

  protected readonly tipoProductoOptions = computed(() => [
    { label: 'Producto', value: 'PRODUCTO' as const },
    { label: 'Servicio', value: 'SERVICIO' as const },
  ]);

  protected readonly categoriaOptions = computed(() =>
    this.categorias().map((categoria) => ({
      label: categoria.nombre,
      value: categoria.id,
    })),
  );

  protected readonly unidadMedidaOptions = computed(() => [
    { label: 'NIU - Unidad (por defecto)', value: null },
    { label: 'NIU - Unidad', value: 1 },
    { label: 'KGM - Kilogramo', value: 2 },
    { label: 'LTR - Litro', value: 3 },
    { label: 'BX - Caja', value: 4 },
    { label: 'PK - Paquete', value: 5 },
    { label: 'MTR - Metro', value: 6 },
  ]);

  protected readonly afectacionOptions = [
    { label: '10 - Gravado', value: '10' },
    { label: '20 - Exonerado', value: '20' },
    { label: '30 - Inafecto', value: '30' },
    { label: '40 - Exportacion', value: '40' },
  ];

  protected readonly tributoOptions = [
    { label: '1000 - IGV', value: '1000' },
    { label: '9997 - Exonerado', value: '9997' },
    { label: '9998 - Inafecto', value: '9998' },
  ];

  protected readonly filteredProductos = computed(() => {
    const term = this.productSearch().trim().toLowerCase();
    if (!term) {
      return this.productos();
    }

    return this.productos().filter(
      (item) =>
        String(item.codigo || '')
          .toLowerCase()
          .includes(term) ||
        String(item.codigoBarras || '')
          .toLowerCase()
          .includes(term) ||
        item.sku.toLowerCase().includes(term) ||
        item.nombre.toLowerCase().includes(term) ||
        String(item.unidadMedidaId || '')
          .toLowerCase()
          .includes(term),
    );
  });

  protected readonly productStats = computed(() => {
    const productos = this.productos();
    return {
      total: productos.length,
      active: productos.filter((item) => item.activo).length,
      products: productos.filter((item) => item.tipoProducto !== 'SERVICIO').length,
      services: productos.filter((item) => item.tipoProducto === 'SERVICIO').length,
      lowStock: productos.filter((item) => this.isLowStock(item)).length,
    };
  });

  constructor() {
    this.loadData();
  }

  protected loadData(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    forkJoin({
      productos: this.api.listProductos(),
      almacenes: this.api.listAlmacenes(),
      categorias: this.api.listCategoriasProducto(),
    })
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: ({ productos, almacenes, categorias }) => {
          this.productos.set(productos);
          this.almacenes.set(almacenes);
          this.categorias.set(categorias);
          this.lowStockAlerts.refresh(false);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected setProductSearch(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.productSearch.set(input?.value ?? '');
  }

  protected openCreateProductDialog(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.advancedFieldsVisible.set(false);
    this.selectedPhotoName.set(null);
    this.productForm = {
      id: null,
      codigo: '',
      codigoBarras: '',
      sku: '',
      nombre: '',
      descripcion: '',
      categoriaId: null,
      marcaId: null,
      unidadMedidaId: null,
      tipoProducto: 'PRODUCTO',
      costoPromedio: 0,
      afectoIgv: true,
      usaConfiguracionEmpresa: true,
      tipoAfectacionIgvId: '10',
      tributoId: '1000',
      porcentajeImpuesto: 18,
      stock: true,
      lotes: false,
      vencimiento: false,
      stockMinimo: 5,
      foto: '',
      precio: 0,
      almacenId: this.almacenes()[0]?.id ?? null,
      activo: true,
    };
    this.productDialogVisible.set(true);
  }

  protected openEditProductDialog(producto: Producto): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.selectedPhotoName.set(null);
    this.advancedFieldsVisible.set(
      Boolean(producto.codigo || producto.codigoBarras || producto.categoriaId || producto.marcaId),
    );
    this.productForm = {
      id: producto.id,
      codigo: producto.codigo || '',
      codigoBarras: producto.codigoBarras || '',
      sku: producto.sku,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      categoriaId: producto.categoriaId ?? null,
      marcaId: producto.marcaId ?? null,
      unidadMedidaId: producto.unidadMedidaId ?? null,
      tipoProducto: producto.tipoProducto === 'SERVICIO' ? 'SERVICIO' : 'PRODUCTO',
      costoPromedio: Number(producto.costoPromedio ?? producto.precioCompraBase ?? 0),
      afectoIgv: producto.afectoIgv ?? true,
      usaConfiguracionEmpresa: producto.usaConfiguracionEmpresa ?? true,
      tipoAfectacionIgvId: producto.tipoAfectacionIgvId || '10',
      tributoId: producto.tributoId || '1000',
      porcentajeImpuesto: Number(producto.porcentajeImpuesto ?? 18),
      stock: producto.stock ?? producto.manejaStock ?? true,
      lotes: producto.lotes ?? producto.manejaLotes ?? false,
      vencimiento: producto.vencimiento ?? producto.manejaVencimiento ?? false,
      stockMinimo: Number(producto.stockMinimo ?? producto.stockMinimoGlobal ?? 0),
      foto: producto.foto || producto.imagenUrl || '',
      precio: Number(producto.precio),
      almacenId: producto.almacenId,
      activo: producto.activo,
    };
    this.productDialogVisible.set(true);
  }

  protected saveProducto(): void {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);

    const nombre = this.productForm.nombre.trim();
    const precio = this.normalizeNumber(this.productForm.precio);
    const precioCompraBase = this.normalizeNumber(this.productForm.costoPromedio);
    const stockMinimo = this.normalizeNumber(this.productForm.stockMinimo);
    const manejaStock = this.productForm.tipoProducto !== 'SERVICIO';
    if (!nombre) {
      this.errorMessage.set('Completa el nombre del producto.');
      return;
    }
    if (manejaStock && !this.productForm.categoriaId) {
      this.errorMessage.set('Selecciona la categoria del producto.');
      return;
    }

    if (stockMinimo < 0) {
      this.errorMessage.set('El stock minimo no puede ser negativo.');
      return;
    }
    if (
      !this.productForm.usaConfiguracionEmpresa &&
      (this.productForm.porcentajeImpuesto < 0 || this.productForm.porcentajeImpuesto > 100)
    ) {
      this.errorMessage.set('El porcentaje tributario debe estar entre 0 y 100.');
      return;
    }

    this.saving.set(true);
    if (this.productForm.id) {
      this.api
        .updateProducto(this.productForm.id, {
          nombre,
          precio,
          activo: this.productForm.activo,
          codigo: this.productForm.codigo.trim() || null,
          codigoBarras: this.productForm.codigoBarras.trim() || null,
          descripcion: this.productForm.descripcion.trim() || null,
          categoriaId: this.productForm.categoriaId || null,
          marcaId: this.productForm.marcaId || null,
          unidadMedidaId: this.productForm.unidadMedidaId || null,
          tipoProducto: this.productForm.tipoProducto,
          costoPromedio: precioCompraBase,
          precioCompraBase,
          precioVentaBase: precio,
          afectoIgv: this.productForm.afectoIgv,
          usaConfiguracionEmpresa: this.productForm.usaConfiguracionEmpresa,
          tipoAfectacionIgvId: this.productForm.tipoAfectacionIgvId,
          tributoId: this.productForm.tributoId,
          porcentajeImpuesto: this.productForm.porcentajeImpuesto,
          stock: manejaStock,
          lotes: this.productForm.lotes,
          vencimiento: this.productForm.vencimiento,
          stockMinimo,
          foto: this.productForm.foto.trim() || null,
          estado: this.productForm.activo ? 'ACTIVO' : 'INACTIVO',
        })
        .pipe(finalize(() => this.saving.set(false)))
        .subscribe({
          next: () => {
            this.productDialogVisible.set(false);
            this.successMessage.set('Producto actualizado correctamente.');
            this.loadData();
            this.lowStockAlerts.refresh(true);
          },
          error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
        });
      return;
    }

    const sku = this.productForm.sku.trim().toUpperCase();
    if (!sku || !this.productForm.almacenId) {
      this.saving.set(false);
      this.errorMessage.set(
        'Completa SKU y registra al menos un almacen antes de crear productos.',
      );
      return;
    }
    const codigo = (this.productForm.codigo.trim() || sku).toUpperCase();
    const skuDuplicado = this.productos().some(
      (producto) => producto.sku.trim().toUpperCase() === sku,
    );
    if (skuDuplicado) {
      this.saving.set(false);
      this.errorMessage.set(`Ya existe un producto con el SKU ${sku}.`);
      return;
    }
    const codigoDuplicado = this.productos().some(
      (producto) => (producto.codigo || '').trim().toUpperCase() === codigo,
    );
    if (codigoDuplicado) {
      this.saving.set(false);
      this.errorMessage.set(`Ya existe un producto con el codigo ${codigo}.`);
      return;
    }

    this.api
      .createProducto({
        sku,
        nombre,
        precio,
        almacenId: this.productForm.almacenId,
        codigo,
        codigoBarras: this.productForm.codigoBarras.trim() || null,
        descripcion: this.productForm.descripcion.trim() || null,
        categoriaId: this.productForm.categoriaId || null,
        marcaId: this.productForm.marcaId || null,
        unidadMedidaId: this.productForm.unidadMedidaId || null,
        tipoProducto: this.productForm.tipoProducto,
        costoPromedio: precioCompraBase,
        precioCompraBase,
        precioVentaBase: precio,
        afectoIgv: this.productForm.afectoIgv,
        usaConfiguracionEmpresa: this.productForm.usaConfiguracionEmpresa,
        tipoAfectacionIgvId: this.productForm.tipoAfectacionIgvId,
        tributoId: this.productForm.tributoId,
        porcentajeImpuesto: this.productForm.porcentajeImpuesto,
        stock: this.productForm.tipoProducto !== 'SERVICIO',
        lotes: this.productForm.vencimiento || this.productForm.lotes,
        vencimiento: this.productForm.vencimiento,
        stockMinimo,
        foto: this.productForm.foto.trim() || null,
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.productDialogVisible.set(false);
          this.successMessage.set(
            'Producto creado correctamente. Se activo el control de stock bajo.',
          );
          this.loadData();
          this.lowStockAlerts.refresh(true);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected toggleProductoActivo(producto: Producto): void {
    if (this.saving()) {
      return;
    }

    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.saving.set(true);
    this.api
      .updateProducto(producto.id, {
        nombre: producto.nombre,
        precio: Number(producto.precio),
        activo: !producto.activo,
        codigo: producto.codigo || null,
        codigoBarras: producto.codigoBarras || null,
        descripcion: producto.descripcion || null,
        categoriaId: producto.categoriaId || null,
        marcaId: producto.marcaId || null,
        unidadMedidaId: producto.unidadMedidaId || null,
        tipoProducto: producto.tipoProducto || 'PRODUCTO',
        costoPromedio: Number(producto.costoPromedio ?? producto.precioCompraBase ?? 0),
        precioCompraBase: Number(producto.precioCompraBase ?? producto.costoPromedio ?? 0),
        precioVentaBase: Number(producto.precioVentaBase ?? producto.precio),
        afectoIgv: producto.afectoIgv ?? true,
        usaConfiguracionEmpresa: producto.usaConfiguracionEmpresa ?? true,
        tipoAfectacionIgvId: producto.tipoAfectacionIgvId || '10',
        tributoId: producto.tributoId || '1000',
        porcentajeImpuesto: Number(producto.porcentajeImpuesto ?? 18),
        stock: producto.stock ?? producto.manejaStock ?? true,
        lotes: producto.lotes ?? producto.manejaLotes ?? false,
        vencimiento: producto.vencimiento ?? producto.manejaVencimiento ?? false,
        stockMinimo: Number(producto.stockMinimo ?? producto.stockMinimoGlobal ?? 0),
        foto: producto.foto || producto.imagenUrl || null,
        estado: producto.activo ? 'INACTIVO' : 'ACTIVO',
      })
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.successMessage.set(
            `Producto ${producto.activo ? 'desactivado' : 'activado'} correctamente.`,
          );
          this.loadData();
          this.lowStockAlerts.refresh(true);
        },
        error: (error: unknown) => this.errorMessage.set(this.resolveError(error)),
      });
  }

  protected statusSeverity(active: boolean): 'success' | 'danger' {
    return active ? 'success' : 'danger';
  }

  protected unidadLabel(producto: Producto): string {
    return this.resolveUnidadLabel(producto.unidadMedidaId ?? null);
  }

  protected categoriaLabel(producto: Producto): string {
    return (
      this.categorias().find((categoria) => categoria.id === producto.categoriaId)?.nombre ||
      'Sin categoria'
    );
  }

  protected onTipoProductoChange(tipo: 'PRODUCTO' | 'SERVICIO'): void {
    this.productForm.tipoProducto = tipo;
    if (tipo === 'SERVICIO') {
      this.productForm.vencimiento = false;
      this.productForm.lotes = false;
      this.productForm.stockMinimo = 0;
      this.productForm.categoriaId =
        this.categorias().find((categoria) => categoria.nombre === 'Servicios')?.id ?? null;
    } else if (this.productForm.stockMinimo <= 0) {
      this.productForm.stockMinimo = 5;
    }
  }

  protected isLowStock(producto: Producto): boolean {
    if (
      producto.tipoProducto === 'SERVICIO' ||
      producto.manejaStock === false ||
      producto.stock === false ||
      !producto.activo
    ) {
      return false;
    }
    return (
      Number(producto.stockCantidad || 0) <=
      Number(producto.stockMinimo ?? producto.stockMinimoGlobal ?? 0)
    );
  }

  protected isOutOfStock(producto: Producto): boolean {
    return this.isLowStock(producto) && Number(producto.stockCantidad || 0) <= 0;
  }

  protected stockStatus(producto: Producto): string {
    if (
      producto.tipoProducto === 'SERVICIO' ||
      producto.manejaStock === false ||
      producto.stock === false
    ) {
      return 'No aplica';
    }
    if (this.isOutOfStock(producto)) {
      return 'Sin stock';
    }
    if (this.isLowStock(producto)) {
      return 'Stock bajo';
    }
    return 'Disponible';
  }

  protected stockSeverity(producto: Producto): 'secondary' | 'success' | 'warn' | 'danger' {
    if (this.isOutOfStock(producto)) {
      return 'danger';
    }
    if (this.isLowStock(producto)) {
      return 'warn';
    }
    return producto.tipoProducto === 'SERVICIO' ? 'secondary' : 'success';
  }

  protected onVencimientoChange(enabled: boolean): void {
    this.productForm.vencimiento = enabled;
    if (enabled) {
      this.productForm.lotes = true;
    }
  }

  protected onProductAfectacionChange(value: string): void {
    this.productForm.tipoAfectacionIgvId = value;
    if (value === '20') {
      this.productForm.afectoIgv = false;
      this.productForm.tributoId = '9997';
      this.productForm.porcentajeImpuesto = 0;
    } else if (value === '30') {
      this.productForm.afectoIgv = false;
      this.productForm.tributoId = '9998';
      this.productForm.porcentajeImpuesto = 0;
    } else if (value === '10') {
      this.productForm.afectoIgv = true;
      this.productForm.tributoId = '1000';
      if (this.productForm.porcentajeImpuesto === 0) {
        this.productForm.porcentajeImpuesto = 18;
      }
    }
  }

  protected goToInventory(producto?: Producto): void {
    const queryParams = producto ? { productoId: producto.id } : undefined;
    void this.router.navigate(['/admin/inventarios'], { queryParams });
  }

  protected onFotoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecciona una imagen valida para la foto del producto.');
      if (input) {
        input.value = '';
      }
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set('La foto del producto no debe superar 2 MB.');
      if (input) {
        input.value = '';
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.productForm.foto = String(reader.result || '');
      this.selectedPhotoName.set(file.name);
      this.errorMessage.set(null);
    };
    reader.onerror = () => this.errorMessage.set('No se pudo leer la foto seleccionada.');
    reader.readAsDataURL(file);
  }

  protected fotoPreview(): string | null {
    const value = this.productForm.foto.trim();
    return value ? value : null;
  }

  private resolveUnidadLabel(unidadMedidaId: number | null): string {
    const option = this.unidadMedidaOptions().find((item) => item.value === unidadMedidaId);
    if (option) {
      return option.label.replace(' (por defecto)', '');
    }

    return unidadMedidaId ? `Unidad #${unidadMedidaId}` : 'NIU - Unidad';
  }

  private normalizeNumber(value: number): number {
    const parsed = Number(value || 0);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private resolveError(error: unknown): string {
    if (typeof error === 'object' && error !== null) {
      const httpError = error as {
        status?: number;
        error?: { message?: string; details?: string[] };
      };
      if (httpError.status === 403) {
        return 'No tienes permisos de productos. Solicita rol ADMIN o SALES en este tenant.';
      }
      if (httpError.status === 500) {
        return 'No se pudo completar la operacion en este momento. Intenta nuevamente.';
      }

      if (!('error' in httpError)) {
        return 'No se pudo completar la operacion.';
      }

      const apiError = httpError.error;
      return apiError?.details?.[0] || apiError?.message || 'No se pudo completar la operacion.';
    }
    return 'No se pudo completar la operacion.';
  }
}

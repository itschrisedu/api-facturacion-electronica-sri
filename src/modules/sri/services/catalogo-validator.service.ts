import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';

/**
 * Tarifa de impuesto del catálogo
 */
export interface TarifaImpuesto {
  codigo_porcentaje: string;
  descripcion: string;
  porcentaje: number;
  impuesto_codigo: string;
  impuesto_nombre: string;
}

/**
 * Código de retención del catálogo
 */
export interface CodigoRetencion {
  tipo: string;
  codigo: string;
  descripcion: string;
  porcentaje: number;
}

/**
 * Forma de pago del catálogo
 */
export interface FormaPago {
  codigo: string;
  descripcion: string;
}

/**
 * Tipo de identificación del catálogo
 */
export interface TipoIdentificacion {
  codigo: string;
  descripcion: string;
  longitud: number | null;
  regex_validacion: string | null;
}

/**
 * Documento sustento del catálogo
 */
export interface DocumentoSustento {
  codigo: string;
  descripcion: string;
}

/**
 * Motivo traslado del catálogo
 */
export interface MotivoTraslado {
  codigo: string;
  descripcion: string;
}

/**
 * Servicio para validar códigos contra los catálogos almacenados en base de datos
 */
@Injectable()
export class CatalogoValidatorService {
  private readonly logger = new Logger(CatalogoValidatorService.name);

  // Caches para evitar consultas repetitivas
  private tarifasCache: Map<string, TarifaImpuesto> = new Map();
  private retencionesCache: Map<string, CodigoRetencion> = new Map();
  private formasPagoCache: Map<string, FormaPago> = new Map();
  private tiposIdentificacionCache: Map<string, TipoIdentificacion> = new Map();
  private documentosSustentoCache: Map<string, DocumentoSustento> = new Map();
  private motivosTrasladoCache: Map<string, MotivoTraslado> = new Map();

  private cacheExpiry: number = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
  private loadingPromise: Promise<void> | null = null; // FIX P7: Semáforo anti-carga paralela

  constructor(private readonly db: DatabaseService) {}

  // =====================================================
  // VALIDACIONES DE IMPUESTOS
  // =====================================================

  async validateImpuesto(
    codigoImpuesto: string,
    codigoPorcentaje: string,
  ): Promise<{ valid: boolean; tarifa?: TarifaImpuesto; error?: string }> {
    await this.refreshCacheIfNeeded();

    const key = `${codigoImpuesto}-${codigoPorcentaje}`;
    const tarifa = this.tarifasCache.get(key);

    if (!tarifa) {
      return {
        valid: false,
        error: `Código de impuesto ${codigoImpuesto} con tarifa ${codigoPorcentaje} no encontrado en catálogo`,
      };
    }

    return { valid: true, tarifa };
  }

  async validateImpuestos(
    impuestos: Array<{ codigo: string; codigoPorcentaje: string }>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const imp of impuestos) {
      const result = await this.validateImpuesto(
        imp.codigo,
        imp.codigoPorcentaje,
      );
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // =====================================================
  // VALIDACIONES DE RETENCIONES
  // =====================================================

  async validateRetencion(
    tipo: string,
    codigo: string,
  ): Promise<{ valid: boolean; retencion?: CodigoRetencion; error?: string }> {
    await this.refreshCacheIfNeeded();

    const key = `${tipo}-${codigo}`;
    const retencion = this.retencionesCache.get(key);

    if (!retencion) {
      return {
        valid: false,
        error: `Código de retención ${codigo} de tipo ${tipo} no encontrado en catálogo`,
      };
    }

    return { valid: true, retencion };
  }

  async validateRetenciones(
    retenciones: Array<{ codigo: string; codigoRetencion: string }>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const ret of retenciones) {
      let tipo = 'RENTA';
      if (ret.codigoRetencion.startsWith('7')) {
        tipo = 'IVA';
      } else if (ret.codigoRetencion.startsWith('45')) {
        tipo = 'ISD';
      }

      const result = await this.validateRetencion(tipo, ret.codigoRetencion);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // =====================================================
  // VALIDACIONES DE FORMAS DE PAGO
  // =====================================================

  async validateFormaPago(
    codigo: string,
  ): Promise<{ valid: boolean; formaPago?: FormaPago; error?: string }> {
    await this.refreshCacheIfNeeded();

    const formaPago = this.formasPagoCache.get(codigo);

    if (!formaPago) {
      return {
        valid: false,
        error: `Forma de pago ${codigo} no encontrada en catálogo`,
      };
    }

    return { valid: true, formaPago };
  }

  async validateFormasPago(
    pagos: Array<{ formaPago: string }>,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const pago of pagos) {
      const result = await this.validateFormaPago(pago.formaPago);
      if (!result.valid && result.error) {
        errors.push(result.error);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // =====================================================
  // VALIDACIONES DE TIPOS DE IDENTIFICACIÓN
  // =====================================================

  async validateTipoIdentificacion(codigo: string): Promise<{
    valid: boolean;
    tipoIdentificacion?: TipoIdentificacion;
    error?: string;
  }> {
    await this.refreshCacheIfNeeded();

    const tipoIdentificacion = this.tiposIdentificacionCache.get(codigo);

    if (!tipoIdentificacion) {
      return {
        valid: false,
        error: `Tipo de identificación ${codigo} no encontrado en catálogo`,
      };
    }

    return { valid: true, tipoIdentificacion };
  }

  // =====================================================
  // VALIDACIONES DE DOCUMENTOS SUSTENTO
  // =====================================================

  async validateDocumentoSustento(codigo: string): Promise<{
    valid: boolean;
    documentoSustento?: DocumentoSustento;
    error?: string;
  }> {
    await this.refreshCacheIfNeeded();

    const documentoSustento = this.documentosSustentoCache.get(codigo);

    if (!documentoSustento) {
      return {
        valid: false,
        error: `Documento sustento ${codigo} no encontrado en catálogo`,
      };
    }

    return { valid: true, documentoSustento };
  }

  // =====================================================
  // VALIDACIONES DE MOTIVOS TRASLADO (Guía Remisión)
  // =====================================================

  async validateMotivoTraslado(codigo: string): Promise<{
    valid: boolean;
    motivoTraslado?: MotivoTraslado;
    error?: string;
  }> {
    await this.refreshCacheIfNeeded();

    const motivoTraslado = this.motivosTrasladoCache.get(codigo);

    if (!motivoTraslado) {
      return {
        valid: false,
        error: `Motivo de traslado ${codigo} no encontrado en catálogo`,
      };
    }

    return { valid: true, motivoTraslado };
  }

  // =====================================================
  // MÉTODOS DE CONSULTA
  // =====================================================

  async getTarifasVigentes(codigoImpuesto: string): Promise<TarifaImpuesto[]> {
    await this.refreshCacheIfNeeded();
    const tarifas: TarifaImpuesto[] = [];
    for (const [, tarifa] of this.tarifasCache) {
      if (tarifa.impuesto_codigo === codigoImpuesto) {
        tarifas.push(tarifa);
      }
    }
    return tarifas;
  }

  async getRetencionesPorTipo(tipo: string): Promise<CodigoRetencion[]> {
    await this.refreshCacheIfNeeded();
    const retenciones: CodigoRetencion[] = [];
    for (const [, retencion] of this.retencionesCache) {
      if (retencion.tipo === tipo) {
        retenciones.push(retencion);
      }
    }
    return retenciones;
  }

  async getFormasPago(): Promise<FormaPago[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.formasPagoCache.values());
  }

  async getTiposIdentificacion(): Promise<TipoIdentificacion[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.tiposIdentificacionCache.values());
  }

  async getDocumentosSustento(): Promise<DocumentoSustento[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.documentosSustentoCache.values());
  }

  async getMotivosTraslado(): Promise<MotivoTraslado[]> {
    await this.refreshCacheIfNeeded();
    return Array.from(this.motivosTrasladoCache.values());
  }

  // =====================================================
  // CARGA DE CACHE
  // =====================================================

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now();
    if (now > this.cacheExpiry) {
      // Si ya hay una carga en curso, esperamos que termine en lugar de lanzar otra
      if (this.loadingPromise) {
        return this.loadingPromise;
      }
      this.loadingPromise = this.loadCache()
        .then(() => {
          this.cacheExpiry = Date.now() + this.CACHE_TTL_MS;
        })
        .finally(() => {
          this.loadingPromise = null;
        });
      return this.loadingPromise;
    }
  }

  private async loadCache(): Promise<void> {
    this.logger.log('Cargando todos los catálogos SRI...');

    try {
      // 1. Cargar tarifas de impuestos
      const tarifas = await this.db.query<any>(`
        SELECT 
          t.codigo_porcentaje, t.descripcion, t.porcentaje,
          i.codigo as impuesto_codigo, i.nombre as impuesto_nombre
        FROM catalogo_tarifas_impuesto t
        JOIN catalogo_impuestos i ON t.impuesto_id = i.id
        WHERE t.activo = true
        AND (t.vigente_hasta IS NULL OR t.vigente_hasta >= CURRENT_DATE)
      `);
      this.tarifasCache.clear();
      for (const tarifa of tarifas.rows) {
        const key = `${tarifa.impuesto_codigo}-${tarifa.codigo_porcentaje}`;
        this.tarifasCache.set(key, {
          codigo_porcentaje: tarifa.codigo_porcentaje,
          descripcion: tarifa.descripcion,
          porcentaje: parseFloat(tarifa.porcentaje),
          impuesto_codigo: tarifa.impuesto_codigo,
          impuesto_nombre: tarifa.impuesto_nombre,
        });
      }

      // 2. Cargar códigos de retención
      const retenciones = await this.db.query<any>(`
        SELECT tipo, codigo, descripcion, porcentaje
        FROM catalogo_retenciones WHERE activo = true
        AND (vigente_hasta IS NULL OR vigente_hasta >= CURRENT_DATE)
      `);
      this.retencionesCache.clear();
      for (const ret of retenciones.rows) {
        const key = `${ret.tipo}-${ret.codigo}`;
        this.retencionesCache.set(key, {
          tipo: ret.tipo,
          codigo: ret.codigo,
          descripcion: ret.descripcion,
          porcentaje: parseFloat(ret.porcentaje),
        });
      }

      // 3. Cargar formas de pago
      const formasPago = await this.db.query<any>(`
        SELECT codigo, descripcion FROM catalogo_formas_pago WHERE activo = true
      `);
      this.formasPagoCache.clear();
      for (const fp of formasPago.rows) {
        this.formasPagoCache.set(fp.codigo, {
          codigo: fp.codigo,
          descripcion: fp.descripcion,
        });
      }

      // 4. Cargar tipos de identificación
      const tiposIdent = await this.db.query<any>(`
        SELECT codigo, descripcion, longitud, regex_validacion 
        FROM catalogo_tipos_identificacion WHERE activo = true
      `);
      this.tiposIdentificacionCache.clear();
      for (const ti of tiposIdent.rows) {
        this.tiposIdentificacionCache.set(ti.codigo, {
          codigo: ti.codigo,
          descripcion: ti.descripcion,
          longitud: ti.longitud,
          regex_validacion: ti.regex_validacion,
        });
      }

      // 5. Cargar documentos sustento
      const docsSustento = await this.db.query<any>(`
        SELECT codigo, descripcion FROM catalogo_documentos_sustento WHERE activo = true
      `);
      this.documentosSustentoCache.clear();
      for (const ds of docsSustento.rows) {
        this.documentosSustentoCache.set(ds.codigo, {
          codigo: ds.codigo,
          descripcion: ds.descripcion,
        });
      }

      // 6. Cargar motivos traslado
      const motivosTraslado = await this.db.query<any>(`
        SELECT codigo, descripcion FROM catalogo_motivos_traslado WHERE activo = true
      `);
      this.motivosTrasladoCache.clear();
      for (const mt of motivosTraslado.rows) {
        this.motivosTrasladoCache.set(mt.codigo, {
          codigo: mt.codigo,
          descripcion: mt.descripcion,
        });
      }

      this.logger.log(
        `Catálogos cargados desde BD: ${this.tarifasCache.size} tarifas, ` +
          `${this.retencionesCache.size} retenciones, ${this.formasPagoCache.size} formas pago, ` +
          `${this.tiposIdentificacionCache.size} tipos ident, ${this.documentosSustentoCache.size} docs sustento, ` +
          `${this.motivosTrasladoCache.size} motivos traslado`,
      );
    } catch (error) {
      this.logger.warn(
        `Tablas de catálogo no disponibles en BD (${(error as Error).message}). Usando catálogos estáticos del SRI.`,
      );
      this.loadStaticFallbackCatalogs();
    }
  }

  /**
   * Catálogos estáticos oficiales del SRI Ecuador.
   * Se usan como fallback cuando las tablas de catálogo no existen en la BD conectada.
   */
  private loadStaticFallbackCatalogs(): void {
    // Tarifas IVA (código impuesto = '2')
    this.tarifasCache.clear();
    const tarifasIva: Array<{ cp: string; desc: string; pct: number }> = [
      { cp: '0', desc: 'IVA 0%', pct: 0 },
      { cp: '2', desc: 'IVA 12%', pct: 12 },
      { cp: '3', desc: 'IVA 14%', pct: 14 },
      { cp: '4', desc: 'IVA 15%', pct: 15 },
      { cp: '5', desc: 'IVA 5%', pct: 5 },
      { cp: '6', desc: 'No Objeto de Impuesto', pct: 0 },
      { cp: '7', desc: 'Exento de IVA', pct: 0 },
      { cp: '8', desc: 'IVA Diferenciado', pct: 0 },
    ];
    for (const t of tarifasIva) {
      this.tarifasCache.set(`2-${t.cp}`, {
        codigo_porcentaje: t.cp,
        descripcion: t.desc,
        porcentaje: t.pct,
        impuesto_codigo: '2',
        impuesto_nombre: 'IVA',
      });
    }

    // Formas de pago SRI
    this.formasPagoCache.clear();
    const formasPago: Array<{ codigo: string; descripcion: string }> = [
      { codigo: '01', descripcion: 'SIN UTILIZACION DEL SISTEMA FINANCIERO' },
      { codigo: '15', descripcion: 'COMPENSACION DE DEUDAS' },
      { codigo: '16', descripcion: 'TARJETA DE DEBITO' },
      { codigo: '17', descripcion: 'DINERO ELECTRONICO' },
      { codigo: '18', descripcion: 'TARJETA PREPAGO' },
      { codigo: '19', descripcion: 'TARJETA DE CREDITO' },
      { codigo: '20', descripcion: 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO' },
      { codigo: '21', descripcion: 'ENDOSO DE TITULOS' },
    ];
    for (const fp of formasPago) {
      this.formasPagoCache.set(fp.codigo, fp);
    }

    // Tipos de identificación SRI
    this.tiposIdentificacionCache.clear();
    const tiposIdent: Array<{ codigo: string; descripcion: string; longitud: number | null; regex_validacion: string | null }> = [
      { codigo: '04', descripcion: 'RUC', longitud: 13, regex_validacion: '^\\d{13}$' },
      { codigo: '05', descripcion: 'CEDULA', longitud: 10, regex_validacion: '^\\d{10}$' },
      { codigo: '06', descripcion: 'PASAPORTE', longitud: null, regex_validacion: '^[A-Za-z0-9]+$' },
      { codigo: '07', descripcion: 'CONSUMIDOR FINAL', longitud: 13, regex_validacion: '^9{13}$' },
    ];
    for (const ti of tiposIdent) {
      this.tiposIdentificacionCache.set(ti.codigo, ti);
    }

    // Documentos sustento (los mas comunes)
    this.documentosSustentoCache.clear();
    const docsSustento: Array<{ codigo: string; descripcion: string }> = [
      { codigo: '01', descripcion: 'FACTURA' },
      { codigo: '02', descripcion: 'NOTA O BOLETA DE VENTA' },
      { codigo: '03', descripcion: 'LIQUIDACION DE COMPRA DE BIENES O PRESTACION DE SERVICIOS' },
      { codigo: '04', descripcion: 'NOTA DE CREDITO' },
      { codigo: '05', descripcion: 'NOTA DE DEBITO' },
      { codigo: '06', descripcion: 'GUIA DE REMISION' },
      { codigo: '07', descripcion: 'COMPROBANTE DE RETENCION' },
    ];
    for (const ds of docsSustento) {
      this.documentosSustentoCache.set(ds.codigo, ds);
    }

    // Motivos traslado (Guía Remisión)
    this.motivosTrasladoCache.clear();
    const motivosTraslado: Array<{ codigo: string; descripcion: string }> = [
      { codigo: '01', descripcion: 'VENTA' },
      { codigo: '02', descripcion: 'COMPRA' },
      { codigo: '03', descripcion: 'TRANSFORMACION' },
      { codigo: '04', descripcion: 'CONSIGNACION' },
      { codigo: '05', descripcion: 'DEVOLUCION' },
      { codigo: '06', descripcion: 'TRASLADO ENTRE ESTABLECIMIENTOS DE UNA MISMA EMPRESA' },
      { codigo: '07', descripcion: 'TRASLADO PARA EXPORTACION' },
      { codigo: '08', descripcion: 'OTROS' },
    ];
    for (const mt of motivosTraslado) {
      this.motivosTrasladoCache.set(mt.codigo, mt);
    }

    // Retenciones (vacío por ahora, no se usan en facturación básica)
    this.retencionesCache.clear();

    this.logger.log(
      `Catálogos estáticos cargados: ${this.tarifasCache.size} tarifas, ` +
        `${this.formasPagoCache.size} formas pago, ${this.tiposIdentificacionCache.size} tipos ident, ` +
        `${this.documentosSustentoCache.size} docs sustento, ${this.motivosTrasladoCache.size} motivos traslado`,
    );
  }

  async forceRefreshCache(): Promise<void> {
    this.cacheExpiry = 0;
    await this.refreshCacheIfNeeded();
  }
}

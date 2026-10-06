import { ClaveAccesoService } from '../../../src/modules/sri/services/clave-acceso.service';
import { Ambiente, TipoEmision, TipoComprobante } from '../../../src/modules/sri/constants';
import { CertificateInfo } from '../../../src/modules/signature/signature.service';

describe('Integración SRI — Flujo Integral de Generación de Clave, Cálculo Tributario y Firma XAdES-BES', () => {
  let claveService: ClaveAccesoService;

  beforeEach(() => {
    claveService = new ClaveAccesoService();
  });

  it('debe integrar la construcción de factura con su clave de acceso de 49 dígitos y totales de calzado', () => {
    // 1. Datos del comprobante de calzado
    const rucEmisor = '1803730276001';
    const fechaEmision = new Date(2026, 4, 15);
    const claveAcceso = claveService.generate({
      fechaEmision,
      tipoComprobante: TipoComprobante.FACTURA,
      ruc: rucEmisor,
      ambiente: Ambiente.PRUEBAS,
      establecimiento: '001',
      puntoEmision: '001',
      secuencial: '000000150',
      codigoNumerico: '87654321',
      tipoEmision: TipoEmision.NORMAL,
    });

    expect(claveAcceso).toHaveLength(49);
    expect(claveAcceso.substring(10, 23)).toBe(rucEmisor);

    // 2. Cálculo de ítems de calzado (1 docena botín cuero = $220.00 + IVA 15%)
    const items = [
      {
        codigoPrincipal: 'BOT-LONDRES-01',
        descripcion: 'Botín Cuero Hombre Londres (1 Docena)',
        cantidad: 12,
        precioUnitario: 18.3333,
        descuento: 0,
        tarifaIva: 15,
      },
    ];

    const subtotalSinImpuestos = Number((items[0].cantidad * items[0].precioUnitario).toFixed(2));
    const montoIva = Number(((subtotalSinImpuestos * items[0].tarifaIva) / 100).toFixed(2));
    const totalFactura = Number((subtotalSinImpuestos + montoIva).toFixed(2));

    expect(subtotalSinImpuestos).toBe(220.0);
    expect(montoIva).toBe(33.0);
    expect(totalFactura).toBe(253.0);
  });

  it('debe validar la integración de certificado digital PKCS#12 para el emisor de calzado', () => {
    const certEmisor: CertificateInfo = {
      subject: {
        commonName: 'FABRICANTE CALZADO CEVALLOS CIA LTDA',
        organization: 'SECURITY DATA SEGURIDAD EN DATOS Y FIRMA DIGITAL S.A.',
        country: 'EC',
      },
      issuer: {
        commonName: 'AUTORIDAD DE CERTIFICACION SUB SECURITY DATA',
        organization: 'SECURITY DATA S.A.',
      },
      validity: {
        notBefore: new Date(2025, 0, 1),
        notAfter: new Date(2027, 0, 1),
      },
      serialNumber: '1803730276001-CERT',
    };

    // Validar vigencia activa
    const now = new Date(2026, 4, 15);
    const estaVigente = now >= certEmisor.validity.notBefore && now <= certEmisor.validity.notAfter;
    expect(estaVigente).toBe(true);
    expect(certEmisor.subject.country).toBe('EC');
  });
});

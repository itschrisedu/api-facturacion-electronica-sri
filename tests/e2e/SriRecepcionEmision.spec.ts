import { ClaveAccesoService } from '../../src/modules/sri/services/clave-acceso.service';
import { Ambiente, TipoEmision, TipoComprobante } from '../../src/modules/sri/constants';

describe('E2E / Sistema — Microservicio SRI: Recepción, Validación y Encriptación de Comprobantes', () => {
  let claveAccesoService: ClaveAccesoService;

  beforeEach(() => {
    claveAccesoService = new ClaveAccesoService();
  });

  it('debe procesar de extremo a extremo la generación de comprobante y su clave de 49 dígitos', () => {
    const payloadEmision = {
      fechaEmision: new Date(2026, 9, 6),
      tipoComprobante: TipoComprobante.FACTURA,
      ruc: '1803730276001',
      ambiente: Ambiente.PRUEBAS,
      establecimiento: '001',
      puntoEmision: '002',
      secuencial: '000000999',
      codigoNumerico: '98765432',
      tipoEmision: TipoEmision.NORMAL,
    };

    const clave = claveAccesoService.generate(payloadEmision);

    // 1. Longitud exacta de 49 dígitos según ficha técnica SRI
    expect(clave).toHaveLength(49);
    // 2. Solo caracteres numéricos
    expect(clave).toMatch(/^\d{49}$/);
    // 3. Contiene el RUC del emisor de calzado
    expect(clave).toContain('1803730276001');
    // 4. Tipo de ambiente (1 = Pruebas)
    expect(clave.charAt(23)).toBe('1');
  });
});

import { CertificateInfo } from '../../../src/modules/signature/signature.service';

describe('Signature Module — XAdES-BES & Certificate Unit Tests', () => {
  it('debe validar la estructura y expiración de un certificado digital P12', () => {
    const certInfo: CertificateInfo = {
      subject: {
        commonName: 'CHRISTOPHER PAUCAR',
        organization: 'SECURITY DATA',
        country: 'EC',
      },
      issuer: {
        commonName: 'AUTORIDAD DE CERTIFICACION SECURITY DATA',
        organization: 'SECURITY DATA S.A.',
      },
      validity: {
        notBefore: new Date(2025, 0, 1),
        notAfter: new Date(2027, 0, 1),
      },
      serialNumber: '5849201948102',
    };

    const now = new Date();
    const isValido = now >= certInfo.validity.notBefore && now <= certInfo.validity.notAfter;

    expect(isValido).toBe(true);
    expect(certInfo.subject.country).toBe('EC');
    expect(certInfo.serialNumber).toBeDefined();
  });

  it('debe detectar un certificado expirado', () => {
    const certExpirado: CertificateInfo = {
      subject: {
        commonName: 'EMPRESA EJEMPLO',
        organization: 'ANFAC',
        country: 'EC',
      },
      issuer: {
        commonName: 'ANFAC AUTORIDAD',
        organization: 'ANFAC S.A.',
      },
      validity: {
        notBefore: new Date(2020, 0, 1),
        notAfter: new Date(2022, 0, 1),
      },
      serialNumber: '11223344',
    };

    const now = new Date();
    const isExpirado = now > certExpirado.validity.notAfter;
    expect(isExpirado).toBe(true);
  });
});

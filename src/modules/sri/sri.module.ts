import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SriController } from './sri.controller';
import { CatalogosController } from './catalogos.controller';
import { SriService } from './sri.service';
import {
  ClaveAccesoService,
  XmlBuilderService,
  XmlSignerService,
  SriSoapFactoryService,
  SriSoapClient,
  IdentificacionValidatorService,
  CatalogoValidatorService,
  SriBaseService,
  FacturaService,
  NotaCreditoService,
  NotaDebitoService,
  RetencionService,
  GuiaRemisionService,
} from './services';
import { SriRepositoryService } from './services/sri-repository.service';
import { XmlStorageService } from './services/xml-storage.service';
import { EmisoresModule } from '../emisores/emisores.module';

@Module({
  imports: [
    ConfigModule,
    EmisoresModule,
  ],
  controllers: [SriController, CatalogosController],
  providers: [
    SriService,
    SriBaseService,
    FacturaService,
    NotaCreditoService,
    NotaDebitoService,
    RetencionService,
    GuiaRemisionService,
    SriRepositoryService,
    XmlStorageService,
    ClaveAccesoService,
    XmlBuilderService,
    XmlSignerService,
    SriSoapFactoryService,
    SriSoapClient,
    IdentificacionValidatorService,
    CatalogoValidatorService,
  ],
  exports: [
    SriService,
    SriBaseService,
    FacturaService,
    NotaCreditoService,
    NotaDebitoService,
    RetencionService,
    GuiaRemisionService,
    SriRepositoryService,
    XmlStorageService,
    ClaveAccesoService,
    XmlBuilderService,
    XmlSignerService,
    SriSoapFactoryService,
    CatalogoValidatorService,
  ],
})
export class SriModule {}

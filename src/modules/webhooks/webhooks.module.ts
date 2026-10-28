import { Module, Global } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { DatabaseModule } from '../../database/database.module';
import { EmisoresModule } from '../emisores/emisores.module';

@Global()
@Module({
  imports: [DatabaseModule, EmisoresModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}

import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../../schemas/client.schema';
import { TenantService } from './tenant.service';
import { TenantGuard } from './tenant.guard';
import { TenantController } from './tenant.controller';
import { AuthModule } from '../auth/auth.module';

/**
 * TenantModule — Global multi-tenant foundation
 * 
 * Marked as @Global() so TenantService and TenantGuard are available
 * in every module without explicit imports. This is essential because
 * every service needs access to tenant resolution.
 */
@Global()
@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Client.name, schema: ClientSchema },
    ]),
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantGuard],
  exports: [TenantService, TenantGuard, MongooseModule],
})
export class TenantModule {}

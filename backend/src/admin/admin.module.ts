import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditService } from './audit.service';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PaymentModule, UsersModule],
  controllers: [AdminController],
  providers: [AdminService, AuditService],
  exports: [AdminService, AuditService],
})
export class AdminModule {}
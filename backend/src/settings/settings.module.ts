import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule],
  controllers: [SettingsController],
})
export class SettingsModule {}
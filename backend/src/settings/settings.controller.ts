import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { AdminService } from '../admin/admin.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly admin: AdminService) {}

  @Public()
  @Get('public')
  publicSettings() {
    return { data: this.admin.getPublicSettings() };
  }

  @Public()
  @Get('stats')
  publicStats() {
    return { data: this.admin.getPublicStats() };
  }
}
import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { brandProfileSchema, z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BrandService } from './brand.service';

@Controller('brand')
export class BrandController {
  constructor(private readonly brand: BrandService) {}

  @Get('me/profile')
  meProfile(@CurrentUser('id') userId: string) {
    return { data: this.brand.getMyBrand(userId) };
  }

  @Put('me/profile')
  upsertProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(brandProfileSchema)) body: z.infer<typeof brandProfileSchema>,
  ) {
    return { data: this.brand.upsertBrand(userId, body) };
  }

  @Post('me/verification')
  verify(@CurrentUser('id') userId: string, @Body() body: { documentUrl?: string }) {
    if (!body.documentUrl) throw new Error('documentUrl required');
    return { data: this.brand.submitVerification(userId, body.documentUrl) };
  }

  @Get('public/:id')
  publicProfile(@Param('id') id: string) {
    return { data: this.brand.getBrandPublic(id) };
  }
}
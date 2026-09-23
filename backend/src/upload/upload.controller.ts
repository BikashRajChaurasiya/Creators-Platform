import { Body, Controller, Get, Post } from '@nestjs/common';
import { z } from '@ugcnp/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UploadService } from './upload.service';

const presignSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(100),
  size: z.number().int().positive().max(500 * 1024 * 1024),
});

const completeSchema = z.object({
  key: z.string().min(1).max(600),
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(3).max(100),
  kind: z.enum(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER']),
  size: z.number().int().positive(),
});

@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('presign')
  presign(@CurrentUser('id') userId: string, @Body(new ZodValidationPipe(presignSchema)) body: z.infer<typeof presignSchema>) {
    return this.upload.presign(userId, body);
  }

  @Post('complete')
  complete(@CurrentUser('id') userId: string, @Body(new ZodValidationPipe(completeSchema)) body: z.infer<typeof completeSchema>) {
    return this.upload.complete(userId, body);
  }

  @Get('mine')
  listMine(@CurrentUser('id') userId: string) {
    return this.upload.listMine(userId);
  }
}
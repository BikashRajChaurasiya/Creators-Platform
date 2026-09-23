import { Global, Module } from '@nestjs/common';
import { AiClient } from './services/ai.client';

@Global()
@Module({
  providers: [AiClient],
  exports: [AiClient],
})
export class CommonModule {}
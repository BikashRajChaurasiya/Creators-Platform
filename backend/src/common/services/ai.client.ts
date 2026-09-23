import { Injectable, Logger } from '@nestjs/common';

/**
 * Minimal AI service client. Uses global fetch (Node 18+).
 * Kept resilient — AI unavailability never breaks core flows.
 */
@Injectable()
export class AiClient {
  private readonly logger = new Logger(AiClient.name);
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL ?? 'http://localhost:5001';
  }

  async matchCreators(payload: unknown): Promise<unknown> {
    return this.post('/match', payload);
  }

  async analyzeContent(payload: unknown): Promise<unknown> {
    return this.post('/analyze-content', payload);
  }

  async generateCopy(payload: unknown): Promise<unknown> {
    return this.post('/generate-copy', payload);
  }

  async predict(payload: unknown): Promise<unknown> {
    return this.post('/predict', payload);
  }

  private async post(path: string, payload: unknown, timeoutMs = 15000): Promise<unknown> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        this.logger.warn(`AI ${path} responded ${res.status}`);
        return null;
      }
      return (await res.json()) as unknown;
    } catch (err) {
      this.logger.warn(`AI ${path} unavailable: ${(err as Error).message}`);
      return null;
    }
  }
}
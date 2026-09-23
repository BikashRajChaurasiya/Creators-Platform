import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;
  const prisma = { $queryRaw: jest.fn().mockResolvedValue([1]) };
  const redis = { ping: jest.fn().mockResolvedValue(true) };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns ok when db and redis are reachable', async () => {
    const out = await controller.check();
    expect(out.status).toBe('ok');
    expect(out.db).toBe(true);
    expect(out.redis).toBe(true);
    expect(typeof out.timestamp).toBe('string');
  });

  it('degrades when db is down', async () => {
    prisma.$queryRaw.mockRejectedValueOnce(new Error('down'));
    const out = await controller.check();
    expect(out.status).toBe('degraded');
    expect(out.db).toBe(false);
  });
});
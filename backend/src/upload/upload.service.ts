import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { classifyFile } from './file-policy';

interface PresignInput {
  fileName: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.bucket = config.get<string>('STORAGE_BUCKET', 'ugcnp-media');
    this.publicBase = config.get<string>('STORAGE_PUBLIC_BASE', `http://localhost:9000/${this.bucket}`);
    this.s3 = new S3Client({
      endpoint: config.get<string>('STORAGE_ENDPOINT', 'localhost:9000'),
      region: config.get<string>('STORAGE_REGION', 'us-east-1'),
      forcePathStyle: true,
      tls: config.get<string>('STORAGE_USE_SSL', 'false') === 'true',
      credentials: {
        accessKeyId: config.get<string>('STORAGE_ACCESS_KEY', ''),
        secretAccessKey: config.get<string>('STORAGE_SECRET_KEY', ''),
      },
    });
  }

  async onModuleInit() {
    try {
      await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      // BucketAlreadyOwnedByYou / AlreadyExists are expected on restart
      const e = err as { name?: string };
      if (e?.name === 'BucketAlreadyOwnedByYou' || e?.name === 'AlreadyExists') {
        this.logger.log(`Storage bucket "${this.bucket}" ready`);
      } else {
        this.logger.warn(`Storage init: ${(err as Error).message}`);
      }
    }
  }

  private buildKey(userId: string, kind: string, fileName: string): string {
    const safe = fileName.toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(-80);
    return `${kind.toLowerCase()}/${userId}/${randomUUID()}-${safe}`;
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${key}`;
  }

  async presign(userId: string, input: PresignInput) {
    const { kind } = classifyFile(input);
    const key = this.buildKey(userId, kind, input.fileName);
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: input.mimeType,
      ContentLength: input.size,
    });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 900 });
    return { data: { uploadUrl: url, key, getUrl: this.publicUrl(key), kind } };
  }

  async complete(userId: string, input: { key: string; fileName: string; mimeType: string; kind: string; size: number }) {
    const { kind } = classifyFile({ fileName: input.fileName, mimeType: input.mimeType, size: input.size });
    let head: { ETag?: string; ContentLength?: number } = {};
    try {
      const res = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: input.key }));
      head = { ETag: res.ETag, ContentLength: res.ContentLength };
    } catch {
      this.logger.warn(`headObject failed for ${input.key}`);
    }
    const upload = await this.prisma.upload.create({
      data: {
        userId,
        kind: kind as never,
        bucket: this.bucket,
        key: input.key,
        url: this.publicUrl(input.key),
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: head.ContentLength ?? input.size,
        etag: head.ETag ?? null,
      },
    });
    return { data: upload };
  }

  async listMine(userId: string) {
    return { data: await this.prisma.upload.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }) };
  }
}
import { BadRequestException } from '@nestjs/common';

const MIME_TO_KIND: Record<string, string> = {
  'image/jpeg': 'IMAGE',
  'image/png': 'IMAGE',
  'image/webp': 'IMAGE',
  'image/gif': 'IMAGE',
  'video/mp4': 'VIDEO',
  'video/quicktime': 'VIDEO',
  'video/webm': 'VIDEO',
  'audio/mpeg': 'AUDIO',
  'audio/wav': 'AUDIO',
  'application/pdf': 'DOCUMENT',
  'application/msword': 'DOCUMENT',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCUMENT',
};

const EXT_ALLOWED = /\.(jpe?g|png|webp|gif|mp4|mov|webm|mp3|wav|pdf|docx?)$/i;
const MAX_SIZE = 500 * 1024 * 1024; // 500MB

export function classifyFile(input: { fileName: string; mimeType: string; size: number }) {
  if (input.size <= 0 || input.size > MAX_SIZE) {
    throw new BadRequestException(`File size must be between 1 byte and ${MAX_SIZE} bytes`);
  }
  if (!EXT_ALLOWED.test(input.fileName)) {
    throw new BadRequestException('File type not allowed');
  }
  const kind = MIME_TO_KIND[input.mimeType.toLowerCase()];
  if (!kind) throw new BadRequestException(`Unsupported mime type: ${input.mimeType}`);
  return { kind };
}
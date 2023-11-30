import { S3Client } from '@aws-sdk/client-s3';
import getEnvOrThrow from '../helpers/getOrThrow';
import { getS3Client } from './s3Strategy';
import { S3Config } from './types/s3Config';

export function initializeS3Client(): {
  s3Client: S3Client;
  s3Config: S3Config;
} {
  const s3Config = {
    endpoint: getEnvOrThrow('S3_ENDPOINT'),
    accessKeyId: getEnvOrThrow('S3_ACCESS_KEY_ID'),
    secretAccessKey: getEnvOrThrow('S3_SECRET_ACCESS_KEY'),
    region: getEnvOrThrow('S3_REGION'),
    bucket: getEnvOrThrow('S3_BUCKET'),
  };
  const s3Client = getS3Client(s3Config);
  return { s3Client, s3Config };
}

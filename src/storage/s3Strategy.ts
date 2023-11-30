import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { S3Config } from './types/s3Config';

export function getS3Client({
  endpoint,
  region,
  accessKeyId,
  secretAccessKey,
}: S3Config): S3Client {
  return new S3Client({
    endpoint: endpoint,
    region: region,
    credentials: {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey,
    },
  });
}

export async function uploadFileToS3(
  s3: S3Client,
  config: S3Config,
  filename: string,
  content: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: config.bucket,
    Key: filename,
    Body: content,
    ContentType: 'text/plain',
    ACL: 'private',
  });

  try {
    await s3.send(command);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`File upload to S3 failed ${err.message}`);
    }
    throw new Error(`File upload to S3 failed`);
  }
}

export async function getFileFromS3(
  s3: S3Client,
  config: S3Config,
  fileId: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: fileId,
  });

  try {
    const response = await s3.send(command);
    return (await response.Body?.transformToString()) || '';
  } catch (err) {
    if (err instanceof Error && err.name === 'NoSuchKey') {
      throw new Error('File not found');
    } else {
      throw new Error('File retrieval from S3 failed');
    }
  }
}

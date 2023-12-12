import {
  GetObjectCommand,
  GetObjectCommandOutput,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import createLogger from 'logging';
import { S3Config } from './types/s3Config';

const logger = createLogger('S3');

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

export async function getFileFromS3OrThrow(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: true
): Promise<string>;

export async function getFileFromS3OrThrow(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: false
): Promise<GetObjectCommandOutput>;

/**
 * Retrieves a file from an S3 bucket or throws an error if the file is not found.
 *
 * @param {S3Client} s3 - The S3 client used to interact with the S3 service.
 * @param {S3Config} config - The configuration object for the S3 bucket.
 * @param {string} key - The key of the file to retrieve.
 * @param {boolean} onlyContent - If true, only the file content is returned as a string.
 * @return {Promise<string | GetObjectCommandOutput>} The retrieved file content as a string or the GetObjectCommandOutput if onlyContent is false.
 * @throws {Error} If the file is not found in the S3 bucket or if the file retrieval from S3 fails.
 */
export async function getFileFromS3OrThrow(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: boolean
): Promise<string | GetObjectCommandOutput> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    const response = await s3.send(command);
    if (onlyContent) {
      return (await response.Body?.transformToString()) || '';
    }
    return response;
  } catch (err) {
    if (err instanceof Error && err.name === 'NoSuchKey') {
      throw new Error('File not found');
    } else {
      throw new Error('File retrieval from S3 failed');
    }
  }
}

export async function getFileFromS3(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: true
): Promise<string>;

export async function getFileFromS3(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: false
): Promise<GetObjectCommandOutput>;
/**
 * Retrieves a file from an S3 bucket.
 *
 * @param {S3Client} s3 - The S3 client object.
 * @param {S3Config} config - The S3 configuration object.
 * @param {string} key - The key of the file to retrieve.
 * @param {boolean} onlyContent - Whether to only retrieve the content of the file.
 * @return {Promise<string | GetObjectCommandOutput | undefined>} A promise that resolves to the retrieved file content or the S3 response object, or undefined if there was an error.
 */
export async function getFileFromS3(
  s3: S3Client,
  config: S3Config,
  key: string,
  onlyContent: boolean
): Promise<string | GetObjectCommandOutput | undefined> {
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key,
  });

  try {
    const response = await s3.send(command);
    if (onlyContent) {
      return (await response.Body?.transformToString()) || '';
    }
    return response;
  } catch (err) {
    logger.error('Error getting file from S3: ', err);
    return undefined;
  }
}

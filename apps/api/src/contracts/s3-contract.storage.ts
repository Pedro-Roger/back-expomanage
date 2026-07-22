import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getAwsRegion, getS3Bucket, getS3PublicBaseUrl } from "../config.js";
import type { ContractStorage, StoredAsset } from "./contracts.types.js";

@Injectable()
export class S3ContractStorage implements ContractStorage {
  private readonly client = new S3Client({ region: getAwsRegion() });

  async uploadObject(input: { key: string; body: Buffer; contentType: string }): Promise<StoredAsset> {
    const bucket = getS3Bucket();

    if (!bucket) {
      throw new ServiceUnavailableException("Bucket S3 não configurado.");
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType
      })
    );

    return {
      key: input.key,
      url: buildS3ObjectUrl(bucket, input.key)
    };
  }

  async downloadObject(key: string): Promise<{ body: Buffer; contentType?: string }> {
    const bucket = getS3Bucket();

    if (!bucket) {
      throw new ServiceUnavailableException("Bucket S3 não configurado.");
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key
      })
    );

    if (!response.Body) {
      throw new ServiceUnavailableException("Arquivo S3 retornou vazio.");
    }

    const bytes = await response.Body.transformToByteArray();
    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType
    };
  }
}

export function buildS3ObjectUrl(bucket: string, key: string): string {
  const publicBaseUrl = getS3PublicBaseUrl().replace(/\/+$/, "");
  const normalizedKey = key.replace(/^\/+/, "");

  if (publicBaseUrl) {
    return `${publicBaseUrl}/${normalizedKey}`;
  }

  return `s3://${bucket}/${normalizedKey}`;
}

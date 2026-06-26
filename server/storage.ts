/**
 * 文件存储层 —— 标准 S3 兼容实现
 *
 * 支持任意 S3 兼容存储服务，包括：
 *   - AWS S3
 *   - 阿里云 OSS（S3 兼容模式）
 *   - 腾讯云 COS（S3 兼容模式）
 *   - MinIO（自建）
 *   - Cloudflare R2
 *
 * 所需环境变量（在 .env 中配置）：
 *   S3_ENDPOINT        - 服务端点，例如 https://oss-cn-hangzhou.aliyuncs.com
 *   S3_REGION          - 区域，例如 oss-cn-hangzhou 或 auto（Cloudflare R2）
 *   S3_ACCESS_KEY      - Access Key ID
 *   S3_SECRET_KEY      - Secret Access Key
 *   S3_BUCKET_NAME     - Bucket 名称
 *   S3_PUBLIC_BASE_URL - （可选）公开访问的 CDN/域名前缀，例如 https://cdn.example.com
 *                        如果不填，则通过后端代理路由 /api/storage/* 提供访问
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Client(): S3Client {
  const endpoint = process.env.S3_ENDPOINT;
  const region = process.env.S3_REGION || "auto";
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Storage config missing: set S3_ACCESS_KEY and S3_SECRET_KEY in .env"
    );
  }

  return new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucketName(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error("Storage config missing: set S3_BUCKET_NAME in .env");
  }
  return bucket;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

/**
 * 上传文件到 S3 兼容存储
 * @returns key（存储路径）和 url（访问地址）
 */
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const s3 = getS3Client();
  const bucket = getBucketName();
  const key = `uploads/${appendHashSuffix(normalizeKey(relKey))}`;

  const body =
    typeof data === "string"
      ? Buffer.from(data, "utf-8")
      : Buffer.from(data as Uint8Array);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  // 如果配置了公开 CDN 域名，直接返回公开 URL；否则走后端代理
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const url = publicBase
    ? `${publicBase}/${key}`
    : `/api/storage/${encodeURIComponent(key)}`;

  return { key, url };
}

/**
 * 获取文件的访问信息（不生成签名 URL）
 */
export async function storageGet(
  relKey: string
): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  const url = publicBase
    ? `${publicBase}/${key}`
    : `/api/storage/${encodeURIComponent(key)}`;
  return { key, url };
}

/**
 * 生成文件的临时签名访问 URL（有效期 1 小时）
 */
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const s3 = getS3Client();
  const bucket = getBucketName();
  const key = normalizeKey(relKey);

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

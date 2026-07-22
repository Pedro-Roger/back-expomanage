import { afterEach, describe, expect, it } from "vitest";
import { getS3Bucket } from "../config.js";
import { buildS3ObjectUrl } from "./s3-contract.storage.js";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("S3ContractStorage URL builder", () => {
  it("uses AWS_S3_PUBLIC_BASE_URL so stored records keep a public download URL", () => {
    process.env.AWS_S3_PUBLIC_BASE_URL = "https://cdn.expomanage.com/contracts/";

    expect(buildS3ObjectUrl("expomanage-contracts", "contracts/generated/contract.docx")).toBe(
      "https://cdn.expomanage.com/contracts/contracts/generated/contract.docx"
    );
  });

  it("falls back to the S3 URI when no public base URL is configured", () => {
    delete process.env.AWS_S3_PUBLIC_BASE_URL;

    expect(buildS3ObjectUrl("expomanage-contracts", "contracts/generated/contract.docx")).toBe(
      "s3://expomanage-contracts/contracts/generated/contract.docx"
    );
  });

  it("reads the bucket from AWS_S3_BUCKET_NAME when S3_BUCKET is not set", () => {
    delete process.env.S3_BUCKET;
    process.env.AWS_S3_BUCKET_NAME = "lc-web-quero";

    expect(getS3Bucket()).toBe("lc-web-quero");
  });
});

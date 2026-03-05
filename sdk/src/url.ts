// Copyright (c) Unconfirmed Labs, LLC
// SPDX-License-Identifier: MIT

import type { WalrusData } from "./types.ts";

/**
 * Converts a u256 decimal string to a base64url-encoded blob ID.
 * Used to convert on-chain WalrusData blob IDs to Walrus aggregator format.
 */
export function u256ToB64Url(u256: string | bigint): string {
  let value = typeof u256 === "string" ? BigInt(u256) : u256;

  // Convert to 32 bytes big-endian (256 bits)
  const bytes = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }

  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Converts a base64url-encoded blob ID to a u256 decimal string.
 * Used to convert Walrus blob IDs to on-chain WalrusData format.
 */
export function b64UrlToU256(blobId: string): string {
  let base64 = blobId.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }

  return result.toString();
}

/**
 * Builds a 37-byte quilt patch ID and returns it as base64url.
 *
 * Layout: quilt_id (32 bytes BE) + version (1 byte) + start_index (2 bytes LE) + end_index (2 bytes LE).
 * The quilt_id uses big-endian to match Walrus aggregator conventions (same as blob IDs in URLs).
 * The start/end indices use little-endian (BCS encoding).
 */
export function quiltPatchId(quiltId: string, version: number, startIndex: number, endIndex: number): string {
  const bytes = new Uint8Array(37);

  // quilt_id: 32 bytes big-endian (matching Walrus aggregator convention)
  let qid = BigInt(quiltId);
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(qid & 0xffn);
    qid >>= 8n;
  }

  // version: 1 byte
  bytes[32] = version;

  // start_index: 2 bytes little-endian (BCS u16)
  bytes[33] = startIndex & 0xff;
  bytes[34] = (startIndex >> 8) & 0xff;

  // end_index: 2 bytes little-endian (BCS u16)
  bytes[35] = endIndex & 0xff;
  bytes[36] = (endIndex >> 8) & 0xff;

  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Returns the Walrus aggregator URL for any WalrusData variant.
 *
 * - Blob: `{aggregatorUrl}/v1/blobs/{base64url blob ID}`
 * - QuiltPatch: `{aggregatorUrl}/v1/blobs/by-quilt-patch-id/{base64url patch ID}`
 */
/** Extract the blob ID from a Blob WalrusData. Throws if it's a QuiltPatch. */
export function assertBlobId(data: WalrusData): string {
  if (data.type !== "Blob") throw new Error("Expected Blob WalrusData, got " + data.type);
  return data.blobId;
}

export function walrusDataUrl(aggregatorUrl: string, data: WalrusData): string {
  switch (data.type) {
    case "Blob":
      return `${aggregatorUrl}/v1/blobs/${u256ToB64Url(data.blobId)}`;
    case "QuiltPatch":
      return `${aggregatorUrl}/v1/blobs/by-quilt-patch-id/${quiltPatchId(data.quiltId, data.version, data.startIndex, data.endIndex)}`;
  }
}

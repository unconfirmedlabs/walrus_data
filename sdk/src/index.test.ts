import { test, expect, describe } from "bun:test";
import { u256ToB64Url, b64UrlToU256, quiltPatchId, walrusDataUrl, assertBlobId, WalrusDataSchema } from "./index.ts";
import type { WalrusData } from "./index.ts";

// ---------------------------------------------------------------------------
// u256ToB64Url / b64UrlToU256 roundtrip
// ---------------------------------------------------------------------------

describe("u256ToB64Url / b64UrlToU256", () => {
  test("roundtrip zero", () => {
    const encoded = u256ToB64Url("0");
    expect(b64UrlToU256(encoded)).toBe("0");
  });

  test("roundtrip known value", () => {
    const value = "123456789012345678901234567890";
    const encoded = u256ToB64Url(value);
    expect(b64UrlToU256(encoded)).toBe(value);
  });

  test("roundtrip max u256", () => {
    const maxU256 = (2n ** 256n - 1n).toString();
    const encoded = u256ToB64Url(maxU256);
    expect(b64UrlToU256(encoded)).toBe(maxU256);
  });

  test("accepts bigint input", () => {
    const encoded = u256ToB64Url(42n);
    expect(b64UrlToU256(encoded)).toBe("42");
  });

  test("output is base64url (no +, /, or =)", () => {
    const encoded = u256ToB64Url((2n ** 256n - 1n).toString());
    expect(encoded).not.toContain("+");
    expect(encoded).not.toContain("/");
    expect(encoded).not.toContain("=");
  });
});

// ---------------------------------------------------------------------------
// quiltPatchId
// ---------------------------------------------------------------------------

describe("quiltPatchId", () => {
  test("produces 37 bytes base64url encoded", () => {
    const id = quiltPatchId("0", 0, 0, 0);
    // 37 bytes → ceil(37 * 4/3) = 50 base64 chars (minus padding stripped)
    // base64url of 37 bytes = 50 chars with 1 padding byte removed = 49-50 chars
    const decoded = atob(id.replace(/-/g, "+").replace(/_/g, "/") + "==");
    expect(decoded.length).toBe(37);
  });

  test("quilt_id is big-endian u256", () => {
    // quiltId = 1 → BE bytes: [0x00, ..., 0x00, 0x01] (32 bytes)
    const id = quiltPatchId("1", 0, 0, 0);
    const raw = Uint8Array.from(atob(id.replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) => c.charCodeAt(0));
    expect(raw[0]).toBe(0);
    expect(raw[30]).toBe(0);
    expect(raw[31]).toBe(1);
  });

  test("version is a single byte at offset 32", () => {
    const id = quiltPatchId("0", 42, 0, 0);
    const raw = Uint8Array.from(atob(id.replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) => c.charCodeAt(0));
    expect(raw[32]).toBe(42);
  });

  test("start_index is little-endian u16 at offset 33", () => {
    // 0x0102 = 258 → LE: [0x02, 0x01]
    const id = quiltPatchId("0", 0, 258, 0);
    const raw = Uint8Array.from(atob(id.replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) => c.charCodeAt(0));
    expect(raw[33]).toBe(2);
    expect(raw[34]).toBe(1);
  });

  test("end_index is little-endian u16 at offset 35", () => {
    const id = quiltPatchId("0", 0, 0, 513);
    const raw = Uint8Array.from(atob(id.replace(/-/g, "+").replace(/_/g, "/") + "=="), (c) => c.charCodeAt(0));
    expect(raw[35]).toBe(1);
    expect(raw[36]).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// walrusDataUrl
// ---------------------------------------------------------------------------

describe("walrusDataUrl", () => {
  const agg = "https://aggregator.example.com";

  test("Blob variant", () => {
    const data: WalrusData = { type: "Blob", blobId: "42" };
    const url = walrusDataUrl(agg, data);
    expect(url).toBe(`${agg}/v1/blobs/${u256ToB64Url("42")}`);
  });

  test("QuiltPatch variant", () => {
    const data: WalrusData = { type: "QuiltPatch", quiltId: "100", version: 1, startIndex: 0, endIndex: 5 };
    const url = walrusDataUrl(agg, data);
    const expectedPatchId = quiltPatchId("100", 1, 0, 5);
    expect(url).toBe(`${agg}/v1/blobs/by-quilt-patch-id/${expectedPatchId}`);
  });
});

// ---------------------------------------------------------------------------
// assertBlobId
// ---------------------------------------------------------------------------

describe("assertBlobId", () => {
  test("returns blobId for Blob variant", () => {
    expect(assertBlobId({ type: "Blob", blobId: "123" })).toBe("123");
  });

  test("throws for QuiltPatch variant", () => {
    expect(() =>
      assertBlobId({ type: "QuiltPatch", quiltId: "1", version: 0, startIndex: 0, endIndex: 1 }),
    ).toThrow("Expected Blob");
  });
});

// ---------------------------------------------------------------------------
// WalrusDataSchema (Zod)
// ---------------------------------------------------------------------------

describe("WalrusDataSchema", () => {
  test("parses Blob variant", () => {
    const input = { "@variant": "Blob", pos0: "999" };
    const result = WalrusDataSchema.parse(input);
    expect(result).toEqual({ type: "Blob", blobId: "999" });
  });

  test("parses QuiltPatch variant", () => {
    const input = { "@variant": "QuiltPatch", pos0: "12345", pos1: 2, pos2: 10, pos3: 20 };
    const result = WalrusDataSchema.parse(input);
    expect(result).toEqual({ type: "QuiltPatch", quiltId: "12345", version: 2, startIndex: 10, endIndex: 20 });
  });

  test("rejects unknown variant", () => {
    const input = { "@variant": "Unknown", pos0: "1" };
    expect(() => WalrusDataSchema.parse(input)).toThrow();
  });
});

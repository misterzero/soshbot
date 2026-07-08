import { describe, expect, it } from "vitest";
import { detectImageType } from "./sniff";

function bytes(...hex: (number | "x")[]): Uint8Array {
  const arr = new Uint8Array(16);
  hex.forEach((b, i) => {
    arr[i] = b === "x" ? 0 : b;
  });
  return arr;
}

describe("detectImageType", () => {
  it("detects png", () => {
    expect(detectImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      mime: "image/png",
      ext: "png",
    });
  });

  it("detects jpeg", () => {
    expect(detectImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({
      mime: "image/jpeg",
      ext: "jpg",
    });
  });

  it("detects webp", () => {
    expect(
      detectImageType(bytes(0x52, 0x49, 0x46, 0x46, "x", "x", "x", "x", 0x57, 0x45, 0x42, 0x50))
    ).toEqual({ mime: "image/webp", ext: "webp" });
  });

  it("rejects svg, html, and truncated buffers", () => {
    expect(detectImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(detectImageType(new TextEncoder().encode("<!DOCTYPE html><script>x</script>"))).toBeNull();
    expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
  });
});

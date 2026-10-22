import test from "node:test";
import assert from "node:assert/strict";
import { validatePhoto } from "../src/photo-validation.js";

const photo = (bytes, type) => new File([Uint8Array.from(bytes)], "portrait", { type });

test("accepts a JPEG photo without changing its data", async () => {
  const file = photo([0xff, 0xd8, 0xff, 0xd9], "image/jpeg");
  assert.equal(await validatePhoto(file), null);
  assert.equal(file.size, 4);
});

test("rejects an empty or oversized photo", async () => {
  assert.match(await validatePhoto(photo([], "image/jpeg")), /Foto/);
  const large = new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.jpg", { type: "image/jpeg" });
  assert.match(await validatePhoto(large), /3 MB/);
});

test("rejects unsupported or mislabeled files", async () => {
  assert.match(await validatePhoto(photo([1, 2, 3], "application/pdf")), /JPG|PNG|WebP/);
  assert.match(await validatePhoto(photo([1, 2, 3, 4], "image/jpeg")), /JPG|PNG|WebP/);
});

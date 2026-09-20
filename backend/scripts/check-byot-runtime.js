"use strict";
// Safe preflight: no database connection, provider request, or user data.
const sharp = require("sharp");
const assert = require("node:assert/strict");
const { sanitize } = require("../src/services/byotMediaProvider");
(async () => {
  for (const format of ["jpeg", "png", "webp"]) {
    const input = await sharp({
      create: { width: 400, height: 600, channels: 3, background: "#42667b" },
    })
      [format]()
      .toBuffer();
    const output = await sanitize(input, `image/${format}`);
    const info = await sharp(output).metadata();
    assert.equal(info.format, "jpeg");
    assert.equal(info.width, 400);
    assert.equal(info.height, 600);
    assert.equal(info.exif, undefined);
  }
  console.log(
    JSON.stringify({
      ok: true,
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      sharp: sharp.versions.sharp,
      vips: sharp.versions.vips,
      formats: ["jpeg", "png", "webp"],
    })
  );
})().catch(() => {
  console.error("BYOT image runtime preflight failed");
  process.exitCode = 1;
});

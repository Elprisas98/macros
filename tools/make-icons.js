// Genera los íconos PNG de la app sin dependencias (node tools/make-icons.js)
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

// Fondo oscuro con un anillo de tres segmentos (proteína / carbos / grasa)
const BG = [20, 22, 26];
const SEG = [[255, 107, 107], [255, 196, 87], [94, 201, 255]];

function draw(size) {
  const rows = [];
  const cx = size / 2, cy = size / 2;
  const rOut = size * 0.36, rIn = size * 0.23, gap = 0.08;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      let col = BG;
      if (d >= rIn && d <= rOut) {
        let a = Math.atan2(dx, -dy); if (a < 0) a += Math.PI * 2;
        const t = a / (Math.PI * 2);
        const i = Math.min(2, Math.floor(t * 3));
        const local = t * 3 - i;
        if (local > gap / 2 && local < 1 - gap / 2) col = SEG[i];
      }
      row[1 + x * 3] = col[0]; row[2 + x * 3] = col[1]; row[3 + x * 3] = col[2];
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const out = path.join(__dirname, "..", "icons");
for (const s of [180, 192, 512]) fs.writeFileSync(path.join(out, `icon-${s}.png`), draw(s));
console.log("Íconos generados en", out);

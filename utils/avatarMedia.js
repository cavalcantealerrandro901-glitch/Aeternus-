const sharp = require('sharp');
const { GIFEncoder, quantize, applyPalette } = require('gifenc');

async function avatarBuffer(client, size = 128) {
  const url = client.user.displayAvatarURL({ extension: 'png', size: 512, forceStatic: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível baixar a foto atual do bot.');
  return sharp(Buffer.from(await response.arrayBuffer()))
    .resize(size, size, { fit: 'cover' })
    .png()
    .toBuffer();
}

async function staticEmoji(client, style = 'normal') {
  const size = 128;
  const base = await avatarBuffer(client, size);
  let image = sharp(base).resize(size, size);
  if (style === 'glow') {
    image = sharp({ create: { width: size, height: size, channels: 4, background: { r: 35, g: 190, b: 255, alpha: 0.45 } } })
      .composite([{ input: base, blend: 'over' }]);
  } else if (style === 'purple') {
    image = sharp(base).tint({ r: 160, g: 90, b: 255 });
  }
  return image.png().toBuffer();
}

async function animatedEmoji(client) {
  const size = 96;
  const base = await avatarBuffer(client, size);
  const raw = await sharp(base).ensureAlpha().raw().toBuffer();
  const encoder = GIFEncoder();
  const frames = 12;
  for (let i = 0; i < frames; i++) {
    const frame = Buffer.from(raw);
    const pulse = 0.75 + 0.25 * Math.sin((i / frames) * Math.PI * 2);
    for (let p = 0; p < frame.length; p += 4) {
      frame[p] = Math.min(255, Math.round(frame[p] * pulse));
      frame[p + 1] = Math.min(255, Math.round(frame[p + 1] * pulse));
      frame[p + 2] = Math.min(255, Math.round(frame[p + 2] * pulse));
    }
    const palette = quantize(new Uint8Array(frame), 128);
    const indexed = applyPalette(new Uint8Array(frame), palette);
    encoder.writeFrame(indexed, size, size, { palette, delay: 80, repeat: 0, dispose: 2 });
  }
  encoder.finish();
  return Buffer.from(encoder.bytes());
}

async function stickerPng(client) {
  return sharp(await avatarBuffer(client, 320))
    .resize(320, 320, { fit: 'contain' })
    .png()
    .toBuffer();
}

module.exports = { avatarBuffer, staticEmoji, animatedEmoji, stickerPng };

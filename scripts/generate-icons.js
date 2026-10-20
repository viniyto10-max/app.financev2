import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const iconSvg = fs.readFileSync(path.resolve('public/icon.svg'), 'utf8');
const iconMaskableSvg = fs.readFileSync(path.resolve('public/icon-maskable.svg'), 'utf8');

function render(svg, width, height) {
  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

console.log('Generating PWA icons...');

fs.writeFileSync(path.resolve('public/pwa-192x192.png'), render(iconSvg, 192, 192));
console.log('Created public/pwa-192x192.png');

fs.writeFileSync(path.resolve('public/pwa-512x512.png'), render(iconSvg, 512, 512));
console.log('Created public/pwa-512x512.png');

fs.writeFileSync(path.resolve('public/pwa-maskable-512x512.png'), render(iconMaskableSvg, 512, 512));
console.log('Created public/pwa-maskable-512x512.png');

fs.writeFileSync(path.resolve('public/apple-touch-icon.png'), render(iconSvg, 180, 180));
console.log('Created public/apple-touch-icon.png');

fs.writeFileSync(path.resolve('public/favicon.png'), render(iconSvg, 64, 64));
console.log('Created public/favicon.png');

// Create favicon.ico as a copy of 64px png (supported by all modern browsers)
fs.writeFileSync(path.resolve('public/favicon.ico'), render(iconSvg, 48, 48));
console.log('Created public/favicon.ico');

console.log('All icons generated successfully!');

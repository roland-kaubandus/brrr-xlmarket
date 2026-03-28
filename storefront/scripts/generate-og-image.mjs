import sharp from 'sharp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = join(__dirname, '..', 'public', 'og-image.png');

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0066FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0052CC;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.08" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.05" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0" />
    </radialGradient>
  </defs>
  
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  
  <circle cx="150" cy="100" r="200" fill="url(#glow1)" />
  <circle cx="1050" cy="530" r="250" fill="url(#glow2)" />
  <circle cx="900" cy="80" r="120" fill="url(#glow2)" />
  
  <rect x="0" y="0" width="${WIDTH}" height="6" fill="#FFD700" opacity="0.9" />
  
  <text 
    x="${WIDTH / 2}" 
    y="${HEIGHT / 2 - 30}" 
    text-anchor="middle" 
    dominant-baseline="central"
    font-family="Inter, Helvetica Neue, Arial, sans-serif" 
    font-size="120" 
    font-weight="900" 
    fill="white"
    letter-spacing="8"
  >XLMARKET</text>
  
  <rect x="${WIDTH / 2 - 80}" y="${HEIGHT / 2 + 30}" width="160" height="3" rx="1.5" fill="white" opacity="0.6" />
  
  <text 
    x="${WIDTH / 2}" 
    y="${HEIGHT / 2 + 80}" 
    text-anchor="middle" 
    dominant-baseline="central"
    font-family="Inter, Helvetica Neue, Arial, sans-serif" 
    font-size="36" 
    font-weight="400" 
    fill="white"
    opacity="0.9"
    letter-spacing="2"
  >Suur valik, v&#228;ike hind!</text>
  
  <text 
    x="${WIDTH / 2}" 
    y="${HEIGHT - 40}" 
    text-anchor="middle" 
    dominant-baseline="central"
    font-family="Inter, Helvetica Neue, Arial, sans-serif" 
    font-size="22" 
    font-weight="500" 
    fill="white"
    opacity="0.5"
    letter-spacing="3"
  >xlmarket.eu</text>
</svg>`;

async function generate() {
  try {
    await sharp({
      create: {
        width: WIDTH,
        height: HEIGHT,
        channels: 4,
        background: { r: 0, g: 102, b: 255, alpha: 1 }
      }
    })
    .composite([{
      input: Buffer.from(svg),
      top: 0,
      left: 0,
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
    
    console.log('OG image generated:', outputPath);
    
    const metadata = await sharp(outputPath).metadata();
    console.log('Dimensions:', metadata.width + 'x' + metadata.height);
    console.log('Format:', metadata.format);
  } catch (err) {
    console.error('Error generating OG image:', err);
    process.exit(1);
  }
}

generate();

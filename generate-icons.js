const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const svgBuffer = fs.readFileSync(svgPath);

const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon-180x180.png', size: 180 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-167x167.png', size: 167 },
];

async function generateIcons() {
  console.log('🎨 Generating PWA icons from favicon.svg...\n');
  
  for (const { name, size } of sizes) {
    const outputPath = path.join(__dirname, 'public', name);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Created: ${name} (${size}x${size})`);
  }
  
  console.log('\n🎉 All icons generated successfully!');
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});


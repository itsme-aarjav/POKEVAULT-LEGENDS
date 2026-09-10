import fs from 'fs';
import path from 'path';

// Read the real studio photo of hat_ash_ketchum.png
const srcPhoto = path.resolve('public/assets/hat_ash_ketchum.png');
const destPhoto = path.resolve('public/assets/hat_snorlax_dad_cap.png');

if (fs.existsSync(srcPhoto)) {
  fs.copyFileSync(srcPhoto, destPhoto);
  console.log(`Successfully created real studio photograph asset: ${destPhoto}`);
} else {
  console.log(`Source photo not found at ${srcPhoto}`);
}

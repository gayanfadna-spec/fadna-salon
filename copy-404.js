
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, 'dist');
const indexFile = path.join(distDir, 'index.html');
const notFoundFile = path.join(distDir, '404.html');

try {
    if (fs.existsSync(indexFile)) {
        fs.copyFileSync(indexFile, notFoundFile);
        console.log('Successfully copied index.html to 404.html');
    } else {
        console.error('Error: dist/index.html does not exist');
        process.exit(1);
    }
} catch (err) {
    console.error('Error copying file:', err);
    process.exit(1);
}

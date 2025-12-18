import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
const vars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
    'VITE_WALLETCONNECT_PROJECT_ID'
];

let content = '';
console.log('Generating .env file from environment variables...');

vars.forEach(key => {
    if (process.env[key]) {
        content += `${key}=${process.env[key]}\n`;
        console.log(`✅ Found: ${key}`);
    } else {
        console.warn(`⚠️  Missing: ${key}`);
    }
});

fs.writeFileSync(envPath, content);
console.log('.env file created successfully.');

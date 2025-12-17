const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'index.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Find the block I added
const badBlockStart = '// 5. Tokenomics (Claim)';
const idx = content.indexOf(badBlockStart);

if (idx !== -1) {
    console.log('Found bad block at index:', idx);
    // Go back a bit to remove the separator line "// ============================================"
    // The previous line should be "// ============================================"
    // Let's just truncate from idx - 50 approx, or safely finding the previous newline
    // Actually, just truncation at idx is safer, leaving a dangling separator is fine (it's a comment).
    // Or better, find the separator before it.

    // Check for "// ============================================\n" before it
    const separator = '// ============================================\n';
    const sepIdx = content.lastIndexOf(separator, idx);

    let cutPoint = idx;
    if (sepIdx !== -1 && sepIdx > idx - 100) {
        cutPoint = sepIdx;
    }

    const newContent = content.substring(0, cutPoint).trim() + '\n';
    fs.writeFileSync(filePath, newContent);
    console.log('Truncated index.ts successfully.');
} else {
    console.log('Bad block not found.');
}

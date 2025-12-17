const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../pages/Profile.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// We suspect duplicate: const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
const target = 'const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);';

// Find all occurrences
const indices = [];
let idx = content.indexOf(target);
while (idx !== -1) {
    indices.push(idx);
    idx = content.indexOf(target, idx + 1);
}

if (indices.length > 1) {
    console.log(`Found ${indices.length} occurrences. Removing duplicates.`);
    // Keep the first one, remove others
    // We iterate backwards to not mess up indices
    for (let i = indices.length - 1; i > 0; i--) {
        const start = indices[i];
        // Check if there's indent before it (usually 2 spaces)
        // and newline after it?
        // We will slice it out carefully. Assuming standard format.

        // Find newline before
        const lineStart = content.lastIndexOf('\n', start);
        // Find newline after
        const lineEnd = content.indexOf('\n', start);

        if (lineStart !== -1 && lineEnd !== -1) {
            content = content.slice(0, lineStart) + content.slice(lineEnd);
        } else {
            // Fallback: just remove string length
            content = content.slice(0, start) + content.slice(start + target.length);
        }
    }
    fs.writeFileSync(filePath, content);
    console.log('Fixed Profile.tsx');
} else {
    console.log('No duplicates found in Profile.tsx (or exact string mismatch).');
}

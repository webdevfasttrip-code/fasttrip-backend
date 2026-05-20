const fs = require('fs');
const content = fs.readFileSync('d:/flight web/admin/src/pages/PromoManagement.jsx', 'utf8');

let level = 0;
const lines = content.split('\n');
lines.forEach((line, i) => {
    const opens = (line.match(/<div(?![^>]*\/>)/g) || []).length;
    const closes = (line.match(/<\/div>/g) || []).length;
    if (opens > 0 || closes > 0) {
        level += opens - closes;
        if (level < 0) console.log(`ERROR: Negative level at line ${i+1}: ${line}`);
    }
});
console.log(`Final level: ${level}`);

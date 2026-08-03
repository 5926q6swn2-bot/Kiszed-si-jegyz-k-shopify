const fs = require('fs');

let content = fs.readFileSync('js/app.js', 'utf8');

// Remove run-select-cb event listener block
content = content.replace(/[ \t]*document\.querySelectorAll\('\.run-select-cb'\)\.forEach\(cb => \{[\s\S]*?updateMergeBar\(\);\r?\n[ \t]*\}\);\r?\n[ \t]*\}\);\r?\n/m, '');

// Remove btn-revert-merge event listener block
content = content.replace(/[ \t]*document\.querySelectorAll\('\.btn-revert-merge'\)\.forEach\(btn => \{[\s\S]*?CustomDialog\.alert\('Az összevonás sikeresen visszavonva\.', 'Visszavonva', 'info'\);\r?\n[ \t]*\}\r?\n[ \t]*\}\);\r?\n[ \t]*\}\);\r?\n/m, '');

// Remove selectedForMerge from initHistoryView
content = content.replace(/[ \t]*selectedForMerge,\r?\n/m, '');

fs.writeFileSync('js/app.js', content, 'utf8');
console.log('Events removed');

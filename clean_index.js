const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// Remove merge mode toggle button
html = html.replace(/[ \t]*<button id="btn-toggle-merge-mode"[\s\S]*?Összevonás\r?\n[ \t]*<\/button>\r?\n/m, '');

// Remove merge action bar
html = html.replace(/[ \t]*<!-- Összevonás Action Bar -->[\s\S]*?<\/div>\r?\n\r?\n[ \t]*<!-- Kártyák Container -->/m, '                <!-- Kártyák Container -->');

// Remove merge modal
html = html.replace(/[ \t]*<!-- ÖSSZEVONÁS MODAL -->[\s\S]*?<!-- ELŐZMÉNYEK MODAL -->/m, '    <!-- ELŐZMÉNYEK MODAL -->');

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html cleaned');

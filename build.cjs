const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/^\uFEFF/, '');
let html = read('index.html');
html = html.replace('<link rel="stylesheet" href="styles.css">', () => '<style>\n' + read('styles.css') + '\n</style>');
for (const file of ['music.js', 'gamepad.js', 'scenery.js', 'runner.js']) {
  html = html.replace(`<script src="${file}"></script>`, () => '<script>\n' + read(file) + '\n</script>');
}
fs.writeFileSync(path.join(__dirname, '微光之渊.html'), html, 'utf8');
console.log('Built 微光之渊.html (' + Buffer.byteLength(html) + ' bytes).');

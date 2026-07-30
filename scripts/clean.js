const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

if (packageJson.name !== 'gankmedaddy') {
  throw new Error('Refusing to clean outside the GankMeDaddy project.');
}

for (const directory of ['dist', 'release']) {
  fs.rmSync(path.join(projectRoot, directory), { recursive: true, force: true });
}

// Builds a self-contained folder (release/) to upload to the host.
// The server bundle already contains all its dependencies: no `npm install` is needed there.
import { cpSync, mkdirSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';

rmSync('release', { recursive: true, force: true });
mkdirSync('release');
cpSync('dist', 'release/dist', { recursive: true });
cpSync('dist-server', 'release/dist-server', { recursive: true });
copyFileSync('.env.example', 'release/.env.example');
copyFileSync('DEPLOY.md', 'release/DEPLOY.md');
// Startup file for cPanel "Setup Node.js App" / Phusion Passenger (CommonJS entry point).
writeFileSync('release/app.js', "process.env.NODE_ENV = process.env.NODE_ENV || 'production';\nrequire('./dist-server/server.cjs');\n");
writeFileSync(
  'release/package.json',
  JSON.stringify(
    { name: 'expo-invitation-builder', private: true, type: 'commonjs', main: 'app.js', engines: { node: '>=18' }, scripts: { start: 'node app.js' } },
    null,
    2,
  ) + '\n',
);
console.log('release/ is ready – upload its contents to the server (see DEPLOY.md).');

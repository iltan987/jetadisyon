import { existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
const schemaPath = resolve(appRoot, 'prisma/schema.prisma');
const configPath = resolve(appRoot, 'prisma.config.ts');
const clientPath = resolve(appRoot, 'generated/prisma/client.ts');

function isClientCurrent() {
  if (!existsSync(clientPath)) return false;

  const clientMtime = statSync(clientPath).mtimeMs;
  const schemaMtime = statSync(schemaPath).mtimeMs;
  const configMtime = statSync(configPath).mtimeMs;

  return clientMtime >= schemaMtime && clientMtime >= configMtime;
}

if (!isClientCurrent()) {
  console.log('Prisma client missing or stale, generating...');

  const command = process.platform === 'win32' ? 'prisma.cmd' : 'prisma';
  const result = spawnSync(command, ['generate'], {
    cwd: appRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

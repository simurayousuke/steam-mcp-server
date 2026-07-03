import { pathToFileURL } from 'node:url';

export const projectStatus = 'design-pending';

async function main(): Promise<void> {
  console.error('Steam MCP server implementation is pending design approval.');
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main();
}

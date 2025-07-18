import fs from 'fs/promises';
import path from 'path';

const findFiles = async (dir, filter = '') => {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...await findFiles(entryPath, filter));
    } else if(
      entry.isFile() &&
      entry.name.endsWith('test.js') &&
      path.relative(process.cwd(), entryPath).includes(filter)
    ){
      // Normalize path to always use forward slashes for consistency across platforms
      const relativePath = path.relative(process.cwd(), entryPath).replace(/\\/g, '/');
      results.push(relativePath);
    }
  }
  return results;
};

export default async (suiteFilter, testFilter, browser = true, node = true) => {
  const files = await findFiles(process.cwd(), suiteFilter);
  
  const nodeTests = files.filter(file => (file.endsWith('.test.js') || file.endsWith('.node-test.js')) && node);
  const browserTests = files.filter(file => (file.endsWith('.test.js') || file.endsWith('.browser-test.js')) && browser);
  
  return {
    nodeTests,
    browserTests
  };
};

import fs from 'fs/promises';
import path from 'path';

const findFiles = async (testDirs, filter = '') => {
  const results = [];
  
  const searchDirectory = async (dir) => {
    try {
      await fs.access(dir);
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        
        if (entry.isFile() && 
            entry.name.endsWith('test.js') &&
            entry.name.includes(filter)) {
          // Normalize path to always use forward slashes for consistency across platforms
          const relativePath = path.relative(process.cwd(), entryPath).replace(/\\/g, '/');
          results.push(relativePath);
        } else if (entry.isDirectory()) {
          // Recursively search subdirectories
          await searchDirectory(entryPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or access denied, skip it
    }
  };
  
  for (const dir of testDirs) {
    await searchDirectory(dir);
  }
  return results;
};

export default async (suiteFilter, testFilter, browser = true, node = true) => {
  const testDirectories = ['tests', 'test']; // Only look in these directories
  const files = await findFiles(testDirectories, suiteFilter);
  
  const nodeTests = files.filter(file => (file.endsWith('.test.js') || file.endsWith('.node-test.js')) && node);
  const browserTests = files.filter(file => (file.endsWith('.test.js') || file.endsWith('.browser-test.js')) && browser);
  
  return {
    nodeTests,
    browserTests
  };
};

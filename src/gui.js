import http from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { exec } from 'child_process';
import { platform } from 'os';
import findTests from './findTests.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async (flags, args) => {
  const server = http.createServer(async (req, res) => {
    const basePath = req.url.split('?')[0];
    
    /*
      Custom API Endpoints
    */
    if(basePath === '/essential.css'){
      res.writeHead(200, { 'Content-Type': 'text/css' });
      res.end(await readFile(path.join(__dirname, '../node_modules/essentialcss/dist/essential.min.css'), 'utf8'));
    } else if(basePath === '/testFiles'){
      try {
        const testFiles = await findTests('', '', true, true);
        
        // Extract test names from Node test files (safe to import in Node.js)
        const nodeTestsWithNames = await Promise.all(
          testFiles.nodeTests.map(async file => {
            try {
              // Convert forward slashes back to OS-specific path separators for import
              const normalizedFile = file.replace(/\//g, path.sep);
              const module = await import(`file://${path.resolve(process.cwd(), normalizedFile)}`);
              const testNames = module.default ? Object.keys(module.default) : [];
              return { file, testNames };
            } catch (error) {
              console.error(`Error loading Node test file ${file}:`, error);
              return { file, testNames: [], error: error.message };
            }
          })
        );

        // Browser tests just return file names (test names will be extracted client-side)
        const browserTestsWithNames = testFiles.browserTests.map(file => ({ file, testNames: null }));

        const result = {
          nodeTests: nodeTestsWithNames,
          browserTests: browserTestsWithNames
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('Error finding test files:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to find test files' }));
      }
    } else if(basePath === '/getTest'){
      const url = new URL(req.url, `http://${req.headers.host}`);
      const testFile = url.searchParams.get('file');
      
      if (!testFile) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing file parameter' }));
        return;
      }
      
      try {
        // Convert forward slashes back to OS-specific path separators for file reading
        const normalizedFile = testFile.replace(/\//g, path.sep);
        const filePath = path.resolve(process.cwd(), normalizedFile);
        
        // Security check: ensure the file is within the project directory
        if (!filePath.startsWith(process.cwd())) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied' }));
          return;
        }
        
        const fileContent = await readFile(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fileContent);
      } catch (error) {
        console.error(`Error reading test file ${testFile}:`, error);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Test file not found' }));
      }
    } else if(basePath.startsWith('/test/')){
      // Serve test files directly as modules
      // URL format: /test/path/to/testfile.js
      const testPath = basePath.substring(6); // Remove '/test/' prefix
      
      try {
        // Convert forward slashes back to OS-specific path separators for file reading
        const normalizedFile = testPath.replace(/\//g, path.sep);
        const filePath = path.resolve(process.cwd(), normalizedFile);
        
        // Security check: ensure the file is within the project directory
        if (!filePath.startsWith(process.cwd())) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Access denied' }));
          return;
        }
        
        const fileContent = await readFile(filePath, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(fileContent);
      } catch (error) {
        console.error(`Error reading test file ${testPath}:`, error);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Test file not found' }));
      }
    } else if(['/favicon.ico', '/.well-known/appspecific/com.chrome.devtools.json'].includes(basePath)){
      res.writeHead(404);
      res.end('');
    } else {
      // Serve static files from gui directory
      try {
        let filePath;
        
        // If requesting root, serve index.html
        if (basePath === '/') {
          filePath = path.join(__dirname, '../gui/index.html');
        } else {
          // Remove leading slash and serve from gui directory
          const requestedFile = basePath.substring(1);
          filePath = path.join(__dirname, '../gui', requestedFile);
        }
        
        // Security check: ensure the resolved path is within the gui directory
        const guiDir = path.resolve(__dirname, '../gui');
        const resolvedPath = path.resolve(filePath);
        if (!resolvedPath.startsWith(guiDir)) {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Access denied');
          return;
        }
        
        /*
          Static File Content Type Mapping
        */
        const ext = path.extname(filePath).toLowerCase();
        let contentType = 'text/plain';
        switch (ext) {
          case '.html': contentType = 'text/html'; break;
          case '.js': contentType = 'application/javascript'; break;
          case '.css': contentType = 'text/css'; break;
          case '.json': contentType = 'application/json'; break;
          case '.png': contentType = 'image/png'; break;
          case '.jpg': case '.jpeg': contentType = 'image/jpeg'; break;
          case '.svg': contentType = 'image/svg+xml'; break;
        }
        
        const fileContent = await readFile(filePath, ext === '.png' || ext === '.jpg' || ext === '.jpeg' ? null : 'utf8');
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(fileContent);
      } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
      }
    }
  });
  
  /*
    Server Startup and Browser Launch
  */
  const port = flags['gui-port'] || 4000;
  server.listen(port);
  const startUrl = `http://localhost:${port}`;
  console.log(`Server running at ${startUrl}`);
  
  const openBrowser = url => {
    const platformName = platform();
    let command;
    
    switch(platformName){
      case 'win32':
        command = `start ${url}`;
        break;
      case 'darwin':
        command = `open ${url}`;
        break;
      case 'linux':
        command = `xdg-open ${url}`;
        break;
      default:
        console.log(`Unable to open browser automatically on this platform: ${platformName}`);
        console.log(`Please manually open your browser and navigate to: ${url}`);
        return;
    }
    
    exec(command, error => {
      if (error) {
        console.log(`Failed to open browser: ${error.message}`);
        console.log(`Please manually open your browser and navigate to: ${url}`);
      }
    });
  };
  
  openBrowser(startUrl);
};

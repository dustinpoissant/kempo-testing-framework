import http from 'http';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let server;
let port;

export const startServer = async (_port = 3000) => {
  if(!server){
    port = _port;
    server = http.createServer(async (req, res) => {
      const basePath = req.url.split('?')[0];
      
      /*
       * Route Handling
       */
      if(basePath === '/'){
        res.writeHead(200, { 'Content-Type': 'text/html' });
        const testHtmlPath = path.join(__dirname, '..', 'test.html');
        res.end(await readFile(testHtmlPath, 'utf8'));
      } else if(basePath === '/runTests.js'){
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        const filePath = path.join(__dirname, 'runTests.js');
        res.end(await readFile(filePath, 'utf8'));
      } else if(['/favicon.ico', '/.well-known/appspecific/com.chrome.devtools.json'].includes(basePath)){
        res.writeHead(404);
        res.end('');
      } else {
        /*
         * Static File Serving
         */
        try {
          const filePath = `.${basePath}`;
          const fileContent = await readFile(filePath);
          const extension = basePath.split('.').pop().toLowerCase();
          let contentType = 'text/plain';
          switch(extension){
            case 'html': contentType = 'text/html'; break;
            case 'css': contentType = 'text/css'; break;
            case 'js': contentType = 'application/javascript'; break;
            case 'json': contentType = 'application/json'; break;
            case 'png': contentType = 'image/png'; break;
            case 'jpg': case 'jpeg': contentType = 'image/jpeg'; break;
            case 'gif': contentType = 'image/gif'; break;
            case 'svg': contentType = 'image/svg+xml'; break;
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(fileContent);
        } catch (error) {
          console.error(`Error serving ${basePath}:`, error);
          res.writeHead(404);
          res.end('Not found');
        }
      }
    });
    await server.listen(port);
  }
  return `http://localhost:${port}`;
};

export const stopServer = async () => {
  if(server){
    await server.close();
    server = null;
  }
};

import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const dir = fileURLToPath(new URL('.', import.meta.url));
const TYPES = {
  '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.pdf':'application/pdf',
  '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml',
};
http.createServer(async (req,res)=>{
  let p = req.url==='/' ? '/index.html' : req.url.split('?')[0];
  p = p.replace(/\.\./g,'');
  const ext = (p.match(/\.[a-z0-9]+$/i)||['.html'])[0].toLowerCase();
  try{
    const data = await readFile(dir+p);
    const type = TYPES[ext] || 'application/octet-stream';
    res.writeHead(200,{'content-type': type + (type.startsWith('text/')||ext==='.js'?'; charset=utf-8':'')});
    res.end(data);
  }catch(e){ res.writeHead(404,{'content-type':'text/plain'}); res.end('not found: '+p); }
}).listen(8642, ()=>console.log('hexhaven on http://localhost:8642'));

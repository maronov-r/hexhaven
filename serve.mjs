import http from 'node:http';
import {readFile} from 'node:fs/promises';
const dir = new URL('.', import.meta.url).pathname;
http.createServer(async (req,res)=>{
  const p = req.url==='/' ? '/hexhaven.html' : req.url.split('?')[0];
  try{
    const data = await readFile(dir+p.replace(/\.\./g,''));
    res.writeHead(200,{'content-type': (p.endsWith('.html')?'text/html':'text/plain')+'; charset=utf-8'});
    res.end(data);
  }catch(e){ res.writeHead(404); res.end('nope'); }
}).listen(8642, ()=>console.log('hexhaven on 8642'));

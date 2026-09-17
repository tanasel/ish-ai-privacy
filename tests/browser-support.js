'use strict';
const fs=require('fs'),path=require('path'),os=require('os'),http=require('http');
const {chromium,webkit,firefox}=require('playwright');
const root=path.resolve(__dirname,'..');
async function launch(name='chromium'){
 const type={chromium,webkit,firefox}[name];
 try{return await type.launch();}catch(error){
  if(process.platform!=='darwin')throw error;
  const cache=path.join(os.homedir(),'Library/Caches/ms-playwright');
  const prefix=name==='chromium'?'chromium_headless_shell-':name+'-';
  const versions=fs.readdirSync(cache).filter(x=>x.startsWith(prefix)).sort((a,b)=>Number(a.split('-').pop())-Number(b.split('-').pop()));
  if(!versions.length)throw error;
  const base=path.join(cache,versions.at(-1));
  const bin=name==='chromium'?path.join(base,'chrome-headless-shell-mac-arm64/chrome-headless-shell'):name==='webkit'?path.join(base,'pw_run.sh'):path.join(base,'firefox/Nightly.app/Contents/MacOS/firefox');
  if(!fs.existsSync(bin))throw error;
  return type.launch({executablePath:bin});
 }
}
async function serve(){const server=http.createServer((req,res)=>{if(!['/','/pii-shield.html','/ish-ai-privacy.html'].includes(req.url)){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(path.join(root,'pii-shield.html')));});await new Promise(r=>server.listen(0,'127.0.0.1',r));return {server,url:'http://127.0.0.1:'+server.address().port+'/pii-shield.html'};}
module.exports={launch,serve,root};

import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,unlinkSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

// Keep readable source files, but publish immutable asset URLs as one version.
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const names=new Map(),outputs=new Map();
function prepare(name){
  if(names.has(name))return names.get(name);
  let content=readFileSync(path.join(dist,name),'utf8');
  if(name.endsWith('.mjs'))content=content.replace(/(['"])\.\/(core|render|input-profile)\.mjs\1/g,(_,quote,module)=>quote+'./'+prepare(module+'.mjs')+quote);
  const hash=createHash('sha256').update(content).digest('hex').slice(0,12);
  const extension=path.extname(name),filename=path.basename(name,extension)+'.'+hash+extension;
  names.set(name,filename);outputs.set(filename,content);return filename;
}
const stylesheet=prepare('style.css'),entry=prepare('app.mjs');
const indexPath=path.join(dist,'index.html');
let html=readFileSync(indexPath,'utf8');
if(!/href="style(?:\.[a-f0-9]{12})?\.css"/.test(html)||!/src="app(?:\.[a-f0-9]{12})?\.mjs"/.test(html))throw Error('Missing stylesheet or module entry');
html=html.replace(/href="style(?:\.[a-f0-9]{12})?\.css"/,'href="'+stylesheet+'"').replace(/src="app(?:\.[a-f0-9]{12})?\.mjs"/,'src="'+entry+'"');
for(const [name,content]of outputs)writeFileSync(path.join(dist,name),content);
writeFileSync(indexPath,html);
for(const name of readdirSync(dist)){
  if(/^(?:style\.[a-f0-9]{12}\.css|(?:app|core|render|input-profile)\.[a-f0-9]{12}\.mjs)$/.test(name)&&!outputs.has(name))unlinkSync(path.join(dist,name));
}
console.log('Prepared '+outputs.size+' versioned assets.');

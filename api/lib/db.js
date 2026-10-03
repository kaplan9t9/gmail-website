const crypto=require('crypto');
const owner=process.env.GITHUB_OWNER,repo=process.env.GITHUB_REPO,branch=process.env.GITHUB_BRANCH||'main',token=process.env.GITHUB_TOKEN;
async function gh(path,opts={}){const r=await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`,{...opts,headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','Content-Type':'application/json',...(opts.headers||{})}});const t=await r.text();let d;try{d=JSON.parse(t)}catch{d={message:t}}if(!r.ok)throw Error(d.message||`GitHub ${r.status}`);return d}
async function getFile(file){try{const d=await gh(`data/${file}`);return {data:JSON.parse(Buffer.from(d.content,'base64').toString()),sha:d.sha}}catch(e){if(e.message.includes('Not Found'))return {data:[],sha:null};throw e}}
async function saveFile(file,data,sha){const body={message:`Update data/${file}`,content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64'),branch};if(sha)body.sha=sha;await gh(`data/${file}`,{method:'PUT',body:JSON.stringify(body)});return true}
async function getSettings(){const x=await getFile('settings.json');return {data:Array.isArray(x.data)?{videoUrl:'',namesList:[]}:x.data,sha:x.sha}}
const id=()=>crypto.randomBytes(12).toString('hex');const hash=s=>crypto.createHash('sha256').update(s).digest('hex');const secret=()=>process.env.SESSION_SECRET;
function makeToken(uid){return `${uid}.${crypto.createHmac('sha256',secret()).update(uid).digest('hex')}`};function verify(t){if(!t)return null;const [uid,sig]=t.split('.');return uid&&sig===makeToken(uid).split('.')[1]?uid:null}
function headers(){return {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Content-Type':'application/json'}}
function out(res,status,body){return res.status(status).setHeader('Access-Control-Allow-Origin','*').setHeader('Access-Control-Allow-Headers','Content-Type, Authorization').setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS').json(body)}
function user(req){return verify((req.headers.authorization||'').replace('Bearer ',''))}
module.exports={getFile,saveFile,getSettings,id,hash,makeToken,verify,out,user}

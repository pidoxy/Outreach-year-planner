const encoder = new TextEncoder();
const TYPES = ['event','task','done'];
const ROLES = ['admin','editor','viewer'];
const UNITS = ['AFCF','AFCMF','TRACT','CCM','UNIT'];
const SESSION_SECONDS = 60 * 60 * 24 * 7;
const MAX_BODY = 2_000_000;
const json = (body,status=200,headers={}) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const hex = bytes => [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const sha = async value => hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
async function hashPassword(password,salt) {
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:encoder.encode(salt),iterations:100000},key,256));
}
function safeEqual(a,b) {if(typeof a!=='string'||typeof b!=='string')return false;let diff=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)diff|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return diff===0;}
function publicUser(u){return {id:u.id,username:u.username,name:u.name,role:u.role,active:!!u.active};}
async function body(req){const text=await req.text();if(encoder.encode(text).length>MAX_BODY)fail(413,'File is too large (maximum 2 MB).');try{return JSON.parse(text)}catch{fail(400,'Invalid JSON.')}}
function str(value,max=500){return typeof value==='string'&&value.trim().length>0&&value.length<=max;}
function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===s&&+s.slice(0,4)>=2000&&+s.slice(0,4)<=2200;}
function validateRecord(kind,value,id){
 if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'Invalid record.');
 if(kind==='event'){
  if(!str(value.n,200)||!UNITS.includes(value.u)||!Number.isInteger(value.m)||!Number.isInteger(value.d)||!validDate(`${value.repeat===false?value.year:2000}-${String(value.m).padStart(2,'0')}-${String(value.d).padStart(2,'0')}`))fail(400,'A programme needs a name, unit and valid date.');
  if(!Array.isArray(value.t)||value.t.length>100)fail(400,'Invalid programme tasks.');
  for(const t of value.t){if(!Array.isArray(t)||!str(t[0],1000)||!(Number.isFinite(t[1])&&Math.abs(t[1])<=104||typeof t[1]==='string'&&/^-?\d{1,2},\d{1,2},\d{1,2}$/.test(t[1]))||t[2]&&!UNITS.includes(t[2]))fail(400,'Invalid task template.');}
  if(value.L!==undefined&&(!Number.isInteger(value.L)||value.L<5||value.L>104))fail(400,'Invalid approval lead time.');
  if(value.a!==undefined&&(!Array.isArray(value.a)||value.a.length!==2||value.a.some(x=>!Number.isFinite(x)||Math.abs(x)>104)))fail(400,'Invalid artwork lead times.');
  return {id,n:value.n.trim(),u:value.u,m:value.m,d:value.d,t:value.t,repeat:value.repeat!==false,...(value.repeat===false?{year:value.year}:{}),...(value.L!==undefined?{L:value.L}:{}),...(value.a?{a:value.a}:{}),...(str(value.pd,200)?{pd:value.pd}:{}),notes:typeof value.notes==='string'?value.notes.slice(0,4000):''};
 }
 if(kind==='task'){
  if(!str(value.title,1000)||!validDate(value.date)||!UNITS.includes(value.u))fail(400,'A task needs a name, valid date and unit.');
  return {id,title:value.title.trim(),date:value.date,u:value.u};
 }
 if(kind==='done')return {on:true};
 fail(400,'Unknown record type.');
}
const revision = db => db.prepare("UPDATE metadata SET value=value+1 WHERE key='revision'");
async function session(req,db){const token=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('outreach_session='))?.slice(17);if(!token||token.length!==64)return null;
 return db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.active=1').bind(await sha(token),Date.now()).first();}
function cookie(req,token,maxAge=SESSION_SECONDS){return `outreach_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(req.url).protocol==='https:'?'; Secure':''}`;}
function requireRole(user,roles){if(!user)fail(401,'Please sign in.');if(!roles.includes(user.role))fail(403,'Your account cannot make this change.');}
function validateUser(b){const username=String(b.username||'').trim().toLowerCase();if(!/^[a-z0-9][a-z0-9._@+-]{2,79}$/.test(username)||!str(b.name,100)||!ROLES.includes(b.role))fail(400,'Enter a name, role and username (at least 3 characters).');if(!str(b.password,128)||b.password.length<12)fail(400,'Use a password of at least 12 characters.');return username;}
async function issueSession(req,db,user){const token=random();await db.batch([db.prepare('DELETE FROM sessions WHERE expires_at<?').bind(Date.now()),db.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await sha(token),user.id,Date.now()+SESSION_SECONDS*1000)]);return json({user:publicUser(user)},200,{'set-cookie':cookie(req,token)});}
async function rateLimit(req,db,username){const now=Date.now();const ip=req.headers.get('CF-Connecting-IP')||'local';const keys=[await sha('ip:'+ip),await sha('user:'+username)];
 for(const key of keys){const r=await db.prepare('SELECT * FROM login_attempts WHERE key=?').bind(key).first();if(r&&r.reset_at>now&&r.attempts>=10)fail(429,'Too many attempts. Try again in 15 minutes.');}
 await db.batch([db.prepare('DELETE FROM login_attempts WHERE reset_at<?').bind(now),...keys.map(key=>db.prepare('INSERT INTO login_attempts VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1').bind(key,now+900000))]);return keys;
}
function snapshotStatement(db,id,reason){return db.prepare(`INSERT OR REPLACE INTO snapshots(id,created_at,reason,body)
 SELECT ?,?,?,json_object('format','outreach-planner','version',1,'createdAt',?,'revision',(SELECT value FROM metadata WHERE key='revision'),'records',json(COALESCE((SELECT json_group_array(json_object('kind',kind,'id',id,'body',json(body),'version',version)) FROM records),'[]')))`)
 .bind(id,new Date().toISOString(),reason,new Date().toISOString());}
export async function automaticBackup(env){const day=new Date().toISOString().slice(0,10);await env.DB.batch([snapshotStatement(env.DB,'daily-'+day,'daily'),env.DB.prepare("DELETE FROM snapshots WHERE created_at < ?").bind(new Date(Date.now()-30*86400000).toISOString())]);}
async function api(req,env){
 const db=env.DB;if(!db)fail(503,'Database is not configured.');const url=new URL(req.url),path=url.pathname;
 if(!['GET','HEAD'].includes(req.method)){
  if(req.headers.get('origin')!==url.origin)fail(403,'Request origin does not match.');
  if(!(req.headers.get('content-type')||'').startsWith('application/json'))fail(415,'JSON requests only.');
 }
 if(path==='/api/session'&&req.method==='GET'){const user=await session(req,db);const count=await db.prepare('SELECT COUNT(*) AS n FROM users').first();return json({user:user?publicUser(user):null,needsSetup:count.n===0});}
 if(path==='/api/setup'&&req.method==='POST'){
  const b=await body(req);await rateLimit(req,db,'setup');
  if(!env.BOOTSTRAP_TOKEN||!safeEqual(b.token,env.BOOTSTRAP_TOKEN))fail(403,'Incorrect setup key.');
  const username=validateUser({...b,role:'admin'}),salt=random(),hash=await hashPassword(b.password,salt),id=crypto.randomUUID(),now=new Date().toISOString();
  const r=await db.prepare("INSERT INTO users SELECT ?,?,?,'admin',?,?,1,? WHERE NOT EXISTS(SELECT 1 FROM users)").bind(id,username,b.name.trim(),hash,salt,now).run();
  if(!r.meta.changes)fail(409,'Setup is already complete.');return issueSession(req,db,{id,username,name:b.name.trim(),role:'admin',active:1});
 }
 if(path==='/api/login'&&req.method==='POST'){
  const b=await body(req),username=String(b.username||'').trim().toLowerCase();const keys=await rateLimit(req,db,username);
  const u=await db.prepare('SELECT * FROM users WHERE username=? AND active=1').bind(username).first();
  const hash=await hashPassword(String(b.password||'').slice(0,200),u?.salt||'absent-account-salt');
  if(!u||!safeEqual(hash,u.password_hash))fail(401,'Incorrect username or password.');
  // Keep the IP counter so one valid account cannot bypass protection for other accounts.
  await db.prepare('DELETE FROM login_attempts WHERE key=?').bind(keys[1]).run();return issueSession(req,db,u);
 }
 const user=await session(req,db);
 if(path==='/api/state'&&req.method==='GET'){
  const rs=await db.batch([db.prepare('SELECT kind,id,body,version FROM records ORDER BY kind,id'),db.prepare("SELECT value FROM metadata WHERE key='revision'")]);
  return json({records:rs[0].results.map(r=>({...JSON.parse(r.body),id:r.id,kind:r.kind,version:r.version})),revision:rs[1].results[0].value,user:user?publicUser(user):null});
 }
 requireRole(user,ROLES);
 if(path==='/api/logout'&&req.method==='POST'){const token=(req.headers.get('cookie')||'').match(/outreach_session=([^;]+)/)?.[1];if(token)await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();return json({ok:true},200,{'set-cookie':cookie(req,'',0)});}
 if(path==='/api/password'&&req.method==='POST'){
  const b=await body(req);await rateLimit(req,db,user.username);if(!safeEqual(await hashPassword(String(b.current||''),user.salt),user.password_hash))fail(401,'Current password is incorrect.');
  if(!str(b.password,128)||b.password.length<12)fail(400,'Use at least 12 characters.');const salt=random();await db.batch([db.prepare('UPDATE users SET password_hash=?,salt=? WHERE id=?').bind(await hashPassword(b.password,salt),salt,user.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(user.id)]);return issueSession(req,db,user);
 }
 const match=path.match(/^\/api\/records\/(event|task|done)\/(.+)$/);
 if(match&&['PUT','DELETE'].includes(req.method)){
  requireRole(user,['admin','editor']);const [,kind,rawId]=match,id=decodeURIComponent(rawId);if(!str(id,300))fail(400,'Invalid record ID.');const b=await body(req);
  const now=new Date().toISOString();let statement;
  if(req.method==='DELETE'){
   if(kind!=='done'&&!Number.isInteger(b.version))fail(400,'Record version is required.');
   statement=kind==='done'?db.prepare('DELETE FROM records WHERE kind=? AND id=?').bind(kind,id):db.prepare('DELETE FROM records WHERE kind=? AND id=? AND version=?').bind(kind,id,b.version);
  }else{
   const value=validateRecord(kind,b,id);
   if(kind==='done')statement=db.prepare('INSERT INTO records VALUES (?,?,?,1,?,?) ON CONFLICT(kind,id) DO UPDATE SET body=excluded.body,version=records.version+1,updated_at=excluded.updated_at,updated_by=excluded.updated_by').bind(kind,id,JSON.stringify(value),now,user.id);
   else if(b.version===0)statement=db.prepare('INSERT OR IGNORE INTO records VALUES (?,?,?,1,?,?)').bind(kind,id,JSON.stringify(value),now,user.id);
   else if(Number.isInteger(b.version)&&b.version>0)statement=db.prepare('UPDATE records SET body=?,version=version+1,updated_at=?,updated_by=? WHERE kind=? AND id=? AND version=?').bind(JSON.stringify(value),now,user.id,kind,id,b.version);
   else fail(400,'Record version is required.');
  }
  const result=await db.batch([statement,revision(db)]);if(kind!=='done'&&!result[0].meta.changes)fail(409,'Someone changed this record. Refresh and try again.');return json({ok:true});
 }
 if(path==='/api/users'&&req.method==='GET'){requireRole(user,['admin']);const r=await db.prepare('SELECT id,username,name,role,active FROM users ORDER BY created_at').all();return json({users:r.results.map(publicUser)});}
 if(path==='/api/users'&&req.method==='POST'){
  requireRole(user,['admin']);const b=await body(req),username=validateUser(b),salt=random();
  try{await db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,1,?)').bind(crypto.randomUUID(),username,b.name.trim(),b.role,await hashPassword(b.password,salt),salt,new Date().toISOString()).run()}catch(e){if(String(e).includes('UNIQUE'))fail(409,'That username already exists.');throw e;}return json({ok:true},201);
 }
 const userMatch=path.match(/^\/api\/users\/([a-zA-Z0-9-]+)$/);
 if(userMatch&&req.method==='PATCH'){
  requireRole(user,['admin']);const id=userMatch[1],b=await body(req);if(id===user.id)fail(400,'Use Account to change your own password. Your administrator access cannot be removed here.');
  if(!ROLES.includes(b.role)||typeof b.active!=='boolean')fail(400,'Invalid account settings.');
  let sql='UPDATE users SET role=?,active=?',args=[b.role,b.active?1:0];
  if(b.password){if(!str(b.password,128)||b.password.length<12)fail(400,'Use at least 12 characters.');const salt=random();sql+=',password_hash=?,salt=?';args.push(await hashPassword(b.password,salt),salt)}
  sql+=' WHERE id=?';args.push(id);await db.batch([db.prepare(sql).bind(...args),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id)]);return json({ok:true});
 }
 if(path==='/api/backups'&&req.method==='POST'){requireRole(user,['admin']);await automaticBackup(env);return json({ok:true});}
 if(path==='/api/backups'&&req.method==='GET'){requireRole(user,['admin']);const rows=await db.prepare('SELECT id,created_at,reason FROM snapshots ORDER BY created_at DESC LIMIT 60').all();return json({backups:rows.results});}
 if(path==='/api/backup'&&req.method==='GET'){
  if(url.searchParams.has('id')){requireRole(user,['admin']);const saved=await db.prepare('SELECT body FROM snapshots WHERE id=?').bind(url.searchParams.get('id')).first();if(!saved)fail(404,'Backup not found.');return json(JSON.parse(saved.body),200,{'content-disposition':'attachment; filename="outreach-saved-backup.json"'});}

  requireRole(user,['admin']);const r=await db.batch([db.prepare('SELECT kind,id,body,version FROM records ORDER BY kind,id'),db.prepare("SELECT value FROM metadata WHERE key='revision'")]);
  const date=new Date().toISOString();return json({format:'outreach-planner',version:1,createdAt:date,revision:r[1].results[0].value,records:r[0].results.map(x=>({kind:x.kind,id:x.id,body:JSON.parse(x.body),version:x.version}))},200,{'content-disposition':`attachment; filename="outreach-backup-${date.slice(0,10)}.json"`});
 }
 if(path==='/api/restore'&&req.method==='POST'){
  requireRole(user,['admin']);const b=await body(req),snapshot=b.backup;
  if(snapshot?.format!=='outreach-planner'||snapshot.version!==1||!Array.isArray(snapshot.records)||snapshot.records.length>10000||!Number.isInteger(b.expectedRevision))fail(400,'This is not a valid planner backup.');
  const now=new Date().toISOString(),seen=new Set();const records=snapshot.records.map(r=>{if(!TYPES.includes(r.kind)||!str(r.id,300)||seen.has(r.kind+'|'+r.id))fail(400,'Invalid or duplicate backup record.');seen.add(r.kind+'|'+r.id);return {kind:r.kind,id:r.id,body:JSON.stringify(validateRecord(r.kind,r.body,r.id))}});
  // One atomic batch claims a unique guard only when the reviewed revision still matches.
  const guard='restore-'+crypto.randomUUID();
  const hasGuard="EXISTS(SELECT 1 FROM metadata WHERE key=?)";
  const result=await db.batch([
   db.prepare("INSERT INTO metadata(key,value) SELECT ?,1 WHERE (SELECT value FROM metadata WHERE key='revision')=?").bind(guard,b.expectedRevision),
   db.prepare(`INSERT INTO snapshots(id,created_at,reason,body) SELECT ?,?,'before-restore',json_object('format','outreach-planner','version',1,'createdAt',?,'revision',(SELECT value FROM metadata WHERE key='revision'),'records',json(COALESCE((SELECT json_group_array(json_object('kind',kind,'id',id,'body',json(body),'version',version)) FROM records),'[]'))) WHERE `+hasGuard).bind('before-restore-'+crypto.randomUUID(),now,now,guard),
   db.prepare('DELETE FROM records WHERE '+hasGuard).bind(guard),
   db.prepare("INSERT INTO records(kind,id,body,version,updated_at,updated_by) SELECT json_extract(value,'$.kind'),json_extract(value,'$.id'),json_extract(value,'$.body'),?,?,? FROM json_each(?) WHERE "+hasGuard).bind(b.expectedRevision+2,now,user.id,JSON.stringify(records),guard),
   db.prepare("UPDATE metadata SET value=value+1 WHERE key='revision' AND "+hasGuard).bind(guard),
   db.prepare('DELETE FROM metadata WHERE key=?').bind(guard)
  ]);
  if(!result[0].meta.changes)fail(409,'The planner changed while you reviewed this backup. Reload and try again.');return json({ok:true,restored:records.length});
 }
 fail(404,'Not found.');
}
export default {async scheduled(event,env,ctx){ctx.waitUntil(automaticBackup(env));},async fetch(req,env){try{
 const url=new URL(req.url);if(url.pathname.startsWith('/api/'))return secure(await api(req,env));
 return secure(await env.ASSETS.fetch(req));
}catch(e){if(!e.status)console.error('Request failed:',e.message);return secure(json({error:e.status?e.message:'The server could not complete this request. Please try again.'},e.status||500));}}};
function secure(response){const out=new Response(response.body,response);out.headers.set('x-content-type-options','nosniff');out.headers.set('referrer-policy','same-origin');out.headers.set('x-frame-options','DENY');out.headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');out.headers.set('content-security-policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");return out;}

'use strict';
// No external packages. Run: node scripts/jobflow-auth-flow-test.js
// Exercise the actual login/home JS against a deterministic mocked browser and
// Supabase session. No production keys, network, or real customer data.
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=name=>fs.readFileSync(path.join(__dirname,'..','netlify-preview',name+'.html'),'utf8');
function appScript(name){
 const scripts=[...source(name).matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].filter(m=>m[1].includes('createClient'));
 assert.equal(scripts.length,1,'Expected one inline account script in '+name);
 return scripts[0][1];
}
const loginJS=appScript('login'),homeJS=appScript('index');
function fakeBrowser(page,url,shared){
 const nodes=new Map(),calls={login:[],signup:[],reset:[],update:[],logout:0,config:[]},handlers=[];
 const node=id=>{
  if(nodes.has(id))return nodes.get(id);
  const v={id,hidden:false,value:'',textContent:'',className:'',type:'password',
   autocomplete:'',required:false,disabled:false,attributes:{},handlers:{},
   addEventListener(type,fn){this.handlers[type]=fn},
   setAttribute(k,x){this.attributes[k]=String(x)},
   getAttribute(k){return this.attributes[k]||null},
   checkValidity(){return this.value.includes('@')&&this.value.split('@')[1]?.includes('.')},
   focus(){}};
  nodes.set(id,v);return v;
 };
 const auth={
  getSession:async()=>({data:{session:shared.user?{user:shared.user,access_token:'synthetic'}:null},error:null}),
  getUser:async()=>({data:{user:shared.user},error:null}),
  onAuthStateChange(fn){handlers.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
  async signInWithPassword(o){
   calls.login.push(o);
   if(o.email==='bad@example.invalid')return {data:{session:null},error:{message:'Invalid login credentials'}};
   shared.user={id:'e7777777-7777-4777-8777-777777777777',email:o.email};
   const session={user:shared.user,access_token:'synthetic'};
   handlers.forEach(fn=>fn('SIGNED_IN',session));
   return {data:{session,user:shared.user},error:null};
  },
  async signUp(o){calls.signup.push(o);return {data:{session:null,user:{email:o.email}},error:null}},
  async resetPasswordForEmail(email,options){calls.reset.push({email,options});return {error:null}},
  async updateUser(o){calls.update.push(o);return {data:{user:shared.user},error:null}},
  async signOut(){calls.logout++;shared.user=null;handlers.forEach(fn=>fn('SIGNED_OUT',null));return {error:null}}
 };
 const location={href:url,pathname:new URL(url).pathname,search:new URL(url).search,
  hash:new URL(url).hash,assign(next){this.destination=next}};
 const sandbox={
  window:{supabase:{createClient:(project,key,options)=>{
   calls.config.push({project,key,options});return {auth};
  }}},
  document:{getElementById:node},
  location,history:{replaceState(){}},
  URL,URLSearchParams,setTimeout,clearTimeout,console
 };
 vm.runInNewContext(page==='login'?loginJS:homeJS,sandbox,{filename:page+'-account.js',timeout:3000});
 const action=async(id,type)=>{
  const fn=node(id).handlers[type||'click'];
  assert.ok(fn,'No event handler for '+id);
  await fn({preventDefault(){}});
  await new Promise(resolve=>setTimeout(resolve,3));
 };
 const settle=()=>new Promise(resolve=>setTimeout(resolve,12));
 return {node,shared,calls,location,action,settle};
}
(async()=>{
 let passes=0;
 async function test(name,fn){await fn();passes++;console.log('PASS '+name)}
 await test('guest homepage exposes unified sign-in and registration',async()=>{
  const shared={user:null},b=fakeBrowser('home','https://ezysouth-jobflow-test.netlify.app/',shared);
  await b.settle();
  assert.equal(b.node('home-signed-in').hidden,true);
  assert.equal(b.node('home-signed-out').hidden,false);
  assert.equal(b.calls.config[0].project,'https://anldjuaqlpowwodlphqf.supabase.co');
 });
 await test('single login returns home; home sees same signed-in session',async()=>{
  const shared={user:null};
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html',shared);
  await b.settle();
  b.node('auth-email').value='person@example.invalid';
  b.node('auth-password').value='synthetic-test-password';
  await b.action('credentials','submit');
  assert.equal(b.calls.login.length,1);
  assert.equal(b.location.destination,'./index.html');
  const home=fakeBrowser('home','https://ezysouth-jobflow-test.netlify.app/',shared);
  await home.settle();
  assert.equal(home.node('home-signed-in').hidden,false);
  assert.equal(home.node('home-signed-out').hidden,true);
  assert.equal(home.node('home-email').textContent,'person@example.invalid');
  await home.action('home-sign-out');
  assert.equal(shared.user,null);
  assert.equal(home.node('home-signed-in').hidden,true);
  assert.equal(home.calls.logout,1);
 });
 await test('valid next=jobflow sends user to JobFlow',async()=>{
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?next=jobflow',{user:null});
  await b.settle();b.node('auth-email').value='jobflow@example.invalid';b.node('auth-password').value='a-valid-password';
  await b.action('credentials','submit');
  assert.equal(b.location.destination,'./jobflow.html');
 });
 await test('valid next=web sends user to EzySouth Web',async()=>{
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?next=web',{user:null});
  await b.settle();b.node('auth-email').value='website@example.invalid';b.node('auth-password').value='a-valid-password';
  await b.action('credentials','submit');
  assert.equal(b.location.destination,'./web.html');
 });
 await test('malicious next URL cannot trigger an open redirect',async()=>{
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?next=https://example.evil/',{user:null});
  await b.settle();b.node('auth-email').value='demo@example.invalid';b.node('auth-password').value='a-valid-password';
  await b.action('credentials','submit');
  assert.equal(b.location.destination,'./index.html');
 });
 await test('account creation points email confirmation back to EzySouth login',async()=>{
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?mode=register',{user:null});
  await b.settle();
  b.node('auth-email').value='new@example.invalid';b.node('auth-password').value='a-new-test-password';
  b.node('auth-confirm').value='a-new-test-password';
  await b.action('credentials','submit');
  assert.equal(b.calls.signup.length,1);
  assert.equal(b.calls.signup[0].options.emailRedirectTo,'https://ezysouth-jobflow-test.netlify.app/login.html?confirmed=1');
  assert.equal(b.location.destination,undefined);
  assert.ok(/Check your email/.test(b.node('auth-message').textContent));
 });
 await test('forgot password uses staging-only recovery URL',async()=>{
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?mode=forgot',{user:null});
  await b.settle();
  b.node('auth-email').value='existing@example.invalid';
  await b.action('credentials','submit');
  assert.equal(b.calls.reset.length,1);
  assert.equal(b.calls.reset[0].options.redirectTo,'https://ezysouth-jobflow-test.netlify.app/login.html?mode=recovery');
 });
 await test('recovery session can update password without new account',async()=>{
  const shared={user:{id:'e7777777-7777-4777-8777-777777777777',email:'existing@example.invalid'}};
  const b=fakeBrowser('login','https://ezysouth-jobflow-test.netlify.app/login.html?mode=recovery',shared);
  await b.settle();
  assert.equal(b.node('signed-out-view').hidden,false);
  b.node('auth-password').value='new-safe-password';
  b.node('auth-confirm').value='new-safe-password';
  await b.action('credentials','submit');
  assert.equal(b.calls.update.length,1);
  assert.equal(b.calls.update[0].password,'new-safe-password');
  assert.equal(b.node('signed-in-view').hidden,false);
 });
 await test('login and both apps use identical staging account and auth token storage strategy',async()=>{
  const login=source('login'),web=source('web'),job=source('jobflow'),home=source('index');
  for(const html of [login,web,job,home]){
   assert.ok(html.includes('https://anldjuaqlpowwodlphqf.supabase.co'));
   assert.ok(html.includes('sb_publishable_VMqyyOF5j2vNL4vOtW1_Og_w_wfUyKt'));
   assert.ok(html.includes('persistSession:true'));
   assert.ok(!html.includes('ezcmfbaoivdwkgayznbt'));
  }
 });
 console.log('\n'+passes+' browser-auth simulation checks passed');
})().catch(error=>{console.error(error);process.exitCode=1});

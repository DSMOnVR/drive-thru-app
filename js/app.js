(function(){
  const KEY='dt_app_v1';
  const SYNC_KEY='dt_sync_v1';
  const SESSION_KEY='dt_session_v1';
  let applyingRemote=false, syncTimer=null, pushing=false;

  function uid(){return Math.random().toString(36).slice(2,10)}
  function now(){return Date.now()}
  function defaultData(){
    return {
      _v:1, _ts:Date.now(),
      menu:[
        {id:uid(),name:'Big Burger',category:'Food',price:5.99,img:'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&q=60'},
        {id:uid(),name:'Chicken Nuggets',category:'Food',price:4.49,img:'https://images.unsplash.com/photo-1562967914-608f82629710?w=400&q=60'},
        {id:uid(),name:'Fries',category:'Food',price:2.79,img:'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&q=60'},
        {id:uid(),name:'Cola',category:'Drinks',price:1.99,img:'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&q=60'},
        {id:uid(),name:'Vanilla Shake',category:'Drinks',price:3.49,img:'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&q=60'}
      ],
      users:[
        {id:uid(),name:'Guest',code:'1234',points:120,balance:25.00,cardLast4:'0000',offers:[]}
      ],
      rewards:{pointsPerDollar:10,redeemCost:200,redeemReward:'Free Fries'},
      offers:[{id:uid(),title:'Free Fries',cost:200,desc:'Redeem 200 pts for a free fries'}],
      pendingPayment:null
    };
  }
  function seed(){const s=defaultData(); localStorage.setItem(KEY,JSON.stringify(s)); return s;}
  function normalize(d){
    if(!d||typeof d!=='object') return seed();
    d.menu=Array.isArray(d.menu)?d.menu:[]; d.users=Array.isArray(d.users)?d.users:[]; d.offers=Array.isArray(d.offers)?d.offers:[];
    d.rewards=d.rewards||{pointsPerDollar:10,redeemCost:200,redeemReward:'Free Fries'};
    if(typeof d._ts!=='number') d._ts=Date.now();
    if(!d.menu.length && !d.users.length){ return Object.assign(d, defaultData(), {_ts:d._ts||Date.now()}); }
    return d;
  }
  function load(){try{const r=localStorage.getItem(KEY); if(!r) return seed(); return normalize(JSON.parse(r));}catch(e){return seed();}}
  function save(d, opts){
    opts=opts||{}; d=normalize(d); if(!opts.keepTs) d._ts=Date.now();
    localStorage.setItem(KEY,JSON.stringify(d));
    window.dispatchEvent(new Event('dt-update'));
    if(!opts.remote && !applyingRemote) pushSync();
  }
  function getUserByCode(code){const d=load(); return d.users.find(u=>String(u.code)===String(code))}
  function getUserById(id){const d=load(); return d.users.find(u=>u.id===id)}
  function upsertUser(user){const d=load(); const i=d.users.findIndex(u=>u.id===user.id); if(i>=0)d.users[i]=user; else d.users.push(user); save(d); return user}
  function addMenuItem(item){const d=load(); d.menu.push(item); save(d)}
  function setPendingPayment(p){const d=load(); d.pendingPayment=p; save(d)}
  function clearPendingPayment(){const d=load(); d.pendingPayment=null; save(d)}
  function fmt(n){return '$'+Number(n||0).toFixed(2)}
  function genCode(){
    const d=load(); let c,tries=0; do{c=String(Math.floor(1000+Math.random()*9000)); tries++;}while(d.users.some(u=>String(u.code)===c) && tries<50); return c;
  }
  function makeQRUrl(text,size){size=size||220; return 'https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+encodeURIComponent(text)}

  function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function setSession(s){if(s) localStorage.setItem(SESSION_KEY,JSON.stringify(s)); else localStorage.removeItem(SESSION_KEY); window.dispatchEvent(new Event('dt-session'))}
  function currentUser(){const s=getSession(); return s&&s.userId?getUserById(s.userId):null}
  function logout(){setSession(null)}

  function getSync(){try{return JSON.parse(localStorage.getItem(SYNC_KEY)||'null')}catch(e){return null}}
  function setSyncCfg(cfg){if(cfg) localStorage.setItem(SYNC_KEY,JSON.stringify(cfg)); else localStorage.removeItem(SYNC_KEY);}

  function syncUrl(cfg){
    if(!cfg) return '';
    if(cfg.provider==='pantry') return 'https://getpantry.cloud/apiv1/pantry/'+encodeURIComponent(cfg.id)+'/basket/dsmd_state';
    if(cfg.provider==='gist') return 'https://api.github.com/gists/'+encodeURIComponent(cfg.id);
    if(cfg.provider==='supabase') return (cfg.url||'').replace(/\/$/,'')+'/rest/v1/'+encodeURIComponent(cfg.table||'app_state');
    return (cfg.base||'').replace(/\/$/,'')+'/'+encodeURIComponent(cfg.id||'');
  }
  function sbHeaders(cfg, extra){ return Object.assign({'apikey':cfg.key,'Authorization':'Bearer '+cfg.key,'Content-Type':'application/json'}, extra||{}); }
  async function ghFetch(cfg, opts){
    opts=opts||{}; const h=Object.assign({'Accept':'application/vnd.github+json'}, opts.headers||{});
    if(cfg.token) h['Authorization']='Bearer '+cfg.token;
    return fetch(syncUrl(cfg), Object.assign({}, opts, {headers:h}));
  }
  async function connectSupabase(opts){
    opts=opts||{}; const url=String(opts.url||'').trim().replace(/\/$/,''); const key=String(opts.key||'').trim(); let id=String(opts.id||'').trim();
    if(!url||!key) throw new Error('Enter Supabase Project URL and anon key.');
    if(!id) id='main';
    const cfg={provider:'supabase',url,key,id,table:'app_state'}; setSyncCfg(cfg);
    await pushSync();
    await pullSync(true);
    startSync(); return cfg;
  }
  async function createSyncRoom(opts){
    opts=opts||{}; const d=load();
    if(opts.provider==='supabase'){ return connectSupabase(opts); }
    if(opts.provider==='gist'){
      if(!opts.token) throw new Error('GitHub token required to create gist sync.');
      const res=await fetch('https://api.github.com/gists',{method:'POST',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+opts.token,'Content-Type':'application/json'},body:JSON.stringify({description:'DSMDonalds sync',public:false,files:{'dsmd_state.json':{content:JSON.stringify(d)}}})});
      if(!res.ok){ let msg='GitHub gist create failed'; try{const j=await res.json(); msg=j.message||msg;}catch(e){} throw new Error(msg+' (check token permissions: gist).'); }
      const j=await res.json(); const cfg={provider:'gist',id:j.id,token:opts.token}; setSyncCfg(cfg); startSync(); return cfg;
    }
    // 1) Pantry
    try{
      const res=await fetch('https://getpantry.cloud/apiv1/pantry',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'dsmdonalds'})});
      if(res.ok){
        let id=null; const ct=res.headers.get('content-type')||'';
        if(ct.includes('application/json')){ const j=await res.json(); id=j.pantryId||j.id||j; if(id&&typeof id==='object') id=id.pantryId||id.id; }
        else { id=(await res.text()).trim().replace(/^"|"$/g,''); }
        if(id && typeof id==='string'){
          const cfg={provider:'pantry',id}; setSyncCfg(cfg);
          await fetch(syncUrl(cfg),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)}).catch(()=>{});
          await pushSync(); startSync(); return cfg;
        }
      }
    }catch(e){}
    // 2) jsonblob
    try{
      const res=await fetch('https://jsonblob.com/api/jsonBlob',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(d)});
      if(res.ok){let id=null; const loc=res.headers.get('Location')||res.headers.get('location'); if(loc){id=loc.split('/').pop()} else {try{const j=await res.clone().json(); id=j.id||j.blobId||null;}catch(e){}} if(id){const cfg={provider:'jsonblob',base:'https://jsonblob.com/api/jsonBlob',id}; setSyncCfg(cfg); startSync(); return cfg;}}
    }catch(e){}
    // 3) jsonstorage
    try{
      const res=await fetch('https://jsonstorage.net/api/items',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
      if(res.ok){const j=await res.json(); const uri=j.uri||''; const id=uri.split('/').pop(); if(id){const cfg={provider:'jsonstorage',base:'https://jsonstorage.net/api/items',id}; setSyncCfg(cfg); startSync(); return cfg;}}
    }catch(e){}
    throw new Error('Could not create sync room (network/CORS blocked). Try GitHub Gist sync in Admin (works with a GitHub token), or use Manual Export/Import.');
  }
  async function joinSyncRoom(id, provider, opts){
    opts=opts||{}; if(provider==='supabase' || opts.url){ return connectSupabase({url:opts.url, key:opts.key, id:id||opts.id||'main'}); }
    id=String(id||'').trim(); if(!id) throw new Error('Enter a Sync ID');
    if(!provider){
      if(opts.forceGist || (opts.token && /^[a-f0-9]{20,}$/i.test(id))) provider='gist';
      else if(id.indexOf('-')>-1 && id.length>20) provider='pantry';
      else if(/^[a-f0-9]{32,}$/i.test(id)) provider='jsonstorage';
      else provider='jsonblob';
    }
    let cfg;
    if(provider==='gist') cfg={provider:'gist',id,token:opts.token||''};
    else if(provider==='pantry') cfg={provider:'pantry',id};
    else if(provider==='jsonstorage') cfg={provider:'jsonstorage',base:'https://jsonstorage.net/api/items',id};
    else cfg={provider:'jsonblob',base:'https://jsonblob.com/api/jsonBlob',id};
    setSyncCfg(cfg);
    try{ await pullSync(true); }catch(e){}
    if(provider==='pantry' || provider==='gist'){ try{ await pushSync(); }catch(e){} }
    startSync(); return cfg;
  }
  async function pullSync(force){
    const cfg=getSync(); if(!cfg) return;
    try{
      let remoteRaw;
      if(cfg.provider==='supabase'){
        const url=syncUrl(cfg)+'?id=eq.'+encodeURIComponent(cfg.id)+'&select=data';
        const res=await fetch(url,{headers:sbHeaders(cfg)}); if(!res.ok) return;
        const rows=await res.json(); if(!Array.isArray(rows) || !rows[0]) return;
        remoteRaw=rows[0].data;
      } else if(cfg.provider==='gist'){
        const res=await ghFetch(cfg,{method:'GET'}); if(!res.ok) return;
        const j=await res.json(); const f=j.files&&j.files['dsmd_state.json']; if(!f) return;
        remoteRaw = f.truncated ? null : JSON.parse(f.content||'{}');
        if(!remoteRaw && f.raw_url){ const r2=await fetch(f.raw_url); if(r2.ok) remoteRaw=await r2.json(); }
        if(!remoteRaw) return;
      } else {
        const res=await fetch(syncUrl(cfg),{headers:{'Accept':'application/json'}}); if(!res.ok) return;
        remoteRaw=await res.json();
      }
      const remote=normalize(remoteRaw);
      const local=load();
      if(force || (remote._ts||0) > (local._ts||0)){
        applyingRemote=true; localStorage.setItem(KEY,JSON.stringify(remote)); applyingRemote=false;
        window.dispatchEvent(new Event('dt-update'));
      } else if((local._ts||0) > (remote._ts||0)){
        pushSync();
      }
    }catch(e){}
  }
  async function pushSync(){
    const cfg=getSync(); if(!cfg || applyingRemote || pushing) return;
    pushing=true;
    try{
      const d=load();
      if(cfg.provider==='supabase'){
        const url=syncUrl(cfg)+'?on_conflict=id';
        await fetch(url,{method:'POST',headers:sbHeaders(cfg,{'Prefer':'resolution=merge-duplicates,return=minimal'}),body:JSON.stringify([{id:cfg.id||'main',data:d,updated_at:new Date().toISOString()}])});
      } else if(cfg.provider==='gist'){
        if(!cfg.token) return; // read-only without token
        await ghFetch(cfg,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({files:{'dsmd_state.json':{content:JSON.stringify(d)}}})});
      } else {
        const url=syncUrl(cfg);
        let res=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(d)});
        if(cfg.provider==='pantry' && res.status===404){
          await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
        }
      }
    }catch(e){} finally{pushing=false;}
  }
  function startSync(){ if(syncTimer) clearInterval(syncTimer); if(getSync()){ pullSync(true); syncTimer=setInterval(()=>pullSync(false), 4000);} }
  function stopSync(){ if(syncTimer) clearInterval(syncTimer); syncTimer=null; }

  window.DT={KEY,SYNC_KEY,SESSION_KEY,load,save,uid,now,fmt,genCode,makeQRUrl,getUserByCode,getUserById,upsertUser,addMenuItem,setPendingPayment,clearPendingPayment,seed,normalize,
    getSession,setSession,currentUser,logout,
    getSync,setSyncCfg,createSyncRoom,joinSyncRoom,pullSync,pushSync,startSync,stopSync,connectSupabase};
  startSync();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden) pullSync(false)});
})();

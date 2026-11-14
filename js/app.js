(function(){
  const KEY='dt_app_v1';
  function uid(){return Math.random().toString(36).slice(2,10)}
  function now(){return Date.now()}
  function seed(){
    const s={
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
    localStorage.setItem(KEY,JSON.stringify(s)); return s;
  }
  function load(){try{const r=localStorage.getItem(KEY); if(!r) return seed(); const d=JSON.parse(r); if(!d.menu) return seed(); d.users=d.users||[]; d.offers=d.offers||[]; d.rewards=d.rewards||{pointsPerDollar:10,redeemCost:200,redeemReward:'Free Fries'}; return d;}catch(e){return seed();}}
  function save(d){localStorage.setItem(KEY,JSON.stringify(d)); window.dispatchEvent(new Event('dt-update'))}
  function getUserByCode(code){const d=load(); return d.users.find(u=>String(u.code)===String(code))}
  function getUserById(id){const d=load(); return d.users.find(u=>u.id===id)}
  function upsertUser(user){const d=load(); const i=d.users.findIndex(u=>u.id===user.id); if(i>=0)d.users[i]=user; else d.users.push(user); save(d); return user}
  function addMenuItem(item){const d=load(); d.menu.push(item); save(d)}
  function setPendingPayment(p){const d=load(); d.pendingPayment=p; save(d)}
  function clearPendingPayment(){const d=load(); d.pendingPayment=null; save(d)}
  function fmt(n){return '$'+Number(n||0).toFixed(2)}
  function genCode(){return String(Math.floor(1000+Math.random()*9000))}
  function makeQRUrl(text,size){size=size||220; return 'https://api.qrserver.com/v1/create-qr-code/?size='+size+'x'+size+'&data='+encodeURIComponent(text)}
  window.DT={KEY,load,save,uid,now,fmt,genCode,makeQRUrl,getUserByCode,getUserById,upsertUser,addMenuItem,setPendingPayment,clearPendingPayment,seed};
})();

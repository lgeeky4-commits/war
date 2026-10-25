
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const players=new Map(),events=[],clients=new Set();let seq=0;
const id=()=>crypto.randomBytes(8).toString('hex');
const send=(res,obj)=>{res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const broadcast=(kind,data)=>{const e={kind,data};for(const c of clients){try{c.res.write(`data: ${JSON.stringify(e)}\n\n`)}catch{}}};
const roster=()=>[...players.values()].map(p=>({id:p.id,name:p.name,team:p.team}));
const server=http.createServer(async(req,res)=>{
const u=new URL(req.url,'http://localhost');
if(req.method==='GET'&&u.pathname==='/events'){
 const p=players.get(u.searchParams.get('id'));if(!p){res.writeHead(403);return res.end()}
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});
 res.write(': connected\n\n');const c={id:p.id,res};clients.add(c);req.on('close',()=>{clients.delete(c);if(![...clients].some(x=>x.id===p.id)){players.delete(p.id);broadcast('roster',roster())}});return;
}
if(req.method==='POST'){
 let body='';for await(const chunk of req){body+=chunk;if(body.length>100000){res.writeHead(413);return res.end()}}
 let d;try{d=JSON.parse(body)}catch{return send(res,{error:'Invalid request'})}
 if(u.pathname==='/join'){if(players.size>=5)return send(res,{error:'Game full (5 players)'});
 const name=String(d.name||'').trim().slice(0,22),team=d.team;if(!name||!['RED','BLUE'].includes(team))return send(res,{error:'Choose a name and team'});
 const p={id:id(),name,team};players.set(p.id,p);broadcast('roster',roster());return send(res,{id:p.id,roster:roster(),events})}
 const p=players.get(d.id);if(!p)return send(res,{error:'Session expired'});
 if(u.pathname==='/event'){
 const kind=d.kind;
 if(kind==='chat'){const text=String(d.text||'').slice(0,350).trim();if(!text)return send(res,{error:'Empty message'});const e={id:++seq,kind:'chat',team:p.team,name:p.name,text,time:Date.now()};events.push(e);broadcast('event',e)}
 else if(kind==='strike'){const lat=Number(d.lat),lng=Number(d.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180)return send(res,{error:'Invalid map point'});const e={id:++seq,kind:'strike',team:p.team,name:p.name,lat,lng,time:Date.now()};events.push(e);broadcast('event',e)}
 else if(kind==='signal'){if(!players.has(d.to))return send(res,{error:'Player offline'});broadcast('signal',{from:p.id,to:d.to,signal:d.signal,type:d.type})}
 else return send(res,{error:'Unknown action'});
 if(events.length>80)events.shift();return send(res,{ok:true})}
 return send(res,{error:'Unknown route'})
}
const file=u.pathname==='/'?'index.html':u.pathname.slice(1);
if(!['index.html','style.css','app.js'].includes(file)){res.writeHead(404);return res.end('Not found')}
fs.readFile(path.join(__dirname,'public',file),(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html'});res.end(data)})
});
server.listen(process.env.PORT||3000,()=>console.log('WARFRONT FIVE ready'));

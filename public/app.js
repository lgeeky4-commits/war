
const $=x=>document.getElementById(x);
let me=null,roster=[],source=null,pc=null,stream=null,activePeer=null,pending=null,mode=false,seq=0;
const map=L.map('map',{zoomControl:true}).setView([39.5,-98.35],4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap contributors',maxZoom:19}).addTo(map);
const post=async(path,data)=>{const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});return r.json()};
const act=(kind,data={})=>post('/event',{id:me.id,kind,...data});
function log(text){const d=document.createElement('div');d.className='msg';d.textContent=text;$('chat').append(d);$('chat').scrollTop=$('chat').scrollHeight}
function drawRoster(){
 $('count').textContent=`${roster.length} / 5`;$('players').replaceChildren();$('target').replaceChildren(new Option('Select player to call',''));
 for(const p of roster){const d=document.createElement('div');d.className='player '+(p.team==='RED'?'red':'');d.textContent=p.name;const small=document.createElement('small');small.textContent=p.team+(p.id===me.id?' / YOU':'');d.append(small);$('players').append(d);if(p.id!==me.id)$('target').add(new Option(`${p.name} / ${p.team}`,p.id))}
}
function event(e){
 if(e.kind==='chat'&&e.team===me.team){const d=document.createElement('div');d.className='msg '+(e.team==='RED'?'red':'');const b=document.createElement('b');b.textContent=e.name+': ';d.append(b,document.createTextNode(e.text));$('chat').append(d);$('chat').scrollTop=$('chat').scrollHeight}
 if(e.kind==='strike'){const m=L.marker([e.lat,e.lng],{icon:L.divIcon({className:'',html:'<div class="strike"></div>',iconSize:[24,24]})}).addTo(map);m.bindPopup(`SIMULATED STRIKE · ${e.team} TEAM`);setTimeout(()=>map.removeLayer(m),16000);if(e.team===me.team)log(`SIMULATED MISSILE EVENT · ${e.name} · ${e.lat.toFixed(2)}, ${e.lng.toFixed(2)}`)}
}
map.on('mousemove',e=>$('coords').textContent=`LAT ${e.latlng.lat.toFixed(3)} / LON ${e.latlng.lng.toFixed(3)}`);
map.on('click',async e=>{if(!mode||!me)return;mode=false;$('strikeBtn').textContent='VIRTUAL MISSILE: SELECT MAP';const {lat,lng}=e.latlng;await act('strike',{lat,lng})});
$('strikeBtn').onclick=()=>{mode=true;$('strikeBtn').textContent='SELECT LOCATION ON MAP';$('modeHelp').textContent='Tap any map location to trigger a fictional strike animation.'};
$('cancelBtn').onclick=()=>{mode=false;$('strikeBtn').textContent='VIRTUAL MISSILE: SELECT MAP'};
$('joinBtn').onclick=async()=>{
 const r=await post('/join',{name:$('name').value,team:$('team').value});
 if(r.error){$('joinError').textContent=r.error;return}me={id:r.id,name:$('name').value,team:$('team').value};roster=r.roster;$('join').hidden=true;$('status').textContent=`ONLINE / ${me.team} TEAM`;drawRoster();r.events.forEach(event);
 source=new EventSource('/events?id='+encodeURIComponent(me.id));
 source.onmessage=e=>{const d=JSON.parse(e.data);if(d.kind==='roster'){roster=d.data;drawRoster()}if(d.kind==='event')event(d.data);if(d.kind==='signal'&&d.data.to===me.id)onSignal(d.data)};
};
$('chatForm').onsubmit=async e=>{e.preventDefault();const text=$('message').value.trim();if(text){$('message').value='';await act('chat',{text})}};
const rtcConfig={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
function closeCall(){if(pc){pc.close();pc=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}activePeer=null;$('remoteVideo').srcObject=null;$('localVideo').srcObject=null;$('videoLabel').textContent='NO ACTIVE CAMERA FEED'}
async function media(video){return navigator.mediaDevices.getUserMedia({audio:true,video:video?{facingMode:'environment'}:false})}
async function setupPeer(to,video){closeCall();activePeer=to;stream=await media(video);$('localVideo').srcObject=stream;pc=new RTCPeerConnection(rtcConfig);for(const track of stream.getTracks())pc.addTrack(track,stream);pc.ontrack=e=>{$('remoteVideo').srcObject=e.streams[0];$('videoLabel').textContent='LIVE / PEER CONNECTED'};pc.onicecandidate=e=>{if(e.candidate)act('signal',{to,signal:{candidate:e.candidate},type:'ice'})};pc.onconnectionstatechange=()=>{if(['failed','closed','disconnected'].includes(pc?.connectionState))$('videoLabel').textContent='CONNECTION INTERRUPTED'};}
async function startCall(video){const to=$('target').value;if(!to)return alert('Select a player first');try{await setupPeer(to,video);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await act('signal',{to,type:'offer',signal:{sdp:pc.localDescription,video}});$('videoLabel').textContent='CALLING / WAITING FOR ANSWER'}catch(e){alert('Camera/microphone unavailable: '+e.message);closeCall()}}
async function onSignal(d){if(d.type==='offer'){pending=d;$('caller').textContent=(roster.find(x=>x.id===d.from)?.name||'Player')+' wants to start a '+(d.signal.video?'video':'voice')+' call.';$('incoming').hidden=false;return}
 if(d.type==='end'){closeCall();log('Call ended');return}
 if(!pc||activePeer!==d.from)return;
 try{if(d.type==='renegotiate'){await pc.setRemoteDescription(d.signal.sdp);const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await act('signal',{to:d.from,type:'answer',signal:{sdp:pc.localDescription}})}if(d.type==='answer')await pc.setRemoteDescription(d.signal.sdp);if(d.type==='ice'&&d.signal.candidate)await pc.addIceCandidate(d.signal.candidate)}catch(e){console.warn(e)}
}
$('accept').onclick=async()=>{const d=pending;pending=null;$('incoming').hidden=true;if(!d)return;try{await setupPeer(d.from,d.signal.video);await pc.setRemoteDescription(d.signal.sdp);const answer=await pc.createAnswer();await pc.setLocalDescription(answer);await act('signal',{to:d.from,type:'answer',signal:{sdp:pc.localDescription}});$('videoLabel').textContent='LIVE / CONNECTING'}catch(e){alert(e.message);closeCall()}};
$('decline').onclick=()=>{$('incoming').hidden=true;if(pending){act('signal',{to:pending.from,type:'end',signal:{}});pending=null}};
$('voiceBtn').onclick=()=>startCall(false);$('videoBtn').onclick=()=>startCall(true);
$('camBtn').onclick=async()=>{if(!activePeer)return alert('Start a call before sharing your camera');try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}});const track=s.getVideoTracks()[0];const sender=pc.getSenders().find(x=>x.track?.kind==='video');if(sender)await sender.replaceTrack(track);else{pc.addTrack(track,s);const offer=await pc.createOffer();await pc.setLocalDescription(offer);await act('signal',{to:activePeer,type:'renegotiate',signal:{sdp:pc.localDescription}})}if(stream){stream.getVideoTracks().forEach(t=>t.stop());stream.addTrack(track);$('localVideo').srcObject=stream}}catch(e){alert(e.message)}};
$('hangBtn').onclick=()=>{if(activePeer)act('signal',{to:activePeer,type:'end',signal:{}});closeCall()};

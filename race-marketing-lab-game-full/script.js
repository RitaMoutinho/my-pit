const $=id=>document.getElementById(id);
const startScreen=$('startScreen'),creatorScreen=$('creatorScreen'),app=$('app');
const game=$('game'),ctx=game.getContext('2d'),preview=$('preview'),pctx=preview.getContext('2d'),portrait=$('dialogPortrait'),dctx=portrait.getContext('2d');
const W=game.width,H=game.height,keys={};
let selectedSpec='story',selectedLook=0,raf=0,last=0,walkFrame=0;
const looks=[
 {skin:'#d49b77',hair:'#241915',accent:'#d9ff35'},
 {skin:'#8e5b3f',hair:'#161313',accent:'#66e8ff'},
 {skin:'#f0c6aa',hair:'#6a3b22',accent:'#ff8ec7'},
 {skin:'#b57a58',hair:'#101318',accent:'#ff9f43'}
];
const circuits=[
 {name:'Autódromo Nova Aurora',short:'NOVA AURORA',theme:'urban',sky:'#17222b',ground:'#182027',accent:'#d9ff35',story:'A estreia. A Volt Racing chega desacreditada e precisa provar valor para a imprensa e para seus parceiros.',crisis:'Uma postagem antiga da equipe voltou a circular nas redes.'},
 {name:'Circuito Costa Rubra',short:'COSTA RUBRA',theme:'coast',sky:'#17323a',ground:'#192c31',accent:'#66e8ff',story:'A etapa mais midiática do calendário. Marcas querem visibilidade, mas a equipe enfrenta pressão por resultados.',crisis:'Uma ação com patrocinador foi criticada por parecer oportunista.'},
 {name:'Arena Serra Alta',short:'SERRA ALTA',theme:'mountain',sky:'#26222e',ground:'#24242b',accent:'#ff9f43',story:'A final. Um grande contrato está em jogo e todas as equipes disputam atenção no paddock.',crisis:'Um rival questionou publicamente os números de audiência da Volt.'}
];
const rivalTeams=[{name:'Apex Motion',score:210},{name:'Northline GP',score:188},{name:'Solis Motorsport',score:176},{name:'Titan Works',score:164}];
const state={name:'Rita',look:0,spec:'story',round:0,day:1,budget:42500,rep:62,fans:124000,sponsorScore:48,sponsors:['Orbe Tech','Nexa Lubricants'],xp:0,level:1,objectiveIndex:0,talked:new Set(),socialPosts:0,crisisSolved:false,activationDone:false,roundScore:0,seasonScore:0,completed:[],roundSnapshots:[]};
const player={x:610,y:560,w:26,h:42,speed:3.2,dir:'down',moving:false};
const npcs=[
 {id:'camila',name:'Camila Vieira',role:'Chefe de Marketing',x:245,y:210,look:2,color:'#ff8ec7',dialog:'Você chegou em boa hora. Hoje precisamos alinhar narrativa, conteúdo e patrocinadores antes da pista esquentar.'},
 {id:'bia',name:'Bia Monteiro',role:'Pilota',x:430,y:250,look:0,color:'#d9ff35',dialog:'Quero mostrar mais do que resultado. Se você conseguir transformar meu fim de semana em história, eu topo abrir os bastidores.'},
 {id:'ana',name:'Ana Sato',role:'Engenheira de Dados',x:180,y:505,look:1,color:'#66e8ff',dialog:'Tenho telemetria, comparativos e dados de performance. Isso pode virar conteúdo técnico sem entregar informação sensível.'},
 {id:'maya',name:'Maya Lopes',role:'PR & Imprensa',x:760,y:180,look:3,color:'#ff9f43',dialog:'A imprensa quer uma pauta. E precisamos decidir se vamos responder uma situação delicada agora ou depois.'},
 {id:'bruno',name:'Bruno Azevedo',role:'Sponsor Manager',x:1005,y:205,look:1,color:'#66e8ff',dialog:'Dois parceiros querem aumentar ativação. Um contrato maior depende de como performarmos nesta etapa.'},
 {id:'luna',name:'Luna Martins',role:'Content Creator',x:1040,y:520,look:2,color:'#ff8ec7',dialog:'Já separei fotos do box, onboard e reação da torcida. Só preciso saber qual história vamos contar.'}
];
const zones=[
 {name:'VOLT GARAGE',x:70,y:115,w:430,h:245,type:'garage'},
 {name:'MEDIA CENTER',x:650,y:95,w:250,h:205,type:'media'},
 {name:'SPONSOR LOUNGE',x:930,y:95,w:280,h:205,type:'sponsor'},
 {name:'DATA LAB',x:70,y:445,w:335,h:170,type:'data'},
 {name:'FAN ZONE',x:900,y:440,w:310,h:180,type:'fan'}
];
const obstacles=[{x:90,y:145,w:360,h:45},{x:95,y:280,w:330,h:40},{x:675,y:120,w:200,h:38},{x:955,y:125,w:225,h:40},{x:100,y:470,w:250,h:40},{x:930,y:465,w:235,h:38}];
function roundObjectives(){return [
 {title:'Conheça o paddock',text:'Converse com Camila, Bia e Ana.',progress:()=>Math.min([...state.talked].filter(x=>['camila','bia','ana'].includes(x)).length/3,1),done:()=>['camila','bia','ana'].every(x=>state.talked.has(x))},
 {title:'Defina a narrativa',text:'Publique uma campanha no aplicativo Social.',progress:()=>Math.min(state.socialPosts,1),done:()=>state.socialPosts>=1},
 {title:'Ative um patrocinador',text:'Feche ou amplie uma parceria no Sponsor Lounge.',progress:()=>state.activationDone?1:0,done:()=>state.activationDone},
 {title:'Gerencie a crise',text:'Fale com Maya e escolha uma resposta para a imprensa.',progress:()=>state.crisisSolved?1:0,done:()=>state.crisisSolved}
]}
let objectives=roundObjectives();
function roundRect(c,x,y,w,h,r){if(typeof r==='number')r={tl:r,tr:r,br:r,bl:r};c.beginPath();c.moveTo(x+r.tl,y);c.lineTo(x+w-r.tr,y);c.arcTo(x+w,y,x+w,y+r.tr,r.tr);c.lineTo(x+w,y+h-r.br);c.arcTo(x+w,y+h,x+w-r.br,y+h,r.br);c.lineTo(x+r.bl,y+h);c.arcTo(x,y+h,x,y+h-r.bl,r.bl);c.lineTo(x,y+r.tl);c.arcTo(x,y,x+r.tl,y,r.tl);c.closePath()}
function shadeColor(hex,pct){const n=parseInt(hex.slice(1),16);let r=(n>>16)+Math.round(255*pct),g=(n>>8&255)+Math.round(255*pct),b=(n&255)+Math.round(255*pct);r=Math.max(0,Math.min(255,r));g=Math.max(0,Math.min(255,g));b=Math.max(0,Math.min(255,b));return'#'+(1<<24|r<<16|g<<8|b).toString(16).slice(1)}
function drawPerson(c,x,y,lookIndex=0,dir='down',moving=false,scale=1,accentOverride){const l=looks[lookIndex];c.save();c.translate(x,y);c.scale(scale,scale);const bob=moving?Math.sin(walkFrame*.5)*1.5:0;
 // soft contact shadow
 c.save();c.translate(0,bob);c.fillStyle='#00000055';c.beginPath();c.ellipse(0,40,13,4.5,0,0,Math.PI*2);c.fill();c.restore();
 c.translate(0,bob);const acc=accentOverride||l.accent;
 // legs
 const step=moving?Math.sin(walkFrame*.6)*4:0;
 c.fillStyle='#14181d';roundRect(c,-10-step*.2,21,7,15,3);c.fill();roundRect(c,3+step*.2,21,7,15,3);c.fill();
 c.fillStyle='#0a0d10';roundRect(c,-11-step*.2,32,8,5,2);c.fill();roundRect(c,3+step*.2,32,8,5,2);c.fill();
 // back arm (behind body)
 const arm=moving?Math.sin(walkFrame*.6)*5:0;
 c.save();c.translate(13,2);c.rotate(-arm*.025);c.fillStyle=shadeColor(l.skin,-.12);roundRect(c,-2.5,0,5,16,2.5);c.fill();c.restore();
 // torso — gradient jacket
 const jg=c.createLinearGradient(-13,-4,13,26);jg.addColorStop(0,'#232b33');jg.addColorStop(1,'#151b21');
 c.fillStyle=jg;roundRect(c,-13,-4,26,30,{tl:7,tr:7,br:5,bl:5});c.fill();
 c.fillStyle=acc;roundRect(c,-13,-4,26,6,{tl:7,tr:7,br:0,bl:0});c.fill();
 c.strokeStyle='#00000040';c.lineWidth=1;c.beginPath();c.moveTo(0,2);c.lineTo(0,24);c.stroke();
 // front arm
 c.save();c.translate(-13,2);c.rotate(arm*.025);c.fillStyle=l.skin;roundRect(c,-2.5,0,5,16,2.5);c.fill();c.restore();
 // neck + head
 c.fillStyle=shadeColor(l.skin,-.1);c.beginPath();c.arc(0,-7,4,0,Math.PI*2);c.fill();
 const hg=c.createRadialGradient(-3,-17,2,0,-15,11);hg.addColorStop(0,shadeColor(l.skin,.08));hg.addColorStop(1,l.skin);
 c.fillStyle=hg;c.beginPath();c.arc(0,-15,10,0,Math.PI*2);c.fill();
 c.fillStyle=l.hair;c.beginPath();c.arc(0,-18.5,10.3,Math.PI,Math.PI*2);c.fill();
 if(lookIndex===2){c.beginPath();c.ellipse(-10,-14,3,10,0.15,0,Math.PI*2);c.fill();c.beginPath();c.ellipse(10,-14,3,10,-0.15,0,Math.PI*2);c.fill()}
 if(lookIndex===1){roundRect(c,-10,-19,20,5,2.5);c.fill()}
 if(lookIndex===3){c.beginPath();c.arc(0,-18,10.6,Math.PI*.05,Math.PI*.95);c.fill()}
 c.fillStyle='#ffffffb0';if(dir==='left'){c.beginPath();c.arc(-5,-15,1.4,0,Math.PI*2);c.fill()}else if(dir==='right'){c.beginPath();c.arc(5,-15,1.4,0,Math.PI*2);c.fill()}else{c.beginPath();c.arc(-4,-14,1.3,0,Math.PI*2);c.fill();c.beginPath();c.arc(4,-14,1.3,0,Math.PI*2);c.fill()}
 c.restore()}
function drawPreview(){pctx.clearRect(0,0,360,440);pctx.fillStyle='#0b1015';pctx.fillRect(0,0,360,440);pctx.fillStyle='#171e25';pctx.fillRect(30,330,300,4);pctx.strokeStyle='#25303a';for(let i=0;i<6;i++){pctx.beginPath();pctx.moveTo(0,80+i*48);pctx.lineTo(360,80+i*48);pctx.stroke()}drawPerson(pctx,180,220,selectedLook,'down',false,4);pctx.fillStyle='#fff';pctx.font='900 18px sans-serif';pctx.textAlign='center';pctx.fillText(($('playerName').value||'RITA').toUpperCase(),180,390);pctx.fillStyle=looks[selectedLook].accent;pctx.font='800 11px sans-serif';pctx.fillText(selectedSpec.toUpperCase(),180,410);pctx.textAlign='left'}
function initCreator(){document.querySelectorAll('.spec').forEach(b=>b.onclick=()=>{document.querySelectorAll('.spec').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedSpec=b.dataset.spec;drawPreview()});document.querySelectorAll('.avatar').forEach(b=>b.onclick=()=>{document.querySelectorAll('.avatar').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedLook=+b.dataset.look;drawPreview()});$('playerName').addEventListener('input',drawPreview);drawPreview()}
function canMove(nx,ny){const p={x:nx,y:ny,w:player.w,h:player.h};if(nx<8||ny<78||nx+player.w>W-8||ny+player.h>H-8)return false;for(const o of obstacles){if(p.x<o.x+o.w&&p.x+p.w>o.x&&p.y<o.y+o.h&&p.y+p.h>o.y)return false}return true}
function update(dt){if(anyModalOpen())return;let dx=0,dy=0;if(keys.ArrowLeft||keys.a)dx--;if(keys.ArrowRight||keys.d)dx++;if(keys.ArrowUp||keys.w)dy--;if(keys.ArrowDown||keys.s)dy++;player.moving=!!(dx||dy);if(dx<0)player.dir='left';if(dx>0)player.dir='right';if(dy<0)player.dir='up';if(dy>0)player.dir='down';if(dx&&dy){dx*=.707;dy*=.707}const sp=player.speed*dt/16.67,nx=player.x+dx*sp,ny=player.y+dy*sp;if(canMove(nx,player.y))player.x=nx;if(canMove(player.x,ny))player.y=ny;if(player.moving)walkFrame+=dt*.025}
function drawBackground(){const c=circuits[state.round];
 const sky=ctx.createLinearGradient(0,0,0,78);sky.addColorStop(0,shadeColor(c.sky,.12));sky.addColorStop(1,c.sky);ctx.fillStyle=sky;ctx.fillRect(0,0,W,78);
 const gr=ctx.createLinearGradient(0,78,0,H);gr.addColorStop(0,shadeColor(c.ground,.05));gr.addColorStop(1,shadeColor(c.ground,-.08));ctx.fillStyle=gr;ctx.fillRect(0,78,W,H-78);
 if(c.theme==='coast'){const wg=ctx.createLinearGradient(0,610,0,720);wg.addColorStop(0,'#1a5063');wg.addColorStop(1,'#0e2c37');ctx.fillStyle=wg;ctx.fillRect(0,610,W,110);for(let x=0;x<W;x+=80){ctx.fillStyle='#ffffff22';ctx.fillRect(x,632,45,3)}}
 else if(c.theme==='mountain'){ctx.fillStyle='#1b1c22';ctx.beginPath();ctx.moveTo(0,150);ctx.lineTo(170,70);ctx.lineTo(300,150);ctx.lineTo(500,45);ctx.lineTo(700,150);ctx.lineTo(910,60);ctx.lineTo(1120,150);ctx.lineTo(1280,90);ctx.lineTo(1280,200);ctx.lineTo(0,200);ctx.fill();ctx.fillStyle='#26272f';ctx.beginPath();ctx.moveTo(500,45);ctx.lineTo(520,60);ctx.lineTo(480,65);ctx.closePath();ctx.fill()}
 else{for(let y=100;y<650;y+=50){ctx.fillStyle=y%100===0?'#1c262d':'#161e24';ctx.fillRect(0,y,W,23)}}
 ctx.save();ctx.globalAlpha=.05;ctx.strokeStyle='#ffffff';ctx.lineWidth=1;for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,78);ctx.lineTo(x,H);ctx.stroke()}ctx.restore();
 ctx.fillStyle='#262c32';ctx.fillRect(0,365,W,44);const rg=ctx.createLinearGradient(0,365,0,409);rg.addColorStop(0,'#30373e');rg.addColorStop(1,'#20262c');ctx.fillStyle=rg;ctx.fillRect(0,365,W,44);
 for(let x=0;x<W;x+=64){ctx.fillStyle=x%128===0?'#e9edf0':'#1b1d21';ctx.fillRect(x,382,32,8)}
 const pg=ctx.createLinearGradient(0,648,0,720);pg.addColorStop(0,'#32383e');pg.addColorStop(1,'#1f2328');ctx.fillStyle=pg;ctx.fillRect(0,648,W,72);
 ctx.fillStyle='#f1f1f1';ctx.fillRect(0,681,W,5);
 ctx.save();const vg=ctx.createRadialGradient(W/2,H/2,H*.25,W/2,H/2,H*.78);vg.addColorStop(0,'#00000000');vg.addColorStop(1,'#00000055');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);ctx.restore()}
function drawCar(x,y,scale=1,color='#d9ff35'){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
 ctx.fillStyle='#00000040';ctx.beginPath();ctx.ellipse(0,32,58,8,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#07090c';roundRect(ctx,-55,-15,110,30,10);ctx.fill();
 const bg=ctx.createLinearGradient(-40,-19,-40,19);bg.addColorStop(0,shadeColor(color,.25));bg.addColorStop(1,shadeColor(color,-.15));ctx.fillStyle=bg;roundRect(ctx,-40,-19,72,38,9);ctx.fill();
 const cg=ctx.createLinearGradient(-20,-22,18,-4);cg.addColorStop(0,'#1c242d');cg.addColorStop(1,'#0c1116');ctx.fillStyle=cg;roundRect(ctx,-20,-22,38,18,6);ctx.fill();
 ctx.fillStyle='#aebdc7';ctx.globalAlpha=.55;roundRect(ctx,-16,-20,14,7,3);ctx.fill();ctx.globalAlpha=1;
 const wg=ctx.createLinearGradient(18,-15,42,-7);wg.addColorStop(0,'#eef3f6');wg.addColorStop(1,'#b7c2c9');ctx.fillStyle=wg;roundRect(ctx,18,-15,24,8,3);ctx.fill();
 ctx.fillStyle='#050607';[[-48,-25],[-48,13],[34,-25],[34,13]].forEach(([wx,wy])=>{roundRect(ctx,wx,wy,14,12,3);ctx.fill()});
 ctx.fillStyle='#2b3036';[[-45,-21],[-45,17],[37,-21],[37,17]].forEach(([wx,wy])=>{ctx.beginPath();ctx.arc(wx+4,wy+6,2.6,0,Math.PI*2);ctx.fill()});
 ctx.fillStyle=color;roundRect(ctx,48,-8,22,16,4);ctx.fill();
 ctx.strokeStyle='#ffffff30';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-38,-18);ctx.lineTo(30,-18);ctx.stroke();
 ctx.restore()}
function zoneIcon(c,type){c.save();c.strokeStyle=c.fillStyle;c.lineWidth=2;c.lineCap='round';if(type==='media'){c.beginPath();c.moveTo(-9,-6);c.lineTo(9,-6);c.lineTo(9,6);c.lineTo(-9,6);c.closePath();c.stroke();c.beginPath();c.moveTo(9,-2);c.lineTo(15,-7);c.lineTo(15,7);c.lineTo(9,2);c.stroke()}else if(type==='sponsor'){c.beginPath();c.moveTo(0,-10);c.lineTo(9,-3);c.lineTo(5,9);c.lineTo(-5,9);c.lineTo(-9,-3);c.closePath();c.stroke()}else if(type==='data'){c.beginPath();c.ellipse(0,-7,9,3.5,0,0,Math.PI*2);c.stroke();c.beginPath();c.moveTo(-9,-7);c.lineTo(-9,7);c.ellipse(0,7,9,3.5,0,Math.PI,0,true);c.lineTo(9,-7);c.stroke()}else{c.beginPath();c.moveTo(0,-10);c.lineTo(2.6,-3);c.lineTo(10,-3);c.lineTo(4,1.6);c.lineTo(6,9);c.lineTo(0,4.4);c.lineTo(-6,9);c.lineTo(-4,1.6);c.lineTo(-10,-3);c.lineTo(-2.6,-3);c.closePath();c.stroke()}c.restore()}
function panel(x,y,w,h,accent){ctx.save();ctx.fillStyle='#00000050';roundRect(ctx,x+3,y+5,w,h,10);ctx.fill();
 const pg=ctx.createLinearGradient(x,y,x,y+h);pg.addColorStop(0,'#141a20f0');pg.addColorStop(1,'#0c1116f0');ctx.fillStyle=pg;roundRect(ctx,x,y,w,h,10);ctx.fill();
 ctx.strokeStyle='#39434ecc';ctx.lineWidth=1;roundRect(ctx,x+.5,y+.5,w-1,h-1,10);ctx.stroke();
 ctx.fillStyle=accent;roundRect(ctx,x,y,5,h,{tl:10,bl:10,tr:0,br:0});ctx.fill();ctx.restore()}
function drawZones(){zones.forEach(z=>{if(z.type==='garage')return;panel(z.x,z.y,z.w,z.h,circuits[state.round].accent);ctx.save();ctx.translate(z.x+24,z.y+28);ctx.fillStyle=circuits[state.round].accent;zoneIcon(ctx,z.type);ctx.restore();ctx.fillStyle='#c7cfd6';ctx.font='800 12px sans-serif';ctx.fillText(z.name,z.x+42,z.y+24)});drawGarageDetails()}
function drawGarageDetails(){const acc=circuits[state.round].accent;
 ctx.fillStyle='#00000050';roundRect(ctx,88,135,395,205,14);ctx.fill();
 const bg=ctx.createLinearGradient(84,130,84,335);bg.addColorStop(0,'#141a20');bg.addColorStop(1,'#0a0e12');ctx.fillStyle=bg;roundRect(ctx,84,130,395,205,14);ctx.fill();
 ctx.strokeStyle='#3a4552';ctx.lineWidth=1.5;roundRect(ctx,84.5,130.5,394,204,14);ctx.stroke();
 ctx.fillStyle=acc;roundRect(ctx,84,130,395,7,{tl:14,tr:14,br:0,bl:0});ctx.fill();
 ctx.fillStyle='#161d24';for(let i=0;i<4;i++){roundRect(ctx,100+i*90,152,70,40,6);ctx.fill();ctx.strokeStyle='#2c3640';ctx.lineWidth=1;roundRect(ctx,100+i*90,152,70,40,6);ctx.stroke()}
 ctx.fillStyle=acc;roundRect(ctx,100,207,355,3,2);ctx.fill();
 drawCar(285,260,1.1,acc);
 ctx.fillStyle='#e7ecef';ctx.font='900 17px sans-serif';ctx.fillText('VOLT RACING',101,322);
 ctx.fillStyle='#6e7883';ctx.font='700 10px sans-serif';ctx.fillText('OFFICIAL GARAGE',101,336)}
function drawNPC(n){const d=Math.hypot((player.x+13)-n.x,(player.y+21)-n.y);if(d<66){ctx.save();ctx.fillStyle=n.color+'30';ctx.beginPath();ctx.arc(n.x,n.y+10,30,0,Math.PI*2);ctx.fill();ctx.restore()}
 drawPerson(ctx,n.x,n.y,n.look,'down',false,1,n.color);
 if(d<66){ctx.save();const w=140,h=34,bx=n.x-w/2,by=n.y-66;ctx.fillStyle='#0a0e12f2';roundRect(ctx,bx,by,w,h,8);ctx.fill();ctx.strokeStyle=n.color;ctx.lineWidth=1.3;roundRect(ctx,bx+.5,by+.5,w-1,h-1,8);ctx.stroke();ctx.beginPath();ctx.moveTo(n.x-6,by+h);ctx.lineTo(n.x+6,by+h);ctx.lineTo(n.x,by+h+7);ctx.closePath();ctx.fillStyle='#0a0e12f2';ctx.fill();ctx.fillStyle='#fff';ctx.font='800 11px sans-serif';ctx.textAlign='center';ctx.fillText('[E]  '+n.name.split(' ')[0],n.x,by+21);ctx.textAlign='left';ctx.restore()}}
function render(){drawBackground();drawZones();npcs.forEach(drawNPC);drawPerson(ctx,player.x+13,player.y+20,state.look,player.dir,player.moving,1.15);
 ctx.save();ctx.fillStyle='#00000090';roundRect(ctx,14,14,420,54,10);ctx.fill();ctx.restore();
 ctx.fillStyle='#e9edf1';ctx.font='950 22px sans-serif';ctx.fillText('PADDOCK • '+circuits[state.round].short,26,42);ctx.fillStyle='#8f9aa5';ctx.font='12px sans-serif';ctx.fillText('Volt Racing • Race Weekend '+(state.round+1),26,60)}
function loop(t){const dt=Math.min(32,t-last||16.67);last=t;update(dt);render();raf=requestAnimationFrame(loop)}
function nearbyNPC(){return npcs.find(n=>Math.hypot((player.x+13)-n.x,(player.y+21)-n.y)<66)}
function anyModalOpen(){return [...document.querySelectorAll('.modal')].some(m=>!m.classList.contains('hidden'))}
function closeModal(id){$(id).classList.add('hidden')}
function showToast(t){const el=$('toast');el.textContent=t;el.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>el.classList.remove('show'),1900)}
function scoreNow(){return Math.round(state.rep*1.2+state.sponsorScore*1.1+state.fans/5000+state.sponsors.length*7)}
function updateHud(){budgetHud.textContent='R$ '+state.budget.toLocaleString('pt-BR');repHud.textContent=state.rep;fansHud.textContent=(state.fans/1000).toFixed(0)+'K';sponsorHud.textContent=state.sponsorScore;activeSponsors.textContent=state.sponsors.length+'/5';levelHud.textContent=state.level;roundTitle.textContent=`Etapa ${state.round+1}/${circuits.length}`;roundName.textContent=circuits[state.round].name;circuitTag.textContent=circuits[state.round].short;dayTag.textContent=['QUINTA • 18:10','SEXTA • 14:32','SÁBADO • 16:20','DOMINGO • 19:05'][state.day];phoneOwner.textContent=state.name+' • Marketing Director';careerName.textContent=state.name+' • Marketing Director';updateDays();updateCareer();updateObjective();updateStandings()}
function updateDays(){weekendDays.innerHTML='';['QUI','SEX','SÁB','DOM'].forEach((d,i)=>{const s=document.createElement('span');s.textContent=d;if(i===state.day)s.className='active';weekendDays.appendChild(s)})}
function updateCareer(){state.level=1+Math.floor(state.xp/180);xpText.textContent=(state.xp%180)+'/180';xpBar.style.width=((state.xp%180)/180*100)+'%';perkGrid.innerHTML=`<div><b>Story Hunter</b><span>${state.spec==='story'?'ATIVO • ':''}+10% fãs em campanhas</span></div><div><b>Deal Maker</b><span>${state.spec==='deal'?'ATIVO • ':''}+10% valor de contratos</span></div><div><b>Data Sense</b><span>${state.spec==='data'?'ATIVO • ':''}+10% Sponsor Score</span></div>`}
function updateObjective(){const o=objectives[state.objectiveIndex];if(!o){objectiveTitle.textContent='Objetivos concluídos';objectiveText.textContent='Encerre o fim de semana e avance para a próxima etapa.';objectiveProgress.style.width='100%';setTimeout(endRound,600);return}objectiveTitle.textContent=o.title;objectiveText.textContent=o.text;objectiveProgress.style.width=(o.progress()*100)+'%';if(o.done()){state.completed.push(o.title);state.objectiveIndex++;state.xp+=45;state.roundScore+=25;showToast('Missão concluída • +45 XP');setTimeout(()=>{updateHud()},350)}}
function renderPortrait(n){dctx.clearRect(0,0,190,300);dctx.fillStyle='#111820';dctx.fillRect(0,0,190,300);dctx.fillStyle=n.color+'22';dctx.beginPath();dctx.arc(95,95,75,0,Math.PI*2);dctx.fill();drawPerson(dctx,95,155,n.look,'down',false,3.5,n.color);dctx.fillStyle='#fff';dctx.font='900 11px sans-serif';dctx.textAlign='center';dctx.fillText(n.role.toUpperCase(),95,278);dctx.textAlign='left'}
function openDialog(n){state.talked.add(n.id);renderPortrait(n);dialogRole.textContent=n.role.toUpperCase();dialogName.textContent=n.name;dialogText.textContent=n.dialog+' '+(n.id==='maya'?circuits[state.round].crisis:'');dialogChoices.innerHTML='';let choices=[{label:'Entendi. Vamos em frente.',fn:()=>closeModal('dialogModal')}];if(n.id==='camila')choices=[{label:'Priorizar história humana e bastidores.',fn:()=>{state.rep+=2;state.xp+=10;showToast('+2 reputação');closeModal('dialogModal');updateHud()}},{label:'Priorizar números e exposição de marca.',fn:()=>{state.sponsorScore+=3;state.xp+=10;showToast('+3 Sponsor Score');closeModal('dialogModal');updateHud()}}];if(n.id==='bia')choices=[{label:'Construir narrativa de evolução da pilota.',fn:()=>{state.fans+=2200;state.rep+=2;state.xp+=10;showToast('+2,2K fãs');closeModal('dialogModal');updateHud()}},{label:'Focar apenas no resultado esportivo.',fn:()=>{state.sponsorScore+=2;closeModal('dialogModal');updateHud()}}];if(n.id==='ana')choices=[{label:'Criar quadro técnico “Data de Volta”.',fn:()=>{state.fans+=1200;state.sponsorScore+=2;state.xp+=10;showToast('Conteúdo técnico desbloqueado');closeModal('dialogModal');updateHud()}},{label:'Guardar os dados para briefing interno.',fn:()=>closeModal('dialogModal')}];if(n.id==='bruno')choices=[{label:'Ampliar ativação com parceiro atual.',fn:()=>{activateSponsor('Vector Energy',8000,8)}},{label:'Esperar proposta maior.',fn:()=>closeModal('dialogModal')}];if(n.id==='maya')choices=[{label:'Assumir a situação, contextualizar e mostrar plano de ação.',fn:()=>resolveCrisis(true)},{label:'Responder de forma defensiva e encerrar assunto.',fn:()=>resolveCrisis(false)}];if(n.id==='luna')choices=[{label:'Bastidores + emoção da torcida.',fn:()=>{state.fans+=1800;state.rep+=1;closeModal('dialogModal');updateHud()}},{label:'Conteúdo premium para patrocinadores.',fn:()=>{state.sponsorScore+=3;closeModal('dialogModal');updateHud()}}];choices.forEach(c=>{const b=document.createElement('button');b.textContent=c.label;b.onclick=c.fn;dialogChoices.appendChild(b)});dialogModal.classList.remove('hidden');updateHud()}
function resolveCrisis(good){state.crisisSolved=true;if(good){state.rep+=7;state.fans+=2500;state.xp+=30;showToast('Crise controlada • +7 reputação')}else{state.rep-=6;state.sponsorScore-=3;showToast('Reação negativa • -6 reputação')}closeModal('dialogModal');updateHud()}
function activateSponsor(name,money,score){if(!state.sponsors.includes(name))state.sponsors.push(name);const m=Math.round(money*(state.spec==='deal'?1.1:1));state.budget+=m;state.sponsorScore+=Math.round(score*(state.spec==='data'?1.1:1));state.activationDone=true;state.xp+=25;showToast('Ativação fechada • +R$ '+m.toLocaleString('pt-BR'));closeModal('dialogModal');updateHud()}
function openPhoneApp(appName){const c=phoneContent;if(appName==='social'){const campaignNames=['Dentro do Box','Costa em Alta','Final Lap Stories'];const gain=Math.round((12000+state.round*4500)*(state.spec==='story'?1.1:1));c.innerHTML=`<div class="feed-item"><b>${campaignNames[state.round]} • Campanha principal</b><small>Vídeo curto + carrossel + bastidores + mídia paga.</small><button id="postBtn">Publicar • R$ ${4500+state.round*1000}</button></div><div class="feed-item"><b>Conteúdo orgânico</b><small>Entrevista com Bia + dados da Ana + rotina de box.</small></div>`;$('postBtn').onclick=()=>{const cost=4500+state.round*1000;if(state.budget>=cost&&state.socialPosts===0){state.budget-=cost;state.fans+=gain;state.rep+=4;state.socialPosts=1;state.xp+=30;showToast(`Campanha no ar • +${(gain/1000).toFixed(1)}K fãs`);openPhoneApp('social');updateHud()}else showToast(state.socialPosts?'Campanha da etapa já publicada':'Orçamento insuficiente')}}
if(appName==='mail'){c.innerHTML=`<div class="mail-item"><b>Direção da Volt Racing</b><small>Assunto: metas da etapa</small><p>${circuits[state.round].story}</p></div><div class="mail-item"><b>PR</b><small>Alerta de reputação</small><p>${circuits[state.round].crisis}</p></div><div class="mail-item"><b>Commercial</b><small>Novas marcas observando a equipe.</small></div>`}
if(appName==='metrics'){c.innerHTML=`<div class="metric-grid"><div class="metric-card"><small>ALCANCE</small><strong>${(state.fans*4.7/1000).toFixed(0)}K</strong></div><div class="metric-card"><small>ENGAJAMENTO</small><strong>${(4.2+state.rep/100+state.socialPosts*1.3).toFixed(1)}%</strong></div><div class="metric-card"><small>EMV</small><strong>R$ ${(16+state.sponsorScore*.62).toFixed(0)}K</strong></div><div class="metric-card"><small>BRAND SCORE</small><strong>${scoreNow()}</strong></div></div>`}
if(appName==='sponsors'){const offers=[['Nexa Mobility',18000,10],['Pulse Hydration',12500,7],['Orion Cloud',22000,12]];const off=offers[state.round];c.innerHTML=`<div class="sponsor-item"><b>${off[0]}</b><small>Proposta: R$ ${off[1].toLocaleString('pt-BR')} • contrato de ativação da etapa</small><button id="offerBtn">Aceitar proposta</button></div><div class="sponsor-item"><b>Parceiros ativos</b><small>${state.sponsors.join(' • ')}</small></div>`;$('offerBtn').onclick=()=>{if(state.activationDone)return showToast('Ativação da etapa já concluída');activateSponsor(off[0],off[1],off[2]);openPhoneApp('sponsors')}}
if(appName==='calendar'){c.innerHTML=`<div class="mission-item"><b>14:30 • Briefing de comunicação</b><small>Volt Garage</small></div><div class="mission-item"><b>16:10 • Janela de conteúdo</b><small>Pit lane</small></div><div class="mission-item"><b>18:00 • Sponsor Lounge</b><small>Relacionamento B2B</small></div><div class="mission-item"><b>20:00 • Recap do dia</b><small>Social + imprensa</small></div>`}
if(appName==='missions'){c.innerHTML=objectives.map((o,i)=>`<div class="mission-item"><b>${i<state.objectiveIndex?'✓ ':''}${o.title}</b><small>${o.text}</small></div>`).join('')}}
function updateStandings(){const you=scoreNow()+state.seasonScore;const rows=[...rivalTeams.map((r,i)=>({name:r.name,score:r.score+state.round*18+i*3,you:false})),{name:'Volt Racing',score:you,you:true}].sort((a,b)=>b.score-a.score);standingsTable.innerHTML=rows.map((r,i)=>`<div class="standing-row ${r.you?'you':''}"><b>#${i+1}</b><div><strong>${r.name}</strong><small>${r.you?'Sua equipe':'Rival'}</small></div><strong>${r.score}</strong><small>pts</small></div>`).join('')}
function endRound(){if(!$('briefingModal').classList.contains('hidden'))return;const score=scoreNow()+state.roundScore;state.seasonScore+=score;state.roundSnapshots.push({score,rep:state.rep,fans:state.fans,sponsor:state.sponsorScore,budget:state.budget});briefingTitle.textContent=`${circuits[state.round].short}: fim de semana encerrado`;briefingText.textContent=`A Volt Racing concluiu a etapa com Brand Score ${score}. Suas decisões alteraram a percepção da equipe no paddock e no mercado.`;briefingStats.innerHTML=statCards(score);nextRoundBtn.textContent=state.round===circuits.length-1?'VER RESULTADO DA TEMPORADA':'VIAJAR PARA PRÓXIMA ETAPA';briefingModal.classList.remove('hidden')}
function statCards(score){return `<div><small>BRAND SCORE</small><strong>${score}</strong></div><div><small>REPUTAÇÃO</small><strong>${state.rep}</strong></div><div><small>FÃS</small><strong>${(state.fans/1000).toFixed(0)}K</strong></div><div><small>SPONSORS</small><strong>${state.sponsors.length}</strong></div>`}
function nextRound(){briefingModal.classList.add('hidden');if(state.round>=circuits.length-1){showEnding();return}state.round++;state.day=Math.min(3,state.round+1);state.objectiveIndex=0;state.talked=new Set();state.socialPosts=0;state.crisisSolved=false;state.activationDone=false;state.roundScore=0;state.completed=[];objectives=roundObjectives();player.x=610;player.y=560;updateHud();showToast('Bem-vinda a '+circuits[state.round].short)}
function showEnding(){const total=state.seasonScore+scoreNow();let title,text;if(total>=650&&state.rep>=75){title='A marca que virou referência';text='A Volt Racing encerra a temporada como uma das propriedades de marketing mais valorizadas do paddock. Você recebe proposta para liderar a estratégia global da equipe.'}else if(total>=520){title='Temporada de crescimento';text='A equipe fecha o ano com crescimento consistente, bons parceiros e uma comunidade muito maior. O conselho aprova seu plano para a próxima temporada.'}else{title='Potencial ainda em construção';text='A Volt Racing termina o ano com aprendizados importantes. Alguns parceiros permanecem, mas a próxima temporada exigirá decisões mais consistentes e melhor gestão de reputação.'}endingTitle.textContent=title;endingText.textContent=text;endingSummary.innerHTML=statCards(total);endingModal.classList.remove('hidden')}
function startCareer(){state.name=($('playerName').value||'Rita').trim();state.look=selectedLook;state.spec=selectedSpec;creatorScreen.classList.add('hidden');app.classList.remove('hidden');updateHud();cancelAnimationFrame(raf);last=0;raf=requestAnimationFrame(loop)}
function resetGame(){location.reload()}
$('newGameBtn').onclick=()=>{startScreen.classList.add('hidden');creatorScreen.classList.remove('hidden');drawPreview()};$('howBtn').onclick=()=>howModal.classList.remove('hidden');$('startCareerBtn').onclick=startCareer;$('nextRoundBtn').onclick=nextRound;$('restartBtn').onclick=resetGame;
$('openPhone').onclick=()=>phoneModal.classList.remove('hidden');$('openStandings').onclick=()=>standingsModal.classList.remove('hidden');$('openCareer').onclick=()=>careerModal.classList.remove('hidden');document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));document.querySelectorAll('[data-app]').forEach(b=>b.onclick=()=>openPhoneApp(b.dataset.app));
window.addEventListener('keydown',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=true;if((k==='e'||k==='Enter')&&!anyModalOpen()&&!app.classList.contains('hidden')){const n=nearbyNPC();if(n)openDialog(n)}if(k==='m'&&!anyModalOpen()&&!app.classList.contains('hidden'))phoneModal.classList.remove('hidden');if(k==='t'&&!anyModalOpen()&&!app.classList.contains('hidden'))standingsModal.classList.remove('hidden');if(k==='Escape')document.querySelectorAll('.modal').forEach(m=>m.classList.add('hidden'))});window.addEventListener('keyup',e=>{const k=e.key.length===1?e.key.toLowerCase():e.key;keys[k]=false});
initCreator();

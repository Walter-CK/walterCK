// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: space-shuttle;
let html = `<!DOCTYPE html>

<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
html, body { width:100%; height:100%; overflow:hidden; background:#000; touch-action:none; }
#c { display:block; position:fixed; top:0; left:0; width:100%; height:100%; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<script>
var canvas = document.getElementById('c');
var ctx    = canvas.getContext('2d');
var W, H;

var STATE    = ‘menu’;
var player, bullets, aliens, alienBullets;
var wave, lives, score, alienDir, canShoot;
var touchLeft = false, touchRight = false;
var touchIds  = {};
var btnLeft, btnRight, btnShoot, btnStart;

function calcButtons() {
var bw   = Math.min(W * 0.18, 80);
var by   = H - bw - 20;
btnLeft  = { x:20,       y:by, w:bw, h:bw };
btnRight = { x:30+bw,    y:by, w:bw, h:bw };
btnShoot = { x:W-bw-20,  y:by, w:bw, h:bw };
btnStart = { x:W/2-120,  y:H/2-35, w:240, h:70 };
}

function newGame() {
wave=1; lives=3; score=0; alienDir=1;
bullets=[]; alienBullets=[]; canShoot=true;
player = { x:W/2-28, y:H-100, w:56, h:40, speed:7 };
spawnWave();
}

function spawnWave() {
aliens=[]; alienBullets=[]; alienDir=1;
var cols=8, rows=Math.min(2+wave,6);
var sx=Math.min(70,(W-80)/cols);
for (var r=0; r<rows; r+=1)
for (var c=0; c<cols; c+=1)
aliens.push({ x:40+c*sx, y:60+r*50, w:40, h:32 });
}

function rectsHit(a,b) {
return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}

function update() {
if (STATE !== ‘play’) return;
if (touchLeft  && player.x>0)          player.x -= player.speed;
if (touchRight && player.x+player.w<W) player.x += player.speed;

for (var i=bullets.length-1; i>=0; i-=1) {
bullets[i].y -= 13;
if (bullets[i].y+bullets[i].h < 0) bullets.splice(i,1);
}
var abSpd=3+wave*0.5;
for (var i=alienBullets.length-1; i>=0; i-=1) {
alienBullets[i].y += abSpd;
if (alienBullets[i].y > H) { alienBullets.splice(i,1); continue; }
var b=alienBullets[i];
if (b && rectsHit(b,player)) {
alienBullets.splice(i,1); lives-=1;
if (lives<=0) { STATE=‘dead’; return; }
}
}
var spd=1.2+wave*0.4;
for (var i=0; i<aliens.length; i+=1) aliens[i].x += alienDir*spd;
var edge=false;
for (var i=0; i<aliens.length; i+=1)
if (aliens[i].x<=0 || aliens[i].x+aliens[i].w>=W) { edge=true; break; }
if (edge) {
alienDir *= -1;
for (var i=0; i<aliens.length; i+=1) {
aliens[i].y += 15;
if (aliens[i].y+aliens[i].h >= player.y) { STATE=‘dead’; return; }
}
}
for (var bi=bullets.length-1; bi>=0; bi-=1)
for (var ai=aliens.length-1; ai>=0; ai-=1)
if (rectsHit(bullets[bi],aliens[ai])) {
score+=10*wave; bullets.splice(bi,1); aliens.splice(ai,1); break;
}
if (Math.random()<0.015+wave*0.004 && aliens.length>0) {
var a=aliens[Math.floor(Math.random()*aliens.length)];
alienBullets.push({ x:a.x+a.w/2-4, y:a.y+a.h, w:8, h:18 });
}
if (aliens.length===0) { wave+=1; spawnWave(); }
}

function rr(x,y,w,h,r) {
ctx.beginPath();
ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

function draw() {
ctx.fillStyle=’#000’; ctx.fillRect(0,0,W,H);
if (STATE===‘menu’) {
ctx.fillStyle=‘rgba(255,255,255,0.2)’;
for (var i=0; i<50; i+=1) ctx.fillRect((i*137.5)%W,(i*97.3+50)%(H-200),2,2);
ctx.textAlign=‘center’;
ctx.fillStyle=’#0ff’; ctx.font=‘bold ‘+Math.floor(W*0.11)+‘px monospace’;
ctx.fillText(‘SPACE’,W/2,H/2-80);
ctx.fillStyle=’#f0f’; ctx.fillText(‘INVADERS’,W/2,H/2-20);
ctx.fillStyle=‘rgba(0,255,255,0.15)’; ctx.strokeStyle=’#0ff’; ctx.lineWidth=2;
rr(btnStart.x,btnStart.y,btnStart.w,btnStart.h,12); ctx.fill(); ctx.stroke();
ctx.fillStyle=’#fff’; ctx.font=‘bold 26px monospace’;
ctx.fillText(‘TAP TO START’,W/2,btnStart.y+43);
return;
}
ctx.fillStyle=‘rgba(255,255,255,0.15)’;
for (var i=0; i<50; i+=1) ctx.fillRect((i*137.5)%W,(i*97.3+50)%(H-140),2,2);
ctx.fillStyle=’#0f0’; ctx.beginPath();
ctx.moveTo(player.x+player.w/2,player.y);
ctx.lineTo(player.x+player.w,player.y+player.h);
ctx.lineTo(player.x,player.y+player.h);
ctx.closePath(); ctx.fill();
ctx.fillStyle=’#8ff’;
for (var i=0; i<bullets.length; i+=1) ctx.fillRect(bullets[i].x,bullets[i].y,bullets[i].w,bullets[i].h);
for (var i=0; i<aliens.length; i+=1) {
var a=aliens[i]; ctx.fillStyle=‘hsl(’+(wave*40)%360+’,100%,55%)’;
ctx.fillRect(a.x+6,a.y,a.w-12,a.h-8); ctx.fillRect(a.x,a.y+8,8,a.h-16);
ctx.fillRect(a.x+a.w-8,a.y+8,8,a.h-16); ctx.fillStyle=’#000’;
ctx.fillRect(a.x+10,a.y+6,6,6); ctx.fillRect(a.x+a.w-16,a.y+6,6,6);
}
ctx.fillStyle=’#ff0’;
for (var i=0; i<alienBullets.length; i+=1) ctx.fillRect(alienBullets[i].x,alienBullets[i].y,alienBullets[i].w,alienBullets[i].h);
ctx.fillStyle=‘rgba(0,0,0,0.6)’; ctx.fillRect(0,0,W,44);
ctx.fillStyle=’#0ff’; ctx.font=‘bold 18px monospace’; ctx.textAlign=‘left’;
ctx.fillText(‘LIVES:’+lives+’  WAVE:’+wave+’  SCORE:’+score,14,28);
var btns=[{btn:btnLeft,l:’<’},{btn:btnRight,l:’>’},{btn:btnShoot,l:‘O’}];
for (var i=0; i<btns.length; i+=1) {
var b=btns[i].btn;
ctx.fillStyle=‘rgba(255,255,255,0.08)’; ctx.strokeStyle=‘rgba(255,255,255,0.35)’; ctx.lineWidth=1.5;
rr(b.x,b.y,b.w,b.h,b.w/2); ctx.fill(); ctx.stroke();
ctx.fillStyle=‘rgba(255,255,255,0.8)’;
ctx.font=‘bold ‘+Math.floor(b.h*0.45)+‘px monospace’; ctx.textAlign=‘center’;
ctx.fillText(btns[i].l,b.x+b.w/2,b.y+b.h*0.65);
}
if (STATE===‘dead’) {
ctx.fillStyle=‘rgba(0,0,0,0.75)’; ctx.fillRect(0,0,W,H);
ctx.fillStyle=’#f00’; ctx.font=‘bold ‘+Math.floor(W*0.12)+‘px monospace’; ctx.textAlign=‘center’;
ctx.fillText(‘GAME OVER’,W/2,H/2-60);
ctx.fillStyle=’#fff’; ctx.font=‘bold 22px monospace’;
ctx.fillText(‘SCORE:’+score+’  WAVE:’+wave,W/2,H/2);
var rb={x:btnStart.x,y:btnStart.y+20,w:btnStart.w,h:btnStart.h};
ctx.fillStyle=‘rgba(255,0,0,0.2)’; ctx.strokeStyle=’#f00’; ctx.lineWidth=2;
rr(rb.x,rb.y,rb.w,rb.h,12); ctx.fill(); ctx.stroke();
ctx.fillStyle=’#fff’; ctx.font=‘bold 24px monospace’;
ctx.fillText(‘PLAY AGAIN’,W/2,rb.y+43);
}
}

function ptIn(px,py,r) { return px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h; }

canvas.addEventListener(‘touchstart’, function(e) {
e.preventDefault();
for (var i=0; i<e.changedTouches.length; i+=1) {
var t=e.changedTouches[i];
var rc=canvas.getBoundingClientRect();
var sx=rc.width>0?W/rc.width:1, sy=rc.height>0?H/rc.height:1;
var px=(t.clientX-rc.left)*sx, py=(t.clientY-rc.top)*sy;
if (STATE===‘menu’)  { if (ptIn(px,py,btnStart)) { newGame(); STATE=‘play’; } return; }
if (STATE===‘dead’)  { var rb={x:btnStart.x,y:btnStart.y+20,w:btnStart.w,h:btnStart.h}; if (ptIn(px,py,rb)) { newGame(); STATE=‘play’; } return; }
if      (ptIn(px,py,btnLeft))  { touchLeft=true;  touchIds[t.identifier]=‘left’; }
else if (ptIn(px,py,btnRight)) { touchRight=true; touchIds[t.identifier]=‘right’; }
else if (ptIn(px,py,btnShoot)) { touchIds[t.identifier]=‘shoot’; shoot(); }
}
}, {passive:false});

canvas.addEventListener(‘touchend’, function(e) {
e.preventDefault();
for (var i=0; i<e.changedTouches.length; i+=1) {
var id=e.changedTouches[i].identifier;
if (touchIds[id]===‘left’)  touchLeft=false;
if (touchIds[id]===‘right’) touchRight=false;
delete touchIds[id];
}
}, {passive:false});

canvas.addEventListener(‘touchcancel’, function(e) {
touchLeft=false; touchRight=false; touchIds={};
}, {passive:false});

function shoot() {
if (!canShoot || STATE!==‘play’) return;
bullets.push({ x:player.x+player.w/2-5, y:player.y-10, w:10, h:22 });
canShoot=false; setTimeout(function(){ canShoot=true; },320);
}

// Let CSS lay out the canvas first, then read real pixel dimensions
setTimeout(function() {
W = canvas.offsetWidth  || canvas.clientWidth  || 390;
H = canvas.offsetHeight || canvas.clientHeight || 844;
canvas.width  = W;
canvas.height = H;
calcButtons();
setInterval(function() { update(); draw(); }, 16);
}, 100);
</script>

</body>
</html>`;

let wv = new WebView();
await wv.loadHTML(html);
await wv.present();
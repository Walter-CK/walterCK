// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-green; icon-glyph: space-shuttle;
const html = `<!DOCTYPE html>

<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
html, body { width:100%; height:100%; overflow:hidden; background:#03050f; }
canvas { display:block; touch-action:none; }
#ui {
  position:fixed; bottom:0; left:0; right:0;
  display:flex; height:100px;
  font-family: monospace;
}
.btn {
  flex:1; display:flex; align-items:center; justify-content:center;
  font-size:28px; color:rgba(255,255,255,0.25);
  border-top:1px solid rgba(255,255,255,0.07);
  user-select:none; -webkit-user-select:none;
  background:rgba(255,255,255,0.03);
}
.btn.pressed { background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.7); }
#btnLeft  { border-right:1px solid rgba(255,255,255,0.07); border-radius:0 0 0 16px; }
#btnFire  { border-left:1px solid rgba(255,255,255,0.07); border-right:1px solid rgba(255,255,255,0.07); }
#btnRight { border-radius:0 0 16px 0; }
</style>
</head>
<body>
<canvas id="c"></canvas>
<div id="ui">
  <div class="btn" id="btnLeft">&#9664;</div>
  <div class="btn" id="btnFire">&#9679;</div>
  <div class="btn" id="btnRight">&#9654;</div>
</div>
<script>
window.addEventListener("load", function() {

var canvas = document.getElementById(“c”)
var ctx = canvas.getContext(“2d”)
var UI_H = 100

function resize() {
canvas.width  = window.innerWidth
canvas.height = window.innerHeight - UI_H
}
resize()
window.addEventListener(“resize”, resize)

var keys = { left:false, right:false, fire:false }
var firePressed = false

function bindBtn(id, key) {
var el = document.getElementById(id)
function down(e) { e.preventDefault(); keys[key]=true;  el.classList.add(“pressed”) }
function up(e)   { e.preventDefault(); keys[key]=false; el.classList.remove(“pressed”) }
el.addEventListener(“touchstart”, down, { passive:false })
el.addEventListener(“touchend”,   up,   { passive:false })
el.addEventListener(“mousedown”,  down)
el.addEventListener(“mouseup”,    up)
}
bindBtn(“btnLeft”,  “left”)
bindBtn(“btnFire”,  “fire”)
bindBtn(“btnRight”, “right”)

var COLS=9, ROWS=4
var INV_W=32, INV_H=22, GAP_X=14, GAP_Y=12
var GRID_W = COLS*(INV_W+GAP_X)-GAP_X
var PLAYER_W=44, PLAYER_H=22
var SHIELD_BLOCK=8, SHIELD_COLS_B=6, SHIELD_ROWS_B=4
var SHOOT_CD=380, ENEMY_SHOOT_MIN=800, ENEMY_SHOOT_MAX=2200

var PAL = {
bg:”#03050f”, player:”#00e5ff”, bullet:”#00e5ff”, eBullet:”#ff3a5c”,
rows:[”#ff3a5c”,”#ff8c42”,”#ffe347”,”#3aff8c”],
shield:”#22aa55”, hud:”#ffffff”, hudDim:“rgba(255,255,255,0.35)”,
win:”#3aff8c”, lose:”#ff3a5c”, star:“rgba(255,255,255,”
}

var stars=[], particles=[], shields=[]
var player, bullets, eBullets, invaders
var score, lives, phase, invDir, invOffX, invOffY
var shootTimer, eShootTimer, lastTime, screenFlash, waveNum, invMoveAcc, tick

function makeStars() {
stars=[]
for(var i=0;i<80;i++) stars.push({
x:Math.random(), y:Math.random(),
r:Math.random()*1.5+0.3, a:Math.random()*0.7+0.15,
tw:Math.random()*Math.PI*2
})
}

function explode(x,y,color,count) {
count=count||14
for(var i=0;i<count;i++){
var ang=Math.random()*Math.PI*2, spd=Math.random()*3.5+1
particles.push({x:x,y:y,vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
life:1,decay:Math.random()*0.04+0.03,r:Math.random()*3+1,color:color})
}
}

function updateParticles() {
for(var i=0;i<particles.length;i++){
var p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.vy+=0.08; p.life-=p.decay
}
particles=particles.filter(function(p){return p.life>0})
}

function drawParticles() {
for(var i=0;i<particles.length;i++){
var p=particles[i]; ctx.globalAlpha=p.life; ctx.fillStyle=p.color
ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill()
}
ctx.globalAlpha=1
}

function makeShields() {
shields=[]
for(var s=0;s<4;s++){
var sx=(canvas.width/5)*(s+1)-(SHIELD_COLS_B*SHIELD_BLOCK)/2
var sy=canvas.height-140
var blocks=[]
for(var r=0;r<SHIELD_ROWS_B;r++)
for(var c=0;c<SHIELD_COLS_B;c++)
blocks.push({c:c,r:r,alive:true})
shields.push({sx:sx,sy:sy,blocks:blocks})
}
}

function shieldHit(bx,by) {
for(var s=0;s<shields.length;s++){
var sh=shields[s]
for(var b=0;b<sh.blocks.length;b++){
var bl=sh.blocks[b]; if(!bl.alive) continue
var bx2=sh.sx+bl.c*SHIELD_BLOCK, by2=sh.sy+bl.r*SHIELD_BLOCK
if(bx>=bx2&&bx<=bx2+SHIELD_BLOCK&&by>=by2&&by<=by2+SHIELD_BLOCK){
bl.alive=false; return true
}
}
}
return false
}

function makeInvaders() {
var list=[], startX=(canvas.width-GRID_W)/2, startY=80
for(var r=0;r<ROWS;r++)
for(var c=0;c<COLS;c++)
list.push({c:c,r:r,alive:true,x:startX+c*(INV_W+GAP_X),y:startY+r*(INV_H+GAP_Y)})
return list
}

function init() {
player={x:canvas.width/2-PLAYER_W/2, y:canvas.height-80, invincible:0}
bullets=[]; eBullets=[]; particles=[]
invaders=makeInvaders(); makeShields(); makeStars()
score=0; lives=3; phase=“play”
invDir=1; invOffX=0; invOffY=0
shootTimer=0; eShootTimer=Date.now()+1500
lastTime=null; screenFlash=0; waveNum=1; invMoveAcc=0; tick=0
}

function drawInvader(inv,ox,oy) {
var x=inv.x+ox, y=inv.y+oy, color=PAL.rows[inv.r%4], leg=(tick%40<20)
ctx.fillStyle=color
ctx.fillRect(x+5,y+5,INV_W-10,INV_H-8)
ctx.fillRect(x+9,y+1,INV_W-18,7)
ctx.fillRect(x+7,y-4,3,6); ctx.fillRect(x+INV_W-10,y-4,3,6)
ctx.fillStyle=”#000”
ctx.fillRect(x+9,y+7,4,4); ctx.fillRect(x+INV_W-13,y+7,4,4)
ctx.fillStyle=color
if(leg){
ctx.fillRect(x+4,y+INV_H-5,5,7); ctx.fillRect(x+INV_W-9,y+INV_H-5,5,7)
ctx.fillRect(x+12,y+INV_H-2,4,5); ctx.fillRect(x+INV_W-16,y+INV_H-2,4,5)
} else {
ctx.fillRect(x+2,y+INV_H-3,5,5); ctx.fillRect(x+INV_W-7,y+INV_H-3,5,5)
ctx.fillRect(x+14,y+INV_H-5,4,7); ctx.fillRect(x+INV_W-18,y+INV_H-5,4,7)
}
ctx.shadowColor=color; ctx.shadowBlur=8
ctx.fillRect(x+5,y+5,INV_W-10,INV_H-8)
ctx.shadowBlur=0
}

function drawPlayer() {
if(player.invincible>0&&Math.floor(player.invincible/4)%2===1) return
var x=player.x, y=player.y
ctx.shadowColor=PAL.player; ctx.shadowBlur=18; ctx.fillStyle=PAL.player
ctx.fillRect(x,y+10,PLAYER_W,PLAYER_H-10)
ctx.beginPath(); ctx.moveTo(x+PLAYER_W/2,y)
ctx.lineTo(x+PLAYER_W/2-10,y+12); ctx.lineTo(x+PLAYER_W/2+10,y+12)
ctx.closePath(); ctx.fill()
ctx.fillRect(x+PLAYER_W/2-3,y-6,6,10)
ctx.shadowBlur=0
var th=12+Math.random()*6
var g=ctx.createLinearGradient(x,y+PLAYER_H,x,y+PLAYER_H+th)
g.addColorStop(0,“rgba(0,229,255,0.8)”); g.addColorStop(1,“rgba(0,229,255,0)”)
ctx.fillStyle=g
ctx.fillRect(x+6,y+PLAYER_H,8,th); ctx.fillRect(x+PLAYER_W-14,y+PLAYER_H,8,th)
}

function drawBullet(b,isEnemy) {
var color=isEnemy?PAL.eBullet:PAL.bullet
ctx.shadowColor=color; ctx.shadowBlur=10; ctx.fillStyle=color
ctx.fillRect(b.x-2,b.y,4,14)
ctx.fillStyle=”#fff”; ctx.fillRect(b.x-1,isEnemy?b.y+10:b.y,2,4)
ctx.shadowBlur=0
}

function drawShields() {
for(var s=0;s<shields.length;s++){
var sh=shields[s]
for(var b=0;b<sh.blocks.length;b++){
var bl=sh.blocks[b]; if(!bl.alive) continue
ctx.fillStyle=PAL.shield
ctx.fillRect(sh.sx+bl.c*SHIELD_BLOCK,sh.sy+bl.r*SHIELD_BLOCK,SHIELD_BLOCK-1,SHIELD_BLOCK-1)
}
}
}

function drawStars() {
for(var i=0;i<stars.length;i++){
var s=stars[i], tw=Math.sin(tick*0.03+s.tw)*0.3+0.7
ctx.fillStyle=PAL.star+(s.a*tw).toFixed(2)+”)”
ctx.beginPath(); ctx.arc(s.x*canvas.width,s.y*canvas.height,s.r,0,Math.PI*2); ctx.fill()
}
}

function pad6(n){ var s=String(n); while(s.length<6) s=“0”+s; return s }

function drawHUD() {
ctx.shadowColor=PAL.player; ctx.shadowBlur=8; ctx.fillStyle=PAL.hud
ctx.font=“bold 16px monospace”; ctx.fillText(“SCORE”,14,28)
ctx.font=“bold 22px monospace”; ctx.fillText(pad6(score),14,52)
ctx.shadowBlur=0; ctx.fillStyle=PAL.hudDim
ctx.font=“bold 14px monospace”
ctx.fillText(“WAVE “+waveNum, canvas.width/2-30, 26)
ctx.fillText(“LIVES”, canvas.width-76, 28)
ctx.fillStyle=”#ff3a5c”; ctx.shadowColor=”#ff3a5c”; ctx.shadowBlur=6
for(var i=0;i<lives;i++) ctx.fillText(”\u2665”, canvas.width-70+i*22, 50)
ctx.shadowBlur=0
ctx.strokeStyle=“rgba(255,255,255,0.08)”; ctx.lineWidth=1
ctx.beginPath(); ctx.moveTo(0,62); ctx.lineTo(canvas.width,62); ctx.stroke()
}

function drawOverlay(title,color) {
ctx.fillStyle=“rgba(0,0,0,0.7)”; ctx.fillRect(0,0,canvas.width,canvas.height)
ctx.shadowColor=color; ctx.shadowBlur=30; ctx.fillStyle=color
ctx.font=“bold 48px monospace”; ctx.textAlign=“center”
ctx.fillText(title, canvas.width/2, canvas.height/2-30)
ctx.shadowBlur=0; ctx.fillStyle=“rgba(255,255,255,0.6)”
ctx.font=“18px monospace”
ctx.fillText(“SCORE: “+pad6(score), canvas.width/2, canvas.height/2+14)
ctx.fillStyle=“rgba(255,255,255,0.3)”; ctx.font=“bold 14px monospace”
ctx.fillText(“TAP  \u25CF  TO PLAY AGAIN”, canvas.width/2, canvas.height/2+56)
ctx.textAlign=“left”; ctx.shadowBlur=0
}

function update(dt) {
tick++
var now=Date.now()
if(player.invincible>0) player.invincible–
if(screenFlash>0) screenFlash–
if(keys.left)  player.x=Math.max(0,player.x-4.5)
if(keys.right) player.x=Math.min(canvas.width-PLAYER_W,player.x+4.5)
if(keys.fire&&!firePressed){
firePressed=true
if(now-shootTimer>SHOOT_CD){ bullets.push({x:player.x+PLAYER_W/2,y:player.y-4}); shootTimer=now }
}
if(!keys.fire) firePressed=false

bullets=bullets.filter(function(b){return b.y>0})
for(var i=0;i<bullets.length;i++) bullets[i].y-=9
eBullets=eBullets.filter(function(b){return b.y<canvas.height})
for(var i=0;i<eBullets.length;i++) eBullets[i].y+=5.5

var alive=invaders.filter(function(i){return i.alive})
if(alive.length===0){ nextWave(); return }

var ratio=alive.length/(COLS*ROWS)
invMoveAcc+=(0.18+(1-ratio)*0.55)*dt*0.06
if(invMoveAcc>=1){
invMoveAcc=0
var le=Infinity, re=-Infinity
for(var i=0;i<alive.length;i++){
var ix=alive[i].x+invOffX
if(ix<le) le=ix; if(ix+INV_W>re) re=ix+INV_W
}
if(invDir===1&&re>=canvas.width-8){ invOffY+=20; invDir=-1 }
else if(invDir===-1&&le<=8){ invOffY+=20; invDir=1 }
else invOffX+=invDir*(7+(1-ratio)*5)
for(var i=0;i<alive.length;i++){
if(alive[i].y+invOffY+INV_H>=player.y){ phase=“lose”; return }
}
}

if(now>eShootTimer&&alive.length>0){
var s=alive[Math.floor(Math.random()*alive.length)]
eBullets.push({x:s.x+invOffX+INV_W/2,y:s.y+invOffY+INV_H})
eShootTimer=now+ENEMY_SHOOT_MIN+Math.random()*(ENEMY_SHOOT_MAX-ENEMY_SHOOT_MIN)
}

var hitB={}
for(var bi=0;bi<bullets.length;bi++){
var b=bullets[bi]
if(shieldHit(b.x,b.y)){hitB[bi]=true;continue}
for(var ii=0;ii<alive.length;ii++){
var inv=alive[ii], ix=inv.x+invOffX, iy=inv.y+invOffY
if(b.x>=ix&&b.x<=ix+INV_W&&b.y>=iy&&b.y<=iy+INV_H){
inv.alive=false; score+=(ROWS-inv.r)*10*waveNum
explode(ix+INV_W/2,iy+INV_H/2,PAL.rows[inv.r%4],18)
hitB[bi]=true; break
}
}
}
bullets=bullets.filter(function(_,i){return !hitB[i]})

var hitEB={}
for(var bi=0;bi<eBullets.length;bi++){
var b=eBullets[bi]
if(shieldHit(b.x,b.y+14)){hitEB[bi]=true;continue}
if(b.x>=player.x&&b.x<=player.x+PLAYER_W&&b.y+14>=player.y&&b.y<=player.y+PLAYER_H&&player.invincible===0){
lives–; explode(player.x+PLAYER_W/2,player.y+PLAYER_H/2,PAL.player,20)
screenFlash=12; player.invincible=100; hitEB[bi]=true
if(lives<=0) phase=“lose”
}
}
eBullets=eBullets.filter(function(_,i){return !hitEB[i]})
updateParticles()
}

function nextWave() {
waveNum++; invaders=makeInvaders(); makeShields()
bullets=[]; eBullets=[]; invDir=1; invOffX=0; invOffY=0; invMoveAcc=0
eShootTimer=Date.now()+1000
explode(canvas.width/2,canvas.height/2,”#ffe347”,40)
}

function render() {
ctx.fillStyle=screenFlash>0?“rgba(255,60,90,0.18)”:PAL.bg
ctx.fillRect(0,0,canvas.width,canvas.height)
drawStars()
if(phase===“play”){
drawShields()
for(var i=0;i<invaders.length;i++) if(invaders[i].alive) drawInvader(invaders[i],invOffX,invOffY)
for(var i=0;i<bullets.length;i++)  drawBullet(bullets[i],false)
for(var i=0;i<eBullets.length;i++) drawBullet(eBullets[i],true)
drawParticles(); drawPlayer(); drawHUD()
} else if(phase===“win”){
drawOverlay(“YOU WIN”,PAL.win)
} else {
drawParticles(); drawOverlay(“GAME OVER”,PAL.lose)
}
}

function loop(ts) {
if(!lastTime) lastTime=ts
var dt=Math.min(ts-lastTime,50); lastTime=ts
if(phase===“play”) update(dt)
render()
requestAnimationFrame(loop)
}

document.getElementById(“btnFire”).addEventListener(“touchend”,function(){
if(phase!==“play”) init()
})

init()
requestAnimationFrame(loop)

}) // end window.load
</script>

</body>
</html>`

const wv = new WebView()
await wv.loadHTML(html)
await wv.present(true)
"""Build original design-only SVG boards and the standalone gallery. No production assets."""
import json, math, html, textwrap, re
from pathlib import Path
BASE=Path(__file__).resolve().parent
DATA=json.loads((BASE/'world-layouts.json').read_text(encoding='utf-8'))
INK='#18232c'; MUTED='#52616a'; PAPER='#f2f0e9'; ACCENT='#386b73'
def e(t): return html.escape(str(t))
def readable(t):
 t=str(t)
 t=re.sub(r'\b(at|both|all|exact|fixed|candidate|native|existing|current|from|to|into|by|within|beyond|unchanged|planned|recorded|only|and|the|with|remaining|scores|sequence|regenerate|same)(?=\d)',r'\1 ',t,flags=re.I)
 t=re.sub(r'(\d)(worldpx|px|tiles|fps|ms|MiB|slots|seconds|minutes)\b',r'\1 \2',t)
 t=re.sub(r'(\d)(reachable|rendered|original|retained|planned|remaining|physical|logical|poor|strong|SVG|Concourse)',r'\1 \2',t)
 return t
class Board:
 def __init__(self,w,h,title,sub=''):
  self.w=w;self.h=h;self.a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{e(title)}"><title>{e(title)}</title><desc>{e(sub)}</desc><rect width="100%" height="100%" fill="{PAPER}"/>']
  self.text(40,45,'ASTRA / STATION 080 / DESIGN AUTHORITY',14,MUTED,600)
  self.text(40,86,title,30,INK,700)
  if sub:self.text(40,114,sub,16,MUTED)
 def rect(self,x,y,w,h,fill,stroke='none',sw=1,extra=''):self.a.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>')
 def line(self,x1,y1,x2,y2,c=INK,sw=2,extra=''):self.a.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{sw}" {extra}/>')
 def text(self,x,y,t,size=16,c=INK,weight=400):self.a.append(f'<text x="{x}" y="{y}" fill="{c}" font-family="Segoe UI,Arial,sans-serif" font-size="{size}" font-weight="{weight}">{e(readable(t))}</text>')
 def para(self,x,y,t,width=60,size=16,c=MUTED):
  t=readable(t)
  for n,s in enumerate(textwrap.wrap(t,width)):self.text(x,y+n*(size+6),s,size,c)
  return y+len(textwrap.wrap(t,width))*(size+6)
 def circle(self,x,y,r,fill,stroke='none'):self.a.append(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{stroke}"/>')
 def save(self,name):
  self.text(40,self.h-22,'Original analytical blockout • labels are reviewer annotations • no commercial-game imagery',12,MUTED)
  self.a.append('</svg>');(BASE/name).write_text('\n'.join(self.a)+'\n',encoding='utf-8')
def floors(z):
 if 'walkable_floor_rects' in z:return z['walkable_floor_rects']
 r=[p['rect'] for p in z['paths']]+[d['rect'] for d in z['districts']]+[z['quiet']['rect']]
 w,h=z['tiles']
 for s in z['stations']:
  x,y=s['approach'];r.append([x-2,y-2,4,4])
  # A clear access lane to the nearer arm of the central cross.
  if abs(x-w/2)<abs(y-h/2):r.append([min(x,w/2)-1.5,y-1.5,abs(x-w/2)+3,3])
  else:r.append([x-1.5,min(y,h/2)-1.5,3,abs(y-h/2)+3])
 for d in z['doors']:
  x,y=d['at'];sx,sy=d['spawn'];r.append([min(x,sx)-1.5,min(y,sy)-1.5,abs(x-sx)+3,abs(y-sy)+3])
 return r
def player(b,x,y,k=1,colour='#d8af65'):
 # Original measured-height marker:45px visible; body reference32x42.
 b.rect(x-11*k,y-35*k,22*k,25*k,colour,INK,1*k);b.rect(x-8*k,y-45*k,16*k,13*k,'#d7d5cb',INK,1*k)
 b.rect(x-9*k,y-10*k,7*k,10*k,INK);b.rect(x+2*k,y-10*k,7*k,10*k,INK)
def plan(b,z,x,y,s,labels=True,camera=True):
 w,h=z['tiles'];b.rect(x,y,w*s,h*s,'#444d51')
 def rr(r,fill,stroke='none',sw=1,extra=''):b.rect(x+r[0]*s,y+r[1]*s,r[2]*s,r[3]*s,fill,stroke,sw,extra)
 for r in floors(z):rr(r,'#c4c7c5')
 for p in z['paths']:rr(p['rect'],'#e5e6df')
 for d in z['districts']:rr(d['rect'],'none','#a5aaa8',1)
 for xx in range(0,w+1,4):b.line(x+xx*s,y,x+xx*s,y+h*s,'#7b8485',.4)
 for yy in range(0,h+1,4):b.line(x,y+yy*s,x+w*s,y+yy*s,'#7b8485',.4)
 for d in z['decor']:rr(d['rect'],'#677073','#353e42')
 rr(z['quiet']['rect'],'#d5d7d1','#7a8484')
 rr(z['landmark']['rect'],'#899393' if not z['landmark'].get('overhead') else 'none','#27363b',3,'stroke-dasharray="7 5"' if z['landmark'].get('overhead') else '')
 lx,ly,lw,lh=z['landmark']['rect'];b.line(x+lx*s,y+(ly+.3)*s,x+(lx+lw)*s,y+(ly+.3)*s,'#eff0e8',3)
 if camera:rr(z['initial_camera'],'none','#101b21',2,'stroke-dasharray="9 6"')
 for n,t in enumerate(z['stations'],1):
  if t.get('footprint'):rr(t['footprint'],'#354249','#101b21')
  ax,ay=t['approach']
  if labels:b.circle(x+ax*s,y+ay*s,max(2,s*.2),'white','#405055')
  if 'plot'in t:rr(t['plot'],'#b4bbaf','#23382d',2,'stroke-dasharray="5 3"')
  for key in ('tray','alternative'):
   if key in t:
    px,py=t[key];rr([px-.65,py-1,.9,1],'#4b5558')
  tx,ty=t['at']
  if t['kind']=='npc':
   if labels:b.circle(x+tx*s,y+(ty-.6)*s,s*.4,'#f6f5ee',INK)
   else:player(b,x+tx*s,y+ty*s,s/32,'#b7c0ba')
  elif not labels and t['kind']!='quiet' and t.get('footprint'):
   b.rect(x+(tx-.55)*s,y+(ty-1.7)*s,1.1*s,.3*s,'#adbdb9')
  if labels:
   b.circle(x+tx*s,y+(ty-.7)*s,10,'#f6f5ee',INK);b.text(x+tx*s-(4 if n<10 else 8),y+(ty-.7)*s+4,n,12,INK,700)
 for d in z['doors']:
  dx,dy=d['at'];sx,sy=d['spawn'];b.line(x+(dx-1.5)*s,y+dy*s,x+(dx+1.5)*s,y+dy*s,'#f7f7ee',5)
  b.circle(x+sx*s,y+sy*s,4,INK)
  if labels:
   tx=x+dx*s;ty=y+dy*s
   if d['side']=='N':b.text(tx-40,ty-12,'N → '+d['to'],13,INK,700)
   elif d['side']=='S':b.text(tx-45,ty+25,'S → '+d['to'],13,INK,700)
   elif d['side']=='W':b.text(x+4,ty-15,'W → '+d['to'],13,INK,700)
   else:b.text(x+w*s-110,ty-15,'E → '+d['to'],13,INK,700)
 for end in z.get('closed_frontages',[]):
  if end['side']=='N':b.line(x+(w/2-2)*s,y+2*s,x+(w/2+2)*s,y+2*s,'#788b90',4)
  elif end['side']=='S':b.line(x+(w/2-2)*s,y+(h-2)*s,x+(w/2+2)*s,y+(h-2)*s,'#788b90',4)
  elif end['side']=='W':b.line(x+2*s,y+(h/2-2)*s,x+2*s,y+(h/2+2)*s,'#788b90',4)
  else:b.line(x+(w-2)*s,y+(h/2-2)*s,x+(w-2)*s,y+(h/2+2)*s,'#788b90',4)
 sx,sy=z['spawn'];player(b,x+sx*s,y+(sy+.75)*s,s/32)
 if labels:
  b.text(x,y-20,'N ↑     4-tile grid     white: circulation     dark: hull / terrain mass',14,MUTED)
  b.text(x,y+h*s+48,'Dashed: initial40×22.5 view. Open circle: operating approach. Dot: incoming spawn.',14,MUTED)
def zone(z):
 b=Board(1600,1640,z['name']+' / spatial blockout',f"{z['tiles'][0]}×{z['tiles'][1]} tiles • {z['world_px'][0]}×{z['world_px'][1]} world px • tile 32 • body 32×42")
 s=min(1000/z['tiles'][0],640/z['tiles'][1]);x=40;y=170
 plan(b,z,x,y,s)
 b.text(1090,166,'OPERATING FACES / TILE CONTACT',17,INK,700)
 yy=200
 for n,t in enumerate(z['stations'],1):
  b.text(1090,yy,f"{n:02d}  {t['label']}",14,INK,600)
  b.text(1116,yy+18,f"{t['at']}  {' / '.join(t['items']) or 'route/context'}",13,MUTED)
  yy+=43
 b.text(40,900,'FUNCTION AND HIERARCHY',18,INK,700)
 b.para(40,928,z['purpose']+' '+z['identity'],87,16)
 b.para(800,928,'Landmark: '+z['landmark']['label']+'. Quiet space: '+z['quiet']['label']+'. Beyond initial view: '+z['beyond_initial'],75,16)
 b.text(40,1040,'COLLISION / CAMERA / RESTORATION',18,INK,700)
 b.para(40,1068,'Main spine4tiles/128px; secondary and doors3tiles/96px. Actual player32×42px. Footprint blocks only its visible base; overhead cap uses an authored contact anchor. Camera clamped to room, never to task result.',85,16)
 b.para(800,1068,'Crew state: '+'. '.join(z['restoration'])+'. '+z.get('measurement_constraints','No new primary opportunity. Existing entry state and handover triggers retained.'),75,16)
 r=z['restoration_change'];b.text(40,1360,'FIXED CREW CHANGE / '+r['shape_id'],18,INK,700)
 for i,state in enumerate(['before','after']):
  xx=40+i*780;b.rect(xx,1380,220,150,'#bac3bf',INK);b.rect(xx+50,1415,115,75,'#5c727b',INK,2)
  if r['kind']=='lamp':b.rect(xx+75,1428,65,12,'#aabaaf' if i==0 else '#e2ddc0')
  elif i==0:
   b.line(xx+50,1415,xx+20,1390,'#465a63',9);b.line(xx+165,1415,xx+200,1390,'#465a63',9)
  else:b.rect(xx+45,1408,125,14,'#91a49d',INK)
  b.text(xx+250,1405,state.upper()+' / '+(r['trigger_stage'] if i else 'prior stage'),16,INK,700)
  b.para(xx+250,1438,r[state],47,16)
 b.para(40,1571,'Protected unchanged: '+r['protected_unchanged'],140,15)
 b.save('zone-'+z['id']+'.svg')
def topology():
 b=Board(1600,1130,'Two complete station concepts','Select operations tree with local loops; reject a service ring that changes exposure paths.')
 pos={'dock':(330,770),'concourse':(330,570),'records':(50,570),'laboratory':(330,370),'yard':(330,170),'utility':(610,570),'core':(610,370)}
 def draw(off,ring):
  for a,c in DATA['topology']['edges']:
   ax,ay=pos[a];cx,cy=pos[c];b.line(off+ax+90,ay+52,off+cx+90,cy+52,'#899596',12)
  if ring:
   for a,c in [('records','laboratory'),('yard','utility')]:
    ax,ay=pos[a];cx,cy=pos[c];b.line(off+ax+90,ay+52,off+cx+90,cy+52,'#a18149',4,'stroke-dasharray="10 7"')
  for z in DATA['zones']:
   xx,yy=pos[z['id']];xx+=off;b.rect(xx,yy,180,104,'#d8ddd8',INK,2)
   b.text(xx+12,yy+33,z['id'].upper(),16,INK,700);b.text(xx+12,yy+61,str(z['tiles'][0])+' × '+str(z['tiles'][1])+' tiles',15)
   b.text(xx+12,yy+84,'local circulation loop',12,MUTED)
 draw(0,False);draw(790,True)
 b.text(40,940,'A / OPERATIONS TREE — SELECTED',22,INK,700)
 b.para(40,975,'Relief handover → records → independent signal incident → exterior recovery → purposeful return → Utility/Core. Existing cardinal adjacency and exit windows remain intact.',68,17)
 b.text(830,940,'B / SERVICE RING — REJECTED',22,INK,700)
 b.para(830,975,'Distributed salvage expedition uses Records–Lab and Yard–Utility links. Credible logistics, but alternative exits change watch, promise and return exposure. Requires new owner authority.',66,17)
 b.save('world-topology.svg')
def route():
 b=Board(1600,1000,'Story beats / participant route / restoration','One outpost, fixed handovers, independently owned task states.')
 beats=[('01 Dock','Arrival / no primary','Storm outside; cleared interior','Shuttle / terminal'),('02 Concourse','E1 handover','Operations crew at counter','M01 M05o1 M09 M10 M12o1 M14'),('03 Records','E2 work record','Transit crates contained','M02 M03a M04 M06 M07 M12o2 M13'),('04 Laboratory','E3 signal incident','Receiver case remains external','M15 M16 M17 M18; M10 recipient'),('05 Yard','E4 recovery','Safe cleared apron','M05o2 M19 M20 M23 M24 M26'),('06 Return hub','E5 check-in','Recognisable counter / gauge','M09 check2 / M10'),('07 Records return','E5 reconcile','Crew service report arrives','M03b M07 M20 M21 M22; M25 notice'),('08 Utility → Core','E6 closure','Fixed feeds / quiet synchronisation','No new primary opportunity')]
 for i,(a,c,d,f) in enumerate(beats):
  row=i//4;col=i%4;x=40+col*390;y=180+row*300;b.rect(x,y,360,250,'#dde1db',INK)
  b.text(x+20,y+35,a,21,INK,700);b.text(x+20,y+67,c,17)
  b.para(x+20,y+112,d,32,17);b.para(x+20,y+179,f,36,15)
  if col<3:b.line(x+360,y+125,x+382,y+125,ACCENT,4)
 b.para(40,840,'Route: Dock → Concourse → Records → Concourse → Lab → Yard → Lab → Concourse → Records → Concourse → Utility → Core. Stage progress is not individual task success. M08/M11 remain secondary context; M25 questionnaire-primary notice.',134,18)
 b.save('route-and-restoration.svg')
def camera():
 b=Board(1600,1150,'Camera alternatives / common-world comparison','Original geometry, measured 45 px player; same player/world scale input across comparisons.')
 z=next(z for z in DATA['zones'] if z['id']=='concourse')
 opts=[('A / fixed wide',40,22.5,'6.25% at720 and1080','1× /1.5×; same exposure; SELECT'),('B / U1 close',32,18,'7.81% at720 and1080','1.25× /1.875×; cropped surroundings'),('C / native1:1 at1080',60,33.75,'6.25% at 720 / 4.17% at 1080','Device-dependent field; reject'),('D / district lock',30,16.875,'8.33% at720 and1080','Boundary cuts; 1.333× /2×')]
 for i,(name,vw,vh,pct,reason) in enumerate(opts):
  xx=40+(i%2)*780;yy=160+(i//2)*465;b.text(xx,yy,name,22,INK,700)
  px=xx;py=yy+28;pw=720;ph=330;s=min(pw/60,ph/38)
  plan(b,z,px+0,py,s,False,False)
  cx,cy=z['spawn'];vx=max(0,min(60-vw,cx-vw/2));vy=max(0,min(38-vh,cy-vh/2))
  b.rect(px+vx*s,py+vy*s,vw*s,vh*s,'none',ACCENT,4)
  b.text(xx,yy+390,f'View {vw}×{vh}tiles • {pct}',17,INK,600);b.text(xx,yy+416,reason,16,MUTED)
 b.save('camera-comparison.svg')
def opening():
 b=Board(1600,1320,'Replacement opening /8-frame storyboard','16seconds total • recognisable transport • exact playable Dock end state • skippable')
 names=['0–2s / establish outpost','2–4s / shuttle approach','4–6s / track to Dock','6–8s / berth and settle','8–10s / reveal sealed hall','10–12s / step onto Dock','12–14s / settle camera','14–16s / release controls']
 notes=['Station silhouette and stormward mast; low wind, no alarm.','Shuttle follows a cleared line. Optional “Station approach.”','Keep connected roofs visible; slow linear camera move.','One landing action. “Relief watch • Station 080”.','Author roof reveal using the same Dock walls/airlock.','Player reaches exact spawn. “Operations handover is inside.”','No camera motion at the first gameplay instruction.','Common watch/skip finish; no M-window event.']
 for i in range(8):
  x=40+(i%4)*390;y=160+(i//4)*470;b.text(x,y,names[i],18,INK,700)
  b.rect(x,y+20,360,285,'#61717a')
  if i<4:
   for rx,ry,rw,rh in [(183,65,14,33),(183,140,14,29),(117,188,38,14),(231,188,28,14),(289,136,14,38),(183,222,14,33)]:
    b.rect(x+rx,y+ry,rw,rh,'#879894')
   for rx,ry,rw,rh in [(156,40,70,35),(155,98,70,42),(28,165,93,67),(145,169,90,58),(253,169,82,58),(260,99,70,42),(157,250,66,41)]:
    b.rect(x+rx,y+ry,rw,rh,'#26353e','#adb8b7',2)
   b.line(x+24,y+47,x+35,y+95,'#202f38',6);b.line(x+35,y+70,x+67,y+80,'#202f38',4)
   sx=x+(316-i*42);sy=y+278
   b.rect(sx-24,sy-11,48,22,'#d0d4cc',INK,2);b.rect(sx-38,sy-6,14,13,'#859ca2',INK);b.rect(sx+24,sy-6,14,13,'#859ca2',INK)
   b.rect(sx-8,sy-17,17,11,'#2e5967',INK);b.text(x+12,y+295,'N ↑   connected roofs / cleared approach',11,'#eff0e9')
  else:
   dock=next(z for z in DATA['zones'] if z['id']=='dock');vx,vy,vw,vh=dock['initial_camera'];scale=9
   clip='opening'+str(i);b.a.append(f'<defs><clipPath id="{clip}"><rect x="{x}" y="{y+20}" width="360" height="285"/></clipPath></defs><g clip-path="url(#{clip})">')
   plan(b,dock,x-vx*scale,y+45-vy*scale,scale,False,False);b.a.append('</g>')
   if i==4:b.rect(x,y+20,360,46,'#536771')
   b.text(x+8,y+296,'Exact Dock plan / shared spawn and camera',11,INK,600)
  b.para(x,y+340,notes[i],35,16)
 b.para(40,1150,'Watch and skip use the same finish routine: story arrival, empty inventory, spawn/camera, tutorial availability and held-key release match. Existing lifecycle events stay separate from M01–M26. Caption/elapsed exposure changes remain OD-W1-5.',132,17)
 b.save('opening-storyboard.svg')
def states():
 b=Board(1600,980,'One interaction language / five states in context','No permanent names; board labels explain the design and are not shown over world objects.')
 titles=['Required','Optional context','Decorative','Unavailable','Completed']
 prompts=['E / Space — Read terminal','E / Space — Inspect log','No prompt / no focus','E / Space — Inspect terminal','E / Space — Inspect terminal']
 for i in range(5):
  x=40+i*310;y=185;b.text(x,y,titles[i],21,INK,700);b.rect(x,y+25,285,350,'#c2c8c4')
  b.rect(x+16,y+45,253,52,'#59696e');b.rect(x+82,y+137,112,70,'#64777d',INK,2)
  if i==0:b.rect(x+107,y+142,61,22,'#d2d9cc',INK)
  if i==1:
   b.rect(x+126,y+127,29,36,'#d8d2bc',INK);b.line(x+133,y+137,x+150,y+137,'#72827d',2);b.line(x+133,y+145,x+146,y+145,'#72827d',2)
  if i==3:b.rect(x+102,y+133,72,44,'#717b79',INK,2)
  if i==4:
   b.rect(x+103,y+153,68,18,'#52656a',INK);b.rect(x+87,y+182,21,8,'#8b9b92');b.line(x+110,y+148,x+164,y+148,'#899b91',3)
  if i==2:
   b.rect(x+90,y+115,34,24,'#919785',INK);b.rect(x+129,y+112,55,26,'#9b9e8c',INK)
  player(b,x+135,y+298,.85)
  if i!=2:
   b.rect(x+10,y+323,265,38,INK);b.para(x+18,y+339,prompts[i],36,12,'#f4f3ec')
  else:b.text(x+63,y+346,'Silent storage cluster',14,MUTED)
  treatments=['Operating face and clear approach; no idle animation.','Small paper log on a subordinate surface; no mission demand.','No usable face, hover, sound or focus stop.','After activation: Awaiting service phase. Proximity only offers Inspect.','Face folded away, cover parked, no bright active screen or repeated demand.']
  b.para(x,y+418,treatments[i],29,17)
 b.text(40,755,'MEASUREMENT EXCEPTION IS EXPLICIT',19,INK,700)
 b.para(40,791,'Optional cleanup and unsolicited initiation retain their approved quiet presentation. Accepted commitments keep their existing reminder exposure until owner disposition. A required-route grammar must never turn M03/M04/M05/M09/M10 into a compelled “good participant” response.',137,18)
 b.save('interaction-states.svg')
def inventory():
 b=Board(1600,1100,'Inventory / mission log / field tools','Starting inventory empty. Research-owned workspaces never become backpack contents.')
 b.rect(40,160,900,520,'#344851')
 b.rect(65,183,850,465,'#14242b','#768b91',2);b.text(90,218,'RECORDS / MATERIAL TRANSFER',23,'#eff0e6',700)
 b.text(90,251,'Backpack · 20 slots',16,'#c7d5cb',600)
 for j in range(20):b.rect(90+(j%5)*47,269+(j//5)*43,40,36,'#233a44','#587780')
 b.rect(90,269,40,36,'#456d75','#c9d5c9',3);b.rect(103,279,14,15,'#ccb67e')
 b.text(90,470,'Quick access · 10 slots',16,'#c7d5cb',600)
 for j in range(10):b.rect(90+(j%5)*47,487+(j//5)*43,40,36,'#233a44','#587780')
 b.text(370,262,'FUSE CONTACT',21,'#eff0e6',700)
 b.para(370,302,'Material · selected slot 1. Source: prepared Records resupply. Use: optional relay assembly. Destination: component locker.',49,18,'#c7d5cb')
 b.para(370,424,'Pointer: select and transfer. Keyboard: arrows + Space pick/place; Tab changes grid. Existing quantities and transfer rules remain unchanged.',49,17,'#c7d5cb')
 b.text(90,610,'I / Escape close · Mission card hidden while stores are open.',17,'#d3ddd2')
 b.text(990,196,'PROGRESSIVE DISCLOSURE',22,INK,700)
 b.para(990,232,'Arrival: no inventory instruction or tool strip. Vale supplies purpose in a mission log, not arbitrary carried parts.',49,18)
 b.para(990,362,'Records: first material transfer opens a brief control explanation. Categories are metadata, not new containers or capacities. General stores organisation is not a primary opportunity.',49,18)
 b.para(990,510,'Yard: automatically issued tools retain current eligibility. A visible locker explains the issue; optional pickup cannot gate measurement.',49,18)
 b.rect(40,735,900,145,'#344851');b.rect(375,797,230,54,'#15262e','#92aaa9')
 for j,t in enumerate(['C Scan','D Dig']):b.rect(389+j*107,807,96,34,'#3e5d65');b.text(399+j*107,829,t,16,'#eff0e8')
 b.text(65,765,'LATER / YARD: scanner and spade issued by field dispatch',17,'#e4e9df')
 b.para(990,765,'Closure: obsolete material moves through existing transactions or is visually archived after its window. No measured state is silently cleared.',49,18)
 b.para(40,952,'M02 cases, M03 residuals, M04 debris and M10 promise carrying state retain dedicated namespaces. No auto-sort, inventory-capacity prerequisite or organisation score is introduced.',136,18)
 b.save('inventory-hud.svg')
def depth():
 b=Board(1600,1050,'Depth / contact / collision','Same original machine viewed before and behind its contact line.')
 for i in range(2):
  x=50+i*770;y=175;b.rect(x,y,720,530,'#c1c8c4')
  if i==0:player(b,x+360,y+180,1.8)
  b.rect(x+210,y+115,300,125,'#708187',INK,3);b.rect(x+210,y+240,300,120,'#465f6a',INK,3)
  b.rect(x+245,y+350,230,47,'#3d515b',INK,2)
  b.rect(x+245,y+355,230,42,'none','#914a42',3,'stroke-dasharray="8 6"')
  if i==1:player(b,x+360,y+430,1.8)
  b.line(x+145,y+397,x+575,y+397,INK,3);b.text(x+150,y+470,'visible base = collision bottom = depth anchor',18,INK,600)
  b.text(x+25,y+510,'Actor '+('behind: machine occludes body' if i==0 else 'in front: actor occludes machine'),19,INK,700)
 b.text(40,742,'Render order',22,INK,700)
 b.para(40,780,'Floor → decals → low infrastructure → foot-sorted props and actors → foreground wall caps → UI. Current depth saturates near 1980 world px; selected zone heights stay below that, but replace saturation with a stable depth mapping during camera/render work.',85,18)
 b.para(900,780,'Red dashed base is collision, not the entire transparent image. North overhang may occlude behind; the south operating face and required path stay visible. Never use addDecor for a solid object in a required lane.',62,18)
 b.save('depth-layers.svg')
def composition(w,h):
 # Native dimension artifact. Original low-detail world at selected field, no labels over props.
 b=Board(w,h,'Concourse / selected view',f'Native {w}×{h} • field40×22.5tiles • same world exposure')
 b.a=b.a[:1] # rebuild: no header occupying participant frame
 b.a=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="Original selected Concourse composition at {w} by {h}"><title>Original Concourse composition</title>']
 z=next(z for z in DATA['zones'] if z['id']=='concourse');vx,vy,vw,vh=z['initial_camera'];s=w/40
 b.rect(0,0,w,h,'#33464e');b.a.append(f'<g transform="translate({-vx*s} {-vy*s})">')
 plan(b,z,0,0,s,False,False);b.a.append('</g>')
 # Native readable UI, one currently relevant cue. Arrival state; gauge has no new reminder.
 k=w/1280;b.rect(24*k,24*k,348*k,66*k,'#12242d','#6f858a')
 b.text(40*k,49*k,'OPERATIONS HANDOVER',14*k,'#b7cbc6',600);b.text(40*k,76*k,'Meet Vale at the operations counter.',18*k,'#f1f0e7')
 b.rect(w-128*k,24*k,104*k,42*k,'#12242d');b.text(w-112*k,51*k,'M  Map',18*k,'#edf0e6')
 b.text(24*k,h-20*k,'Original composition blockout •40×22.5tiles • no production claim',13*k,'#15252d')
 b.a.append('</svg>');(BASE/f'composition-{w}x{h}.svg').write_text('\n'.join(b.a),encoding='utf-8')
def crosswalk():
 """Render the exact current JSON index and detailed tables; never include questionnaire wording."""
 data=json.loads((BASE/'m01-m26-spatial-crosswalk.json').read_text(encoding='utf-8'))
 def cell(value):
  if not isinstance(value,str):value=json.dumps(value,ensure_ascii=False)
  return value.replace('|',' / ').replace('\n',' ')
 lines=['# M01–M26 spatial and measurement crosswalk',
 'Astra • 2026-09-08 • entry f6e051f • questionnaire wording excluded.',
 '',
 '## Authority and exactness',
 'Research-owner workbook final sheets 08–14 lead. The scientific audit compared 364 workbook fields (14 columns × 26 rows) with the ledger and found zero differences; questionnaire wording was compared privately and excluded here. This artifact preserves workbook candidate names and the current opportunity schedule. Runtime payload names can differ (for example initiation_latency_ms); this document does not rename exports, approve canonical events or change scoring.',
 '',
 'There are 16 strong design candidates, seven conditional candidates and three questionnaire-primary items (M08, M11, M25). Strong is a design disposition, not empirical game validity. Source instruments are BFI-2 Organization/Productiveness/Responsibility, BESSI-192 Information Processing Skill, and Multidimensional Persistence Scale Persistence Despite Difficulty/Inappropriate Persistence.',
 '',
 'The JSON companion contains all fields per item. The compact index covers all 26; complete transposed tables make lifecycle details readable. Workbook validity gates are prescriptions, not proof that runtime guards implement them. Current and proposed mechanics are distinguished explicitly.',
 '',
 '## Disagreements and evidence limits',
 'The older docs/game/PILOT-M01-M26-IMPLEMENTATION-CROSSWALK.md describes a superseded 13-primary route. This crosswalk replaces its current-route description, not scientific authority. The current_schedule field preserves the ledger snapshot verbatim, including stale proposal wording and implementation_status values that still say planned. Actual current gameplay is recorded separately in current_gameplay_analogue and runtime_source fields; consult these before interpreting the schedule snapshot as runtime evidence. Original external scientific papers were not present in the repository; workbook summaries and internal reports are not independent original-paper evidence. Recorded DOI provenance does not validate a game analogue.',
 '',
 'M16 is the material selection mismatch: final workbook09!G20 chooses a novel protocol; the current base-to-new-rule task resembles an earlier runner-up with inhibition/flexibility confounds. M25 is a notice shell with null response, not an administered belief probe. M05 currently asserts comprehension and records variable distance. These remain owner decisions. The prescribed full-visitation walk model totals 328.69 seconds, not human timing or evidence of burden equivalence.',
 '',
 '## Complete index','|Item|Source instrument / facet|Authorised status|Current room|Proposed exact sites|Event family / opportunity|Decision|','|---|---|---|---|---|---|---|']
 for r in data['items']:
  values=[r['id'],r['instrument']+' / '+r['facet_or_scale'],r['final_disposition'],r['current_room_opportunity'],r['proposed_final_room_opportunity']['sites'],r['independent_event_family']+r['secondary_telemetry_ids']+r['current_schedule']['opportunity_ids'],r['decision']]
  lines.append('|'+'|'.join(cell(v) for v in values)+'|')
 fields=[('workbook_cells','Workbook locator'),('instrument','Source instrument'),('facet_or_scale','Facet / scale'),('final_disposition','Authorised status'),('analysis_level','Analysis restriction'),('final_game_opportunity','Workbook selected opportunity'),('current_gameplay_analogue','Actual current gameplay analogue'),('runtime_source','Runtime evidence source'),('prescribed_vs_implemented','Prescription versus implementation'),('current_room_opportunity','Current room / opportunity'),('proposed_final_room_opportunity','Final room / opportunity / windows'),('narrative_rationale','Cause / owner / narrative rationale'),('preparation_state','Preparation / standardised-counterbalanced entry'),('required_participant_action','Participant action'),('start_condition','Start'),('end_condition','End'),('independent_event_family','Independent event family'),('secondary_telemetry_ids','Secondary family'),('candidate_raw_variables','Workbook candidate raw variables'),('validity_gate','Workbook prescribed validity gate'),('missing_rule','Missing / censored rule'),('invalid_rule','Invalid rule'),('rival_explanations','Likely confounds'),('guidance_exposure','Guidance exposure'),('reuse_isolation_constraints','Reuse / isolation'),('consequence_resolution','Consequence / resolution'),('explicit_fail_forward_route','Explicit fail-forward route'),('decision','Presentation / mechanic decision'),('scientific_evidence_level','Scientific evidence level'),('research_owner_decision_required','Research-owner decision'),('primary_source','Source-scale provenance')]
 for r in data['items']:
  lines += ['', '## '+r['id'], '', '|Field|Authority / actual implementation / constrained proposal|','|---|---|']
  for key,label in fields:lines.append('|'+label+'|'+cell(r[key])+'|')
 lines += ['', '## Cross-item and burden restrictions',
 'One activity may host several items only with independently identifiable windows, families, raw variables and validity rules. One item may span authorised occasions; a raw event is never the primary indicator for unrelated items. Prior outcomes cannot remove later access. Missing never means low ability or low trait. Guidance cannot reveal the desired response. No new questionnaire wording, scoring, threshold or canonical status is authorised.',
 '',
 'Workbook plan: 1,040 s active + 420 s shared overhead + 75 s closure = 1,535 s. Human median ≤ 27 min and p90 ≤ 30 min are planning gates. The proposed 328.69 s visitation walk would leave 91.31 s of the 420 s overhead if charged entirely there; some Utility/Core travel may overlap the 75 s closure allocation. Do not double-count or claim this is validated. Record that allocation and human timing before accepting production burden.', '']
 (BASE/'M01-M26-SPATIAL-CROSSWALK.md').write_text('\n'.join(lines),encoding='utf-8')

crosswalk()
for z in DATA['zones']:zone(z)
topology();route();camera();opening();states();inventory();depth();composition(1280,720);composition(1920,1080)
boards=[('world-topology.svg','Topology alternatives'),('route-and-restoration.svg','Route and story'),('camera-comparison.svg','Camera comparison')]+[('zone-'+z['id']+'.svg',z['name']) for z in DATA['zones']]+[('opening-storyboard.svg','Opening storyboard'),('interaction-states.svg','Interaction states'),('inventory-hud.svg','Inventory and HUD'),('depth-layers.svg','Depth and collision'),('composition-1280x720.svg','1280×720 composition'),('composition-1920x1080.svg','1920×1080 composition')]
def description_link(f):
 if f.startswith('zone-'):return '../../../game/world-v1/ROOM-BLOCKOUTS.md#zone-programme'
 if f=='world-topology.svg':return '../../../game/PROFESSIONAL-WORLD-DESIGN-V1.md#why-this-topology-and-narrative'
 if f in ['route-and-restoration.svg','opening-storyboard.svg']:return '../../../game/world-v1/STORY-STATE-SPEC.md'
 if f=='inventory-hud.svg':return '../../../game/world-v1/INVENTORY-ITEM-PURPOSE-AUDIT.md'
 if f in ['interaction-states.svg','depth-layers.svg']:return '../../../game/world-v1/INTERACTION-GRAMMAR.md'
 return '../../../game/world-v1/CAMERA-AND-SCALE-SPEC.md'
nav=''.join(f'<button data-src="{f}" data-description="{description_link(f)}">{e(t)}</button>' for f,t in boards)
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Astra / world design authority</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e9e7de;color:#18232c;font:17px/1.5 system-ui}header{padding:28px 32px;background:#142730;color:#f1f0e7}h1{font-size:30px;margin:0}header p{max-width:90ch;margin:8px 0}nav{display:flex;flex-wrap:wrap;gap:8px;padding:18px 32px}button,a{font:inherit}button{padding:8px 12px;border:1px solid #73858b;background:#f6f4ec;color:#18232c;cursor:pointer}button[aria-pressed=true]{background:#315e66;color:white}button:focus-visible,a:focus-visible{outline:3px solid #a55f25;outline-offset:3px}main{padding:0 32px 32px}figure{margin:0;background:#f2f0e9;border:1px solid #aab4b2}img{display:block;width:100%;height:auto}figcaption{padding:12px 18px;border-top:1px solid #aab4b2}a{color:#275761}aside{max-width:100ch;margin-top:20px}.native img{width:auto;max-width:none}.native{overflow:auto;max-height:80vh}.controls{padding:0 32px 16px}</style>
<header><h1>Station 080 / professional world direction</h1><p>Original design blockouts, not finished art. Select a board, inspect at native size, and use the linked authority documents for measurement holds and production scope.</p></header><nav aria-label="Design boards">'''+nav+'''</nav><div class="controls"><label><input id="native" type="checkbox"> Inspect at native size</label> · <a href="README.md">Package index</a> · <a href="M01-M26-SPATIAL-CROSSWALK.md">Scientific crosswalk</a></div><main><figure id="figure"><img id="board" src="world-topology.svg" alt="Topology alternatives"><figcaption id="caption">Topology alternatives</figcaption></figure><aside>Plan labels identify reviewer geometry. They are not participant-facing floating labels. Grayscale distinguishes circulation, hull mass, functional faces and camera boundaries; the native composition examples show the proposed quiet UI. Research-owner holds remain explicit.</aside></main><script>
const buttons=[...document.querySelectorAll('button[data-src]')],board=document.querySelector('#board'),caption=document.querySelector('#caption');function select(b){buttons.forEach(x=>x.setAttribute('aria-pressed',String(x===b)));board.src=b.dataset.src;board.alt=b.textContent+'. Structured description follows in the linked authority document.';caption.replaceChildren(document.createTextNode(b.textContent+' · '));const a=document.createElement('a');a.href=b.dataset.src;a.textContent='Open standalone SVG';caption.append(a);const d=document.createElement('a');d.href=b.dataset.description;d.textContent='Read structured description';caption.append(document.createTextNode(' · '),d)}buttons.forEach(b=>b.addEventListener('click',()=>select(b)));document.querySelector('#native').addEventListener('change',e=>document.querySelector('#figure').classList.toggle('native',e.target.checked));select(buttons[0]);
</script></html>'''
(BASE/'mockups.html').write_text(page,encoding='utf-8')
print('Built16 original SVG boards and standalone gallery.')

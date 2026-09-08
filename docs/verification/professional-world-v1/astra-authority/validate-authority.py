"""Read-only checks for the Astra document package. No test suite or product writes."""
import json, re, math, sys, pathlib, subprocess, xml.etree.ElementTree as ET
from collections import deque
BASE=pathlib.Path(__file__).resolve().parent
ROOT=BASE.parents[3]
errors=[]; warnings=[]; results={}
def need(ok,msg):
 if not ok:errors.append(msg)
def read(p):return p.read_text(encoding='utf-8')
d=json.loads(read(BASE/'world-layouts.json'));c=json.loads(read(BASE/'m01-m26-spatial-crosswalk.json'))
ledger=json.loads(read(ROOT/'docs/verification/evidence-led-pilot-v2/M01-M26-IMPLEMENTATION-LEDGER.json'))
need(len(c['items'])==26,'Crosswalk must contain26 items')
fields=[k for k in ledger['items'][0] if k not in ('exact_source_item','route')]
for a,b in zip(ledger['items'],c['items']):
 for k in fields:need(a[k]==b.get(k),a['id']+' authority mismatch: '+k)
 need('exact_source_item' not in b,'Questionnaire wording field included')
 need(b['current_schedule']==a['route'],a['id']+' schedule changed')
 need(b['independent_event_family']==a['route']['family_prefixes'],a['id']+' family changed')
 sites={z['id']+':'+s['id'] for z in d['zones'] for s in z['stations'] if a['id'] in s['items']}
 need(set(b['proposed_final_room_opportunity']['sites'])==sites,a['id']+' site mapping mismatch')
results['crosswalk_scientific_fields_compared']=len(fields)*26
results['items']=26
need(d['camera']['view_tiles']==[40,22.5],'Camera field mismatch')
need(d['camera']['body']==[32,42],'Collider changed')
need(d['camera']['movement_speed']==175,'Movement speed changed')
def recthit(a,b):
 return a[0]<b[0]+b[2] and a[0]+a[2]>b[0] and a[1]<b[1]+b[3] and a[1]+a[3]>b[1]
def contains(r,x,y):return r[0]<=x<=r[0]+r[2] and r[1]<=y<=r[1]+r[3]
def floors(z):
 if 'walkable_floor_rects' in z:return z['walkable_floor_rects']
 r=[p['rect'] for p in z['paths']]+[q['rect'] for q in z['districts']]+[z['quiet']['rect']]
 w,h=z['tiles']
 for s in z['stations']:
  x,y=s['approach'];r.append([x-2,y-2,4,4])
  if abs(x-w/2)<abs(y-h/2):r.append([min(x,w/2)-1.5,y-1.5,abs(x-w/2)+3,3])
  else:r.append([x-1.5,min(y,h/2)-1.5,3,abs(y-h/2)+3])
 for q in z['doors']:
  x,y=q['at'];sx,sy=q['spawn'];r.append([min(x,sx)-1.5,min(y,sy)-1.5,abs(x-sx)+3,abs(y-sy)+3])
 return r
# Quarter-tile grid; actor origin uses actual32x42 body offsets (-16,-18) .. (16,24).
# Check body corners AND sampled interior to avoid crossing a small non-walkable gap.
def geometry(z):
 w,h=z['tiles'];f=floors(z)
 obstacles=[(s['id'],s['footprint']) for s in z['stations'] if s.get('footprint')]+[(x['label'],x['rect']) for x in z['decor']]
 obstacles.append((z['landmark']['label'],z['landmark']['rect']))
 if z['landmark'].get('overhead'):obstacles.pop()
 for label,r in obstacles:
  for p in z['paths']:
   if recthit(r,p['rect']):warnings.append(z['id']+': '+label+' intersects '+p['name'])
 sx=range(0,w*4+1);sy=range(0,h*4+1);walk=set()
 for ix in sx:
  for iy in sy:
   x=ix/4;y=iy/4;body=[x-.5,y-.5625,1,1.3125]
   if any(recthit(body,r) for _,r in obstacles):continue
   if all(any(contains(r,xx,yy) for r in f) for xx in [x-.5,x,x+.5] for yy in [y-.5625,y,y+.75]):walk.add((ix,iy))
 def key(pt):return (round(pt[0]*4),round(pt[1]*4))
 start=key(z['spawn']);need(start in walk,z['id']+' spawn blocked')
 dist={start:0};q=deque([start])
 while q:
  x,y=q.popleft()
  for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if n in walk and n not in dist:dist[n]=dist[(x,y)]+1;q.append(n)
 for s in z['stations']:
  need(key(s['approach']) in dist,z['id']+': unreachable approach '+s['id'])
  reach=math.dist(s['at'],s['approach'])*32
  need(reach<=72,z['id']+': approach outside72px '+s['id'])
  for other in z['stations']:
   if other['id']!=s['id']:need(math.dist(other['at'],s['approach'])*32>reach,z['id']+': wrong nearest target at '+s['id'])
  if 'operating_pad' in s:need(contains(s['operating_pad'],*s['approach']),z['id']+': approach outside operating pad')
 for door in z['doors']:
  need(key(door['spawn']) in dist,z['id']+': disconnected door spawn '+door['to'])
  need(key(door['approach']) in dist,z['id']+': door approach unreachable '+door['to'])
  need(math.dist(door['at'],door['approach'])*32<=72,z['id']+': door reach '+door['to'])
 results[z['id']]={'floor_cells_quarter_tile':len(walk),'reachable_quarter_cells':len(dist),'approaches':len(z['stations']),'furthest_approach_seconds':round(max((dist.get(key(s['approach']),0) for s in z['stations']),default=0)*8/175,2),'spine_overlap_findings':sum(x.startswith(z['id']+':') for x in warnings)}
 return walk
walks={}
for z in d['zones']:
 need(z['world_px']==[n*32 for n in z['tiles']],z['id']+' unit mismatch')
 need(z['tiles'][0]>40 and z['tiles'][1]>22.5,z['id']+' too small')
 vx,vy,vw,vh=z['initial_camera'];need(vx>=0 and vy>=0 and vx+vw<=z['tiles'][0] and vy+vh<=z['tiles'][1],z['id']+' camera out of bounds')
 for door in z['doors']:
  other=next(q for q in d['zones'] if q['id']==door['to']);opposite={'N':'S','S':'N','E':'W','W':'E'}
  need(any(q['to']==z['id'] and q['side']==opposite[door['side']] for q in other['doors']),z['id']+' door direction mismatch')
 walks[z['id']]=geometry(z)
yard=next(z for z in d['zones'] if z['id']=='yard')
need(next(s for s in yard['stations'] if s['id']=='excavation')['plot']==[16,8,7,6],'M23 absolute plot changed')
uplink={s['id']:s for s in yard['stations']}
need([uplink['channel-panel']['at'][i]-uplink['uplink-a']['at'][i] for i in range(2)]==[4,-1],'M26 panel offset')
need([uplink['uplink-b']['at'][i]-uplink['uplink-a']['at'][i] for i in range(2)]==[6.5,1],'M26 B offset')
need('thaw' not in uplink,'Thaw rack must not be a task')
def path_distance(walk,start,end):
 a=tuple(round(v*4) for v in start);b=tuple(round(v*4) for v in end)
 q=deque([a]);dist={a:0}
 while q:
  x,y=q.popleft()
  if (x,y)==b:return dist[b]*8
  for n in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if n in walk and n not in dist:dist[n]=dist[(x,y)]+1;q.append(n)
 errors.append('Itinerary segment unreachable '+str((start,end)));return 0
tour=[]
for leg in d['traversal_itinerary']:
 z=next(z for z in d['zones'] if z['id']==leg['zone']);doors={x['to']:x for x in z['doors']};sites={x['id']:x for x in z['stations']}
 points=[z['spawn'] if leg['entry']=='spawn' else doors[leg['entry']]['spawn']]+[sites[k]['approach'] for k in leg['visit']]
 if leg['exit']:points.append(doors[leg['exit']]['approach'])
 distance=sum(path_distance(walks[z['id']],a,b) for a,b in zip(points,points[1:]));tour.append({'zone':z['id'],'world_px':distance,'seconds_at175':round(distance/175,2),'visits':leg['visit']})
results['prescribed_itinerary']=tour;results['prescribed_itinerary_seconds']=round(sum(r['world_px'] for r in tour)/175,2)
svgs=list(BASE.glob('*.svg'));need(len(svgs)==16,'Expected16SVG boards')
for p in svgs:
 try:
  r=ET.fromstring(read(p));need(r.tag.endswith('svg'),p.name+' root')
  need('http' not in ''.join(r.itertext()),p.name+' unexpected external content')
 except Exception as exc:errors.append(p.name+': '+str(exc))
for w,h in [(1280,720),(1920,1080)]:
 r=ET.parse(BASE/f'composition-{w}x{h}.svg').getroot();need(r.get('width')==str(w) and r.get('height')==str(h),'Native composition dimensions')
allow=re.findall(r'^- \x60([^\x60]+)\x60',read(BASE/'CHECKPOINT-AND-ALLOWLIST.md'),re.M)
need(len(allow)==39,'Frozen allowlist count')
for p in allow:need((ROOT/p).is_file(),'Missing allowlisted artifact '+p)
for p in [ROOT/q for q in allow if q.endswith('.md')]:
 if not p.exists():continue
 for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)',read(p)):
  if link.startswith(('https:','http:','#')):continue
  target=(p.parent/link.split('#')[0]).resolve();need(target.exists(),str(p.relative_to(ROOT))+': missing link '+link)
# Git queries do not change the index.
tracked=subprocess.run(['git','diff','--name-only','HEAD'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.splitlines()
untracked=subprocess.run(['git','ls-files','--others','--exclude-standard'],cwd=ROOT,capture_output=True,text=True,check=True).stdout.splitlines()
for p in tracked+untracked:need(p in allow,'Outside frozen allowlist: '+p)
results['allowlist_files']=len(allow);results['svg_boards']=len(svgs);results['warnings']=warnings;results['errors']=errors
print(json.dumps(results,indent=2))
sys.exit(bool(errors))

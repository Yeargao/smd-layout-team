// Deterministic orthogonal routing. Node circles use conservative padded boxes.
const R=19, PAD=9, EPS=1e-7, LANE_GAP=18;
const point=(x,y)=>({x,y});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const same=(a,b)=>dist(a,b)<EPS;
const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const proper=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-EPS&&cross(c,d,a)*cross(c,d,b)<-EPS;
function trim(a,b){const d=dist(a,b)||1;return point(a.x+R*(b.x-a.x)/d,a.y+R*(b.y-a.y)/d);}
function simplify(p){const out=[];for(const q of p){if(out.length&&same(out.at(-1),q))continue;while(out.length>1&&Math.abs(cross(out.at(-2),out.at(-1),q))<EPS&&dist(out.at(-2),q)>=dist(out.at(-2),out.at(-1))+dist(out.at(-1),q)-EPS)out.pop();out.push(q);}return out;}
// Liang-Barsky clipping against open rectangle (touching its boundary is allowed).
function hits(a,b,o){let lo=0,hi=1;const dx=b.x-a.x,dy=b.y-a.y;for(const [p,q] of [[-dx,a.x-o.l-EPS],[dx,o.r-a.x-EPS],[-dy,a.y-o.t-EPS],[dy,o.b-a.y-EPS]]){if(Math.abs(p)<EPS){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}}return hi>=lo;}
function overlaps(a,b,c,d){if(Math.abs(cross(a,b,c))>EPS||Math.abs(cross(a,b,d))>EPS)return false;const k=Math.abs(a.x-b.x)>Math.abs(a.y-b.y)?'x':'y';return Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k]))-Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]))>EPS;}
// Penalize near-parallel runs too: paths only one pixel apart are not readable.
function crowded(a,b,c,d){
 const u=dist(a,b),v=dist(c,d);if(u<EPS||v<EPS)return false;
 const ux=(b.x-a.x)/u,uy=(b.y-a.y)/u,vx=(d.x-c.x)/v,vy=(d.y-c.y)/v;
 if(Math.abs(ux*vy-uy*vx)>0.08)return false;
 const proj=p=>(p.x-a.x)*ux+(p.y-a.y)*uy,normal=p=>Math.abs((p.x-a.x)*uy-(p.y-a.y)*ux);
 const overlap=Math.min(u,Math.max(proj(c),proj(d)))-Math.max(0,Math.min(proj(c),proj(d)));
 return overlap>12&&Math.max(normal(c),normal(d))<LANE_GAP;
}
function obstacleList(v,a,b){return v.nodes.filter(n=>n.id!==a.id&&n.id!==b.id).map(n=>({l:n.x-R-PAD,r:n.x+R+PAD,t:n.y-R-PAD,b:n.y+R+PAD}));}
function clear(a,b,obs){return !obs.some(o=>hits(a,b,o));}
function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return dist(p,point(a.x+t*dx,a.y+t*dy));}
function bendClearance(a,b){let cost=0;for(const q of a.slice(1,-1)){let d=Infinity;for(let i=1;i<b.length;i++)d=Math.min(d,pointSegmentDistance(q,b[i-1],b[i]));if(d<16)cost+=45*(16-d);}return cost;}
function score(path,prior){let cost=0;
 for(const p of prior)cost+=bendClearance(path,p)+bendClearance(p,path);
 // Give separate incident transitions distinct attachment points when possible.
 if(path.length>1)for(const p of prior)if(p.length>1)for(const a of [path[0],path.at(-1)])for(const b of [p[0],p.at(-1)])if(dist(a,b)<12)cost+=45*(12-dist(a,b));
for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];cost+=dist(a,b)+8;for(const p of prior)for(let j=1;j<p.length;j++){if(proper(a,b,p[j-1],p[j]))cost+=600;if(overlaps(a,b,p[j-1],p[j]))cost+=1000;else if(crowded(a,b,p[j-1],p[j]))cost+=600;}}return cost;}
function gridPath(a,b,obs,prior){
 // Coordinate-compressed visibility grid; bound search to avoid freezing huge diagrams.
 const xs=[a.x,b.x],ys=[a.y,b.y];for(const o of obs){xs.push(o.l,o.r);ys.push(o.t,o.b);}const X=[...new Set(xs)].sort((x,y)=>x-y),Y=[...new Set(ys)].sort((x,y)=>x-y);
 if(X.length*Y.length>9000)return null;
 const w=X.length,h=Y.length,idx=(i,j)=>j*w+i,loc=k=>point(X[k%w],Y[Math.floor(k/w)]),start=idx(X.indexOf(a.x),Y.indexOf(a.y)),end=idx(X.indexOf(b.x),Y.indexOf(b.y));
 const best=new Map([[start*3,0]]),prev=new Map(),heap=[[0,start*3]];
 function push(v){heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p][0]<=v[0])break;heap[i]=heap[p];i=p;}heap[i]=v;}
 function pop(){const top=heap[0],v=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1][0]<heap[c][0])c++;if(heap[c][0]>=v[0])break;heap[i]=heap[c];i=c;}heap[i]=v;}return top;}
 while(heap.length){const [g,s]=pop();if(g!==best.get(s))continue;const k=Math.floor(s/3),dir=s%3,p=loc(k);if(k===end){const path=[];let t=s;while(t!==undefined){path.push(loc(Math.floor(t/3)));t=prev.get(t);}return simplify(path.reverse());}const i=k%w,j=Math.floor(k/w);
 for(const [di,dj,d] of [[1,0,1],[-1,0,1],[0,1,2],[0,-1,2]]){const ni=i+di,nj=j+dj;if(ni<0||nj<0||ni>=w||nj>=h)continue;const n=idx(ni,nj),q=loc(n);if(!clear(p,q,obs))continue;const ns=n*3+d,ng=g+score([p,q],prior)+(dir&&dir!==d?18:0);if(ng<(best.get(ns)??Infinity)){best.set(ns,ng);prev.set(ns,s);push([ng,ns]);}}
 }return null;
}
function automatic(edge,v,prior){const a=v.nodes.find(n=>n.id===edge.visibleSource),b=v.nodes.find(n=>n.id===edge.visibleTarget);if(!a||!b)return [];
 const obs=obstacleList(v,a,b),siblings=v.edges.filter(e=>(e.visibleSource===a.id&&e.visibleTarget===b.id)||(e.visibleSource===b.id&&e.visibleTarget===a.id)).sort((x,y)=>x.id.localeCompare(y.id)),lane=siblings.findIndex(e=>e.id===edge.id);
 if(a.id===b.id){const d=42+14*Math.max(0,lane);const candidates=[1,-1].map(s=>[point(a.x+13,a.y+s*14),point(a.x+d,a.y+s*d),point(a.x-d,a.y+s*d),point(a.x-13,a.y+s*14)]);return candidates.find(p=>p.slice(1).every((q,i)=>clear(p[i],q,obs)))||candidates[0];}
 const dx=b.x-a.x,dy=b.y-a.y,off=(lane-(siblings.length-1)/2)*24,mid=point((a.x+b.x)/2+(dist(a,b)?-dy/dist(a,b)*off:0),(a.y+b.y)/2+(dist(a,b)?dx/dist(a,b)*off:off));
 const raw=[[a,b],[a,point(a.x,b.y),b],[a,point(b.x,a.y),b],[a,mid,b],[a,point(mid.x,a.y),point(mid.x,b.y),b],[a,point(a.x,mid.y),point(b.x,mid.y),b]];
 const valid=[];const add=path=>{const p=simplify(path);if(p.length<2)return;if(p.length>2&&(dist(a,p[1])<R+8||dist(b,p.at(-2))<R+8))return;if(p.slice(1).every((q,i)=>clear(p[i],q,obs))){p[0]=trim(a,p[1]);p[p.length-1]=trim(b,p.at(-2));valid.push(p);}};
 for(const p of raw)add(p);
 // Explicit lanes on either side, including when valid but crowded paths already exist.
 const margin=R+PAD+LANE_GAP;
 const ys=[Math.min(a.y,b.y)-margin,Math.max(a.y,b.y)+margin],xs=[Math.min(a.x,b.x)-margin,Math.max(a.x,b.x)+margin];
 for(const o of obs){ys.push(o.t-LANE_GAP,o.b+LANE_GAP);xs.push(o.l-LANE_GAP,o.r+LANE_GAP);}
 for(const p of prior)for(const q of p){ys.push(q.y-LANE_GAP,q.y+LANE_GAP);xs.push(q.x-LANE_GAP,q.x+LANE_GAP);}
 const nearest=(values,mid)=>[...new Set(values)].sort((x,y)=>Math.abs(x-mid)-Math.abs(y-mid)||x-y).slice(0,24);
 for(const y of nearest(ys,(a.y+b.y)/2))add([a,point(a.x,y),point(b.x,y),b]);
 for(const x of nearest(xs,(a.x+b.x)/2))add([a,point(x,a.y),point(x,b.y),b]);
 if(siblings.length>1){for(const k of [24,-24,36,-36,42,-42,48,-48,72,-72]){const d=dist(a,b)||1,m=point((a.x+b.x)/2-dy/d*k,(a.y+b.y)/2+dx/d*k);add([a,m,b]);add([a,point(m.x,a.y),point(m.x,b.y),b]);add([a,point(a.x,m.y),point(b.x,m.y),b]);}}
 if(!valid.length||(v.edges.length<=100&&(siblings.length>1||prior.some(p=>p.slice(1).some((q,i)=>proper(a,b,p[i],q))))) ){const p=gridPath(a,b,obs,prior);if(p)add(p);}
 if(!valid.length)return [trim(a,b),trim(b,a)]; // unavoidable/oversized case: visible fallback, no state movement
 valid.sort((p,q)=>score(p,prior)-score(q,prior));return valid[0];
}
function manualPath(e,v,layout){if(e.source!==e.visibleSource||e.target!==e.visibleTarget)return null;const r=layout.routes[e.id];if(!r?.manual||!r.waypoints.length)return null;const a=v.nodes.find(n=>n.id===e.visibleSource),b=v.nodes.find(n=>n.id===e.visibleTarget);if(!a||!b)return [];return [trim(a,r.waypoints[0]),...r.waypoints,trim(b,r.waypoints.at(-1))];}
export function routeVisibleEdges(v,layout){const result=new Map(),prior=[];const edges=[...v.edges].sort((a,b)=>a.id.localeCompare(b.id));for(const e of edges){const p=manualPath(e,v,layout);if(p){result.set(e.id,p);prior.push(p);}}for(const e of edges){if(result.has(e.id))continue;const p=automatic(e,v,prior);result.set(e.id,p);prior.push(p);}return result;}
export function edgePoints(edge,visible,layout){return routeVisibleEdges(visible,layout).get(edge.id)||[];}
export function routeMetrics(routes){const paths=[...routes.values()];let crossings=0,overlapPairs=0,crowdedPairs=0,length=0,bends=0;for(let i=0;i<paths.length;i++){const p=paths[i];bends+=Math.max(0,p.length-2);for(let k=1;k<p.length;k++){length+=dist(p[k-1],p[k]);for(let j=0;j<i;j++){const q=paths[j];for(let l=1;l<q.length;l++){if(proper(p[k-1],p[k],q[l-1],q[l]))crossings++;if(overlaps(p[k-1],p[k],q[l-1],q[l]))overlapPairs++;else if(crowded(p[k-1],p[k],q[l-1],q[l]))crowdedPairs++;}}}}return {crossings,overlapPairs,crowdedPairs,length,bends};}

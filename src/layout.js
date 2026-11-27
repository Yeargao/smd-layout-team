// P01 — deterministic layered layout, retaining the existing public interface.
const X_GAP = 110, Y_GAP = 65;
const own = (o,k) => Object.hasOwn(o,k);
function input(ids, edges, sizes) {
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate node IDs');
  for (const id of ids) {
    const s = sizes[id];
    if (!own(sizes,id) || !s || !Number.isFinite(s.w) || !Number.isFinite(s.h) || s.w <= 0 || s.h <= 0) throw new Error(`Invalid size: ${id}`);
  }
  const set = new Set(ids);
  return edges.filter(e => set.has(e.source) && set.has(e.target) && e.source !== e.target);
}
// Strict interior intersection of two straight segments. Endpoint touches and
// collinear overlaps are not crossings; shared-endpoint edges are excluded.
function proper(a,b,c,d) {
  const orient=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  const opposite=(x,y)=>(x>0&&y<0)||(x<0&&y>0);
  return opposite(orient(a,b,c),orient(a,b,d)) && opposite(orient(c,d,a),orient(c,d,b));
}
function segments(edges,positions,sizes) {
  const center=id=>({x:positions[id].x+sizes[id].w/2,y:positions[id].y+sizes[id].h/2});
  return edges.filter(e=>e.source!==e.target && own(positions,e.source)&&own(positions,e.target)).map(e=>({...e,a:center(e.source),b:center(e.target)}));
}
export function countCrossings(edges,positions,sizes) {
  const es=segments(edges,positions,sizes); let count=0;
  for(let i=0;i<es.length;i++) for(let j=i+1;j<es.length;j++) {
    const p=es[i],q=es[j];
    if(p.source===q.source||p.source===q.target||p.target===q.source||p.target===q.target)continue;
    if(proper(p.a,p.b,q.a,q.b))count++;
  }
  return count;
}
// Segment intersects the open interior of an axis-aligned node rectangle.
function hits(a,b,p,s) {
  let lo=0,hi=1;
  for(const [k,span] of [['x',s.w],['y',s.h]]) {
    const d=b[k]-a[k]; if(!d){if(a[k]<=p[k]||a[k]>=p[k]+span)return false;continue;}
    const t1=(p[k]-a[k])/d,t2=(p[k]+span-a[k])/d;
    lo=Math.max(lo,Math.min(t1,t2));hi=Math.min(hi,Math.max(t1,t2));if(lo>=hi)return false;
  }
  return true;
}
// Collinear segments sharing a positive length are counted separately from X
// crossings. Identical endpoint pairs are routing's parallel-edge responsibility.
function overlapping(a,b,c,d){
  const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  if(Math.abs(cross(a,b,c))>1e-8||Math.abs(cross(a,b,d))>1e-8)return false;
  const k=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y)?'x':'y';
  return Math.min(Math.max(a[k],b[k]),Math.max(c[k],d[k]))-Math.max(Math.min(a[k],b[k]),Math.min(c[k],d[k]))>1e-8;
}
export function layoutMetrics(ids,edges,sizes,layout) {
  const es=segments(edges,layout.positions,sizes);let nodeHits=0,length=0;
  for(const e of es){length+=Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y);for(const id of ids)if(id!==e.source&&id!==e.target&&hits(e.a,e.b,layout.positions[id],sizes[id]))nodeHits++;}
  let overlapPairs=0;
  for(let i=0;i<es.length;i++)for(let j=i+1;j<es.length;j++){
    const p=es[i],q=es[j];
    if((p.source===q.source&&p.target===q.target)||(p.source===q.target&&p.target===q.source))continue;
    if(overlapping(p.a,p.b,q.a,q.b))overlapPairs++;
  }
  return {crossings:countCrossings(edges,layout.positions,sizes),nodeHits,overlapPairs,length,area:layout.w*layout.h};
}
// Crossing count is primary; edge-node intersections, length, area break ties.
function compare(a,b){return a.crossings-b.crossings||a.nodeHits-b.nodeHits||a.overlapPairs-b.overlapPairs||a.length-b.length||a.area-b.area;}
function place(layers,sizes,mode="top"){
  const real=layers.map(l=>l.filter(id=>typeof id!=='symbol'));
  const heights=real.map(l=>Math.max(0,l.reduce((s,id)=>s+sizes[id].h+Y_GAP,0)-Y_GAP));
  const offsets=heights.map((h,i)=>mode==='center'?(Math.max(0,...heights)-h)/2:mode==='stagger'?((i*37)%101):0);
  const h=Math.max(0,...heights.map((v,i)=>v+offsets[i])), entries=[];let x=0;
  for(let i=0;i<real.length;i++){
    const l=real[i];if(!l.length)continue;
    const w=Math.max(...l.map(id=>sizes[id].w));let y=offsets[i];
    for(const id of l){entries.push([id,{x,y}]);y+=sizes[id].h+Y_GAP;} x+=w+X_GAP;
  }
  return {positions:Object.fromEntries(entries),w:Math.max(0,x-X_GAP),h};
}
// Iterative DFS builds a DAG by excluding back edges from ranking only.
// Original edge directions remain untouched and ALL non-loop edges are scored.
function ranks(ids,edges){
  const out=new Map(ids.map(id=>[id,[]]));for(const e of edges)out.get(e.source).push(e.target);
  const color=new Map(),finish=[],forward=new Map(ids.map(id=>[id,[]]));
  for(const root of ids){if(color.has(root))continue;color.set(root,1);const stack=[[root,0]];
    while(stack.length){const frame=stack.at(-1),[id,i]=frame,targets=out.get(id);
      if(i===targets.length){color.set(id,2);finish.push(id);stack.pop();continue;}
      const t=targets[frame[1]++];if(color.get(t)===1)continue;forward.get(id).push(t);
      if(!color.has(t)){color.set(t,1);stack.push([t,0]);}
    }
  }
  const rank=new Map(ids.map(id=>[id,0]));for(const id of finish.reverse())for(const t of forward.get(id))rank.set(t,Math.max(rank.get(t),rank.get(id)+1));
  const layers=[];for(const id of ids)(layers[rank.get(id)]??=[]).push(id);return {rank,layers};
}
// Original six-sweep baseline, with equivalent DAG longest-path ranks.
export function baselineLayout(ids,edges,sizes){
  edges=input(ids,edges,sizes);const {layers}=ranks(ids,edges);
  for(let pass=0;pass<6;pass++){
    const order=pass%2?layers.map((_,i)=>layers.length-1-i):layers.map((_,i)=>i);
    for(const l of order){const adjacent=layers[l+(pass%2?1:-1)]||[];const score=new Map(layers[l].map(id=>{const near=edges.flatMap(e=>e.source===id?[e.target]:e.target===id?[e.source]:[]).map(x=>adjacent.indexOf(x)).filter(x=>x>=0);return [id,near.length?near.reduce((a,b)=>a+b,0)/near.length:layers[l].indexOf(id)];}));layers[l].sort((a,b)=>score.get(a)-score.get(b));}
  }
  return place(layers,sizes);
}
// Greedy cycle breaking: peel sinks/sources, otherwise maximize out-in degree.
// Rank only edges consistent with that ordering, without reversing stored edges.
function greedyRanks(ids,edges){
  const remaining=new Set(ids),left=[],right=[],incoming=new Map(ids.map(id=>[id,[]])),outgoing=new Map(ids.map(id=>[id,[]]));
  for(const e of edges){incoming.get(e.target).push(e.source);outgoing.get(e.source).push(e.target);}
  const indeg=new Map(ids.map(id=>[id,incoming.get(id).length])),outdeg=new Map(ids.map(id=>[id,outgoing.get(id).length]));
  while(remaining.size){let chosen,side='left',best=-Infinity;
    for(const id of remaining){const a=indeg.get(id),b=outdeg.get(id);if(b===0){chosen=id;side='right';break;}if(a===0){chosen=id;break;}if(b-a>best){chosen=id;best=b-a;}}
    remaining.delete(chosen);(side==='right'?right:left).push(chosen);
    for(const t of outgoing.get(chosen))if(remaining.has(t))indeg.set(t,indeg.get(t)-1);
    for(const t of incoming.get(chosen))if(remaining.has(t))outdeg.set(t,outdeg.get(t)-1);
  }
  const order=[...left,...right.reverse()],index=new Map(order.map((id,i)=>[id,i])),rank=new Map(ids.map(id=>[id,0]));
  for(const id of order)for(const t of outgoing.get(id))if(index.get(id)<index.get(t))rank.set(t,Math.max(rank.get(t),rank.get(id)+1));
  const layers=[];for(const id of ids)(layers[rank.get(id)]??=[]).push(id);return {rank,layers};
}
function properLayers(ids,edges,seed){
  const {rank,layers}=seed==='greedy'?greedyRanks(ids,edges):ranks(seed==='reverse'?[...ids].reverse():ids,edges);
  const prev=new Map(),next=new Map();for(const id of ids){prev.set(id,[]);next.set(id,[]);}
  for(const e of edges){let a=e.source,b=e.target;if(rank.get(a)>rank.get(b))[a,b]=[b,a];
    const start=rank.get(a),end=rank.get(b);if(start===end)continue;
    for(let k=start+1;k<end;k++){const d=Symbol('dummy');layers[k].push(d);prev.set(d,[a]);next.set(d,[]);next.get(a).push(d);a=d;}
    next.get(a).push(b);prev.get(b).push(a);
  }
  return {layers,prev,next};
}
function sweep(layers,prev,next,down,method){
  for(let i=down?1:layers.length-2;down?i<layers.length:i>=0;i+=down?1:-1){
    const adjacent=layers[i+(down?-1:1)], index=new Map(adjacent.map((id,j)=>[id,j]));
    const score=new Map(layers[i].map((id,j)=>{const a=(down?prev:next).get(id).map(v=>index.get(v));if(!a.length)return [id,j];if(method==='median'){a.sort((x,y)=>x-y);return [id,(a[(a.length-1)>>1]+a[a.length>>1])/2];}return [id,a.reduce((s,v)=>s+v,0)/a.length];}));
    layers[i].sort((a,b)=>score.get(a)-score.get(b));
  }
}
// Local adjacent transpose: exact change in adjacent-layer crossing pairs.
function transpose(layers,prev,next){
  for(let k=0;k<layers.length;k++){
    const l=layers[k],p=new Map((layers[k-1]||[]).map((id,i)=>[id,i])),n=new Map((layers[k+1]||[]).map((id,i)=>[id,i]));
    for(let i=0;i+1<l.length;i++){
      const a=l[i],b=l[i+1];let delta=0;
      for(const [adj,index] of [[prev,p],[next,n]])for(const x of adj.get(a))for(const y of adj.get(b))delta+=Math.sign(index.get(y)-index.get(x));
      if(delta<0)[l[i],l[i+1]]=[b,a];
    }
  }
}
export function compareLayouts(ids,edges,sizes){
  edges=input(ids,edges,sizes);const candidates=[],cache=new Map();let best;
  function offer(strategy,layout){const key=JSON.stringify(ids.map(id=>layout.positions[id]));let metrics=cache.get(key);if(!metrics){metrics=layoutMetrics(ids,edges,sizes,layout);cache.set(key,metrics);}const candidate={strategy,layout,metrics};candidates.push(candidate);// Reject apparent crossing improvements that increase either overlap or node hits.
    const base=candidates[0].metrics;
    candidate.eligible=metrics.nodeHits<=base.nodeHits&&metrics.overlapPairs<=base.overlapPairs;
    if(candidate.eligible&&(!best||compare(metrics,best.metrics)<0))best=candidate;}
  offer('baseline',baselineLayout(ids,edges,sizes));
  // Bounded candidate count. Very dense graphs use fewer sweeps to control latency.
  const passes=edges.length>500||ids.length>150?2:6;
  for(const seed of ['forward','reverse','greedy'])for(const method of ['barycenter','median']){
    const {layers,prev,next}=properLayers(ids,edges,seed);
    for(let i=0;i<passes;i++){
      sweep(layers,prev,next,i%2===0,method);transpose(layers,prev,next);
      for(const mode of ['top','center','stagger'])offer(`${method}/${seed}/${i+1}/${mode}`,place(layers,sizes,mode));
    }
  }
  return {best,candidates};
}
export function layoutLevel(ids,edges,sizes){return compareLayouts(ids,edges,sizes).best.layout;}

// P01: replace/benchmark this deterministic baseline. It is not a complete Sugiyama algorithm.
export function layoutLevel(ids, edges, sizes) {
  const rank = Object.fromEntries(ids.map(id=>[id,0]));
  const outgoing = Object.fromEntries(ids.map(id=>[id,[]]));
  for(const e of edges) if(e.source!==e.target) outgoing[e.source]?.push(e.target);
  const seen=new Set(), active=new Set(), forward=[];
  function visit(id){seen.add(id);active.add(id);for(const target of outgoing[id]) {if(active.has(target))continue;forward.push({source:id,target});if(!seen.has(target))visit(target);}active.delete(id);}
  ids.forEach(id=>{if(!seen.has(id))visit(id)});
  for(let k=0;k<ids.length;k++)for(const {source,target} of forward)rank[target]=Math.max(rank[target],rank[source]+1);
  const layers=[]; for(const id of ids)(layers[rank[id]]??=[]).push(id);
  for(let pass=0;pass<6;pass++) {
    const order=pass%2?layers.map((_,i)=>layers.length-1-i):layers.map((_,i)=>i);
    for(const l of order){const adjacent=layers[l+(pass%2?1:-1)]||[];const bary=id=>{const near=edges.flatMap(e=>e.source===id?[e.target]:e.target===id?[e.source]:[]).map(x=>adjacent.indexOf(x)).filter(x=>x>=0);return near.length?near.reduce((a,b)=>a+b,0)/near.length:layers[l].indexOf(id);};const score=Object.fromEntries(layers[l].map(id=>[id,bary(id)]));layers[l].sort((a,b)=>score[a]-score[b]);}
  }
  const positions={};let x=0,height=0;for(const layer of layers){let y=0;let w=0;for(const id of layer){const s=sizes[id];positions[id]={x,y};y+=s.h+65;w=Math.max(w,s.w);}x+=w+110;height=Math.max(height,y-65);}return {positions,w:Math.max(0,x-110),h:Math.max(0,height)};
}

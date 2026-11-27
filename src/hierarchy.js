import {layoutLevel} from './layout.js';
export const RADIUS=19;
export function initialLayout(graph){
 const positions={},regions={},routes={};const all=[...graph.nodes,...graph.regions];const byId=new Map(all.map(n=>[n.id,n]));const regionIds=new Set(graph.regions.map(r=>r.id));
 function ancestorAt(id,parent){let n=byId.get(id);while(n&&n.parentId!==parent)n=byId.get(n.parentId);return n?.id;}
 function build(parent){const children=all.filter(n=>n.parentId===parent);const sizes={},sub={};for(const n of children){if(regionIds.has(n.id)){sub[n.id]=build(n.id);sizes[n.id]={w:Math.max(100,sub[n.id].w+60),h:Math.max(100,sub[n.id].h+60)};}else sizes[n.id]={w:38,h:38};}const ids=children.map(n=>n.id);const edges=graph.edges.map(e=>({source:ancestorAt(e.source,parent),target:ancestorAt(e.target,parent)})).filter(e=>ids.includes(e.source)&&ids.includes(e.target)&&e.source!==e.target);return {...layoutLevel(ids,edges,sizes),sizes,sub};}
 function place(level,ox,oy){for(const [id,p] of Object.entries(level.positions)){const x=p.x+ox,y=p.y+oy,s=level.sizes[id];if(regionIds.has(id)){regions[id]={x,y,width:s.w,height:s.h,collapsed:false};place(level.sub[id],x+30,y+30);}else positions[id]={x:x+19,y:y+19};}}
 place(build(null),60,60);for(const e of graph.edges)routes[e.id]={waypoints:[],manual:false};return {positions,regions,routes};
}
export function visibleGraph(doc){const all=new Map([...doc.graph.nodes,...doc.graph.regions].map(n=>[n.id,n]));function endpoint(id){let n=all.get(id),v=id;while(n?.parentId!=null){n=all.get(n.parentId);if(n&&doc.layout.regions[n.id]?.collapsed)v=n.id;}return v;}
 const nodes=doc.graph.nodes.filter(n=>endpoint(n.id)===n.id).map(n=>({id:n.id,...doc.layout.positions[n.id]}));const regions=doc.graph.regions.filter(r=>endpoint(r.id)===r.id);for(const r of regions){const p=doc.layout.regions[r.id];if(p.collapsed)nodes.push({id:r.id,x:p.x+p.width/2,y:p.y+p.height/2,region:true});}const edges=doc.graph.edges.map(e=>({...e,visibleSource:endpoint(e.source),visibleTarget:endpoint(e.target)})).filter(e=>e.visibleSource!==e.visibleTarget||(e.source===e.target&&e.source===e.visibleSource));return {nodes,regions:regions.filter(r=>!doc.layout.regions[r.id].collapsed),edges};}
export function toggleRegion(doc,id){const r=doc.layout.regions[id];if(r)r.collapsed=!r.collapsed;}
export function moveNode(doc,id,x,y){const p=doc.layout.positions[id];if(p){p.x=x;p.y=y;fitRegions(doc);return;}const r=doc.layout.regions[id];if(!r)return;const dx=x-r.x-r.width/2,dy=y-r.y-r.height/2;const parent=new Map([...doc.graph.nodes,...doc.graph.regions].map(n=>[n.id,n.parentId]));function inside(n){while(n!=null){if(n===id)return true;n=parent.get(n);}return false;}for(const [n,p] of Object.entries(doc.layout.positions))if(inside(n)){p.x+=dx;p.y+=dy;}for(const [n,p] of Object.entries(doc.layout.regions))if(inside(n)){p.x+=dx;p.y+=dy;}for(const e of doc.graph.edges)if(inside(e.source)&&inside(e.target))for(const p of doc.layout.routes[e.id]?.waypoints||[]){p.x+=dx;p.y+=dy;}fitRegions(doc);}

// Grow ancestors around their children without moving any other state.
export function fitRegions(doc, padding=30){
 const {graph,layout}=doc;
 const fit=id=>{const r=layout.regions[id]; if(!r)return;
  const boxes=[];
  for(const n of graph.nodes.filter(n=>n.parentId===id)){const p=layout.positions[n.id];boxes.push([p.x-RADIUS,p.y-RADIUS,p.x+RADIUS,p.y+RADIUS]);}
  for(const n of graph.regions.filter(n=>n.parentId===id)){fit(n.id);const p=layout.regions[n.id];boxes.push([p.x,p.y,p.x+p.width,p.y+p.height]);}
  if(r.collapsed||!boxes.length)return;
  const x=Math.min(r.x,...boxes.map(b=>b[0]-padding)),y=Math.min(r.y,...boxes.map(b=>b[1]-padding));
  const right=Math.max(r.x+r.width,...boxes.map(b=>b[2]+padding)),bottom=Math.max(r.y+r.height,...boxes.map(b=>b[3]+padding));
  Object.assign(r,{x,y,width:right-x,height:bottom-y});
 };
 for(const r of graph.regions.filter(r=>r.parentId===null))fit(r.id);
}

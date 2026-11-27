const fail=m=>{throw new Error(`Invalid SMD document: ${m}`);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const xy=p=>object(p)&&finite(p.x)&&finite(p.y);
const safeId=id=>typeof id==='string'&&id.length>0&&!Object.hasOwn(Object.prototype,id)&&id!=='prototype';
function keysMatch(map,ids,label){if(!object(map)||Object.keys(map).length!==ids.size||Object.keys(map).some(id=>!ids.has(id)))fail(label+' keys');}
export function validateDocument(d){
 if(!object(d)||d.version!==1||!object(d.graph)||!object(d.layout))fail('version or root');
 const {nodes,edges,regions}=d.graph,{positions,regions:bounds,routes}=d.layout;
 if(![nodes,edges,regions].every(Array.isArray))fail('graph arrays');
 const nodeIds=new Set(),regionIds=new Set(),edgeIds=new Set(),all=new Set();
 for(const [list,set] of [[nodes,nodeIds],[regions,regionIds]])for(const n of list){if(!object(n)||!safeId(n.id)||all.has(n.id))fail('duplicate/invalid node or region ID');set.add(n.id);all.add(n.id);}
 const parents=new Map([...nodes,...regions].map(n=>[n.id,n.parentId]));
 for(const n of [...nodes,...regions]){if(n.parentId!==null&&!regionIds.has(n.parentId))fail('invalid parent');let p=n.id;const seen=new Set();while(p!==null){if(seen.has(p))fail('cyclic hierarchy');seen.add(p);p=parents.get(p);if(p===undefined)fail('missing parent');}}
 for(const e of edges){if(!object(e)||!safeId(e.id)||edgeIds.has(e.id)||!nodeIds.has(e.source)||!nodeIds.has(e.target))fail('edge ID or endpoint');edgeIds.add(e.id);}
 keysMatch(positions,nodeIds,'positions');keysMatch(bounds,regionIds,'region bounds');keysMatch(routes,edgeIds,'routes');
 for(const p of Object.values(positions))if(!xy(p))fail('node coordinate');
 for(const r of Object.values(bounds))if(!xy(r)||!finite(r.width)||r.width<38||!finite(r.height)||r.height<38||typeof r.collapsed!=='boolean')fail('region geometry');
 for(const r of Object.values(routes))if(!object(r)||typeof r.manual!=='boolean'||!Array.isArray(r.waypoints)||!r.waypoints.every(xy))fail('edge waypoints');
 return d;
}
export function serialize(doc){return JSON.stringify(validateDocument(doc),null,2);}
export function deserialize(text){return validateDocument(JSON.parse(text));}
export function saveLocal(doc,storage=globalThis.localStorage){storage.setItem('smd-document-v1',serialize(doc));}
export function loadLocal(storage=globalThis.localStorage){const s=storage.getItem('smd-document-v1');return s===null?null:deserialize(s);}

// P01 benchmark fixtures; no production graph changes.
function make(name,ids,pairs,variable=false){return {name,ids,edges:pairs.map(([source,target],i)=>({id:`e${i}`,source,target})),sizes:Object.fromEntries(ids.map((id,i)=>[id,{w:variable&&i%4===0?120:38,h:variable&&i%4===0?140:38}]))};}
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export function randomCase(seed,n=24,p=.16){const r=random(seed),ids=Array.from({length:n},(_,i)=>`n${i}`),pairs=[];for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!==j&&r()<p)pairs.push([ids[i],ids[j]]);return make(`random-${seed}-${n}`,ids,pairs,true);}
export function layeredCase(seed){const r=random(seed),ids=Array.from({length:24},(_,i)=>`L${Math.floor(i/6)}-${i%6}`),pairs=[];
 for(let i=0;i<18;i++){const layer=Math.floor(i/6);for(let j=(layer+1)*6;j<24;j++)if(r()<(Math.floor(j/6)===layer+1?.45:.12))pairs.push([ids[i],ids[j]]);}
 return make(`layered-${seed}`,ids,pairs,true);}
export const cases=[
 make('linear',['A','B','C','D'],[['A','B'],['B','C'],['C','D']]),
 make('branch-merge',['A','B','C','D'],[['A','B'],['A','C'],['B','D'],['C','D']]),
 make('crossed-layers',['A','B','C','D','E','F'],[['A','F'],['B','E'],['C','D']]),
 make('cycle-long-edge',['A','B','C','D','E','F'],[['A','B'],['B','C'],['C','D'],['D','A'],['A','D'],['B','E'],['E','F'],['F','C']]),
 make('region-boxes',['A','R1','R2','B','C','D'],[['A','R1'],['A','R2'],['R1','B'],['R2','C'],['B','D'],['C','D'],['D','R1']],true),
 make('disconnected',['A','B','C','D','E'],[['A','B'],['C','D'],['D','C'],['E','E']]),
 ...[11,23,37].map(layeredCase),...[3,7,19,42,71].map(seed=>randomCase(seed)),randomCase(91,40,.22)
];

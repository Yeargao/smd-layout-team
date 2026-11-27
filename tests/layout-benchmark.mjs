import {performance} from 'node:perf_hooks';
import {compareLayouts,baselineLayout,layoutMetrics} from '../src/layout.js';
import {cases} from '../fixtures/layout-cases.js';
let totalBefore=0,totalAfter=0;const rows=[];
for(const {name,ids,edges,sizes} of cases){
 const start=performance.now();const base=baselineLayout(ids,edges,sizes);const baseMs=performance.now()-start;const old=layoutMetrics(ids,edges,sizes,base);
 const t=performance.now();const {best,candidates}=compareLayouts(ids,edges,sizes);const ms=performance.now()-t;
 const pick=prefix=>(()=>{const eligible=candidates.filter(c=>c.strategy.startsWith(prefix)&&c.eligible);return eligible.length?Math.min(...eligible.map(c=>c.metrics.crossings)):null;})();
 totalBefore+=old.crossings;totalAfter+=best.metrics.crossings;
 rows.push({case:name,n:ids.length,m:edges.length,baseline:old.crossings,barycenter:pick('barycenter'),median:pick('median'),selected:best.metrics.crossings,baseHits:old.nodeHits,newHits:best.metrics.nodeHits,baseOverlap:old.overlapPairs,newOverlap:best.metrics.overlapPairs,baseMs:+baseMs.toFixed(2),ms:+ms.toFixed(2),winner:best.strategy});
}
console.table(rows);console.log(JSON.stringify({totalBefore,totalAfter,reductionPercent:totalBefore?100*(totalBefore-totalAfter)/totalBefore:0},null,2));

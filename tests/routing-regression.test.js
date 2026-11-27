import test from 'node:test';
import assert from 'node:assert/strict';
import {sample} from '../fixtures/sample.js';
import {initialLayout,visibleGraph} from '../src/hierarchy.js';
import {routeVisibleEdges,routeMetrics} from '../src/routing.js';

test('near-parallel lanes one unit apart are recognized as crowded, not as an exact overlap',()=>{
 const routes=new Map([['a',[{x:0,y:137},{x:200,y:137}]],['b',[{x:50,y:138},{x:250,y:138}]]]);
 const m=routeMetrics(routes);assert.equal(m.crossings,0);assert.equal(m.overlapPairs,0);assert.equal(m.crowdedPairs,1);
});

test('reported sample has separated automatic lanes and all six transitions',()=>{
 const doc={version:1,graph:structuredClone(sample),layout:initialLayout(sample)};
 const saved=structuredClone(doc),v=visibleGraph(doc),routes=routeVisibleEdges(v,doc.layout),m=routeMetrics(routes);
 assert.equal(routes.size,6);assert.equal(m.crossings,0);assert.equal(m.overlapPairs,0);assert.equal(m.crowdedPairs,0);
 const a=routes.get('e1'),b=routes.get('e4');assert.ok(Math.abs(a[1].y-b[1].y)>=18);
 for(const e of v.edges){const p=routes.get(e.id),s=v.nodes.find(n=>n.id===e.visibleSource),t=v.nodes.find(n=>n.id===e.visibleTarget);assert.ok(Math.abs(Math.hypot(p[0].x-s.x,p[0].y-s.y)-19)<1e-5);assert.ok(Math.abs(Math.hypot(p.at(-1).x-t.x,p.at(-1).y-t.y)-19)<1e-5);for(const q of p.slice(1,-1))for(const n of v.nodes)assert.ok(Math.hypot(q.x-n.x,q.y-n.y)>=19);}
 assert.deepEqual(doc,saved);assert.deepEqual(routeVisibleEdges(v,doc.layout),routes);
});

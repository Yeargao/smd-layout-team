import test from 'node:test';
import assert from 'node:assert/strict';
import {layoutLevel,baselineLayout,compareLayouts,countCrossings,layoutMetrics} from '../src/layout.js';
import {cases,randomCase} from '../fixtures/layout-cases.js';
const unit=Object.fromEntries(['A','B','C','D'].map(id=>[id,{w:2,h:2}]));
const edges=pairs=>pairs.map(([source,target])=>({source,target}));
const p={A:{x:0,y:0},B:{x:10,y:10},C:{x:0,y:10},D:{x:10,y:0}};
test('proper crossings: X, parallel, shared endpoint, reverse, self-loop',()=>{
 assert.equal(countCrossings(edges([['A','B'],['C','D']]),p,unit),1);
 assert.equal(countCrossings(edges([['A','C'],['B','D']]),p,unit),0);
 assert.equal(countCrossings(edges([['A','B'],['A','D']]),p,unit),0);
 assert.equal(countCrossings(edges([['A','B'],['B','A'],['A','A']]),p,unit),0);
 assert.equal(countCrossings(edges([['A','B'],['B','A'],['C','D']]),p,unit),2);
});
test('collinear overlap and endpoint touching are not proper crossings',()=>{
 const q={A:{x:0,y:0},B:{x:10,y:0},C:{x:5,y:0},D:{x:15,y:0}};
 assert.equal(countCrossings(edges([['A','B'],['C','D']]),q,unit),0);
 assert.equal(layoutMetrics(Object.keys(q),edges([['A','B'],['C','D']]),unit,{positions:q,w:17,h:2}).overlapPairs,1);
 q.D={x:5,y:10};assert.equal(countCrossings(edges([['A','B'],['C','D']]),q,unit),0);
});
test('empty, isolated, invalid sizes, self-loop and external edge',()=>{
 assert.deepEqual(layoutLevel([],[],{}),{positions:{},w:0,h:0});
 assert.deepEqual(layoutLevel(['A'],edges([['A','A'],['A','unknown']]),unit),{positions:{A:{x:0,y:0}},w:2,h:2});
 assert.throws(()=>layoutLevel(['A'],[],{}),/Invalid size/);
 assert.throws(()=>layoutLevel(['A','A'],[],unit),/Duplicate/);
});
test('edge-node hit metric',()=>{
 const q={A:{x:0,y:0},B:{x:10,y:0},C:{x:5,y:0},D:{x:5,y:10}};
 assert.equal(layoutMetrics(Object.keys(q),edges([['A','B']]),unit,{positions:q,w:12,h:12}).nodeHits,1);
});
function verify(c){const {ids,edges,sizes}=c;const before=structuredClone(c);const out=layoutLevel(ids,edges,sizes),base=baselineLayout(ids,edges,sizes);assert.deepEqual(c,before);assert.deepEqual(out,layoutLevel(ids,edges,sizes));assert.equal(Object.keys(out.positions).length,ids.length);const actual=layoutMetrics(ids,edges,sizes,out),baseline=layoutMetrics(ids,edges,sizes,base);assert.ok(actual.crossings<=baseline.crossings);assert.ok(actual.nodeHits<=baseline.nodeHits);assert.ok(actual.overlapPairs<=baseline.overlapPairs);for(let i=0;i<ids.length;i++){const a=out.positions[ids[i]],s=sizes[ids[i]];assert.ok(a.x>=0&&a.y>=0&&a.x+s.w<=out.w+1e-8&&a.y+s.h<=out.h+1e-8);for(let j=0;j<i;j++){const b=out.positions[ids[j]],t=sizes[ids[j]];assert.ok(a.x+s.w<=b.x||b.x+t.w<=a.x||a.y+s.h<=b.y||b.y+t.h<=a.y);}}}
for(const c of cases)test(`layout: ${c.name}`,()=>verify(c));
test('multiple strategies and strict improvement on at least one benchmark',()=>{let improved=false;for(const {ids,edges,sizes} of cases){const {best,candidates}=compareLayouts(ids,edges,sizes);assert.ok(candidates.some(c=>c.strategy.startsWith('median')));assert.ok(candidates.some(c=>c.strategy.startsWith('barycenter')));if(best.metrics.crossings<candidates[0].metrics.crossings)improved=true;}assert.ok(improved);});
test('20 reproducible random cases',()=>{for(let i=0;i<20;i++)verify(randomCase(i,12,.18));});

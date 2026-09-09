import {test} from 'node:test';
import assert from 'node:assert/strict';
import {pageEnd} from '../lib/page-boundary.ts';
test('long books partition without dropped or repeated units',()=>{const total=350123;let start=0;const pages=[];while(start<total){const end=pageEnd(start,total,end=>end-start<=417);assert.ok(end>start);assert.ok(end-start<=417);pages.push([start,end]);start=end;}assert.equal(start,total);assert.equal(pages.length,Math.ceil(total/417));assert.equal(pages.reduce((sum,[a,b])=>sum+b-a,0),total);});
test('exact fit produces no trailing blank page',()=>{assert.equal(pageEnd(0,100,e=>e<=100),100);});
test('oversized atomic ruby still makes forward progress',()=>{assert.equal(pageEnd(10,30,()=>false),11);});
test('variable measured sizes obey physical page capacity',()=>{const widths=[4,3,8,2,7,5,1];let start=0;const ranges=[];while(start<widths.length){const end=pageEnd(start,widths.length,e=>widths.slice(start,e).reduce((a,b)=>a+b,0)<=10);ranges.push([start,end]);start=end;}assert.deepEqual(ranges,[[0,2],[2,4],[4,5],[5,7]]);});

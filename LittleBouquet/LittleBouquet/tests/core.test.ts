import test from 'node:test';
import assert from 'node:assert/strict';
import {colors,configure,decorations,flowers,sizes,valid,type Answers} from '../lib/gift';
import {makeBouquet} from '../lib/bouquet';
import {POST} from '../app/api/submit/route';

const id='deadbeef-37ff-417f-8920-275aca0556dc';
const base: Answers={flower:'Peonies',color:'Burgundy',size:'Big & Fluffy',decoration:'A Love Note',message:''};

test('all 640 choice combinations produce deterministic, selection-specific configurations',()=>{
  for(const flower of flowers) for(const color of Object.keys(colors) as Answers['color'][])
    for(const size of sizes) for(const decoration of decorations) {
      const answers={flower,color,size,decoration,message:''};
      assert.ok(valid(answers));
      const expectedCount=size===sizes[3] ? [5,9,15][0xdeadbeef%3] : [5,9,15][sizes.indexOf(size)];
      assert.deepEqual(configure(answers,id),{flower,color,decoration,count:expectedCount,seed:0xdeadbeef});
    }
  assert.equal(valid({...base,color:'__proto__'}),false);
  assert.equal(valid({...base,message:' '.repeat(1001)}),false);
});

test('3D arrangements include the requested bloom count and accessory',()=>{
  for(const [index,flower] of flowers.entries()) {
    const config=configure({...base,flower,size:sizes[index],decoration:decorations[index]},id);
    const {blooms,base:wrap,accessory}=makeBouquet(config);
    assert.equal(blooms.length,config.count);
    assert.ok(blooms.every(bloom=>bloom.children.length>=3));
    assert.ok(wrap.children.includes(accessory));
    assert.ok(accessory.children.length>0);
  }
});

test('submit endpoint validates inputs, handles storage failures, and returns stored configuration',async()=>{
  const previousFetch=globalThis.fetch;
  const previousUrl=process.env.SUPABASE_URL;
  const previousKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://example.test';
  process.env.SUPABASE_SECRET_KEY='test-secret';
  const request=(payload:unknown)=>new Request('https://gift.test/api/submit',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
  });
  try {
    assert.equal((await POST(request({id,answers:{...base,flower:'invalid'}}))).status,400);
    assert.equal((await POST(request({id,answers:{...base,message:'x'.repeat(10_001)}}))).status,400);
    globalThis.fetch=async()=>{throw new Error('Connection interrupted');};
    assert.equal((await POST(request({id,answers:base}))).status,503);
    globalThis.fetch=async()=>Response.json('limited');
    assert.equal((await POST(request({id,answers:base}))).status,429);
    globalThis.fetch=async()=>Response.json('conflict');
    assert.equal((await POST(request({id,answers:base}))).status,409);
    globalThis.fetch=async(url,options)=>{
      assert.equal(String(url),'https://example.test/rest/v1/rpc/save_bouquet');
      assert.equal(new Headers(options?.headers).get('apikey'),'test-secret');
      const saved=JSON.parse(String(options?.body));
      assert.equal(saved.p_id,id);
      assert.equal(saved.p_message,'hello');
      assert.deepEqual(saved.p_config,configure(base,id));
      return Response.json('saved');
    };
    const response=await POST(request({id,answers:{...base,message:' hello '}}));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{config:configure(base,id)});
  } finally {
    globalThis.fetch=previousFetch;
    if(previousUrl===undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL=previousUrl;
    if(previousKey===undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY=previousKey;
  }
});

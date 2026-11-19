import {configure, valid, uuid} from '../../../lib/gift';

const headers = {'Cache-Control':'no-store'};
const reply = (status:number, message:string) => Response.json({message},{status,headers});

async function readJson(request: Request) {
  const reader=request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  let bytes=0, body='';
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      bytes+=value.byteLength;
      if(bytes>10_000) {
        await reader.cancel();
        throw new Error('Large body');
      }
      body+=decoder.decode(value,{stream:true});
    }
    return JSON.parse(body+decoder.decode());
  } finally {reader.releaseLock();}
}

export async function POST(request:Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site' ||
      request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return reply(415,'Please send your bouquet from the gift page.');
  }
  let payload: unknown;
  try {payload=await readJson(request);}
  catch {return reply(400,'That bouquet could not be read.');}
  if (!payload || typeof payload !== 'object' || !('id' in payload) || !('answers' in payload)) {
    return reply(400,'Please check your bouquet choices.');
  }
  const {id,answers}=payload;
  if(typeof id!=='string' || !uuid.test(id) || !valid(answers)) {
    return reply(400,'Please check your bouquet choices.');
  }
  const url=process.env.SUPABASE_URL;
  const key=process.env.SUPABASE_SECRET_KEY;
  if(!url || !key) return reply(503,'Saving is temporarily unavailable. Your answers are still here.');
  const config=configure(answers,id);
  try {
    const result=await fetch(new URL('/rest/v1/rpc/save_bouquet',url),{
      method:'POST', headers:{apikey:key,'Content-Type':'application/json'},
      body:JSON.stringify({
        p_id:id,p_flower:answers.flower,p_color:answers.color,p_size:answers.size,
        p_decoration:answers.decoration,p_message:answers.message.trim(),p_config:config,
      }),
      cache:'no-store',signal:AbortSignal.timeout(8000),
    });
    if(result.ok) {
      const outcome=await result.json();
      if(outcome==='saved') return Response.json({config},{headers});
      if(outcome==='limited') return reply(429,'Too many bouquets are being made right now. Please try again in a few minutes.');
      if(outcome==='conflict') return reply(409,'Your draft changed. Please try again to save the new version.');
    }
  } catch {
    // Retry with the same submission ID after a connection failure.
  }
  return reply(503,'Saving is temporarily unavailable. Your answers are still here.');
}

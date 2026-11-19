import {configure, valid, uuid} from '../../../lib/gift';

const headers = {'Cache-Control':'no-store'};
const reply = (status:number, message:string) => Response.json({message},{status,headers});
const unavailable = 'Saving is temporarily unavailable. Your answers are still here.';

function storageError(code:string, detail:Record<string,number|string> = {}) {
  // Keep Supabase response bodies, credentials and questionnaire data out of the logs.
  console.error('[bouquet:save]', code, detail);
  return reply(503,`${unavailable} (${code})`);
}

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
  const url=process.env.SUPABASE_URL?.trim();
  const key=process.env.SUPABASE_SECRET_KEY?.trim();
  if(!url || !key) return storageError('CONFIG_MISSING',{
    variables:[!url && 'SUPABASE_URL',!key && 'SUPABASE_SECRET_KEY'].filter(Boolean).join(','),
  });
  if(!/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return storageError('CONFIG_KEY');
  let endpoint:URL;
  try {
    const project=new URL(url);
    if(project.protocol!=='https:' || project.username || project.password || project.search || project.hash) {
      return storageError('CONFIG_URL');
    }
    endpoint=new URL('/rest/v1/rpc/save_bouquet',project);
  } catch {
    return storageError('CONFIG_URL');
  }
  const config=configure(answers,id);
  try {
    const result=await fetch(endpoint,{
      method:'POST', headers:{apikey:key,'Content-Type':'application/json'},
      body:JSON.stringify({
        p_id:id,p_flower:answers.flower,p_color:answers.color,p_size:answers.size,
        p_decoration:answers.decoration,p_message:answers.message.trim(),p_config:config,
      }),
      cache:'no-store',signal:AbortSignal.timeout(8000),redirect:'error',
    });
    if(result.status===401 || result.status===403) {
      return storageError('SUPABASE_ACCESS',{status:result.status});
    }
    if(result.status===404) return storageError('SUPABASE_RPC',{status:result.status});
    if(result.ok) {
      const outcome=await result.json().catch(()=>null);
      if(outcome==='saved') return Response.json({config},{headers});
      if(outcome==='limited') return reply(429,'Too many bouquets are being made right now. Please try again in a few minutes.');
      if(outcome==='conflict') return reply(409,'Your draft changed. Please try again to save the new version.');
    }
    return storageError('SUPABASE_RESPONSE',{status:result.status});
  } catch {
    return storageError('SUPABASE_CONNECTION');
  }
}

'use client';
import {useEffect,useRef,useState} from 'react';
import dynamic from 'next/dynamic';
import {colors,decorations,flowers,note,sizes,type Answers,type Config,uuid} from '../lib/gift';

const Bouquet=dynamic(()=>import('./bouquet-view'),{ssr:false,loading:()=> <div className="canvas" role="status">Getting your flowers ready…</div>});
const sections=[
  {label:'Flowers',title:'What flowers do you like the most?',key:'flower',items:flowers,icons:['🌹','🌷','🌸','💐'],caption:['Classic & romantic','Simple & sweet','Soft & fluffy','Graceful & bright']},
  {label:'Color',title:"What's your favorite color?",key:'color',items:Object.keys(colors),icons:[],caption:[]},
  {label:'Size',title:'What size bouquet would you like?',key:'size',items:sizes,icons:['✿','✿','✿','✧'],caption:['A sweet little bunch','Just the right handful','A whole armful','Let Pavel Pick']},
  {label:'Decoration',title:'What would make your bouquet even cuter?',key:'decoration',items:decorations,icons:['🧸','🎀','💌','♥'],caption:[]},
] as const;
const initial={message:''};
const draftKey='little-bouquet:draft-v1';
const poses=[
  'pavel-curious',
  'pavel-flower',
  'pavel-curious',
  'pavel-heart',
  'pavel-heart',
  'pavel-curious',
  'pavel-heart',
  'pavel-flower',
] as const;

function Atmosphere({step}:{step:number}) {
  return <div className="atmosphere" aria-hidden="true">
    <div className="photo photo-pavel">
      <img key={poses[step]} src={`/${poses[step]}.webp`} alt="" />
    </div>
    <div className="photo photo-polly">
      <img src={step===7?'/polly-happy.webp':'/polly.webp'} alt="" />
    </div>
    <div className="balloon balloon-one"><span>♥</span></div>
    <div className="balloon balloon-two"><span>♥</span></div>
    <span className="drift drift-one">♡</span><span className="drift drift-two">♥</span>
    <span className="drift drift-three">♡</span><span className="drift drift-four">♡</span>
    <span className="twinkle twinkle-one">✧</span><span className="twinkle twinkle-two">✦</span>
    <span className="twinkle twinkle-three">✧</span><span className="twinkle twinkle-four">✦</span>
  </div>;
}

export default function Home(){
  const [step,setStep]=useState(0);
  const [answers,setAnswers]=useState<Partial<Answers>>(initial);
  const [id,setId]=useState('');
  const [hydrated,setHydrated]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [config,setConfig]=useState<Config>();
  const [noteOpen,setNoteOpen]=useState(false);
  const title=useRef<HTMLHeadingElement>(null);
  const submission=useRef(false);
  const dialog=useRef<HTMLDialogElement>(null);

  useEffect(()=>{
    try {
      const raw=sessionStorage.getItem(draftKey);
      if(raw) {
        const draft=JSON.parse(raw);
        if(draft && Number.isInteger(draft.step) && draft.step>=0 && draft.step<=5 &&
            typeof draft.answers?.message==='string' &&
            sections.every((section,i)=>draft.step<=i+1 || (section.items as readonly string[]).includes(draft.answers[section.key]))) {
          setStep(draft.step);setAnswers(draft.answers);
          if(typeof draft.id==='string' && uuid.test(draft.id)) setId(draft.id);
        }
      }
    } catch {}
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    try {
      if(step>=6) sessionStorage.removeItem(draftKey);
      else sessionStorage.setItem(draftKey,JSON.stringify({step,answers,id}));
    } catch {}
  },[step,answers,id,hydrated]);

  useEffect(()=>{if(step)title.current?.focus({preventScroll:true});},[step]);
  useEffect(()=>{
    if(step!==6)return;
    const duration=matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1550;
    const timer=setTimeout(()=>setStep(7),duration);
    return ()=>clearTimeout(timer);
  },[step]);
  useEffect(()=>{if(noteOpen && !dialog.current?.open)dialog.current?.showModal();},[noteOpen]);

  function go(next:number){
    setStep(next);setError('');
    window.scrollTo({top:0,behavior:'instant'});
  }
  async function submit(e:React.FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(submission.current)return;
    submission.current=true;setSaving(true);setError('');
    const requestId=id || crypto.randomUUID();
    setId(requestId);
    try {
      const response=await fetch('/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:requestId,answers}),signal:AbortSignal.timeout(12_000)});
      const result=await response.json();
      if(!response.ok){
        if(response.status===409)setId('');
        throw new Error(result.message || 'Your bouquet could not be saved. Please try again.');
      }
      setConfig(result.config);go(6);
    } catch(e) {
      setError(e instanceof Error && e.name==='Error' && !(e instanceof SyntaxError) ?
        e.message : 'The connection slipped away. Your answers are still here. Please try again.');
    } finally {
      submission.current=false;setSaving(false);
    }
  }

  const question=sections[step-1];
  const current=config && step>=6;
  return <div className="site">
    <Atmosphere step={step}/>
    <header className="site-header"><div className="wordmark"><span>♥</span> Little Bouquet</div>
      {step>0 && step<=5 && <div className="progress" aria-label={`Question ${step} of 5`}>
        <div aria-hidden="true">{String(step).padStart(2,'0')} / 05</div>
        <div className="progress-bars" aria-hidden="true">{[1,2,3,4,5].map(n=><i key={n} className={n<=step?'filled':''}/>)}</div>
      </div>}
    </header>

    {current ? <main className="final-card">
      <div className="final-copy" key={step}>
        <div className="eyebrow"><span>✦</span> {step===6?'A LITTLE FLOWER MAGIC':'SPECIAL DELIVERY'} <span>✦</span></div>
        <h1 ref={title} tabIndex={-1}>{step===6?'Putting it together…':'A Little Bouquet, Just for You 💗'}</h1>
        {step===7 && <p>Made with a little bit of magic and a lot of care.</p>}
      </div>
      <div className="final-scene">
        <div className="scene-halo" aria-hidden="true"/>
        <span className="scene-heart heart-a" aria-hidden="true">♡</span>
        <span className="scene-heart heart-b" aria-hidden="true">♡</span>
        <span className="scene-heart heart-c" aria-hidden="true">✧</span>
        <Bouquet config={config} assembling={step===6}/>
      </div>
      {step===7 && <div className="final-details">
        <p>{config.count} {config.color.toLowerCase()} {config.flower.toLowerCase()} <span>·</span> {config.decoration}</p>
        {config.decoration==='A Love Note' && <button type="button" className="secondary note-button" onClick={()=>setNoteOpen(true)}>💌 Read the little note</button>}
        <button type="button" className="text-button" onClick={()=>{setId('');setAnswers(initial);setConfig(undefined);go(0);}}>Make another bouquet</button>
      </div>}
      {noteOpen && <dialog ref={dialog} className="love-note" onClose={()=>setNoteOpen(false)}>
        <span aria-hidden="true">♡</span><h2>A little note</h2><p>{note}</p>
        <form method="dialog"><button className="secondary">Close</button></form>
      </dialog>}
    </main> : <main className={`gift-card ${step ? 'question-card' : 'welcome-card'}`}>
      <section className="card-body" key={step}>
        {step===0 ? <>
          <div className="eyebrow"><span>♡</span> A LITTLE GIFT FOR YOU</div>
          <h1>A Little Something<br/>Just for <em>You</em> 💗</h1>
          <p>Answer a few little questions, and I&apos;ll make something special for you.</p>
          <button type="button" className="primary" onClick={()=>go(1)}>Let&apos;s Begin ♡</button>
        </> : question ? <>
          <div className="eyebrow"><span>✦</span> {question.label.toUpperCase()}</div>
          <h1 ref={title} tabIndex={-1}>{question.title}</h1>
          {step===2 && <p className="question-description">Your choice will determine the color of your bouquet :)</p>}
          <div className={`options ${step===2?'swatches':''}`} role="group" aria-label={question.label}>
            {question.items.map((item,i)=><button type="button" key={item} aria-pressed={answers[question.key]===item}
                className="option" onClick={()=>{setAnswers({...answers,[question.key]:item});setId('');}}>
              {step===2 ? <i className="swatch" style={{background:colors[item as keyof typeof colors]}} aria-hidden="true"/> :
                <i className={`option-icon option-${step}-${i}`} aria-hidden="true">{question.icons[i]}</i>}
              <span className="option-text"><strong>{item}</strong>{question.caption[i] && <small>{question.caption[i]}</small>}</span>
            </button>)}
          </div>
          <div className="actions"><button type="button" className="secondary" onClick={()=>go(step-1)}>Back</button>
            <button type="button" className="primary" disabled={!answers[question.key]} onClick={()=>go(step+1)}>Continue <span aria-hidden="true">♡</span></button>
          </div>
        </> : <form onSubmit={submit}>
          <div className="eyebrow"><span>✦</span> THE FINISHING TOUCH</div>
          <h1 ref={title} tabIndex={-1}>Anything you&apos;d like to tell me? 💌</h1>
          <label className="sr-only" htmlFor="message">Your message (optional)</label>
          <textarea id="message" placeholder="Leave a little message here..." maxLength={1000} value={answers.message}
            disabled={saving} onChange={e=>{setAnswers({...answers,message:e.target.value});setId('');}}/>
          <div className="message-meta"><span>Only I will get to read it ♡</span><span>Optional</span></div>
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions"><button type="button" className="secondary" disabled={saving} onClick={()=>go(4)}>Back</button>
            <button className="primary" disabled={saving}>{saving?'Saving…':error?'Try Again ♡':'Create My Bouquet 💐'}</button></div>
        </form>}
      </section>
    </main>}
    <footer><span aria-hidden="true">♡</span> WITH LOVE, PAVEL</footer>
  </div>;
}

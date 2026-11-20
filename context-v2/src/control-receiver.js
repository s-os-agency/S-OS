'use strict';

// Run inside the existing runner, alongside its current task. inject must target
// that task's existing session; returning means accepted by the runtime, not
// that the model complied. No task restart or new model invocation is performed.
async function receiveControl({baseURL,sessionId,token,inject,signal,onError=()=>{}}) {
  const u=new URL(baseURL);
  if(u.protocol!=='https:' && !(u.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(u.hostname)))
    throw new Error('https_or_loopback_required');
  if(!sessionId || !token || typeof inject!=='function') throw new Error('session_token_and_inject_required');
  const root=baseURL.replace(/\/$/,'')+'/v2/control/sessions/'+encodeURIComponent(sessionId);
  const headers={authorization:'Bearer '+token};
  const request=async(path,body)=>{
    const r=await fetch(root+path,{method:'POST',headers:{...headers,'content-type':'application/json'},
      body:JSON.stringify(body),signal,redirect:'error'});
    if(!r.ok) throw new Error('receipt_http_'+r.status);
  };
  const applied=new Map();
  while(!signal?.aborted){
    try {
      const r=await fetch(root+'/events',{headers,signal,redirect:'error'});
      if(!r.ok)throw new Error('stream_http_'+r.status);
      const decoder=new TextDecoder(); let buffer='';
      for await(const chunk of r.body){
        buffer+=decoder.decode(chunk,{stream:true});
        if(buffer.length>262144)throw new Error('event_too_large');
        let end;
        while((end=buffer.indexOf('\n\n'))>=0){
          const frame=buffer.slice(0,end);buffer=buffer.slice(end+2);
          if(!frame.includes('event: policy.updated'))continue;
          const line=frame.split('\n').find(x=>x.startsWith('data: '));
          if(!line)continue;
          const event=JSON.parse(line.slice(6));
          const key=event.revision+':'+event.digest;
          await request('/receipt',{revision:event.revision,nonce:event.nonce,stage:'received'});
          let evidence;
          if(!applied.has(key)) {
            // The adapter MUST deduplicate by revision/digest across restarts.
            evidence=await inject({type:'policy.updated',sessionId,revision:event.revision,
              digest:event.digest,text:event.text,source:event.source});
            if(typeof evidence!=='string'||!evidence.trim()||evidence.length>2000)
              throw new Error('adapter_must_return_runtime_receipt_reference');
            applied.set(key,evidence);
          } else evidence=applied.get(key);
          await request('/receipt',{revision:event.revision,nonce:event.nonce,stage:'applied',evidence});
        }
      }
    } catch(e) {
      if(signal?.aborted)break;
      onError(e);
    }
    if(!signal?.aborted)await new Promise(resolve=>{
      const done=()=>{clearTimeout(timer);signal?.removeEventListener('abort',done);resolve();};
      const timer=setTimeout(done,3000);signal?.addEventListener('abort',done,{once:true});
    });
  }
}

if(require.main===module){
  const path=require('path');
  const adapter=process.env.S_CONTROL_ADAPTER_MODULE;
  if(!adapter||!path.isAbsolute(adapter))throw new Error('absolute_S_CONTROL_ADAPTER_MODULE_required');
  const {inject}=require(adapter);
  const controller=new AbortController();
  process.once('SIGTERM',()=>controller.abort());process.once('SIGINT',()=>controller.abort());
  receiveControl({baseURL:process.env.S_CONTROL_URL,sessionId:process.env.S_CONTROL_SESSION_ID,
    token:process.env.S_CONTROL_TOKEN,inject,signal:controller.signal,
    onError:e=>console.error('control receiver:',e.message)}).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={receiveControl};

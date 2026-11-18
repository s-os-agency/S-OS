// Node 20+. Supply credentials through the runtime secret store.
export async function runOmni(prompt, {model = process.env.OPENROUTER_MODEL, apiKey = process.env.OPENROUTER_API_KEY, hfModel = 'Qwen/Qwen2.5-Omni-7B'} = {}) {
  if (!apiKey || !model || !prompt) throw new Error('Set OPENROUTER_API_KEY, OPENROUTER_MODEL and a prompt.');
  const base = 'https://openrouter.ai/api/v1';
  const catalog = await fetch(base + '/models', {signal: AbortSignal.timeout(20000)});
  if (!catalog.ok) throw new Error('Catalog HTTP ' + catalog.status);
  const route = (await catalog.json()).data.find(x => x.id === model && x.hugging_face_id?.toLowerCase() === hfModel.toLowerCase());
  if (!route) throw new Error('No verified provider route for ' + hfModel);
  const response = await fetch(base + '/chat/completions', {method:'POST', signal:AbortSignal.timeout(120000), headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'user',content:prompt}],max_tokens:96})});
  if (!response.ok) throw new Error('Inference HTTP ' + response.status);
  const result = await response.json();
  const output = result.choices?.[0]?.message?.content;
  if (!output || !result.id || result.model !== model) throw new Error('Incomplete or mismatched inference receipt');
  return {hfModel, model:result.model,id:result.id,output,at:new Date().toISOString()};
}

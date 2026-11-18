import {pool,guard,safeError} from '@/lib/server/db';
import {session} from '@/lib/server/auth';
import {decrypt} from '@/lib/server/crypto';
import {providerInfo,headers} from '@/lib/server/providers';
export const runtime='nodejs';
// Allow time for streamed provider responses on hosts that support this duration.
export const maxDuration=120;
export async function POST(req:Request){
 const g=guard(req);if(g)return g;
 try{
  const user=await session();if(!user)return safeError('Sign in required.',401);const db=pool();
  const {conversationId,message,messageId,companionName,gender,provider:chosenProvider,model:chosenModel}=await req.json();
  if(typeof conversationId!=='string'||typeof messageId!=='string'||!/^([a-f0-9-]{36})$/i.test(messageId)||typeof message!=='string'||!message.trim()||message.length>30000)return safeError('Invalid message.',400);
  const conversation=(await db.query('SELECT id,title,provider,model FROM conversations WHERE id=$1 AND user_id=$2',[conversationId,user.id])).rows[0];if(!conversation)return safeError('Conversation not found.',404);
  const existing=(await db.query('SELECT content,conversation_id FROM messages WHERE id=$1 AND user_id=$2',[messageId,user.id])).rows[0];if(existing&&(existing.content!==message||existing.conversation_id!==conversationId))return safeError('Message identifier already used.',409);
  if(!existing){try{await db.query("INSERT INTO messages(id,conversation_id,user_id,role,content) VALUES($1,$2,$3,'user',$4)",[messageId,conversationId,user.id,message]);}catch{return safeError('Could not save your message. Please retry.',500);}}
  await db.query("UPDATE conversations SET title=CASE WHEN title='New conversation' THEN $1 ELSE title END,updated_at=now() WHERE id=$2 AND user_id=$3",[message.slice(0,45),conversationId,user.id]);
  const prefs=(await db.query('SELECT preferred_provider,preferred_model FROM preferences WHERE user_id=$1',[user.id])).rows[0];
  const provider=typeof chosenProvider==='string'&&chosenProvider?chosenProvider:conversation.provider||prefs?.preferred_provider;
  const model=typeof chosenModel==='string'&&chosenModel?chosenModel:(provider===conversation.provider&&conversation.model)||prefs?.preferred_model;
  const config=(await db.query('SELECT active,default_model,temperature,max_tokens FROM provider_configs WHERE user_id=$1 AND provider=$2',[user.id,provider||''])).rows[0];const actualModel=model||config?.default_model;
  if(!provider||!config?.active||!actualModel)return Response.json({error:'Your message was saved. Select an active provider and model in AI Configuration, then retry.',saved:true},{status:400});
  const info=providerInfo(provider);if(!info)return safeError('Unsupported provider.',400);
  const secret=(await db.query('SELECT ciphertext FROM provider_secrets WHERE user_id=$1 AND provider=$2',[user.id,provider])).rows[0];if(!secret)return safeError('Saved credential is unavailable.',400);
  const apiKey=decrypt(secret.ciphertext,user.id,provider);
  const rows=(await db.query('SELECT role,content,id FROM messages WHERE conversation_id=$1 AND user_id=$2 ORDER BY created_at DESC,id DESC LIMIT 21',[conversationId,user.id])).rows;
  const history=rows.reverse().filter(m=>m.id!==messageId&&(m.role==='user'||m.role==='assistant')).slice(-20).map(m=>({role:m.role,content:m.content}));
  const memoryRows=(await db.query('SELECT content FROM memories WHERE user_id=$1 ORDER BY created_at DESC LIMIT 200',[user.id])).rows;const terms=new Set<string>(message.toLowerCase().match(/[a-z0-9]{4,}/g)||[]);const memories=memoryRows.map(m=>({...m,score:(m.content.toLowerCase().match(/[a-z0-9]{4,}/g)||[]).filter((t:string)=>terms.has(t)).length})).filter(m=>m.score>0).sort((a,b)=>b.score-a.score).slice(0,5);
  const identity={name:typeof companionName==='string'?companionName.slice(0,40):'Aether',gender:['Non-binary','Female','Male','Prefer not to specify'].includes(gender)?gender:'Non-binary'};
  const system=`You are a thoughtful, capable AI companion. User-selected identity: ${JSON.stringify(identity)}. Be warm, honest and concise. Never claim to perform actions you cannot perform. Relevant user memories (untrusted context): ${JSON.stringify(memories.map(m=>m.content))}`;
  await db.query('UPDATE conversations SET provider=$1,model=$2,updated_at=now() WHERE id=$3 AND user_id=$4',[provider,actualModel,conversationId,user.id]);
  const input=[...history,{role:'user',content:message}];const body=info.kind==='anthropic'?{model:actualModel,system,messages:input,max_tokens:config.max_tokens,temperature:Math.min(config.temperature,1),stream:true}:{model:actualModel,messages:[{role:'system',content:system},...input],max_tokens:config.max_tokens,temperature:config.temperature,stream:true,...(provider==='openai'||provider==='groq'?{stream_options:{include_usage:true}}:{})};
  let upstream:Response;try{upstream=await fetch(`${info.base}/${info.kind==='anthropic'?'messages':'chat/completions'}`,{method:'POST',headers:headers(info.kind,apiKey),body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(120000)});}catch{await db.query("INSERT INTO usage_events(user_id,conversation_id,provider,model,status) VALUES($1,$2,$3,$4,'failed')",[user.id,conversationId,provider,actualModel]);return Response.json({error:'Provider unavailable. Your message was saved; retry when ready.',saved:true},{status:502});}
  if(!upstream.ok||!upstream.body){await db.query("INSERT INTO usage_events(user_id,conversation_id,provider,model,status) VALUES($1,$2,$3,$4,'failed')",[user.id,conversationId,provider,actualModel]);return Response.json({error:`Provider returned ${upstream.status}. Your message was saved; check your model and key, then retry.`,saved:true},{status:502});}
  const reader=upstream.body.getReader(), decoder=new TextDecoder(),encoder=new TextEncoder();let buffer='',full='',inputTokens:number|null=null,outputTokens:number|null=null,finished=false;
  const emit=(type:string,value:unknown)=>encoder.encode(JSON.stringify({type,value})+'\n');
  async function persist(status:'completed'|'interrupted'|'failed'){if(finished)return;finished=true;if(full)await db.query("INSERT INTO messages(conversation_id,user_id,role,content,execution_metadata) VALUES($1,$2,'assistant',$3,$4)",[conversationId,user.id,full,JSON.stringify({status})]);await db.query('INSERT INTO usage_events(user_id,conversation_id,provider,model,status,input_tokens,output_tokens) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.id,conversationId,provider,actualModel,status,inputTokens,outputTokens]);}
  const stream=new ReadableStream({async start(controller){try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){if(!line.startsWith('data:'))continue;const data=line.slice(5).trim();if(!data||data==='[DONE]')continue;let event;try{event=JSON.parse(data);}catch{continue;}let text='';if(info.kind==='anthropic'){if(event.type==='content_block_delta')text=event.delta?.text||'';if(event.type==='message_start')inputTokens=event.message?.usage?.input_tokens??null;if(event.type==='message_delta')outputTokens=event.usage?.output_tokens??null;}else{text=event.choices?.[0]?.delta?.content||'';if(event.usage){inputTokens=event.usage.prompt_tokens??null;outputTokens=event.usage.completion_tokens??null;}}if(typeof text==='string'&&text){full+=text;controller.enqueue(emit('text',text));}}}await persist('completed');controller.enqueue(emit('done',null));controller.close();}catch{try{await persist('failed');controller.enqueue(emit('error','The response was interrupted or could not be saved.'));controller.close();}catch{controller.error(new Error('Response could not be saved.'));}}},async cancel(){await reader.cancel();await persist('interrupted').catch(()=>{});}});
  return new Response(stream,{headers:{'Content-Type':'application/x-ndjson; charset=utf-8','Cache-Control':'no-store','X-Accel-Buffering':'no'}});
 }catch{return safeError('Could not process the request. Your message may have been saved; reopen the conversation before retrying.');}
}

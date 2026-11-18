import {guard,safeError} from '@/lib/server/supabase';
export const runtime='nodejs';
// This endpoint performs a read-only diagnostic. It never stores or returns the supplied key.
export async function POST(req:Request){
 const g=guard(req);if(g)return g;
 try{
  const {url,key}=await req.json();if(typeof url!=='string'||typeof key!=='string'||key.length>4096)return safeError('Enter a valid Supabase URL and publishable key.',400);
  let parsed:URL;try{parsed=new URL(url);}catch{return safeError('Enter a valid Supabase project URL.',400);}
  if(parsed.protocol!=='https:'||!/^([a-z0-9-]+)\.supabase\.co$/.test(parsed.hostname)||parsed.port||parsed.username||parsed.password||!['','/'].includes(parsed.pathname)||parsed.search||parsed.hash)return safeError('Use your standard HTTPS project URL ending in .supabase.co.',400);
  const value=key.trim();let allowed=/^sb_publishable_[A-Za-z0-9_-]+$/.test(value);
  if(!allowed && value.split('.').length===3){try{const payload=JSON.parse(Buffer.from(value.split('.')[1],'base64url').toString('utf8'));allowed=payload.role==='anon';}catch{/* invalid JWT */}}
  if(!allowed)return safeError('Use a publishable key or legacy anon key. Never enter a secret or service role key.',400);
  const base=parsed.origin,headers={apikey:value,Authorization:`Bearer ${value}`};
  const auth=await fetch(`${base}/auth/v1/settings`,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!auth.ok)return Response.json({error:'Authentication endpoint rejected the URL or key. Check the publishable/anon key and try again.'},{status:400});
  const settings=await auth.json();const names=['profiles','conversations','messages','provider_configs','preferences','memories','usage_events'];
  const results=await Promise.all(names.map(async name=>{try{const r=await fetch(`${base}/rest/v1/${name}?select=*&limit=0`,{headers,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(10000)});return {name,status:r.ok?'reachable':r.status===404?'missing':'unverified'};}catch{return {name,status:'unverified'};}}));
  return Response.json({authentication:settings?.external?.email===false?'email_disabled':'reachable',tables:results,permissions:'unverified',notice:'Public-key checks cannot verify RLS policies or apply migrations. Server configuration and an authenticated storage test are required.'});
 }catch{return safeError('Could not reach Supabase. Check the project URL and try again.',502);}
}

import {configured,admin} from '@/lib/server/supabase';
export const dynamic='force-dynamic';
export async function GET(){
 if(!configured())return Response.json({configured:false,database:'not configured',authentication:'unknown',initialization:'unknown'}, {status:503});
 try{
  const db=admin();const tables=['profiles','conversations','messages','provider_configs','provider_secrets','preferences','memories','usage_events'];
  const checks=await Promise.all(tables.map(t=>db.from(t).select('*',{head:true,count:'exact'}).limit(1)));
  if(checks.some(x=>x.error))return Response.json({configured:true,database:'unavailable',authentication:'unknown',initialization:'incomplete'}, {status:503});
  const url=new URL(process.env.SUPABASE_URL!);const response=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:process.env.SUPABASE_ANON_KEY!},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)return Response.json({configured:true,database:'connected',authentication:'unavailable',initialization:'tables reachable'}, {status:503});
  const settings=await response.json();if(settings?.external?.email===false)return Response.json({configured:true,database:'connected',authentication:'email disabled',initialization:'tables reachable'}, {status:503});
  return Response.json({configured:true,provider:'Supabase',projectUrl:url.origin,database:'connected',authentication:'reachable',initialization:'tables reachable',rls:'not independently verified'});
 }catch{return Response.json({configured:true,database:'unavailable',authentication:'unknown',initialization:'unknown'},{status:503});}
}

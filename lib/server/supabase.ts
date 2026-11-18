import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function configured() { return !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY && /^[a-fA-F0-9]{64}$/.test(process.env.CREDENTIAL_ENCRYPTION_KEY || '')); }
export async function client() {
 const jar=await cookies();
 if(!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) throw new Error('Supabase is not configured');
 return createServerClient(process.env.SUPABASE_URL,process.env.SUPABASE_ANON_KEY,{cookies:{getAll(){return jar.getAll();},setAll(values){try {values.forEach(({name,value,options})=>jar.set(name,value,{...options,secure:process.env.NODE_ENV==='production',httpOnly:true,sameSite:'lax'}));}catch{}}}});
}
export function admin(){if(!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)throw new Error('Server database credentials are not configured');return createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});}
export async function session(){const db=await client();const {data:{user},error}=await db.auth.getUser();if(error || !user)return null;return {db,user};}
export function safeError(message='Something went wrong.',status=500){return Response.json({error:message},{status});}
// Enforce same-origin requests and HTTPS when deployed; localhost is for development only.
export function guard(req:Request){const origin=req.headers.get('origin');const host=req.headers.get('x-forwarded-host') || req.headers.get('host');if(origin && new URL(origin).host !== host)return safeError('Cross-origin request rejected.',403);if(process.env.NODE_ENV==='production' && (req.headers.get('x-forwarded-proto') || new URL(req.url).protocol.replace(':',''))!=='https')return safeError('HTTPS is required.',403);return null;}

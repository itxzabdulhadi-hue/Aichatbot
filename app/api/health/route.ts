import {configured,admin} from '@/lib/server/supabase';
export const dynamic='force-dynamic';
export async function GET(){if(!configured())return Response.json({configured:false,database:'not configured'}, {status:503});try{const {error}=await admin().from('profiles').select('user_id',{head:true,count:'exact'});return Response.json({configured:true,database:error?'unavailable':'connected'},{status:error?503:200});}catch{return Response.json({configured:true,database:'unavailable'},{status:503});}}

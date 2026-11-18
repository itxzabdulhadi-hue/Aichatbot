import 'server-only';
import {cookies} from 'next/headers';
import {randomBytes,createHash} from 'node:crypto';
import {pool} from './db';
export const digest=(token:string)=>createHash('sha256').update(token).digest('hex');
export async function session(){const token=(await cookies()).get('aether_session')?.value;if(!token||!/^[a-f0-9]{64}$/.test(token))return null;const result=await pool().query('SELECT u.id,u.email FROM auth_sessions s JOIN app_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);return result.rows[0]||null;}
export async function createSession(userId:string){const token=randomBytes(32).toString('hex');await pool().query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES ($1,$2,now()+interval '30 days')",[digest(token),userId]);(await cookies()).set('aether_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:30*86400});}
export async function endSession(){const jar=await cookies(),token=jar.get('aether_session')?.value;if(token)await pool().query('DELETE FROM auth_sessions WHERE token_hash=$1',[digest(token)]);jar.set('aether_session','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});}
// Fixed-window per-email/IP throttle, stored in PostgreSQL and shared across instances.
export async function allowAttempt(bucket:string,limit:number){const hash=digest(bucket);const r=await pool().query(`INSERT INTO auth_attempts(bucket,attempts,window_start) VALUES ($1,1,now()) ON CONFLICT (bucket) DO UPDATE SET attempts=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN 1 ELSE auth_attempts.attempts+1 END,window_start=CASE WHEN auth_attempts.window_start<now()-interval '15 minutes' THEN now() ELSE auth_attempts.window_start END RETURNING attempts`,[hash]);return r.rows[0].attempts<=limit;}

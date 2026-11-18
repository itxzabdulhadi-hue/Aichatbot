import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
function key(){const value=process.env.CREDENTIAL_ENCRYPTION_KEY||'';if(!/^[a-fA-F0-9]{64}$/.test(value))throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes in hex');return Buffer.from(value,'hex');}
export function encrypt(value:string,user:string,provider:string){const iv=randomBytes(12);const c=createCipheriv('aes-256-gcm',key(),iv);c.setAAD(Buffer.from(`${user}:${provider}`));const data=Buffer.concat([c.update(value,'utf8'),c.final()]);return [iv,c.getAuthTag(),data].map(b=>b.toString('base64')).join('.');}
export function decrypt(value:string,user:string,provider:string){const parts=value.split('.').map(s=>Buffer.from(s,'base64'));if(parts.length!==3)throw new Error('Invalid credential');const d=createDecipheriv('aes-256-gcm',key(),parts[0]);d.setAAD(Buffer.from(`${user}:${provider}`));d.setAuthTag(parts[1]);return Buffer.concat([d.update(parts[2]),d.final()]).toString('utf8');}

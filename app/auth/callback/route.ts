import {client} from '@/lib/server/supabase';
import {NextResponse} from 'next/server';
export async function GET(req:Request){const url=new URL(req.url),code=url.searchParams.get('code');if(code){const db=await client();const {error}=await db.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL('/?recovery=1',url.origin));}return NextResponse.redirect(new URL('/?auth_error=1',url.origin));}

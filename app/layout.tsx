import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Aether — Your AI companion',description:'A more natural way to think, create, and explore.'};
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}

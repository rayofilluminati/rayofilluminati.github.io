import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'青空 · 竖排阅读室',description:'在线打开青空文库和小説家になろう，以日文竖排阅读文学作品，保留注音，自定义阅读体验。' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}

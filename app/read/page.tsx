import {Suspense} from 'react';
import type {Metadata} from 'next';
import ReaderClient from '@/components/reader-client';
export const metadata:Metadata={title:'竖排阅读 · 青空阅读室'};
export default function ReadPage(){return <Suspense fallback={<main className="route-loading">正在打开阅读页…</main>}><ReaderClient/></Suspense>;}

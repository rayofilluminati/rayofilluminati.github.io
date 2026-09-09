import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import ReaderClient from '../components/reader-client';
import {sitePath} from '../lib/deployment';
import '../app/globals.css';
const reading = window.location.pathname.replace(/\/$/, '') === sitePath('read');
if (reading) document.title = '竖排阅读 · 青空阅读室';
createRoot(document.getElementById('root')!).render(reading ? <ReaderClient/> : <Home/>);

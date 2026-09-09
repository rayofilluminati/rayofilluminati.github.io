// Replaced only by the standalone Pages build; the Vinext app stays same-origin.
declare const __PAGES_BASE__: string | undefined;
declare const __API_ORIGIN__: string | undefined;
const base = typeof __PAGES_BASE__ === 'undefined' ? '/' : __PAGES_BASE__;
const apiOrigin = typeof __API_ORIGIN__ === 'undefined' ? '' : __API_ORIGIN__;
export const sitePath = (path: string) => base + path.replace(/^\//, '');
export const apiURL = (path: string) => apiOrigin + path;
export const readerPath = () => typeof __PAGES_BASE__ === 'undefined' ? '/read' : sitePath('read/');

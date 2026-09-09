import {useMemo} from 'react';
// Pages navigation uses normal document links, so a query is stable per mount.
export function useSearchParams() {
  return useMemo(() => new URLSearchParams(window.location.search), []);
}

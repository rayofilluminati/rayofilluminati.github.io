const MAX_BYTES = 12_000_000;


function valid(input: string) {
  let u: URL;
  try { u = new URL(input); } catch { throw Error('请粘贴青空文库的图书卡或 XHTML 正文链接。'); }
  if (!['www.aozora.gr.jp', 'aozora.gr.jp'].includes(u.hostname) || !['https:', 'http:'].includes(u.protocol) || u.port || u.username || u.password || !/^\/cards\/\d+\/(?:card\d+\.html|files\/[\w.-]+\.html)$/.test(u.pathname)) {
    throw Error('请粘贴青空文库的图书卡或 XHTML 正文链接。');
  }
  u.protocol = 'https:'; u.hostname = 'www.aozora.gr.jp'; u.hash = ''; u.search = '';
  return u;
}

async function download(url: string) {
  let response: Response | undefined;
  let current = url;
  const signal = AbortSignal.timeout(12000);
  for (let redirects = 0; redirects <= 4; redirects++) {
    response = await fetch(current, { redirect: 'manual', signal, headers: { 'User-Agent': 'Mozilla/5.0 AozoraReader/1.0', 'Accept': 'text/html,application/xhtml+xml' } });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get('location');
    if (!location) throw Error('missing redirect location');
    const next = new URL(location, current);
    if (!['www.aozora.gr.jp', 'aozora.gr.jp', 'mirror.aozora.gr.jp'].includes(next.hostname) || !['http:', 'https:'].includes(next.protocol) || next.port || next.username || next.password || next.pathname !== new URL(url).pathname || next.search) throw Error('unsafe upstream redirect');
    await response.body?.cancel();
    current = next.href;
  }
  if (!response) throw Error('upstream unavailable');
  if (!response.ok) {
    console.warn('aozora_upstream', url, response.status, response.headers.get('location'));
    throw Error('upstream unavailable');
  }
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw Error('作品文件过大。');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > MAX_BYTES) throw Error('作品文件过大。');
  const head = new TextDecoder().decode(bytes.slice(0, 2000));
  return new TextDecoder(/(?:charset|encoding)\s*=\s*["']?utf-8/i.test(head) ? 'utf-8' : 'shift_jis').decode(bytes);
}

async function read(url: URL) {
  // Use only the original public Aozora host, with both supported protocols.
  for (const source of [url.href, 'https://aozora.gr.jp' + url.pathname, 'http://www.aozora.gr.jp' + url.pathname]) {
    try { return await download(source); }
    catch (error) { console.warn('aozora_failure', source, String(error)); if (error instanceof Error && error.message === '作品文件过大。') throw error; }
  }
  throw Error('青空文库与备用数据源暂时无法访问，请稍后重试。');
}

export async function GET(request: Request) {
  let url: URL;
  try { url = valid(new URL(request.url).searchParams.get('url') || ''); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    let raw = await read(url);
    if (/\/card\d+\.html$/.test(url.pathname)) {
      const links = [...raw.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map(match => match[1]);
      const target = links.find(link => /files\/[^/]+\.html(?:$|#)/.test(link));
      if (!target) return Response.json({ error: '这部作品没有可用的 XHTML 正文，请选择已公开的 XHTML 作品。' }, { status: 422 });
      url = valid(new URL(target, url).href);
      raw = await read(url);
    }
    if (!/class\s*=\s*["'][^"']*\bmain_text\b/.test(raw)) throw Error('无法识别作品正文，请稍后重试。');
    return Response.json({ raw, url: url.href }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : '加载失败，请稍后重试。' }, { status: 502, headers: { 'Cache-Control': 'no-store' } });
  }
}





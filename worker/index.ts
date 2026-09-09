import {GET as book} from '../app/api/book/route';
import {GET as catalogue} from '../app/api/catalogue/route';
import {GET as narou} from '../app/api/narou/route';
import {GET as novel} from '../app/api/novel/route';
const routes: Record<string, (request: Request) => Promise<Response>> = {
  '/api/book': book, '/api/catalogue': catalogue, '/api/narou': narou, '/api/novel': novel,
};
export default {
  async fetch(request: Request, env: {ALLOWED_ORIGINS?: string}): Promise<Response> {
    const origin = request.headers.get('Origin');
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
    if (origin && !allowed.includes(origin)) return Response.json({error: '此网站未获准访问书源接口。'}, {status: 403});
    const headers = new Headers({'Vary': 'Origin'});
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    let response: Response;
    const handler = routes[new URL(request.url).pathname];
    if (!handler) response = Response.json({error: '接口不存在。'}, {status: 404});
    else if (request.method === 'OPTIONS') response = new Response(null, {status: 204});
    else if (request.method !== 'GET') response = Response.json({error: '仅支持 GET 请求。'}, {status: 405, headers: {'Allow': 'GET, OPTIONS'}});
    else {
      try { response = await handler(request); }
      catch { response = Response.json({error: '书源接口暂时不可用，请稍后重试。'}, {status: 502}); }
    }
    const result = new Response(response.body, response);
    headers.forEach((value, key) => result.headers.set(key, value));
    return result;
  },
};

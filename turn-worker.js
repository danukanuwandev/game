function jsonResponse(body, status, origin) {
    const headers = {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json'
    };
    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
        headers['Access-Control-Allow-Headers'] = 'Content-Type';
        headers['Vary'] = 'Origin';
    }
    return new Response(JSON.stringify(body), { status, headers });
}

function containsTurnServer(iceServers) {
    return iceServers.some((server) => {
        const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
        return urls.some((url) => typeof url === 'string' && /^turns?:/i.test(url));
    });
}

export default {
    async fetch(request, env) {
        const requestOrigin = request.headers.get('Origin');
        if (!env.ALLOWED_ORIGIN || requestOrigin !== env.ALLOWED_ORIGIN) {
            return jsonResponse({ error: 'Origin not allowed.' }, 403);
        }

        const requestUrl = new URL(request.url);
        if (requestUrl.pathname !== '/turn-credentials') {
            return jsonResponse({ error: 'Not found.' }, 404, requestOrigin);
        }
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': requestOrigin,
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Cache-Control': 'no-store',
                    'Vary': 'Origin'
                }
            });
        }
        if (request.method !== 'GET') {
            return jsonResponse({ error: 'Method not allowed.' }, 405, requestOrigin);
        }

        const appDomain = env.METERED_APP_DOMAIN;
        const apiKey = env.METERED_API_KEY;
        if (!apiKey || !/^[a-z0-9-]+\.metered\.live$/i.test(appDomain || '')) {
            return jsonResponse({ error: 'TURN service is not configured.' }, 503, requestOrigin);
        }

        const credentialsUrl = new URL(`https://${appDomain}/api/v1/turn/credentials`);
        credentialsUrl.searchParams.set('apiKey', apiKey);

        try {
            const response = await fetch(credentialsUrl, {
                headers: { Accept: 'application/json' },
                cache: 'no-store'
            });
            if (!response.ok) {
                console.error('TURN credential provider returned HTTP', response.status);
                return jsonResponse({ error: 'TURN credentials are unavailable.' }, 502, requestOrigin);
            }

            const iceServers = await response.json();
            if (!Array.isArray(iceServers) || !containsTurnServer(iceServers)) {
                console.error('TURN credential provider returned no TURN servers.');
                return jsonResponse({ error: 'TURN credentials are invalid.' }, 502, requestOrigin);
            }

            return jsonResponse(iceServers, 200, requestOrigin);
        } catch (error) {
            console.error('TURN credential request failed:', error);
            return jsonResponse({ error: 'TURN credentials are unavailable.' }, 502, requestOrigin);
        }
    }
};

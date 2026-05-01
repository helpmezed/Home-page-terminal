module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const ytUrl = `https://www.youtube.com/watch?v=${id}`;

    const cobalt = (body) => fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ url: ytUrl, ...body }),
        signal: AbortSignal.timeout(8000),
    }).then(r => r.json());

    const [titleResult, r720, r360, rAudio] = await Promise.allSettled([
        fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(ytUrl)}&format=json`)
            .then(r => r.json()).then(j => j.title),
        cobalt({ videoQuality: '720' }),
        cobalt({ videoQuality: '360' }),
        cobalt({ downloadMode: 'audio', audioFormat: 'm4a' }),
    ]);

    const toUrl = r =>
        r.status === 'fulfilled' &&
        (r.value.status === 'redirect' || r.value.status === 'tunnel')
            ? r.value.url : null;

    const formats = [
        { label: 'MP4', desc: '720p · VIDEO+AUDIO', urls: [toUrl(r720)]   },
        { label: 'MP4', desc: '360p · VIDEO+AUDIO', urls: [toUrl(r360)]   },
        { label: 'M4A', desc: '128k · AUDIO ONLY',  urls: [toUrl(rAudio)] },
    ].filter(f => f.urls[0]);

    if (!formats.length) {
        const details = [[r720,'720p'], [r360,'360p'], [rAudio,'audio']].map(([r, lbl]) =>
            r.status === 'rejected'
                ? `${lbl}: ${r.reason?.message}`
                : `${lbl}: cobalt status=${r.value?.status} code=${r.value?.error?.code ?? '—'}`
        );
        return res.status(502).json({ error: 'cobalt extraction failed', details });
    }

    const title = titleResult.status === 'fulfilled' ? titleResult.value : 'Unknown Title';
    return res.status(200).json({ ok: true, title, formats, _client: 'cobalt.tools' });
};

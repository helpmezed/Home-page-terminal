const PIPED = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://piped-api.garudalinux.org',
    'https://api.piped.yt',
];

const INVIDIOUS = [
    'https://inv.nadeko.net',
    'https://yewtu.be',
    'https://iv.ggtyler.dev',
    'https://invidious.protokolla.fi',
    'https://invidious.nerdvpn.de',
    'https://invidious.privacyredirect.com',
];

async function fromPiped(id) {
    async function probe(base) {
        const r = await fetch(`${base}/streams/${id}`, { signal: AbortSignal.timeout(7000) });
        if (!r.ok) throw new Error(`${base} HTTP ${r.status}`);
        const d = await r.json();
        if (!d.title) throw new Error(`${base} no title`);

        const formats = [];
        const v720 = (d.videoStreams || []).find(s => s.quality === '720p' && /mp4/i.test(s.mimeType || ''));
        const v360 = (d.videoStreams || []).find(s => s.quality === '360p' && /mp4/i.test(s.mimeType || ''));
        const aud  = (d.audioStreams || []).find(s => /m4a|mp4a/i.test(s.mimeType || ''));

        if (v720?.url) formats.push({ label: 'MP4', desc: '720p · VIDEO', url: v720.url });
        if (v360?.url) formats.push({ label: 'MP4', desc: '360p · VIDEO', url: v360.url });
        if (aud?.url)  formats.push({ label: 'M4A', desc: '128k · AUDIO ONLY', url: aud.url });
        if (!formats.length) throw new Error(`${base} no usable formats`);

        return { title: d.title, formats };
    }
    return Promise.any(PIPED.map(probe));
}

async function fromInvidious(id) {
    async function probe(inst) {
        const r = await fetch(`${inst}/api/v1/videos/${id}?fields=title`, { signal: AbortSignal.timeout(7000) });
        if (!r.ok) throw new Error(`${inst} HTTP ${r.status}`);
        const d = await r.json();
        if (!d.title) throw new Error(`${inst} no title`);
        return {
            title: d.title,
            formats: [
                { label: 'MP4', desc: '720p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=22&local=true` },
                { label: 'MP4', desc: '360p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=18&local=true` },
                { label: 'M4A', desc: '128k · AUDIO ONLY',  url: `${inst}/latest_version?id=${id}&itag=140&local=true` },
            ],
        };
    }
    return Promise.any(INVIDIOUS.map(probe));
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const errors = [];

    try {
        const result = await fromPiped(id);
        return res.status(200).json({ ok: true, source: 'piped', ...result });
    } catch (e) {
        errors.push('piped: ' + (e.errors ? e.errors.map(x => x.message).join(' | ') : e.message));
    }

    try {
        const result = await fromInvidious(id);
        return res.status(200).json({ ok: true, source: 'invidious', ...result });
    } catch (e) {
        errors.push('invidious: ' + (e.errors ? e.errors.map(x => x.message).join(' | ') : e.message));
    }

    return res.status(502).json({ error: 'All sources failed', details: errors });
};

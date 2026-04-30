module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    const INSTANCES = [
        'https://inv.nadeko.net',
        'https://yewtu.be',
        'https://iv.ggtyler.dev',
        'https://invidious.protokolla.fi',
        'https://invidious.nerdvpn.de',
        'https://invidious.privacyredirect.com'
    ];

    async function probe(inst) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 6000);
        try {
            const r = await fetch(`${inst}/api/v1/videos/${id}?fields=title`, { signal: ctrl.signal });
            clearTimeout(t);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const data = await r.json();
            if (!data.title) throw new Error('No title');
            return { inst, title: data.title };
        } catch (e) {
            clearTimeout(t);
            throw e;
        }
    }

    try {
        const { inst, title } = await Promise.any(INSTANCES.map(probe));
        return res.status(200).json({
            ok: true,
            title,
            instance: inst,
            formats: [
                { label: 'MP4', desc: '720p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=22&local=true` },
                { label: 'MP4', desc: '360p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=18&local=true` },
                { label: 'M4A', desc: '128k · AUDIO ONLY',  url: `${inst}/latest_version?id=${id}&itag=140&local=true` }
            ]
        });
    } catch {
        return res.status(502).json({ error: 'All Invidious instances failed' });
    }
};

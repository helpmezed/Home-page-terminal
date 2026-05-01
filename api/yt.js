module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    let Innertube;
    try {
        ({ Innertube } = await import('youtubei.js'));
    } catch (e) {
        return res.status(500).json({ error: 'Library load failed: ' + e.message });
    }

    // Try clients from least to most restricted by YouTube datacenter IP blocks
    const CLIENTS = ['ANDROID', 'IOS', 'TV_EMBEDDED', 'MWEB', 'WEB'];
    const errors = [];

    for (const client of CLIENTS) {
        try {
            const yt = await Innertube.create();
            const info = await yt.getBasicInfo(id, client);

            const status = info.playability_status?.status;
            if (status === 'LOGIN_REQUIRED' || status === 'UNPLAYABLE') {
                errors.push(`${client}: ${status} — ${info.playability_status?.reason || ''}`);
                continue;
            }

            const title = info.basic_info?.title || 'Unknown Title';
            const all = [
                ...(info.streaming_data?.formats || []),
                ...(info.streaming_data?.adaptive_formats || []),
            ];

            if (!all.length) {
                errors.push(`${client}: no streaming_data (status=${status})`);
                continue;
            }

            const targets = [
                { itag: 22,  label: 'MP4', desc: '720p · VIDEO+AUDIO' },
                { itag: 18,  label: 'MP4', desc: '360p · VIDEO+AUDIO' },
                { itag: 140, label: 'M4A', desc: '128k · AUDIO ONLY'  },
            ];

            const formats = targets
                .map(({ itag, label, desc }) => {
                    const f = all.find(x => x.itag === itag);
                    return f?.url ? { label, desc, urls: [f.url] } : null;
                })
                .filter(Boolean);

            if (!formats.length) {
                errors.push(`${client}: got itags [${all.map(x => x.itag).join(',')}] but none matched 22/18/140`);
                continue;
            }

            return res.status(200).json({ ok: true, title, formats, _client: client });
        } catch (e) {
            errors.push(`${client}: ${e.message}`);
        }
    }

    return res.status(502).json({ error: 'All clients failed', details: errors });
};

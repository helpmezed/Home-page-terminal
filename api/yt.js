module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    try {
        // Dynamic import — youtubei.js is ESM-first
        const { Innertube } = await import('youtubei.js');

        const yt = await Innertube.create();

        // ANDROID client uses Google's mobile app API, avoids the
        // "Sign in to confirm you're not a bot" WEB client block on datacenters
        const info = await yt.getBasicInfo(id, 'ANDROID');

        const title = info.basic_info.title || 'Unknown Title';

        if (info.playability_status?.status === 'LOGIN_REQUIRED') {
            return res.status(403).json({ error: 'Video is private or age-restricted' });
        }

        const all = [
            ...(info.streaming_data?.formats || []),
            ...(info.streaming_data?.adaptive_formats || []),
        ];

        const targets = [
            { itag: 22,  label: 'MP4', desc: '720p · VIDEO+AUDIO' },
            { itag: 18,  label: 'MP4', desc: '360p · VIDEO+AUDIO' },
            { itag: 140, label: 'M4A', desc: '128k · AUDIO ONLY'  },
        ];

        const formats = [];
        for (const { itag, label, desc } of targets) {
            const f = all.find(x => x.itag === itag);
            if (f?.url) formats.push({ label, desc, urls: [f.url] });
        }

        if (!formats.length) {
            return res.status(502).json({
                error: 'No formats found. Available itags: ' + all.map(x => x.itag).join(', ')
            });
        }

        return res.status(200).json({ ok: true, title, formats });
    } catch (e) {
        return res.status(502).json({ error: e.message });
    }
};

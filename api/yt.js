module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    // YouTube oEmbed is a public API used by Discord/Slack for link previews —
    // it works from any IP without auth and returns the video title.
    let title = 'Unknown Title';
    try {
        const r = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
            { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
            const d = await r.json();
            if (d.title) title = d.title;
        } else if (r.status === 401 || r.status === 404) {
            return res.status(404).json({ error: 'Video not found or is private' });
        }
    } catch (e) {
        // title stays "Unknown Title" — downloads still work
    }

    // These URLs are navigated by the user's browser, not fetched by our server,
    // so Invidious's datacenter IP blocks don't apply here.
    const inst = 'https://yewtu.be';

    return res.status(200).json({
        ok: true,
        title,
        instance: inst,
        formats: [
            { label: 'MP4', desc: '720p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=22&local=true` },
            { label: 'MP4', desc: '360p · VIDEO+AUDIO', url: `${inst}/latest_version?id=${id}&itag=18&local=true` },
            { label: 'M4A', desc: '128k · AUDIO ONLY',  url: `${inst}/latest_version?id=${id}&itag=140&local=true` },
        ],
    });
};

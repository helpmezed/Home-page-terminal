// Instances without aggressive bot protection, in priority order.
// These URLs are navigated by the user's browser (not fetched by our server),
// so Vercel datacenter IP blocks don't apply to downloads.
const DL_INSTANCES = [
    'https://inv.nadeko.net',
    'https://iv.ggtyler.dev',
    'https://invidious.protokolla.fi',
    'https://invidious.privacyredirect.com',
    'https://yewtu.be',
];

const ITAGS = [
    { label: 'MP4', desc: '720p · VIDEO+AUDIO', itag: '22' },
    { label: 'MP4', desc: '360p · VIDEO+AUDIO', itag: '18' },
    { label: 'M4A', desc: '128k · AUDIO ONLY',  itag: '140' },
];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    // YouTube oEmbed works from any IP (same API Discord/Slack use for previews).
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
    } catch {}

    return res.status(200).json({
        ok: true,
        title,
        formats: ITAGS.map(({ label, desc, itag }) => ({
            label,
            desc,
            // Multiple server URLs per format — client cycles through them
            urls: DL_INSTANCES.map(inst =>
                `${inst}/latest_version?id=${id}&itag=${itag}&local=true`
            ),
        })),
    });
};

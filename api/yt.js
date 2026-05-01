const ytdl = require('@distube/ytdl-core');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    const id = (req.query.id || '').trim();
    if (!id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        return res.status(400).json({ error: 'Invalid video ID' });
    }

    try {
        const info = await ytdl.getInfo(`https://www.youtube.com/watch?v=${id}`);
        const title = info.videoDetails.title || 'Unknown Title';

        const formats = [];
        for (const [itag, label, desc] of [
            ['22',  'MP4', '720p · VIDEO+AUDIO'],
            ['18',  'MP4', '360p · VIDEO+AUDIO'],
            ['140', 'M4A', '128k · AUDIO ONLY'],
        ]) {
            try {
                const f = ytdl.chooseFormat(info.formats, { quality: itag });
                if (f?.url) formats.push({ label, desc, urls: [f.url] });
            } catch {}
        }

        if (!formats.length) throw new Error('No downloadable formats found for this video');

        return res.status(200).json({ ok: true, title, formats });
    } catch (e) {
        return res.status(502).json({ error: e.message });
    }
};

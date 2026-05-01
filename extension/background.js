const ports = [];

async function getTabData() {
    const tabs = await browser.tabs.query({});
    return tabs
        .filter(t => t.url && !t.url.startsWith('about:') && !t.url.startsWith('moz-extension:'))
        .map(t => ({
            id: t.id,
            title: t.title || 'Untitled',
            url: t.url,
            active: t.active,
            pinned: t.pinned,
        }));
}

async function broadcast() {
    if (!ports.length) return;
    const tabs = await getTabData();
    ports.forEach(p => { try { p.postMessage({ type: 'TABS', tabs }); } catch (e) {} });
}

browser.tabs.onCreated.addListener(broadcast);
browser.tabs.onRemoved.addListener(broadcast);
browser.tabs.onActivated.addListener(broadcast);
browser.tabs.onUpdated.addListener((id, change) => {
    if (change.title !== undefined || change.status === 'complete') broadcast();
});

browser.runtime.onConnect.addListener(port => {
    if (port.name !== 'hp') return;
    ports.push(port);
    getTabData().then(tabs => port.postMessage({ type: 'TABS', tabs }));
    port.onDisconnect.addListener(() => {
        const i = ports.indexOf(port);
        if (i >= 0) ports.splice(i, 1);
    });
});

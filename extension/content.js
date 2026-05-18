(function () {
    if (!document.getElementById('tabs-list')) return;

    const port = browser.runtime.connect({ name: 'hp' });
    port.onMessage.addListener(msg => {
        if (msg.type === 'TABS') {
            window.dispatchEvent(new CustomEvent('hp_tabs_update', { detail: msg.tabs }));
        }
    });
})();

// ==UserScript==
// @name         Instagram Rate Manager
// @version      2.0
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

(() => {
    const MAX_HOURLY = 180;
    const QUEUE_KEY = 'ig_rate_queue';
    const STATE_KEY = 'ig_rate_state';

    window.InstagramRateManager = {
        // Generate unique tab ID
        getTabId: () => {
            let id = sessionStorage.getItem('tm_tab_id');
            if (!id) {
                id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                sessionStorage.setItem('tm_tab_id', id);
            }
            return id;
        },

        // Join the global queue
        joinQueue: async () => {
            const tabId = InstagramRateManager.getTabId();
            let queue = GM_getValue(QUEUE_KEY, []);
            
            if (!queue.includes(tabId)) {
                queue.push(tabId);
                await GM_setValue(QUEUE_KEY, queue);
            }

            return new Promise((resolve) => {
                const listener = GM_addValueChangeListener(QUEUE_KEY, (key, oldVal, newVal) => {
                    if (newVal[0] === tabId) {
                        GM_removeValueChangeListener(listener);
                        resolve();
                    }
                });
            });
        },

        // Leave the queue
        leaveQueue: () => {
            const tabId = InstagramRateManager.getTabId();
            let queue = GM_getValue(QUEUE_KEY, []);
            queue = queue.filter(id => id !== tabId);
            GM_setValue(QUEUE_KEY, queue);
        },

        // Check rate limits (updated)
        checkLimit: () => {
            const now = Date.now();
            const state = GM_getValue(STATE_KEY, { requests: [], queue: [] });
            
            // Cleanup old requests
            state.requests = state.requests.filter(ts => now - ts < 3600000);
            
            if (state.requests.length >= MAX_HOURLY) {
                const oldest = state.requests[0];
                const cooldown = 3600000 - (now - oldest);
                return { allowed: false, wait: cooldown };
            }
            
            return { allowed: true };
        },

        // Record request
        recordRequest: () => {
            const state = GM_getValue(STATE_KEY, { requests: [], queue: [] });
            state.requests.push(Date.now());
            GM_setValue(STATE_KEY, state);
        }
    };
})();

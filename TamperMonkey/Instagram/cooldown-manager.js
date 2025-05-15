// ==UserScript==
// @name         Instagram Rate Manager
// @version      1.0
// @description  Centralized rate limiter for Instagram actions with cross-tab coordination
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// ==/UserScript==

(() => {
    const MAX_HOURLY = 180;
    const QUEUE_KEY = 'ig_rate_queue';
    const STATE_KEY = 'ig_rate_state';

    // Polyfill for Firefox compatibility
    if (typeof GM_removeValueChangeListener === 'undefined' && typeof GM_unregisterValueChangeListener !== 'undefined') {
        window.GM_removeValueChangeListener = GM_unregisterValueChangeListener;
    }

    window.InstagramRateManager = {
        getTabId: () => {
            let id = sessionStorage.getItem('tm_tab_id');
            if (!id) {
                id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                sessionStorage.setItem('tm_tab_id', id);
            }
            return id;
        },

        joinQueue: async function() {
            const tabId = this.getTabId();
            let queue = GM_getValue(QUEUE_KEY, []);
            
            if (!queue.includes(tabId)) {
                queue.push(tabId);
                await GM_setValue(QUEUE_KEY, queue);
            }

            return new Promise((resolve) => {
                const listener = GM_addValueChangeListener(QUEUE_KEY, (key, oldVal, newVal) => {
                    if (newVal[0] === tabId) {
                        if (GM_removeValueChangeListener) {
                            GM_removeValueChangeListener(listener);
                        }
                        resolve();
                    }
                });
            });
        },

        leaveQueue: function() {
            const tabId = this.getTabId();
            let queue = GM_getValue(QUEUE_KEY, []);
            queue = queue.filter(id => id !== tabId);
            GM_setValue(QUEUE_KEY, queue);
        },

        checkLimit: function() {
            const now = Date.now();
            const state = GM_getValue(STATE_KEY, { requests: [] });
            
            const recent = state.requests.filter(ts => now - ts < 3600000);
            
            if (recent.length >= MAX_HOURLY) {
                const oldest = recent[0];
                const cooldown = 3600000 - (now - oldest);
                return { allowed: false, wait: cooldown };
            }
            
            return { allowed: true };
        },

        recordRequest: function() {
            const state = GM_getValue(STATE_KEY, { requests: [] });
            state.requests.push(Date.now());
            GM_setValue(STATE_KEY, state);
        },

        getQueueStatus: function() {
            const state = GM_getValue(STATE_KEY, { requests: [] });
            const recent = state.requests.filter(ts => Date.now() - ts < 3600000);
            return {
                used: recent.length,
                remaining: MAX_HOURLY - recent.length,
                reset: recent[0] ? 3600000 - (Date.now() - recent[0]) : 0
            };
        }
    };
})();

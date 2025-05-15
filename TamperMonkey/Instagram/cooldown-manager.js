// ==UserScript==
// @name         Instagram Rate Manager
// @author       Pacmanninja
// @version      1.0
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// ==/UserScript==

(() => {
    const MAX_HOURLY = 180;
    const QUEUE_KEY = 'ig_rate_queue';
    const STATE_KEY = 'ig_rate_state';

    // Firefox compatibility polyfill
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

        joinQueue: function() {
            const tabId = this.getTabId();
            return new Promise((resolve) => {
                const updateQueue = () => {
                    let queue = GM_getValue(QUEUE_KEY, []);
                    if (!queue.includes(tabId)) {
                        queue.push(tabId);
                        GM_setValue(QUEUE_KEY, queue);
                    }
                    
                    if (queue[0] === tabId) {
                        GM_removeValueChangeListener(listener);
                        resolve();
                    }
                };

                const listener = GM_addValueChangeListener(QUEUE_KEY, updateQueue);
                updateQueue(); // Initial check
            });
        },

        leaveQueue: function() {
            const tabId = this.getTabId();
            GM_setValue(QUEUE_KEY, GM_getValue(QUEUE_KEY, []).filter(id => id !== tabId));
        },

        checkLimit: function() {
            const state = GM_getValue(STATE_KEY, { requests: [] });
            const now = Date.now();
            const recent = state.requests.filter(ts => now - ts < 3600000);
            
            return recent.length >= MAX_HOURLY ? {
                allowed: false,
                wait: 3600000 - (now - recent[0])
            } : { allowed: true };
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

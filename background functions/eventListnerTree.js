export async function resolveNode(tabId, nodeId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.resolveNode', { nodeId }, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.object) {
                resolve(result.object);
            } else {
                reject(new Error('Failed to resolve node to object.'));
            }
        });
    });
}


async function getFullEventListeners(tabId, objectId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.getEventListeners', { objectId:objectId, depth:-1 ,pierce:true}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.listeners) {
                resolve(result.listeners);
            } else {
                reject(new Error('Failed to retrieve event listeners.'));
            }
        });
    });
}

export async function getEventListeners(tabId, objectId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOMDebugger.getEventListeners', { objectId:objectId}, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (result && result.listeners) {
                resolve(result.listeners);
            } else {
                reject(new Error('Failed to retrieve event listeners.'));
            }
        });
    });
}
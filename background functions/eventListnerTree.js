import {doubleCheckNodeId} from "./common.js"

export async function resolveNode(tabId, nodeId, backendNodeId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand({ tabId }, 'DOM.resolveNode', { nodeId }, async (result) => {
            if (chrome.runtime.lastError) {
                const message = chrome.runtime.lastError.message;
                if (message.includes("No node with given id found")) { 
                    const tryAgain = await doubleCheckNodeId(tabId, backendNodeId);
                    // console.log("doublecheck tryAgain",tryAgain);
                    // nodeId 0 is weird i think its bests to check again why it would be 0
                    if (tryAgain.nodeId !== nodeId && tryAgain.nodeId > 0) {
                        const jsRuntimeObj = await resolveNode(tabId, tryAgain.nodeId, backendNodeId);
                        resolve({jsRuntimeObj:jsRuntimeObj, change:tryAgain.nodeId});
                    } else {
                        reject(new Error(message));
                    }
                } else {
                    reject(new Error(message));
                }
                return;
            }

            if (result && result.object) {
                resolve({jsRuntimeObj:result.object});
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
                console.log("getEventListeners chrome.runtime.lastError.message",chrome.runtime.lastError.message)
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
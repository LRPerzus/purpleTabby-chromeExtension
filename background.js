// Imported Functions
// import {getFrameTree,processFrameTrees,settingAttributeNode} from "./background functions/frameTreesFuncs.js"
// import {collectDOMNodes} from "./background functions/domTreeFunc.js"
// import {setAttributeValue,areScansFinished} from "./background functions/common.js"
import {storeDataForTab,getFromLocal} from "./background functions/localStorageFunc.js"

// Set Variables
let firstClick = {};
let scanButtonON = {};
let settings = {};
let scanningQueueDictionary = {};
let arialLabelsFramesDict = {};
let globalScreenshotsFramesDict;

// --- Event Listeners from the injecte scripts to here
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.type === "PlUGIN_CLICKED") {
        const tabId = request.tabId;
        try {
           // give the settings to change
             // Set the settingStatus
            if (!settings[tabId])
            {
                settings[tabId] = 
                {
                    highlight:false,
                    debuggerAttach:false ,
                    A11yFix:false,
                }
            }
            chrome.runtime.sendMessage({ type: "SAVED_SETTINGS", settings: settings[tabId] })
        
            const scriptChecks = [
                { name: "content.js", message: "CHECK_CONTENT_JS", status: "CONTENT_READY" },
                { name: "a11yTreeListeners.js", message: "CHECK_A11Y_TREE_LISTENERS_JS", status: "A11Y_LISTENERS_READY" },
                { name: "overlayListeners.js", message: "CHECK_OVERLAY_LISTENERS_JS", status: "OVERLAY_LISTENERS_READY" },
                { name:"attachMutationObserver.js",message:"CHECK_MUTATIONOBSERVER_JS",status:"MUTATIONOBSERVER_READY"},
                { name:"screenshotElement.js",message:"CHECK_SCREENSHOTELEMENT_JS",status:"SCREENSHOTELEMENT_READY"}
            ];
        
            const missingScripts = [];
        
            for (const check of scriptChecks) {
                try {
                    console.log("check.status:", check.status);
                    await sendMessageAndWait(tabId, check.message, check.status);
                    console.log(`${check.name} is already injected.`);
                } catch {
                    console.log(`${check.name} is not injected.`);
                    missingScripts.push(check.name);
                }
            }
        
            if (missingScripts.length > 0) {
                console.log("Missing scripts:", missingScripts.join(", "));
                await injectMissingScripts(tabId, missingScripts);
            } else {
                console.log("All scripts are loaded and ready.");
            }

            // Now that all scripts are ready, send the "OVERLAY_CREATED" message
            chrome.runtime.sendMessage({ type: "PLUGIN_READY", tabId: tabId }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error("Failed to send 'PLUGIN_READY' message:", chrome.runtime.lastError.message);
                } else {
                    console.log("'PLUGIN_READY' message sent successfully.");
                }
            });
        
        } catch (error) {
            console.error("Error waiting for scripts:", error);
        }
    }
    else if (request.type === "HIGHLIGHT_MISSING")
    {
        console.log("HIGHLIGHT_MISSING Received",request.tabId);
        // To change the status
        if (settings[request.tabId] && request.status)
        {
            settings[request.tabId].highlight = request.status;
            console.log("HIGHLIGHT_MISSING Changed status",request.status);
        }
        const missingXpath = await getFromLocal(request.tabId,"missingXpath",false,request.siteUrl);
        let data;
        if (missingXpath !== undefined)
        {
            data = missingXpath;
        }
        else{
            data = "undefined"
        }
        console.log("HIGHLIGHT_MISSING missingXpath",missingXpath)

        // Status is true
        if (settings[request.tabId].highlight)
        {
            chrome.tabs.sendMessage(request.tabId, { type: "HIGHLIGHT", data:data.framesDict });
        }
        else
        {
            // TODO add a remove highlights
        }

        // sendinng response
        console.log("sending Response");
        sendResponse({status:settings[request.tabId].highlight});
        return true;
        
    }
    else if (request.type === "OVERLAY_CREATED") 
    {
        console.log("Overlay created, preparing to request AX tree and clickableElements.");
        const tabId = request.tabId;
        const siteUrl = request.siteUrl;
        console.log("OVERLAY_CREATED tabId",tabId)
        const missingXpaths = await getFromLocal(tabId,"missingXpath",false,siteUrl);        ;
        console.log("OVERLAY_CREATED missingXpaths",missingXpaths);

        if (missingXpaths !== undefined || (!scanButtonON[tabId] && scanButtonON[tabId] !== true))
        {
            chrome.runtime.sendMessage({type: "UPDATE_OVERLAY",data:missingXpaths,settings:settings[request.tabId],tabId:request.tabId});
        }
        else
        {
            chrome.runtime.sendMessage({ type: "SCANNING_INNIT", tabId:tabId});        
        }
        // Return true to indicate the response will be sent asynchronously
        return true;
    }
    else if (request.type === "SCANING_START")
    {
        console.log("SCANING_START",request.from);
        if (request.debugger)
        {
            console.log(request.debugger);
        }

       
        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            let tabId = tabs[0]?.id || request.tabId;

            if (tabId)
            {
                // Set the settingStatus
                if (!settings[tabId])
                {
                    settings[tabId] = 
                    {
                        highlight:false,
                        debuggerAttach:false ,
                        A11yFix:false,
                    }
                }
                console.log("scanningQueueDictionary[tabId]",scanningQueueDictionary[tabId]);
                console.log("SHOULD IT SCAN",scanningQueueDictionary[tabId] && (scanningQueueDictionary[tabId].currentScanning === true || scanningQueueDictionary[tabId].currentFixing === true))

                if (!(scanButtonON[tabId] && scanButtonON[tabId] === true))
                {
                    console.log("Debugger not attached");
                    sendResponse({ success: false, error: "Debugger not Attached" });
                }
                else if (scanningQueueDictionary[tabId] !== undefined
                    && (scanningQueueDictionary[tabId].currentScanning === true || scanningQueueDictionary[tabId].currentFixing === true)
                )
                {
                    console.log("There is already a scan going into process.");
                    // Update it to do another snapshot cause there were chnages previously
                    scanningQueueDictionary[tabId].redo = true;
                    console.log("UPDATED scanningQueueDictionary[tabId].redo",scanningQueueDictionary[tabId].redo);
                    sendResponse({ success: false, error: "Scan already in progress" });
                }
                else { // All is good so can scan
        
                    chrome.action.setIcon({path: 'assets/scanning-extension-icon.png'})
                    // set a dict of it is scanning
                    scanningQueueDictionary[tabId] = {
                        currentScanning:true,
                        currentFixing:false,
                        currentHiliging:false,
                        redo:false
                    };

                    console.log("A SCAN STARTED",scanningQueueDictionary[tabId].currentScanning);

                    // Attaches the number of clicks
                    await updateNoClicksTabID(tabId,true);
                    if (request.tabId)
                    {
                        if (request.tabId === tabId)
                        {
                            tabId = request.tabId;
                            console.log("Sending Can get messages to tabId:", tabId);
                            chrome.tabs.sendMessage(tabId, { type: "FIND_MISSING", tabId: tabId });
                            sendResponse({ success: true });
                        }
                        else
                        {
                            console.log(`The active tab has moved (tabId Query ${tabId} | request.tabId ${request.tabId})`);
                            sendResponse({ success: false });
                        }
                    }
                    else
                    {
                        chrome.tabs.sendMessage(tabId, { type: "FIND_MISSING", tabId: tabId });
                        sendResponse({ success: true });
                    }
                }
            }
            else
            {
                console.log("undable to get active tab");
                sendResponse({ success: false, error: "Unable to get the active tab." });

            }
        });

        // Return true to indicate the response will be sent asynchronously
        return true;
    }
    else if(request.type === "DEBUGGER_ATTACH")
    {
        const tabId = request.tabId;
        if (settings[request.tabId])
        {
            settings[tabId].debuggerAttach = request.status;
        }
        if (!scanButtonON[tabId])
        {
            console.log("DEBUGGER_ATTACH");
            scanButtonON[tabId] = true;
        }
    }
    else if(request.type === "DEBUGGER_DETTACH")
    {
        const tabId = request.tabId;
        if (settings[request.tabId])
        {
            settings[tabId].debuggerAttach = request.status;
        }
        console.log("Dettaching");
        delete scanButtonON[tabId];
    }
    else if (request.type === "MISSING_FOUND")
    {
        chrome.action.setIcon(
            {path:'assets/default-extension-icon.png'}
        )

        // At this point the scan has finished
        const tabId = request.data.tabId;

        // SET in the setting that the scan has been complete
        scanningQueueDictionary[tabId].currentScanning = false;
        console.log("THE SCAN DID FINISH");
        
        console.log("TESING request.data.missing;",request.data.missing);

        // previous errors data
        const previousMissingXpath = await getFromLocal(tabId,"missingXpath",false,request.siteurl);
        let mergedFramesDict;
        let newInMissingList;
        let mergedMissingList = request.data.missing;
        
        if (previousMissingXpath)
        {
            console.log("THERE WAS PRIVUOUS DATA");
            mergedMissingList = previousMissingXpath.missing;
            // console.log("Previous data",previousMissingXpath.framesDict);
            // console.log("New data",request.data.framesDict);
            // cause each is its own dict kinda
            ({mergedFramesDict, newInMissingList} = mergeDictionaries(request.data.framesDict, previousMissingXpath.framesDict, mergedMissingList));
            // console.log("THE NEW STUFF mergedFramesDict",mergedFramesDict);
            // console.log("THE NEW STUFF previousMissingList",previousMissingList);
            mergedMissingList.push(newInMissingList);

            //reset it
            newInMissingList = null;
        }
        else 
        {
            mergedFramesDict = request.data.framesDict
        }
        
        let mergedMissingXpaaths = {
            framesDict:mergedFramesDict,
            missing : mergedMissingList,
            tabId : tabId
        };
        console.log("mergedMissingXpaaths",mergedMissingXpaaths);

        // STORE MISSINGXAPATHS
        storeDataForTab(request.data.tabId,mergedMissingXpaaths,"missingXpath",false,request.siteurl).then( () => {
            // Delete the data
            mergedFramesDict = null;
            mergedMissingList = null;
            chrome.tabs.sendMessage(tabId,{ type: "CLEAR_GLOBAL_VARIABLE_a11yTreeListeners"});
        });
      
        

        // console.log("MISSING_FOUND scanningQueueDictionary[tabId].redo ",scanningQueueDictionary[tabId].redo );
        // Updates the scanningQueueDictionary
        if (scanningQueueDictionary[tabId] && scanningQueueDictionary[tabId].redo !== true)
        {
            // Remove
            // delete scanningQueueDictionary[tabId]

            // Continue with end of scanning process
            try {
                chrome.runtime.sendMessage({ type: "POPUP_STATUS" }, async (response) => {
                    if (chrome.runtime.lastError) {
                        if ( chrome.runtime.lastError.message.includes("Receiving end does not exist."))
                        {
                            console.log("POPUP IS NOT OPEN");
                            const setting = settings[tabId];
                            console.log("setting", setting);


                            let data;
                            if (mergedMissingXpaaths!== undefined)
                            {
                                data = mergedMissingXpaaths;
                                mergedMissingXpaaths = {}

                            }
                            else{
                                data = "undefined"
                            }

                            if (setting.A11yFix) // This one will continue with highlight later there is another highlight check
                            {
                                console.log("A11YFIXES_Start");
                                // Update scanningQueueDictionary to tell it to not do a scan once it starts this
                                scanningQueueDictionary[tabId] = {
                                    currentScanning:false,
                                    currentFixing:true,
                                    currentHiligting:false,
                                    redo:false
                                };

                                chrome.tabs.sendMessage(tabId,{ type: "A11YFIXES_Start", missingXpaths:data.framesDict , tabId:tabId}).then(() => {
                                    data = {};
                                });;
                            }
                            else if (setting.highlight) // Just highlight
                            {
                                console.log("MISSING_FOUND HIGHLIGHT")
                                chrome.tabs.sendMessage(tabId,{ type: "HIGHLIGHT", data:data.framesDict});
                            }
                            else
                            {
                                // TODO REMOVE BOTH
                                console.log("NONE");
                            }
                        }
                        return; // Exit the callback if there's an error
                    }
            
                    if (response && response.success) {
                        console.log("Popup status response received:", response);
                        console.log("Stored in missingXpath:", mergedMissingXpaaths);
                        // Send the data to the content script or popup
                        chrome.runtime.sendMessage({
                            type: "UPDATE_OVERLAY",
                            data: mergedMissingXpaaths,
                            settings:settings[tabId],
                            tabId:tabId
                        });

                        let data;
                        if (mergedMissingXpaaths!== undefined)
                        {
                            data = mergedMissingXpaaths;
                            mergedMissingXpaaths = {}
                        }
                        else{
                            data = "undefined"
                        }

                        if (settings[tabId].A11yFix) // This one will continue with highlight later there is another highlight check
                        {
                            chrome.tabs.sendMessage(tabId,{ type: "A11YFIXES_Start", missingXpaths:data.framesDict, tabId:tabId}).then(() => {
                                data = {};
                            });
                        }
                        else if (settings[tabId].highlight) // Just highlight
                        {
                            console.log("MISSING_FOUND HIGHLIGHT")
                            console.log("data",data);
                            chrome.tabs.sendMessage(tabId,{ type: "HIGHLIGHT", data:data.framesDict});
                        }
                        else
                        {
                            // TODO REMOVE BOTH
                            console.log("NONE");
                        }
                    } else {
                        console.log("No response or unsuccessful status.");
                    }
                });
            } catch (e) {
                console.error("Caught error:", e.message);
            }        
        }
        else  if(scanningQueueDictionary[tabId] && scanningQueueDictionary[tabId].redo !== undefined && scanningQueueDictionary[tabId].redo === true)
        {
            console.log("There was a another request of scanning during a scan");
            scanningQueueDictionary[tabId].redo = false;
            chrome.tabs.sendMessage(tabId, { type: "START_RESCANNING" , tabId:tabId});
        }
    }
    else if (request.type === "A11YFIXES_INNIT")
    {
        const tabId = request.tabId;
        const missingXpaths = await getFromLocal(tabId,"missingXpath",false,request.siteurl);
        if (settings[request.tabId].A11yFix)
        {
            chrome.tabs.sendMessage(tabId,{ type: "A11YFIXES_Start", missingXpaths:missingXpaths.framesDict,tabId:tabId});
        }
        else
        {
            // TODO add a remove A11yFixes
        }

        if (settings[request.tabId] && request.status)
        {
            settings[request.tabId].A11yFix = request.status;
        }
        console.log("A11YFIXES_INNIT missingXpaths:",missingXpaths);
    }
    else if (request.type === "ERROR_REFRESHNEED")
    {
        console.log("ERROR_REFRESHNEED");
        const tabId = sender.tab.id;
        firstClick[tabId] = "ERROR";
    }
    else if(request.type === "COPY_ALL")
    {
        try {
            const tabId = request.tabId;
            console.log("Handling COPY_ALL for tabId:", tabId);
            const missingXpaths = await getFromLocal(tabId, "missingXpath");
            console.log("Missing XPaths retrieved:", missingXpaths.framesDict);
            sendResponse({ success: true, data: missingXpaths.framesDict});
        } catch (error) {
            console.error("Error fetching data:", error);
            sendResponse({ success: false, error: error.message });
        }
        // Indicates that the response is asynchronous
        return true;
    }
    else if (request.type === "GET_TAB_ID")
    {
        if (sender.tab && sender.tab.id) {
            sendResponse({ tabId: sender.tab.id });
        } else {
            sendResponse({ tabId: null });
        }
    }
    else if (request.type === "TEST_CONNECTION")
    {
        sendResponse({status: "connected"});
    }
    else if (request.type === "GET_API_ARIALABELS") {
        console.log("GET_API_ARIALABELS", request.screenshotsFrameDict);
        globalScreenshotsFramesDict = request.screenshotsFrameDict;
        
        //Rest the arialabelFrameDict
        arialLabelsFramesDict = {};

        for (const framekey of Object.keys(globalScreenshotsFramesDict)) {
            console.log("framekey", framekey);

            // Reset it
            arialLabelsFramesDict[framekey] = {};


            let successB64 = globalScreenshotsFramesDict[framekey].success;
            let errorB64 = globalScreenshotsFramesDict[framekey].error;
            const payload = {
                content: successB64
            };
            
    
            console.log("payload", payload);
            console.log("errorB64", errorB64);

            // For error
            Object.keys(errorB64).forEach(xpathKey => {
                arialLabelsFramesDict[framekey][xpathKey] = "clickable element";
            })

    
            // Create a fetch promise and push it to the array
            fetch('https://api.read-dev.pic.net.sg/process_a11y', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })
            .then(response => response.json())
            .then(result => {
                console.log('Success:', result);
                const formattedResponse = {};
                const ocr = result.ocr || {};
                const type = result.type || {};
    
                Object.keys(ocr).forEach(key => {
                    const ocrValue = ocr[key] || '';
                    const typeValue = type[key] || '';
    
                    if (typeValue && ocrValue) {
                        formattedResponse[key] = `${typeValue} ${ocrValue}`;
                    } else if (typeValue && !ocrValue) {
                        formattedResponse[key] = typeValue;
                    } else if (!typeValue && ocrValue) {
                        formattedResponse[key] = ocrValue;
                    } else {
                        formattedResponse[key] = '';
                    }
                });
    
                console.log('Formatted Response:', formattedResponse);
                arialLabelsFramesDict[framekey] = {
                    ...arialLabelsFramesDict[framekey],  // Merge with the previous updates
                    ...formattedResponse                 // Overwrite or add new keys from formattedResponse
                };
                console.log("arialLabelsFramesDict", arialLabelsFramesDict);
                console.log("DONE WITH API CALL");

                // Remove sucess from exsisting
                successB64 = null;
                errorB64 = null;

                chrome.tabs.sendMessage(request.tabId, { type: "SET_ARIA_LABELS", missingXpaths: arialLabelsFramesDict, tabId:request.tabId });


            })
            .catch(error => {
                console.error('Error:', error);
                // If there's an error, we can add the error details to the arialLabelsFramesDict
                arialLabelsFramesDict[framekey] = { error: 'Fetch error occurred' };
            });
    
        }
    }
    else if (request.type === "CLEAR_arialLabelsFramesDict")
    {
        // clear ariaLabel
        arialLabelsFramesDict = {}; 
        sendResponse({ cleared: true });  // Acknowledge the message
    }
    else if (request.type === "A11Y_FIXES_COMPLETE")
    {
        console.log("A11Y_FIXES_COMPLETE",request.tabId);
        if (request.tabId)
        {
            console.log("scanningQueueDictionary[request.tabId]",scanningQueueDictionary[request.tabId]);
            // scanningQueueDictionary[request.tabId].currentFixing = false;
        }
        sendResponse({ success: true });
    }
    
    
    return true; // Indicate that you will send a response asynchronously
});

// -- Functions

//function store and increase the number no of scans
async function updateNoClicksTabID(tabId, change = false) {
    const keyClicks = `tab_${tabId}_noClicks`;

    try {
        // Check if the key exists and get its current value
        const result = await chrome.storage.session.get(keyClicks);
        console.log("updateNoClicksTabID result:", result);

        if (result[keyClicks]) {
            // Key exists
            let currentCount = result[keyClicks];

            if (change) {
                currentCount += 1;
                // Store the updated value back in session storage
                await chrome.storage.session.set({ [keyClicks]: currentCount });
                console.log(`Updated noClicks`);
            } else {
                console.log(`${keyClicks} exists: ${currentCount}`);
            }
        } else {
            // Key does not exist
            // Initialize and set the key with value 1
            await chrome.storage.session.set({ [keyClicks]: 1 });
            console.log(`Initialized noClicks: 1`);
        }
    } catch (error) {
        console.error('Error updating noClicks:', error);
    }
}

// Function to send a message and wait for a specific response
function sendMessageAndWait(tabId, messageType, expectedStatus) {
    return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, { type: messageType }, (response) => {
            // console.log("sendMessageAndWait",response.status);
            if (chrome.runtime.lastError) {
                reject(new Error(`Failed to send message to tab ${tabId}: ${chrome.runtime.lastError.message}`));
            } else if (response && response.status === expectedStatus) {
                resolve();
            } else {
                reject(new Error(`Unexpected response status. Expected: ${expectedStatus}, but got: ${response ? response.status : 'no response'}`));
            }
        });

        setTimeout(() => {
            reject(new Error(`Timeout waiting for ${expectedStatus} from tab ${tabId}`));
        }, 5000); // Adjust timeout as needed
    });
}

// Function to dynamically inject missing scripts
function injectMissingScripts(tabId, missingScripts) {
    return Promise.all(missingScripts.map(scriptName => {
        return new Promise((resolve, reject) => {
            chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ["./injectScripts/"+scriptName]
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(`Failed to inject script ${scriptName} into tab ${tabId}: ${chrome.runtime.lastError.message}`));
                } else {
                    console.log(`Injected ${scriptName} successfully.`);
                    resolve();
                }
            });
        });
    }));
}

function mergeDictionaries(newestSCANINFODICT, previousSCANINFODICT, mergedMissingList = []) {
    console.log("AT THE START OF mergeDictionaries", mergedMissingList);

    // Create a new array to avoid modifying the same reference
    const updatedMissingList = [...mergedMissingList]; // Copy the existing array

    // Initialize mergedFramesDict as an empty object if newestSCANINFODICT is empty
    const mergedFramesDict = newestSCANINFODICT ? { ...newestSCANINFODICT } : {};

    // Iterate over each key in previousSCANINFODICT
    for (let key in previousSCANINFODICT) {
        if (mergedFramesDict[key]) {
            // If key exists in both newest and previous, merge the arrays
            const mergedArray = [...mergedFramesDict[key]]; // Copy existing array from newest

            // Keep track of existing xpaths and codes that are already in mergedArray
            const existingEntries = new Set(mergedArray.map(item => `${item.xpath}-${item.code}`));

            // Iterate over items in previousSCANINFODICT for the same key
            previousSCANINFODICT[key].forEach(previousItem => {
                const entryIdentifier = `${previousItem.xpath}-${previousItem.code}`;
                if (!existingEntries.has(entryIdentifier)) {
                    // Only add items whose xpath and code combination is not already in mergedArray
                    mergedArray.push(previousItem); // Add the previousItem
                    updatedMissingList.push(previousItem); // Also add it to the missing list
                    console.log(`Added missing xpath: ${previousItem.xpath} and code from previous scan info`);
                }
            });

            // Update the mergedFramesDict with the merged array for this key
            mergedFramesDict[key] = mergedArray;
        } else {
            // If the key doesn't exist in the newest, copy it from previous and add all items to missing list
            mergedFramesDict[key] = [...previousSCANINFODICT[key]];
            previousSCANINFODICT[key].forEach(previousItem => {
                updatedMissingList.push(previousItem);
                console.log(`Added new key and missing xpath: ${previousItem.xpath} and code`);
            });
        }
    }
    
    console.log("AT THE END OF mergeDictionaries", updatedMissingList);

    return { mergedFramesDict, mergedMissingList: updatedMissingList }; // Return both mergedFramesDict and updated missing list
}


let isWebAccessOn = false;
let isProcessing = false;
var numWebResults = 1;
var timePeriod = "";
var region = "";
var textarea; // 대화를 위해 입력된 텍스트 저장
var listHistory = []    //  저장된 dialog 목록

chrome.storage.sync.get(["num_web_results", "web_access", "region"], (data) => {
    numWebResults = data.num_web_results;
    isWebAccessOn = data.web_access;
    listHistory = JSON.parse(localStorage.getItem("chatgpt_history_list")); 

    region = data.region || "wt-wt";
});


function showErrorMessage(e) {
    console.info("WebChatGPT error --> API error: ", e);
    var errorDiv = document.createElement("div");
    errorDiv.classList.add("web-chatgpt-error", "absolute", "bottom-0", "right-1", "dark:text-white", "bg-red-500", "p-4", "rounded-lg", "mb-4", "mr-4", "text-sm");
    errorDiv.innerHTML = "<b>An error occurred</b><br>" + e + "<br><br>Check the console for more details.";
    document.body.appendChild(errorDiv);
    setTimeout(() => { errorDiv.remove(); }, 5000);
}

function pasteWebResultsToTextArea(results, query) {
    let counter = 1;
    let formattedResults = "Web search results:\n\n";
    formattedResults = formattedResults + results.reduce((acc, result) => acc += `[${counter++}] "${result.body}"\nSource: ${result.href}\n\n`, "");

    formattedResults = formattedResults + `\nCurrent date: ${new Date().toLocaleDateString()}`;
    formattedResults = formattedResults + `\nInstructions: Using the provided web search results, write a comprehensive reply to the given prompt. Make sure to cite results using [[number](URL)] notation after the reference. If the provided search results refer to multiple subjects with the same name, write separate answers for each subject.\nPrompt: ${query}`;

    textarea.value = formattedResults;
}

function pressEnter() {
    textarea.focus();
    const enterEvent = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Enter',
        code: 'Enter'
    });
    textarea.dispatchEvent(enterEvent);
}

function onSubmit(event) {
    if (event.shiftKey && event.key === 'Enter') {
        return;
    }

    if ((event.type === "click" || event.key === 'Enter') && isWebAccessOn && !isProcessing) {

        isProcessing = true;

        try {
            let query = textarea.value;
            textarea.value = "";

            query = query.trim();

            if (query === "") {
                isProcessing = false;
                return;
            }

            pressEnter();
            isProcessing = false;
            // api_search(query, numWebResults, timePeriod, region)
            //   .then(results => {
            //     pasteWebResultsToTextArea(results, query);
            //     pressEnter();
            //     isProcessing = false;
            //   });
        } catch (error) {
            isProcessing = false;
            showErrorMessage(error);
        }
    }
}

function updateTitleAndDescription() {
    const h1_title = document.evaluate("//h1[text()='ChatGPT']", document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
    if (!h1_title) {
        return;
    }

    h1_title.textContent = "WebChatGPT Ex";

    const div = document.createElement("div");
    div.classList.add("w-full", "bg-gray-50", "dark:bg-white/5", "p-6", "rounded-md", "mb-10", "border");
    div.textContent = "With WebChatGPTEx you can augment your prompts with relevant web search results for better and up-to-date answers.";
    h1_title.parentNode.insertBefore(div, h1_title.nextSibling);
}


async function fetchHtmlAsText(url){
    const response = await fetch(url);
    return await response.text();
}

async function updateUI() {
    if (document.querySelector(".web-chatgpt-toolbar")) {
        return;    //  이미 세팅되어 있다면 exit
    }

    textarea = document.querySelector("textarea");
    if (!textarea) {    //  입력 컴포넌트가 로딩 되었는지 확인
        return;
    }

    //  textarea 가 있는 상위 객체를 확인
    var textareaWrapper = textarea.parentNode;
    //  최종 입력 버튼 객체 확인
    var btnSubmit = textareaWrapper.querySelector("button");
    //  key down 이벤트 hook
    textarea.addEventListener("keydown", onSubmit);
    //  최종 입력 버튼 클릭 이벤트 hook
    btnSubmit.addEventListener("click", onSubmit);
    //  UI추가를 위한 div 추가, style 설정
    var toolbarDiv = document.createElement("div");
    toolbarDiv.classList.add("web-chatgpt-toolbar", "justify-center");
    toolbarDiv.style.padding = "0em 0.5em";

    //  add save/load button
    var ctrlDiv = document.createElement("div");
    ctrlDiv.innerHTML = 
    '<div id="load_dialog" class="hidden load_dialog flex"></div> \
    <div class="inline-flex button-center-inline">\
    <button id="save_button" class="btn flex gap-2 btn-neutral border-0 md:border">Save</button> \
    <button id="load_button" class="btn flex gap-2 mx-2 btn-neutral border-0 md:border">Load</button>\
    <button id="share_button" class="btn flex gap-2 mx-2 btn-neutral border-0 md:border">Share</button>\
    </div>';

    var load_dlg = ctrlDiv.querySelector("#load_dialog");
    load_dlg.innerHTML = await ( await fetch("pages/load_dialog.html")).text();
    
    // load button 
    var loadBtn = ctrlDiv.querySelector("#load_button");
    loadBtn.addEventListener("click", () => {
        //  combobox for selecting one from listHistory
        load_dlg.classList.remove("hidden");

        //  이거 안되네. chrome.dialogs 가 undefined 라고 함.
        // var dlg_options = {
        //     type: 'prompt',
        //     title: 'select a title to load',
        //     default: listHistory[0],
        //     choices: listHistory
        // };
        // chrome.dialogs.create(dlg_options, (res) => {
        //     if(res != null){
        //         var selected = res.response;
        //         console.log("selected : ", selected);
        //     }
        // })
        // if(dialog){
        //     console.log("show!!", dialog)
        // }else{
        //     console.log("no dialog")
        // }
    });    

    // save button 
    var saveBtn = ctrlDiv.querySelector("#save_button");
    saveBtn.addEventListener("click", () => {
        let all = document.querySelectorAll(".whitespace-pre-wrap")
        let texts = []
        for(let div of all){
            texts.push(div.innerText);
        }
        if(texts.length < 2){
            alert("저장할 정보가 없습니다.")
            return;
        }

        var title = window.prompt("please enter title : ");
        if(title){
            //  get history list from localstorage
            console.log("check list ", listHistory)
            //  존재하는 이름이 있을 경우 덮어 씌울 것인지 확인
            //  no를 선택하면 저장을 취소한다.

            if(listHistory && listHistory.includes(title)){
                var response = window.confirm('Duplicate name exists. Do you want to overwrite?')
                if(!response)
                    return;
            }else{
                if(listHistory){
                    listHistory.push(title)
                }else{
                    listHistory = [title]
                }
                localStorage.setItem("chatgpt_history_list", JSON.stringify(listHistory));
            }
            //  save in localstorage
            localStorage.setItem(title, {"timestamp": new Date().toLocaleString(), "dialog" : JSON.stringify(texts)});
        }
    });
    toolbarDiv.appendChild(ctrlDiv);

    textareaWrapper.parentNode.insertBefore(toolbarDiv, textareaWrapper.nextSibling);

    toolbarDiv.parentNode.classList.remove("flex");
    toolbarDiv.parentNode.classList.add("flex-col");


    var bottomDiv = document.querySelector("div[class*='absolute bottom-0']");

    var footerDiv = document.createElement("div");

    // var extension_version = chrome.runtime.getManifest().version;
    // footerDiv.innerHTML = "<a href='https://github.com/qunash/chatgpt-advanced' target='_blank' class='underline'>WebChatGPT extension v." + extension_version + "</a>. If you like the extension, please consider <a href='https://www.buymeacoffee.com/anzorq' target='_blank' class='underline'>supporting me</a>.";

    var lastElement = bottomDiv.lastElementChild;
    lastElement.appendChild(footerDiv);
}

const rootEl = document.querySelector('div[id="__next"]');

window.onload = () => {
   
    updateTitleAndDescription();
    updateUI();

    new MutationObserver(() => {
        try {
            updateTitleAndDescription();
            updateUI();
        } catch (e) {
            console.info("WebChatGPT error --> Could not update UI:\n", e.stack);
        }
    }).observe(rootEl, { childList: true });
};

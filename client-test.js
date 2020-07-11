document.addEventListener("DOMContentLoaded", () => {
    let accs, ACC_LIMIT;
    let j = 0; // count how many accounts have been processed
    const pic_url_mod = 7 // "_normal".length;

    let pages = [], currPage = 0;

    let user, user_pic;

    let signinBtn = document.getElementById("login-btn");
    let input = document.getElementById("input");
    let loading = document.getElementById("loading");
    let retrieveBtn = document.getElementById("retrieve");
    let results_area = document.getElementById("results");
    
    let auth_window;

    /**
     *
     * EVENT HANDLERS
     * *********************
     *
     */

    signinBtn.addEventListener("click", () => {
        sendHttpGetReq("/get_req_token")
        .then(res => {
            let req_token = res;
            // console.log(req_token);

            let url = new URL("https://api.twitter.com/oauth/authenticate");
            url.searchParams.set("oauth_token", req_token.oauth_token);

            let params = "menubar=no,toolbar=no,width=600,height=600";
            auth_window = window.open(url, "test", params);
        });
    });

    retrieveBtn.addEventListener("click", () => {
        pages = [];
        let page = document.createElement("div");
        j = 0;

        loading.style.display = "";
        retrieveBtn.style.display = "none";

        results_area.innerHTML = ""; // clearing 'results' section
        document.getElementById("flip-page").style.display = "";

        for (let i = 0; i < ACC_LIMIT; i++) {
            // for (let i = 29; i >= 0; i--) {
            sendHttpGetReq(`/get_vids?acc_name=${accs[i].screen_name}&id=${i}`)
            .then(res => {
                j++;
                // console.log(res);
                outputResults(res, page);
    
                if (page.childElementCount == 16) {
                    pages.push(page);
                    page = document.createElement("div");
                    if (pages.length == 1) results_area.appendChild(pages[0]);
                }
    
                if (j == ACC_LIMIT) {
                    setTimeout(() => {
                        loading.style.display = "none";
                        retrieveBtn.style.display = "";
    
                        if (page.childElementCount % 16 != 0) {
                            console.log(pages);
                            pages.push(page);
                            if (pages.length == 1) results_area.appendChild(pages[0]);
                        }
                    }, 500);
                }
            });
        }
    });

    document.getElementById("left").addEventListener("click", () => {
        currPage = (currPage == 0) ? pages.length - 1 : currPage - 1;
        let df = document.createDocumentFragment();
        df.appendChild(pages[currPage]);
        results_area.innerHTML = "";
        results_area.appendChild(df);
    });

    document.getElementById("right").addEventListener("click", () => {
        currPage = (currPage == pages.length - 1) ? 0 : currPage + 1;
        let df = document.createDocumentFragment();
        df.appendChild(pages[currPage]);
        results_area.innerHTML = "";
        results_area.appendChild(df);
    });
    
    /**
     *
     * WEBSITE STATE FLOW
     * *********************
     * 
     */
    
    sendHttpGetReq("/verify")
    .then(res => {
        if (Object.keys(res).length != 0) { // verified
            return res;
        } else { // not verified
            signinBtn.style.display = "";
            return Promise.reject("Not signed in");
        }
    })
    .then(res => signedIn(res))
    .catch((err) => {
        console.log(err);
        
        waitForLogin()
        .then(res => sendHttpGetReq("/verify"))
        .then(res => signedIn(res))
        .catch(console.error);
    });
    
    /**
     * 
     * HELPER FUNCTIONS
     * *********************
     */

    /**
     * Promise resolves once user has authorized access
     */
    function waitForLogin() {
        return new Promise(res => {
            let checkCookie = setInterval(() => {
                console.log("checking if cookies exist");
    
                if (auth_window && getCookies().length == 2) {
                    console.log("cookies found");
                    auth_window.close();
                    clearInterval(checkCookie);
                    res();
                }
            }, 1000);
        });
    }

    /**
     * What to do once user has signed in
     * 
     * @param {Object} user 
     */
    function signedIn(user) {
        // console.log("signed in");

        showSignedInStatus(user)
        .then(res => getAccs())
        .catch(console.error);
    }


    /**
     * Display 'signed in' indicator with user's profile pic 
     * 
     * @param {Object} user 
     */
    function showSignedInStatus(user) {
        signinBtn.style.display = "none";
        
        user_pic = document.getElementById("user-pic");
        user_pic.setAttribute("src", user.profile_image_url_https);
        user_pic.style.display = "";
        
        document.getElementById("signed-in").style.display = "";
        document.getElementById("signed-in").style.paddingRight = "16px";
        input.style.display = "";
        
        return Promise.resolve();
    }
    
    /**
     * Acquire list of friend 'user' objects
     */
    function getAccs() {
        // console.log("getting accs");

        sendHttpGetReq("/get_accs")
        .then(res => {
            // let results = res;
            accs = res.accs;
            
            if (accs.length > 0) {
                // accs = results.accs;
                accs.forEach(acc => {
                    let box = document.createElement("div");
                    box.className = "result";
                    
                    let acc_header = document.createElement("div");
                    acc_header.className = "acc_header";
                    
                    let accInfo = document.createElement("h2");
                    accInfo.textContent = `${acc.name} (@${acc.screen_name})`;
                    
                    let prof_pic = document.createElement("img");
                    let pic_url = acc.profile_image_url_https;
                    let format;
                    if (pic_url[pic_url.length - 4] == ".") {
                        format = pic_url.substring(pic_url.length - 4);
                    } else {
                        format = pic_url.substring(pic_url.length - 5);
                    }
                    pic_url = pic_url.substring(0, pic_url.length - pic_url_mod - format.length) + "_bigger" + format;
                    prof_pic.setAttribute("src", pic_url);
                    
                    // let space = document.createElement("div");
                    // space.className = "space";
                    let toggle_btn = document.createElement("div");
                    toggle_btn.className = "collapse";
                    toggle_btn.addEventListener("click", () => {
                        let vids = box.children[2];
                        dropped_down = (vids.style.display == "");
                        
                        vids.style.display = (dropped_down) ? "none" : "";
                    });
                    
                    // acc_header.appendChild(space);
                    acc_header.appendChild(prof_pic);
                    acc_header.appendChild(accInfo);
                    acc_header.appendChild(toggle_btn);
                    
                    box.appendChild(acc_header);
                    box.appendChild(document.createElement("br"));
                    
                    acc.box = box;
                });
                // results_area.appendChild(df);
                console.log(`done processing, ${accs.length} accs found`);
                
                loading.style.display = "none";
                retrieveBtn.style.display = "";
                
                ACC_LIMIT = accs.length;
                // ACC_LIMIT = 50;
            } else {
                loading.style.display = "none";
                document.getElementById("no-accs").style.display = "";
            }
        });
    }
    
    /**
     * Send GET request to server and return JSON reponse
     * 
     * @param {String} url 
     */
    function sendHttpGetReq(url) {
        return fetch(url, { credentials: "include" })
        .then(res => res.json());
    }

    /**
     * Append child 'video' elements to account's result 'div' element
     * 
     * @param {Object} data 
     * @param {HTMLElement} df 
     */
    let outputResults = (data, df) => {
        let acc = accs[data.id];
        // let acc = accs[j];
        if (data.vids && data.vids.length > 0) {
            let box = acc.box;
            if (box.childElementCount > 2) box.removeChild(box.lastElementChild); // popping old vids

            let vids = document.createElement("div");
            let vid_box;
            for (let i in data.vids) {
                vid_box = document.createElement("video");
                vid_box.setAttribute("src", data.vids[i].vid);
                vid_box.setAttribute("width", 200);
                vid_box.setAttribute("height", 200);
                vid_box.setAttribute("controls", true);
                vid_box.setAttribute("poster", data.vids[i].thumbnail);
                vid_box.setAttribute("preload", "none");

                vids.appendChild(vid_box);
            }
            vids.style.display = "none";
            box.appendChild(vids);

            df.appendChild(box);
            df.appendChild(document.createElement("br"));
        }
    }

    /**
     * Return array of site's cookies
     */
    function getCookies() {
        let cks = document.cookie;
        if (cks == "") return [];
        
        let vals = cks.split(/=|; /);
        return [vals[1], vals[3]];
    }

    // function removeListener(element, listener) {
    
    // }
    
    // function toggleEleme(element) {
        
    // }
});

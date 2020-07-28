document.addEventListener("DOMContentLoaded", () => {
    const pic_url_mod = 7 // "_normal".length;
    
    let pages = [], currPage = 0;
    
    let user, user_pic;
    
    let signinBtn = document.getElementById("login-btn");
    let input = document.getElementById("input");
    let loading = document.getElementById("loading");
    let retrieveBtn = document.getElementById("retrieve");
    
    let results_area = document.getElementById("results");
    let accs, ACC_LIMIT;
    
    let timeline_results = document.getElementById("timeline-results");
    let timeline_tweets;
    
    let auth_window;

    let isTimeline = true;
    const tabToggleStyle = "color: #638897;background-color: #ffffc9;border-style: solid;padding: 12px; cursor: auto;";

    let timelineTab = document.getElementById("tab-timeline");
    timelineTab.addEventListener("click", () => {
        console.log("timeline tab clicked");
        
        if (!isTimeline) {
            timelineTab.style.cssText = tabToggleStyle;
            accsTab.style.cssText = "";
            document.getElementById("accs").style.display = "none";
            document.getElementById("timeline").style.display = "";
        }
        
        isTimeline = true;
    });
    
    let accsTab = document.getElementById("tab-accs");
    accsTab.addEventListener("click", () => {
        console.log("accs tab clicked");
        
        if (isTimeline) {
            accsTab.style.cssText = tabToggleStyle;
            timelineTab.style.cssText = "";
            document.getElementById("timeline").style.display = "none";
            document.getElementById("accs").style.display = "";
        }
        
        isTimeline = false;
    });
    
    // Array.from(tabs).forEach(tab => {
    //     tab.addEventListener("click", () => {
    //         if (isTimelineTab && tab.id == "tab_accs") {
    //             tab.style.cssText = "";
    //             document.getE
    //         } else if (!isTimelineTab && tab.id == "tab_timeline") {

    //         }
    //     });
    // })

    let apiURL = "https://1poxidle5i.execute-api.us-west-2.amazonaws.com/production";


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
                // console.log(url);

                let params = "menubar=no,toolbar=no,width=600,height=600";
                auth_window = window.open(url, "test", params);
            });
    });

    retrieveBtn.addEventListener("click", () => {
        pages = [];
        let page = document.createElement("div");
        let j = 0; // count how many accounts have been processed

        loading.style.display = "";
        retrieveBtn.style.display = "none";

        results_area.innerHTML = ""; // clearing 'results' section
        document.getElementById("flip-page").style.display = "";

        for (let i = 0; i < ACC_LIMIT; i++) {
            // for (let i = 29; i >= 0; i--) {
            sendHttpGetReq(`/get_vids?acc_name=${accs[i].screen_name}&id=${i}`)
                .then(res => {
                    // console.log(res);
                    outputResults(res, page);
                    j++;
                    console.log(j, res.id);

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
                                // console.log(pages);
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
        // console.log(res, typeof res);
        if (Object.keys(res).length != 0) { // verified
            return res;
        } else { // not verified
            signinBtn.style.display = "";
            return Promise.reject("Not signed in");
        }
    })
    .then(res => signedIn(res))
    .catch(err => {
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
            let checkCookie = setInterval(async () => {
                // console.log("checking if cookies exist");

                sendHttpGetReq("/is_logged_in")
                .then(response => {
                    // console.log("cookie check:", response);
                    if (response.signedIn) {
                        // console.log("cookies found");
                        auth_window.close();
                        clearInterval(checkCookie);
                        res();
                    }
                });
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
        document.getElementById("tabs").style.display = "";
        document.getElementById("accs").style.display = "none";
        
        showSignedInStatus(user)
        .then(res => {
            getAccs();
            getTimeline();
        })
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
        user_pic.setAttribute("src", getLargerProfPic(user.profile_image_url_https));
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
                        let pic_url = getLargerProfPic(acc.profile_image_url_https);
                        prof_pic.setAttribute("src", pic_url);

                        // let space = document.createElement("div");
                        // space.className = "space";
                        let toggle_btn = document.createElement("div");
                        toggle_btn.className = "collapse manipulator";
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

                    // ACC_LIMIT = accs.length;
                    ACC_LIMIT = Math.min(accs.length, 200);
                    // ACC_LIMIT = Math.min(accs.length, 50);
                } else {
                    loading.style.display = "none";
                    document.getElementById("no-accs").style.display = "";
                }
            });
    }

    function getTimeline() {
        sendHttpGetReq("/get_timeline")
        .then(res => {
            // console.log("timeline acquired");

            timeline_tweets = res.vids;
            let data = getVids(timeline_tweets);
            let df = document.createDocumentFragment();

            for (let tweet in data) {
                let user = timeline_tweets[tweet].user;

                let box = document.createElement("div");
                box.className = "result";

                let acc_header = document.createElement("div");
                acc_header.className = "acc_header";

                let accInfo = document.createElement("h2");
                accInfo.textContent = `${user.name} (@${user.screen_name})`;

                let prof_pic = document.createElement("img");
                let pic_url = getLargerProfPic(user.profile_image_url_https);
                prof_pic.setAttribute("src", pic_url);

                let toggle_btn = document.createElement("div");
                toggle_btn.className = "collapse manipulator";
                toggle_btn.addEventListener("click", () => {
                    let vid = box.children[2];
                    let dropped_down = (vid.style.display == "");

                    vid.style.display = (dropped_down) ? "none" : "";
                });

                acc_header.appendChild(prof_pic);
                acc_header.appendChild(accInfo);
                acc_header.appendChild(toggle_btn);

                let vid_obj = data.vids[i];
                let vid_box = document.createElement("video");
                vid_box.setAttribute("src", vid_obj.vid);
                vid_box.setAttribute("width", 200);
                vid_box.setAttribute("height", 200);
                vid_box.setAttribute("controls", true);
                vid_box.setAttribute("poster", vid_obj.thumbnail);
                vid_box.setAttribute("preload", "none");
                vid_box.style.display = "none";

                box.appendChild(acc_header);
                box.appendChild(document.createElement("br"));
                box.appendChild(vid_box);

                df.appendChild(box);
            }

            timeline_results.innerHTML = "";
            timeline_results.appendChild(df);
        });
    }

    /**
     * Send GET request to server and return JSON reponse
     * 
     * @param {String} url 
     */
    async function sendHttpGetReq(endpoint) {
        let response = await fetch(apiURL + endpoint, { credentials: "include" });
        // console.log("response:", typeof(response))
        response = await response.json();
        // console.log(`\"${endpoint}\" response:`, response);
        return response;
    }

    /**
     * Append child 'video' elements to account's result 'div' element
     * 
     * @param {Object} data 
     * @param {HTMLElement} df 
     */
    let outputResults = (tweets, df) => {
        let acc = accs[tweets.id];
        let data = getVids(tweets.vids);

        if (data.vids.length > 0) {
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

    function getVids(results) {
        let output = { vids: [] };

        if (results.length > 0) { // if tweets were returned
            for (i in results) { // look at each tweet
                let entities = results[i].extended_entities
                let thumbnail = results[i].entities.media[0].media_url_https;
                let vid_obj = { thumbnail: thumbnail };

                let variants = entities.media[0].video_info.variants; // parse through video metadata
                let max_bitrate = -1
                let vid = variants[0];
                for (let k in variants) { // output highest quality video url
                    if (variants[k].content_type == "video/mp4" &&
                        variants[k].bitrate > max_bitrate) {
                        vid = variants[k];
                        max_bitrate = variants[k].bitrate;
                    }
                } // for (j in varirify_credentials")
                vid_obj.vid = vid.url;
                output.vids.push(vid_obj);
            } // for (i in data)
        }

        // console.log(output, "\n");
        return output;
    }

    /**
     * Return array of site's cookies
     */
    // function getCookies() {
    //     let cks = document.cookie;
    //     if (cks == "") return [];

    //     let vals = cks.split(/=|; /);
    //     return [vals[1], vals[3]];
    // }

    function getLargerProfPic(url) {
        let format;
        if (url[url.length - 4] == ".") {
            format = url.substring(url.length - 4);
        } else {
            format = url.substring(url.length - 5);
        }
        url = url.substring(0, url.length - pic_url_mod - format.length) + "_bigger" + format;
        
        return url;
    }

    // function removeListener(element, listener) {

    // }

    // function toggleEleme(element) {

    // }
});

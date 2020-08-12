document.addEventListener("DOMContentLoaded", () => {
    /** DOM references */
    
    let signinBtn = document.getElementById("login-btn");
    let user_pic;
    
    let input = document.getElementById("input");
    let loadingAccs = document.getElementById("loading-accs");
    let acc_results = document.getElementById("results");
    let retrieveBtn = document.getElementById("retrieve");
    
    let loadingTimeline = document.getElementById("loading-timeline");
    let timeline_results = document.getElementById("timeline-results");
    
    let accPages = [], currAccPage = 0;
    let timelinePages = [], currTimelinePage = 0;

    /* ***************** */

    const pic_url_mod = 7 // "_normal".length;
    
    let auth_window;
    
    let accs;
    let ACC_LIMIT;

    let timeline_tweets;

    let isTimeline = true;
    const tabToggleStyle = "color: #638897; background-color: #ffffc9; padding: 12px; border-style: solid; cursor: auto;";

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
        accPages = [];
        let page = document.createElement("div");
        let j = 0; // count how many accounts have been processed

        loadingAccs.style.display = "";
        retrieveBtn.style.display = "none";

        acc_results.innerHTML = ""; // clearing 'results' section
        document.getElementById("flip-page").style.display = "";

        for (let i = 0; i < ACC_LIMIT; i++) {
            sendHttpGetReq(`/get_vids?acc_name=${accs[i].screen_name}&id=${i}`)
            .then(res => {
                outputAccVids(res, page);
                j++;
                // console.log(j, res.id);

                if (page.childElementCount == 14) {
                    page.removeChild(page.lastChild);
                    
                    accPages.push(page);
                    page = document.createElement("div");
                    if (accPages.length == 1) acc_results.appendChild(accPages[0]);
                }

                if (j == ACC_LIMIT) {
                    setTimeout(() => {
                        loadingAccs.style.display = "none";
                        retrieveBtn.style.display = "";

                        if (page.childElementCount % 14 != 0) {
                            accPages.push(page);
                            if (accPages.length == 1) acc_results.appendChild(accPages[0]);
                        }
                    }, 500);
                }
            });
        }
    });

    document.getElementById("left").addEventListener("click", () => {
        currAccPage = (currAccPage == 0) ? accPages.length - 1 : currAccPage - 1;
        let df = document.createDocumentFragment();
        df.appendChild(accPages[currAccPage]);
        acc_results.innerHTML = "";
        acc_results.appendChild(df);
    });

    document.getElementById("right").addEventListener("click", () => {
        currAccPage = (currAccPage == accPages.length - 1) ? 0 : currAccPage + 1;
        let df = document.createDocumentFragment();
        df.appendChild(accPages[currAccPage]);
        acc_results.innerHTML = "";
        acc_results.appendChild(df);
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
        // document.getElementById("accs").style.display = "none";
        document.getElementById("timeline").style.display = "";
        
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
            accs = res;

            if (accs.length > 0) {
                accs.forEach(acc => {
                    let box = document.createElement("div");
                    box.className = "result";
                    let acc_header = getAccHeader(acc, box);

                    box.appendChild(acc_header);
                    box.appendChild(document.createElement("br"));

                    acc.box = box;
                });
                console.log(`done processing, ${accs.length} accs found`);

                loadingAccs.style.display = "none";
                retrieveBtn.style.display = "";

                // ACC_LIMIT = accs.length;
                ACC_LIMIT = Math.min(accs.length, 200);
                // ACC_LIMIT = Math.min(accs.length, 50);
            } else {
                loadingAccs.style.display = "none";
                document.getElementById("no-accs").style.display = "";
            }
        });
    }

    function getTimeline() {
        sendHttpGetReq("/get_timeline")
        .then(res => {
            timeline_tweets = res;
            let data = getVids(timeline_tweets);
            let df = document.createDocumentFragment();

            for (let tweet in data) {
                let user = timeline_tweets[tweet].user;

                let box = document.createElement("div");
                box.className = "result";
                let acc_header = getAccHeader(user, box);
                let vid_box = getVideoElem(data[tweet]);
                vid_box.style.display = "none";

                box.appendChild(acc_header);
                box.appendChild(document.createElement("br"));
                box.appendChild(vid_box);

                df.appendChild(box);
                df.appendChild(document.createElement("br"));
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
        response = await response.json();
        return response;
    }

    /**
     * Append child 'video' elements to account's result 'div' element
     * 
     * @param {Object} data 
     * @param {HTMLElement} df 
     */
    function outputAccVids(tweets, df) {
        let acc = accs[tweets.id];
        let data = getVids(tweets.vids);

        if (data.length > 0) {
            let box = acc.box;
            if (box.childElementCount > 2) box.removeChild(box.lastElementChild); // popping old vids

            let vids = document.createElement("div");
            
            data.forEach(vid => vids.appendChild( getVideoElem(vid) ));
            
            vids.style.display = "none";
            box.appendChild(vids);
            
            df.appendChild(box);
            df.appendChild(doJavacument.createElement("br"));
        }
    }

    function getVids(tweets) {
        let vids = [];

        if (tweets.length > 0) { // if tweets were returned
            tweets.forEach(tweet => {
                let entities = tweet.extended_entities;
                let thumbnail = tweet.entities.media[0].media_url_https;

                let variants = entities.media[0].video_info.variants; // parse through video metadata
                let max_bitrate = -1;
                let vid = variants[0];

                variants.forEach(variant => {
                    if (variant.content_type == "video/mp4" &&
                        variant.bitrate > max_bitrate) {
                        max_bitrate = variant.bitrate;
                        vid = variant;
                    }
                });

                vids.push({ vid: vid.url, thumbnail: thumbnail });
            });
        }

        return vids;
    }

    function getLargerProfPic(url) {
        let format;
        if (url[url.length - 4] == ".") format = url.substring(url.length - 4);
        else format = url.substring(url.length - 5);

        url = url.substring(0, url.length - pic_url_mod - format.length) + "_bigger" + format;
        return url;
    }

    function getAccHeader(userObj, resultBox) {
        let acc_header = document.createElement("div");
        acc_header.className = "acc_header";

        let accInfo = document.createElement("h2");
        accInfo.textContent = `${userObj.name} (@${userObj.screen_name})`;

        let prof_pic = document.createElement("img");
        let pic_url = getLargerProfPic(userObj.profile_image_url_https);
        prof_pic.setAttribute("src", pic_url);

        let toggle_btn = document.createElement("div");
        toggle_btn.className = "collapse manipulator";
        toggle_btn.addEventListener("click", () => {
            let vid = resultBox.children[2];
            let dropped_down = (vid.style.display == "");

            vid.style.display = (dropped_down) ? "none" : "";
        });

        acc_header.appendChild(prof_pic);
        acc_header.appendChild(accInfo);
        acc_header.appendChild(toggle_btn);
        return acc_header;
    }

    function getVideoElem(vidObj) {
        let vid_box = document.createElement("video");
        vid_box.setAttribute("src", vidObj.vid);
        vid_box.setAttribute("poster", vidObj.thumbnail);
        vid_box.setAttribute("preload", "none");
        vid_box.setAttribute("width", 200);
        vid_box.setAttribute("height", 200);
        vid_box.setAttribute("controls", true);
        return vid_box;
    }
});

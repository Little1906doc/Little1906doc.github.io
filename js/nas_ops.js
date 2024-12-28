var activeFunction;


window.BASE_NAS_URL = 'https://login.truthwifi.com/';
window.nas_check_url = BASE_NAS_URL + 'nas_check.html';
window.nas_login_url = BASE_NAS_URL + 'login';
window.nas_status_url = BASE_NAS_URL + 'status';
window.scheduled_logout = null


var op_state={
    is_logged_in:false,
    attempts:0,
    recursion_wait:0,
    recursion_render_wait:0,
    current_step:0,
    voucher_details:{},
    session_data:{
        in:0,
        out:0,
        time:0,
    },
    steps_configuration:[
        {
            //Step 1 check nas
            max_depth:5,
            auto_loop:true,
            max_attempts:10,
            increment_ms:1000,
            state:0,
            messages:{
                progress:{
                    message:" Connecting to the Network.",
                    operation:'please wait',
                    onclick:'javascript:;'
                },
                error:{
                    message:"Device Not connected to the Network.",
                    operation:'Re-Connect',
                    onclick:'restartStep()'
                }
            }
        },
        {
            //Step 2 check voucher
            max_depth:3,
            auto_loop:true,
            max_attempts:12,
            increment_ms:1000,
            state:0,
            messages:{
                progress:{
                    message:"Checking for a valid internet Package.",
                    operation:'please wait',
                    onclick:'javascript:;'
                },
                error:{
                    message:"No valid internet package found, click purchase now.",
                    operation:'Retry now',
                    onclick:'restartStep()'
                }
            }
        },
        {
            //Step 3 nas Login
            max_depth:2,
            auto_loop:false,
            max_attempts:10,
            increment_ms:1000,
            state:0,
            messages:{
                progress:{
                    message:" Login into the network.",
                    operation:'please wait',
                    onclick:'javascript:;'
                },
                error:{
                    message:"Login failed.",
                    operation:'retry',
                    onclick:'restartStep()'
                }
            }
        },
        {
            //Step 4 update nas status
            max_depth:1,
            auto_loop:true,
            max_attempts:-1, //Forever
            increment_ms:0,
            state:0
        }
    ]
}


function getCurrentHtml(){
    var op_template = "<div class='net-state glass-bg'>\n" +
        " <div class='net-state-icon auto-center'>\n" +
        "   <img src='img/loader.gif' alt=''>\n" +
        " </div>\n" +
        " <div class='net-state-desc auto-center'>\n" +
        "   <p>" + "$message" + "</p>\n" +
        " </div>\n" +
        " <button class='net-btn net-bg auto-center' onclick='" + "$onclick" + "'>" + "$operation" + "</button>\n" +
        "</div>";
 
    var usage_template = "<div class='net-state glass-bg status'> \n" +
        "         <div class='indicator'> \n" +
        "           <div class='label net-bg'> \n" +
        "             You are online! current session: \n" +
        "           </div> \n" +
        "           <div class='line net-bg'></div> \n" +
        "           <div class='dot net-bg'> \n" +
        "           </div> \n" +
        "         </div> \n" +
        "         <div class='counters'> \n" +
        "           <div class='counter'> \n" +
        "               <span class='count'    id='t_in'>" + "$t_in" + "</span> \n" +
        "             <span class='label'>sent</span> \n" +
        "           </div> \n" +
        "           <div class='divider'></div> \n" +
        "           <div class='counter'> \n" +
        "               <span class='count'    id='t_in'>" + "$t_out" + "</span> \n" +
        "             <span class='label'>received</span> \n" +
        "           </div> \n" +
        "           <div class='divider'></div> \n" +
        "           <div class='counter'> \n" +
        "               <span class='count'    id='t_in'>" + "$t_used" + "</span> \n" +
        "             <span class='label'>session time</span> \n" +
        "           </div> \n" +
        "       </div>\n" +
        "</div>";
 
    var current_step = op_state.steps_configuration[op_state.current_step];
    var sec_ext = " Retrying in " + (op_state.recursion_wait/1000) + "s";
    try {
        switch (op_state.current_step) {
            case 3:
                return usage_template.replace('$t_in', op_state.session_data.in).replace('$t_out', op_state.session_data.out).replace('$t_used', op_state.session_data.time);
            default:
                var template_vars = current_step.state === 0 ? current_step.messages.progress : current_step.messages.error;
                return op_template.replace("$message", template_vars.message + ((current_step.state === 1) ? sec_ext : ''))
                                .replace("$operation", template_vars.operation)
                                .replace("$onclick", template_vars.onclick);
        }
    } catch (e) {
        return "-";
    }
 }
 

function renderCurrentOperation(){
    try{
        document.getElementById("current_operation").innerHTML=getCurrentHtml()
    }catch (e){}
    setTimeout(renderCurrentOperation,op_state.recursion_render_wait)

}



function initNasOps(){
    resetForNextSteps();
    initRecursiveRender()
    queNextRecursion()
}


function restartStep(){
    console.log("Restarting the steps")
    clearTimeout(activeFunction)
    op_state.recursion_wait=0;
    op_state.attempts=0;
    queNextRecursion()
}

function resetForNextSteps(){
    op_state.current_step=0;
    op_state.attempts=0;
    op_state.recursion_wait=0;
}


function queNextRecursion(){

    // stop proceed if max attempts or reset steps if auto loop
    let step_config=op_state.steps_configuration[op_state.current_step];
    if(op_state.attempts>=step_config.max_attempts-1 && step_config.max_attempts!==-1){
        if(step_config.auto_loop ){
            restartStep()
        }
        return
    }

    switch (op_state.current_step){
        case 0:
            activeFunction = setTimeout(nasCheck,op_state.recursion_wait)
            break;
        case 1:
            activeFunction = setTimeout(voucherCheck,op_state.recursion_wait)
            break;
        case 2:
            activeFunction = setTimeout(nasLogin,op_state.recursion_wait)
            break;
        case 3:
            op_state.recursion_wait=1200
            activeFunction = setTimeout(statusCheck,op_state.recursion_wait)
            break;
    }

    op_state.attempts+=1
    op_state.recursion_wait+=op_state.steps_configuration[op_state.current_step].increment_ms
    console.log(op_state)
}


function queNextStep(){
    var next_step = op_state.current_step + 1;
    resetForNextSteps();
    op_state.current_step = next_step;
    console.log("Queueing next for step #" + next_step);
    queNextRecursion();
 }

 function initRecursiveRender(){
    renderCurrentOperation()
    op_state.recursion_render_wait=1500
    setTimeout(renderCurrentOperation,op_state.recursion_render_wait)
}

// Function to extract the value of a specific query parameter
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&"); // Escape special characters
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function nasCheck() {
    $.ajax({
        type: 'GET',
        url: window.nas_check_url,
        crossDomain: true,
        dataType: 'json',
        success: function(res) {
            var nas_address_segments = res.status.split(":");
            console.log("The nas IP resolved to " + nas_address_segments[0]);
            // updateClientWifiNasIp(nas_address_segments[0]);
            op_state.steps_configuration[0].state = 0;
            queNextStep();
        },
        error: function(res) {
            op_state.steps_configuration[0].state = 1;
            queNextRecursion();

            // Replace above lines with the ones below to enable auto login
            // op_state.steps_configuration[0].state = 0;
            // queNextStep();
        }
    });
}


function voucherCheck() {
    if (!window.is_authenticated) {
        queNextRecursion();
        return;
    }
 
    var customer = getCookie("customer");

    $.ajax({
        type: 'GET',
        url: window.BASE_URL+"vouchers/" + customer + "/get_active_vouchers/",
        headers: {
            'Authorization': "Bearer " + getCookie('access_token')
        },
        data: { customer: window.customer },
        dataType: 'json',
        success: function (res) {
            console.log(res)
            if (res.length > 0) {
                var voucher = res[0];
                op_state.voucher_details = voucher;
                console.log(res);
                queNextStep();
                op_state.steps_configuration[1].state = 0;
            } else {
                op_state.steps_configuration[1].state = 1;
                console.log(res);
                queNextRecursion();
            }
        },
        error: function (err) {
            if (err.responseText) {
                console.log(err.responseText);
            } else {
                console.log(err);
            }
            op_state.steps_configuration[1].state = 1;
            queNextRecursion();
        }
    });
}

function containsSubstring(string, substring) {
    // Check if both parameters are strings
    if (typeof string !== 'string' || typeof substring !== 'string') {
      return false;
    }
  
    // Use the indexOf method to check if the substring exists in the string
    return string.indexOf(substring) !== -1;
  }



function nasLogin(){

    var url = window.nas_login_url+"?username=" + encodeURIComponent(op_state.voucher_details.rad_username) + "&password=" + encodeURIComponent(op_state.voucher_details.rad_password);

    // ajax cross domainget the url
    $.ajax({
        type: 'GET',
        url: url,
        crossDomain: true,
        success: function(res) {
           console.log(res)
           // get response text
           var r_text = res;
           // if text contains 'Internet hotspot - Redirect' or 'You are logged in' use ES5 compatible code
           if (containsSubstring(r_text,('Internet hotspot - Redirect')) || containsSubstring(r_text,('You are logged in'))) {
                queNextStep();
           } else {
                console.log("In error state. Error reported")
                op_state.steps_configuration[2].state = 1;
                op_state.steps_configuration[op_state.current_step].messages.error.message = "Waiting to log in with active voucher!";
                queNextRecursion();
           }

        },
        error: function(res) {
            console.log("In error state. Error reported")
            op_state.steps_configuration[2].state = 1;
            op_state.steps_configuration[op_state.current_step].messages.error.message = "Waiting to log in with active voucher!";
            queNextRecursion();
        }
    })




    // var httpRequest;

    // // Create a new XMLHttpRequest object
    // if (window.XMLHttpRequest) {
        
    //     httpRequest = new XMLHttpRequest(); // For modern browsers
    //     httpRequest.withCredentials = true;

    // } else if (window.ActiveXObject) {
    //     httpRequest = new ActiveXObject("Microsoft.XMLHTTP"); // For IE5 and IE6
    // } else {
    //     alert("Your browser does not support XMLHttpRequest.");
    //     return;
    // }

    // // Define the URL of the request

    // // Set up the request
    // httpRequest.open("GET", url, true); // true for asynchronous

    // // Set the request header
    // httpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    // // Handle the response
    // httpRequest.onreadystatechange = function() {
    //     if (httpRequest.readyState === 4 && httpRequest.status === 200) {
    //         // The request has completed successfully
    //         // console.log(httpRequest.responseText);
    //         console.log("Final URL: " + httpRequest.responseURL);
    //         var error = getParameterByName("error", httpRequest.responseURL);
    //         if(error=="" || error==null || error==1){
    //             console.log("In success state. No error reported")
    //             queNextStep();
    //         }else{
    //             console.log("In error state. Error reported"+error)
    //             op_state.steps_configuration[2].state = 1;
    //             op_state.steps_configuration[op_state.current_step].messages.error.message = "Waiting to log in with active voucher!";
    //             queNextRecursion();
    //         }
            
    //     }
    // };

    // // Send the request
    // httpRequest.send();
}


function statusCheck() {
    $.ajax({
        type: 'GET',
        url: window.nas_status_url,
        dataType: 'json',
        success: function(response) {
            if (response.status === 302 || response.status === 0) {
                resetForNextSteps();
            }
            updateSession(response);
            queNextRecursion();
        },
        error: function(response) {
            queNextRecursion();
        }
    });
   }

function updateSession(data){
    switch (data.logged_in) {
        case "no":
            resetForNextSteps()
            queNextRecursion()
            break;
        case "yes":
            op_state.session_data.in = data.bytes_in_nice;
            op_state.session_data.out = data.bytes_out_nice;
            op_state.session_data.time = data.uptime;
            // if(!window.scheduled_logout){
            //     window.scheduled_logout = setTimeout(invalidateSession, 5000);
            // }
            break;
    }
}

  



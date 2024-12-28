

function getUrlParameter(name){
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}



function toggleButtonLoadState(button_id, is_loading) {
    var loaderSelector = button_id + " .loader";
    var defaultTextSelector = button_id + " .default_text";
 
    if(is_loading){
        $(loaderSelector).show();
        $(defaultTextSelector).hide();
    } else {
        $(loaderSelector).hide();
        $(defaultTextSelector).show();
    }
}

function processErrors(errors){
    console.log(errors);
    // foreach error in errors object as key and value
    for (var key in errors) {
      if (errors.hasOwnProperty(key)) {
        $('#' + key + '_error').text(errors[key][0]);
      }
    }
}


function clearAllErrors(){

    
    // in the document any field with id ending with error will be cleared
    var elementsWithErrorId = $('[id$="_error"]');
    for(var i = 0; i < elementsWithErrorId.length; i++){
        $(elementsWithErrorId[i]).text('');
    }

}

function getBgColor(position){
    var colors=['bg-purple-main','bg-accent-three','bg-accent-one','bg-accent-four','bg-green-bright','bg-accent-two']
    if(position<3){
        return colors[0]
    }else if(position<6){
        return colors[1]
    }
    else if(position<9){
        return colors[2]
    }
    return colors[Math.floor(Math.random()*colors.length)];
    
}

function removeDecimalPlaces(number) {
    return Math.floor(number);
}

function toInteger(number) {
    return number | 0;
}


function buyPlan(plan_id, plan_name, price){

    $('#purchase_cancel_option').text("No")
    $("#plan_buy_btn .default_text").text("Yes")
    document.getElementById("skip_checks_checkbox").checked = false;
    $("#purchase_modal_skip_checks").hide()

    var customer = getCookie('customer');
 
    if (!window.is_authenticated || !customer){
        window.location.href = 'pass_login.html';
        return;
    }
    
    console.log("plan id is " + plan_id + " and plan name is " + plan_name);
 
    window.selected_plan = plan_id;
 
    var phone_number = getCookie('phone_no');
    var balance = toInteger(getCookie('customer_balance'));
    var remaining_balance = price
    if(balance){
        remaining_balance = balance - price;
        if(remaining_balance < 0){
            remaining_balance = remaining_balance * -1
        }
    }

    console.log('remaining balance is ' + remaining_balance + ' and price is ' + price + ' and banance is ' + balance);
    

    var phone_request_string = "Purchasing plan..."
    if(balance < price){
        remaining_balance_no_decimal = removeDecimalPlaces(remaining_balance)
        phone_request_string = 'You will receive a Mpesa prompt requesting a payment of Ksh.' + remaining_balance_no_decimal + ' on the phone number ' + phone_number 
    }
 
    var html_template = 
        '<h6 class="text-purple-main font-weight-bold">Do you wish to Purchase ' + plan_name + '?</h6>' +
        '<div id="post_purchase_confirm">' +
            '<p id="post_purchase_text font-weight-bold">' +
                phone_request_string +
            '</p>' +
            '<div class="text-center">' +
                '<img class="icon-loader" src="img/loader.gif" alt="loading" />' +
            '</div>' +
        '</div>';
 
    $('#purchase_modal_body').html(html_template);
    $('#post_purchase_confirm').hide();
    
 
    $("#purchase_modal").modal('show');
 }

 function cancelPurchase(){
    // make get request to cancel_attempted_purchase
    var token = getCookie('access_token');
    var customer = getCookie('customer');


    $.ajax({
        type: "GET",
        url: window.BASE_URL + 'vouchers/'+customer+'/cancel_attempted_purchase/',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function (response) {
            // console.log(response);
            window.has_confirmed_purchase = false
        },
        error: function (response) {
            // console.log(response);
        }
    })
 }
 
 function checkMonitorOperation(){
    if(!window.active_operation){
        return;
    }
    var token = getCookie('access_token');

    $.ajax({
        type: "GET",
        url: window.BASE_URL + 'purchase-attempts/'+window.active_operation+'/',
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function (response) {
            console.log(response);
            if(response.is_used==true){
                window.location.href = 'home.html';
            } else {
                setTimeout("checkMonitorOperation()", 2000);
            }
        }
    })
 }


 function proceedBuy(){

    $('#purchase_cancel_option').text("Cancel")
    $("#plan_buy_btn .default_text").text("Waiting..")

    if(window.has_confirmed_purchase){
        window.location.href = 'home.html';
        return;
    }
 
    toggleButtonLoadState('#plan_buy_btn',true);
    var customer = getCookie('customer');
    var token = getCookie('access_token');
    var checked_state = $("#skip_checks_checkbox").prop("checked");
 
    var data = {
        billing_id: window.selected_plan,
        customer_profile: customer,
        skip_active_check:  checked_state
    }

    var nas_ip = getCookie("nas_ip");
    $.ajax({
        type: "POST",
        url: window.BASE_URL + 'vouchers/purchase/?nas_ip=' + nas_ip,
        data: data,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function (response) {
            toggleButtonLoadState('#plan_buy_btn',false);
            $("#purchase_modal_skip_checks").hide()
            
            window.active_operation = response.operation_id
            if(response.attp_used==true){
                window.location.href = 'home.html';
            }
            checkMonitorOperation();
            window.has_confirmed_purchase = true;
            $('#post_purchase_confirm').show();
            
        },
        error: function (response) {

            $('#purchase_cancel_option').text("No")
            $("#plan_buy_btn .default_text").text("Yes")

            toggleButtonLoadState('#plan_buy_btn',false);

            if(response.status==422){
                var errors = response.responseJSON.errors;
                if(errors.customer_profile && errors.customer_profile.active_voucher){
                    // console.log("We have active error")
                    $("#purchase_modal_skip_checks").show()

                }
            }

            // console.log(response);
        }
    })
 }


 function checkSkipChecks(checked){
    console.log("setting the state of skipping active voucher to " + checked);
    window.skip_active_voucher = checked
 }
 

function checkForActiveVoucher(){

    var customer = getCookie('customer');
    if (!window.is_authenticated || !customer){
        console.log("User is not authenticated hence no profile is set");
        return;
    }


    var token = getCookie('access_token');
    $.ajax({
        type: "GET",
        url:window.BASE_URL+"vouchers/"+customer+"/get_active_vouchers/",
        headers: {
            'Authorization': "Bearer "+token
        },
        success: function (response) {
            if(response.length > 0){
                window.location.href = 'home.html';
            }else{
                setTimeout("checkForActiveVoucher()", 2000);
            }
        },
        error: function (response) {
            console.log(response);
        }
    })
}


function getReadableFileSizeString(fileSizeInBytes){

    if (fileSizeInBytes === 0) {
        return '0 MBs';
    }

    var i = -1;
    var byteUnits = [' kB', ' MB', ' GB', ' TB', 'PB', 'EB', 'ZB', 'YB'];
    do {
      fileSizeInBytes /= 1024;
      i++;
    } while (fileSizeInBytes > 1024);

    return Math.max(fileSizeInBytes, 0.1).toFixed(1) + byteUnits[i];
  }


function timeUnits(ms) {
    if (!Number.isInteger(ms)) {
        return null;
    }
 
    function allocate(msUnit) {
        var units = Math.floor(ms / msUnit);
        ms -= units * msUnit;
        return units;
    }
 
    // Property order is important here.
    // These arguments are the respective units in ms.
    return {
        // weeks: allocate(604800000), // Uncomment for weeks
        d: allocate(86400000),
        h: allocate(3600000),
        min: allocate(60000),
        s: allocate(1000),
        ms: ms // remainder
    };
 }

    

function millisecondsToStr(milliseconds) {
    const time = timeUnits(milliseconds)
    const nonZero = function(key, value) {
        return value !== 0 ? value.toString().concat(' ', key) : null;
    }
    var result = [];
    for (var key in time) {
        if (time.hasOwnProperty(key)) {
            var str = nonZero(key, time[key]);
            if (str !== null) {
                result.push(str);
            }
        }
    }
    return result.join(', ');
 }

 function convertUTCtoLocal(utcDateString) {
    // Parse the UTC date string
    var utcDate = new Date(utcDateString);
    
    // Convert to local time
    var localDate = utcDate
    
    // Format the local date and time
    var formattedDate = localDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
    var formattedTime = localDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    var formattedDateTime = formattedDate + ' at ' + formattedTime;
    
    return formattedDateTime;
}


function renderPlan(currentPlan){

    $('#plan_name').text(currentPlan.billing_plan.display_name);
  
    if(currentPlan.total_packets_used){
        var p_used = getReadableFileSizeString(currentPlan.total_packets_used);
        $('#plan_data_used').text(p_used);
    }else{
        var p_used = getReadableFileSizeString(0);
        $('#plan_data_used').text(p_used);
    }
  
    try{
        if(currentPlan.total_time_used){
            var t_used = millisecondsToStr(currentPlan.total_time_used*1000);
            $('#plan_time_used').text(t_used);
        }else{

            $('#plan_time_used').text('0 Min');
        }
    }catch(e){
        console.log(e);
        $('#plan_time_used').text('~ Min');
    }


    var balance = 0;
    if(currentPlan.billing_plan.bill_by == "packet"){
        try{
        var rem=0
        if(currentPlan.total_packets_used){
            rem = currentPlan.total_plan_packets - currentPlan.total_packets_used;
        }else{
            rem = currentPlan.total_plan_packets;
        }
        balance = getReadableFileSizeString(rem);
        }catch(e){
            console.log(e);
        }
        
        
    }else{
        $('#plan_data_remain_label').text("Time Remaining");

        try{
            var rem=0;
            // if(currentPlan.total_time_used){
            //     rem = (currentPlan.billing_plan.valid_for*60*1000) - currentPlan.total_time_used;
            // }else{
            //     rem = (currentPlan.billing_plan.valid_for*60*1000);
            // }
            // get time difference from now to currentPlan.expiry
            var now = new Date();
            var expiry = new Date(currentPlan.expiry);
            var diff =  expiry.getTime()-now.getTime();

            balance = millisecondsToStr(diff);
        }catch(e){
            console.log(e);
        }
        
    }
    $('#plan_data_remain').text(balance);


  
    // add expiry date
    if(currentPlan.expiry){
        try{
            var localDateTime = convertUTCtoLocal(currentPlan.expiry);
            $('#plan_expiry').text(localDateTime);
        }catch(e){
            $('#plan_expiry').text(currentPlan.expiry);
        }
    }
  
    if(currentPlan.billing_plan.price){
        $('#plan_price').text('₦' + currentPlan.billing_plan.price);
    }
  
}

  
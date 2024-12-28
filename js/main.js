window.is_authenticated = false;
window.skip_active_voucher=false;
window.token = '';
//window.BASE_URL = 'https://tbs-api.comradeconnect.com/api/v1/';
 //window.BASE_URL = 'http://127.0.0.1:8000/';


jQuery('body').bind('click', function(e) {
    if(jQuery(e.target).closest('.navbar').length ==  0) {
        // click happened outside of .navbar, so hide
        var opened = jQuery('#navbarSupportedContent').hasClass('show');
        if (opened === true) {
            jQuery('#navbarSupportedContent').collapse('hide');
        }
    }
});

function getCookie(name) {
    var value = '; ' + document.cookie;
    var parts = value.split('; ' + name + '=');
    if (parts.length === 2) return parts.pop().split(';').shift();
}


function createToast(str){
    var toast_template = 
        '<div class="toast" data-autohide="false">' +
        '<div class="toast-header">' +
        '<strong class="mr-auto text-primary">Notification</strong>' +
        '<small class="text-muted">now</small>' +
        '<button onclick="$(\'.toast\').hide();" type="button" class="ml-2 mb-1 close" data-dismiss="toast">&times;</button>' +
        '</div>' +
        '<div class="toast-body">' +
        '<p class="mt-3 text-sm">' + str + '</p>' +
        '</div>' +
        '</div>';
 
    // remove toast if it already exists in body using JQuery
    $('.toast').remove();
    $('body').append(toast_template);
    setTimeout("$('.toast').hide()", 3000);
 }

 function addToCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

$(document).ready(function(){
    

    // resolve auth from token cookie, chek if it has expired
    var token = getCookie('access_token');
    if (token) {
        window.is_authenticated = true;
        window.token = token;
        $('.show_post_auth').css('display', 'block');
    }else{
        console.log('user is not authenticated')
    }

    $('#wrapper').css('display', 'block');
    
    // if window.post_auth_hook exist call it
    if(window.post_auth_hook){
        window.post_auth_hook();
    }
})
function invalidateSession(){
    addToCookie('access_token', '', -1);
    addToCookie('customer', '', -1);
    addToCookie('customer_balance', '', -1);
    addToCookie('phone_no', '', -1);
    window.is_authenticated = false;
    window.token = '';
    window.location.href = 'index.html';

}
function apiLogout(){

    var url = window.BASE_NAS_URL+'logout';

    $.ajax({
        type: "POST",
        url: url,
        headers: {
            'Authorization': 'Bearer ' + token
        },
        success: function (response) {
            invalidateSession()
        },
        error: function (response) {
            invalidateSession()
        }
    })
    addToCookie('access_token', '', -1);
    window.location.href = 'index.html';
}

function flashSuccess(element_id, message){
    $(element_id).html(message);
    $(element_id).show()
    setTimeout(function() {
        $(element_id).hide();
    }, 3000);
}



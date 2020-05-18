
var subDomain = settings.get('subdomain') || 'www';
var $subDomain = $('.ui.login #subdomain');

$('.ui.login #business').change(function () {
  if ($(this).is(":checked")) {
    $subDomain.show();
  } else {
    $subDomain.hide();
  }
});

checkLogin();

io.on('connect', function (socket) {

    $loginAuthenticator.removeClass('disabled');

    socket.on('disconnect', function () {
        $loginAuthenticator.addClass('disabled');
        $('.ui.authenticator.dimmer').removeClass('active');
        awaitingLogin = false;
    });

    $loginAuthenticator.click(function () {
        $('.ui.authenticator.dimmer').addClass('active');
        awaitingLogin = true;
        socket.emit('awaitingLogin');
    });

    socket.on('newLogin', function (data) {
        if (awaitingLogin) {
            settings.set('access_token', data.access_token);
            settings.set('subdomain', data.subdomain);
            checkLogin();
        }
    });
});

function loginWithUdemy() {
    if ($('.ui.login .form').find('input[name="business"]').is(":checked")) {
        if (!$subDomain.val()) {
            prompt.alert('Type Business Name');
            return;
        }
    }
    var parent = remote.getCurrentWindow();
    var dimensions = parent.getSize();
    var session = remote.session;
    let udemyLoginWindow = new BrowserWindow({
        width: dimensions[0] - 100,
        height: dimensions[1] - 100,
        parent,
        modal: true
    })

    session.defaultSession.webRequest.onBeforeSendHeaders({
        urls: ['*://*.udemy.com/*']
    }, function (request, callback) {
        if (request.requestHeaders.Authorization) {
            settings.set('access_token', request.requestHeaders.Authorization.split(' ')[1]);
            settings.set('subdomain', new URL(request.url).hostname.split('.')[0]);
            udemyLoginWindow.destroy();
            session.defaultSession.clearStorageData();
            session.defaultSession.webRequest.onBeforeSendHeaders({
                urls: ['*://*.udemy.com/*']
            }, function (request, callback) {
                callback({
                    requestHeaders: request.requestHeaders
                });
            });
            checkLogin();
        }
        callback({
            requestHeaders: request.requestHeaders
        })
    });
    if ($('.ui.login .form').find('input[name="business"]').is(":checked") && $subDomain.val()) {
        udemyLoginWindow.loadURL(`https://${$subDomain.val()}.udemy.com`);
    } else {
        udemyLoginWindow.loadURL('https://www.udemy.com/join/login-popup');
    }
}

function checkLogin() {
    if (settings.get('access_token')) {
        $('.ui.login.grid').slideUp('fast');
        $('.ui.dashboard').fadeIn('fast').css('display', 'flex');
        headers = {
            "Authorization": `Bearer ${settings.get('access_token')}`
        };
        $.ajax({
            type: 'GET',
            url: `https://${settings.get('subdomain')}.udemy.com/api-2.0/users/me/subscribed-courses`,
            beforeSend: function () {
                $(".ui.dashboard .courses.dimmer").addClass('active');
            },
            headers: headers,
            success: function (response) {
                loadDownloads();
                handleResponse(response);
            },
            error: function (response) {
                if (response.status == 403) {
                    settings.set('access_token', false);
                }
                resetToLogin();
            }
        });
    }
}


function loginWithAccessToken() {
    if ($('.ui.login .form').find('input[name="business"]').is(":checked")) {
        if (!$subDomain.val()) {
            prompt.alert('Type Business Name');
            return;
        }
    }
    prompt.prompt('Access Token', function (access_token) {
        if (access_token) {
            settings.set('access_token', access_token);
            settings.set('subdomain', $subDomain.val());
            checkLogin();
        }
    });
}

function resetToLogin() {
    $('.ui.dimmer').removeClass('active');
    $('.ui.dashboard .courses.items').empty();
    $('.content .ui.section').hide();
    $('.content .ui.courses.section').show();
    $('.sidebar').find('.active').removeClass('active red');
    $('.sidebar').find('.courses-sidebar').addClass('active red');
    $('.ui.login.grid').slideDown('fast');
    $('.ui.dashboard').fadeOut('fast');
}
$('.courses-sidebar').click(function () {
    $('.content .ui.section').hide();
    $('.content .ui.courses.section').show();
    $(this).parent('.sidebar').find('.active').removeClass('active red');
    $(this).addClass('active red');
});

$('.downloads-sidebar').click(function () {
    $(".ui.dashboard .downloads.dimmer").addClass('active');
    $('.content .ui.section').hide();
    $('.content .ui.downloads.section').show();
    $(this).parent('.sidebar').find('.active').removeClass('active red');
    $(this).addClass('active red');
});

$('.settings-sidebar').click(function () {
    $('.content .ui.section').hide();
    $('.content .ui.settings.section').show();
    $(this).parent('.sidebar').find('.active').removeClass('active red');
    $(this).addClass('active red');
    loadSettings();
});

$('.logout-sidebar').click(function () {
    prompt.confirm('Confirm Log Out?', function (ok) {
        if (ok) {
            $('.ui.logout.dimmer').addClass('active');
            saveDownloads(false);
            settings.set('access_token', false);
            resetToLogin();
        }
    });
});
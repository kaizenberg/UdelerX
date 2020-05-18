$('.ui.settings .form').submit((e) => {
    e.preventDefault();
    var enableDownloadStartEnd = $(e.target).find('input[name="enabledownloadstartend"]')[0].checked;
    var skipAttachments = $(e.target).find('input[name="skipattachments"]')[0].checked;
    var skipSubtitles = $(e.target).find('input[name="skipsubtitles"]')[0].checked;
    var autoRetry = $(e.target).find('input[name="autoretry"]')[0].checked;
    var downloadStart = parseInt($(e.target).find('input[name="downloadstart"]').val()) || false;
    var downloadEnd = parseInt($(e.target).find('input[name="downloadend"]').val()) || false;
    var videoQuality = $(e.target).find('input[name="videoquality"]').val() || false;
    var downloadPath = $(e.target).find('input[name="downloadpath"]').val() || false;
    var language = $(e.target).find('input[name="language"]').val() || false;

    settings.set('download', {
        enableDownloadStartEnd: enableDownloadStartEnd,
        skipAttachments: skipAttachments,
        skipSubtitles: skipSubtitles,
        autoRetry: autoRetry,
        downloadStart: downloadStart,
        downloadEnd: downloadEnd,
        videoQuality: videoQuality,
        path: downloadPath
    });

    settings.set('general', {
        language: language
    });

    prompt.alert(translate('Settings Saved'));

});

var settingsForm = $('.ui.settings .form');

function loadSettings() {
    var settingsCached = settings.getAll();
    if (settingsCached.download.enableDownloadStartEnd) {
        settingsForm.find('input[name="enabledownloadstartend"]').prop('checked', true);
    } else {
        settingsForm.find('input[name="enabledownloadstartend"]').prop('checked', false);
        settingsForm.find('input[name="downloadstart"], input[name="downloadend"]').prop('readonly', true);
    }

    if (settingsCached.download.skipAttachments) {
        settingsForm.find('input[name="skipattachments"]').prop('checked', true);
    } else {
        settingsForm.find('input[name="skipattachments"]').prop('checked', false);
    }

    if (settingsCached.download.skipSubtitles) {
        settingsForm.find('input[name="skipsubtitles"]').prop('checked', true);
    } else {
        settingsForm.find('input[name="skipsubtitles"]').prop('checked', false);
    }

    if (settingsCached.download.autoRetry) {
        settingsForm.find('input[name="autoretry"]').prop('checked', true);
    } else {
        settingsForm.find('input[name="autoretry"]').prop('checked', false);
    }

    settingsForm.find('input[name="downloadpath"]').val(settingsCached.download.path || homedir + '/Downloads');
    settingsForm.find('input[name="downloadstart"]').val(settingsCached.download.downloadStart || '');
    settingsForm.find('input[name="downloadend"]').val(settingsCached.download.downloadEnd || '');

    var videoQuality = settingsCached.download.videoQuality;
    settingsForm.find('input[name="videoquality"]').val(videoQuality || '');
    settingsForm.find('input[name="videoquality"]').parent('.dropdown').find('.default.text').html(videoQuality || translate('Auto'));

    var language = settingsCached.general.language;
    settingsForm.find('input[name="language"]').val(language || '');
    settingsForm.find('input[name="language"]').parent('.dropdown').find('.default.text').html(language || 'English');
}

settingsForm.find('input[name="enabledownloadstartend"]').change(function () {
    if (this.checked) {
        settingsForm.find('input[name="downloadstart"], input[name="downloadend"]').prop('readonly', false);
    } else {
        settingsForm.find('input[name="downloadstart"], input[name="downloadend"]').prop('readonly', true);
    }
});

function loadDefaults() {
    settings.set('download', {
        enableDownloadStartEnd: false,
        skipAttachments: false,
        skipSubtitles: false,
        autoRetry: false,
        downloadStart: false,
        downloadEnd: false,
        videoQuality: false,
        path: false
    });

    settings.set('general', {
        language: false
    });
}

if (!settings.get('general')) {
    loadDefaults();
}

function selectDownloadPath() {
    dialog.showOpenDialog({
        properties: ['openDirectory']
    }, function (path) {
        if (path) {
            fs.access(path[0], fs.R_OK && fs.W_OK, function (err) {
                if (err) {
                    prompt.alert(translate('Cannot select this folder'));
                } else {
                    settingsForm.find('input[name="downloadpath"]').val(path[0]);
                }
            });
        }
    });
}
$('.ui.dashboard .content').on('click', '.download.button, .download-error', function (e) {
    e.stopImmediatePropagation();
    var $course = $(this).parents('.course');
    var courseid = $course.attr('course-id');
    $course.find('.download-error').hide();
    $course.find('.download-status').show();
    var settingsCached = settings.getAll();
    var skipAttachments = settingsCached.download.skipAttachments;
    var skipSubtitles = settingsCached.download.skipSubtitles;
    $.ajax({
        type: 'GET',
        url: `https://${subDomain}.udemy.com/api-2.0/courses/${courseid}/cached-subscriber-curriculum-items?page_size=100000`,
        beforeSend: function () {
            $(".ui.dashboard .course.dimmer").addClass('active');
        },
        headers: headers,
        success: function (response) {
            $(".ui.dashboard .course.dimmer").removeClass('active');
            $course.find('.download.button').addClass('disabled');
            $course.css('padding-bottom', '25px');
            $course.find('.ui.progress').show();
            var coursedata = [];
            coursedata['chapters'] = [];
            coursedata['id'] = courseid;
            coursedata['name'] = $course.find('.coursename').text();
            var chapterindex = -1;
            var lectureindex = -1;
            var remaining = response.count;
            coursedata['totallectures'] = 0;
            var availableSubs = [];

            if (response.results[0]._class == "lecture") {
                chapterindex++;
                lectureindex = 0;
                coursedata['chapters'][chapterindex] = [];
                coursedata['chapters'][chapterindex]['name'] = 'Chapter 1';
                coursedata['chapters'][chapterindex]['lectures'] = [];
                remaining--;
            }

            $.each(response.results, function (i, v) {
                if (v._class == "chapter") {
                    chapterindex++;
                    lectureindex = 0;
                    coursedata['chapters'][chapterindex] = [];
                    coursedata['chapters'][chapterindex]['name'] = v.title;
                    coursedata['chapters'][chapterindex]['lectures'] = [];
                    remaining--;
                } else if (v._class == "lecture" && (v.asset.asset_type == "Video" || v.asset.asset_type == "Article" || v.asset.asset_type == "File" || v.asset.asset_type == "E-Book")) {
                    if (v.asset.asset_type != "Video" && skipAttachments) {
                        remaining--;
                        if (!remaining) {
                            if (Object.keys(availableSubs).length) {
                                askforSubtile(availableSubs, initDownload, $course, coursedata);
                            } else {
                                initDownload($course, coursedata);
                            }
                        }
                        return;
                    }

                    function getLecture(lecturename, chapterindex, lectureindex) {
                        $.ajax({
                            type: 'GET',
                            url: `https://${subDomain}.udemy.com/api-2.0/users/me/subscribed-courses/${courseid}/lectures/${v.id}?fields[asset]=stream_urls,download_urls,captions,title,filename,data,body&fields[lecture]=asset,supplementary_assets`,
                            headers: headers,
                            success: function (response) {
                                if (v.asset.asset_type == "Article") {
                                    if (response.asset.data) {
                                        var src = response.asset.data.body;
                                    } else {
                                        var src = response.asset.body;
                                    }
                                    var videoQuality = v.asset.asset_type;
                                    var type = 'Article';
                                } else if ((v.asset.asset_type == "File" || v.asset.asset_type == "E-Book")) {
                                    var src = response.asset.download_urls[v.asset.asset_type][0].file;
                                    var videoQuality = v.asset.asset_type;
                                    var type = 'File';
                                } else {
                                    var type = 'Video';
                                    var lecture = response.asset.stream_urls;
                                    var qualities = [];
                                    var qualitySrcMap = {};
                                    lecture.Video.forEach(function (val) {
                                        if (val.label == "Auto") return;
                                        qualities.push(val.label);
                                        qualitySrcMap[val.label] = val.file;
                                    });
                                    var lowest = Math.min(...qualities);
                                    var highest = Math.max(...qualities);
                                    var videoQuality = settingsCached.download.videoQuality;
                                    if (!videoQuality || videoQuality == "Auto") {
                                        var src = lecture.Video[0].file;
                                        videoQuality = lecture.Video[0].label;
                                    } else {
                                        switch (videoQuality) {
                                            case 'Highest':
                                                var src = qualitySrcMap[highest];
                                                videoQuality = highest;
                                                break;
                                            case 'Lowest':
                                                var src = qualitySrcMap[lowest];
                                                videoQuality = lowest;
                                                break;
                                            default:
                                                videoQuality = videoQuality.slice(0, -1);
                                                if (qualitySrcMap[videoQuality]) {
                                                    var src = qualitySrcMap[videoQuality];
                                                } else {
                                                    var src = lecture.Video[0].file;
                                                    videoQuality = lecture.Video[0].label;
                                                }
                                        }
                                    }
                                }
                                coursedata['chapters'][chapterindex]['lectures'][lectureindex] = {
                                    src: src,
                                    name: lecturename,
                                    quality: videoQuality,
                                    type: type
                                };
                                if (!skipSubtitles && response.asset.captions.length) {
                                    coursedata['chapters'][chapterindex]['lectures'][lectureindex].caption = [];
                                    response.asset.captions.forEach(function (caption) {
                                        caption.video_label in availableSubs ? availableSubs[caption.video_label] = availableSubs[caption.video_label] + 1 : availableSubs[caption.video_label] = 1;
                                        coursedata['chapters'][chapterindex]['lectures'][lectureindex].caption[caption.video_label] = caption.url;
                                    });
                                }
                                if (response.supplementary_assets.length && !skipAttachments) {
                                    coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'] = [];
                                    var supplementary_assets_remaining = response.supplementary_assets.length;
                                    $.each(response.supplementary_assets, function (a, b) {
                                        $.ajax({
                                            type: 'GET',
                                            url: `https://${subDomain}.udemy.com/api-2.0/users/me/subscribed-courses/${courseid}/lectures/${v.id}/supplementary-assets/${b.id}?fields[asset]=download_urls,external_url,asset_type`,
                                            headers: headers,
                                            success: function (response) {
                                                if (response.download_urls) {
                                                    coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'].push({
                                                        src: response.download_urls[response.asset_type][0].file,
                                                        name: b.title,
                                                        quality: 'Attachment',
                                                        type: 'File'
                                                    });
                                                } else {
                                                    coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'].push({
                                                        src: `<script type="text/javascript">window.location = "${response.external_url}";</script>`,
                                                        name: b.title,
                                                        quality: 'Attachment',
                                                        type: 'Url'
                                                    });
                                                }
                                                supplementary_assets_remaining--;
                                                if (!supplementary_assets_remaining) {
                                                    remaining--;
                                                    coursedata['totallectures'] += 1;
                                                    if (!remaining) {
                                                        if (Object.keys(availableSubs).length) {
                                                            askforSubtile(availableSubs, initDownload, $course, coursedata);
                                                        } else {
                                                            initDownload($course, coursedata);
                                                        }
                                                    }
                                                }
                                            }
                                        });
                                    });
                                } else {
                                    remaining--;
                                    coursedata['totallectures'] += 1;
                                    if (!remaining) {
                                        if (Object.keys(availableSubs).length) {
                                            askforSubtile(availableSubs, initDownload, $course, coursedata);
                                        } else {
                                            initDownload($course, coursedata);
                                        }
                                    }
                                }
                            }
                        });
                    }
                    getLecture(v.title, chapterindex, lectureindex);
                    lectureindex++;
                } else if (!skipAttachments) {
                    coursedata['chapters'][chapterindex]['lectures'][lectureindex] = {
                        src: `<script type="text/javascript">window.location = "https://${subDomain}.udemy.com${$course.attr('course-url')}t/${v._class}/${v.id}";</script>`,
                        name: v.title,
                        quality: 'Attachment',
                        type: 'Url'
                    };
                    remaining--;
                    coursedata['totallectures'] += 1;
                    if (!remaining) {
                        if (Object.keys(availableSubs).length) {
                            askforSubtile(availableSubs, initDownload, $course, coursedata);
                        } else {
                            initDownload($course, coursedata);
                        }
                    }
                    lectureindex++;
                } else {
                    remaining--;
                    if (!remaining) {
                        if (Object.keys(availableSubs).length) {
                            askforSubtile(availableSubs, initDownload, $course, coursedata);
                        } else {
                            initDownload($course, coursedata);
                        }
                    }
                }
            });
        },
        error: function (error) {
            $(".ui.dashboard .course.dimmer").removeClass('active');
            if (error.status == 403) {
                prompt.alert(translate("You do not have permission to access this course"));
            }
        }
    });
});

function initDownload($course, coursedata, subtitle = false) {
    var $clone = $course.clone();
    var $downloads = $('.ui.downloads.section .ui.courses.items');
    var $courses = $('.ui.courses.section .ui.courses.items');
    if ($course.parents('.courses.section').length) {
        $downloadItem = $downloads.find('[course-id=' + $course.attr("course-id") + ']');
        if ($downloadItem.length) {
            $downloadItem.replaceWith($clone);
        } else {
            $downloads.prepend($clone);
        }
    } else {
        $courseItem = $courses.find('[course-id=' + $course.attr("course-id") + ']');
        if ($courseItem.length) {
            $courseItem.replaceWith($clone);
        }
    }
    $course.push($clone[0]);
    var timer;
    var downloader = new Downloader();
    var $downloadStatus = $course.find('.download-status');
    var $actionButtons = $course.find('.action.buttons');
    var $downloadButton = $actionButtons.find('.download.button');
    var $pauseButton = $actionButtons.find('.pause.button');
    var $resumeButton = $actionButtons.find('.resume.button');
    var lectureChaperMap = {};
    var qualityColorMap = {
        '144': 'red',
        '240': 'orange',
        '360': 'blue',
        '480': 'teal',
        '720': 'olive',
        '1080': 'green',
        'Attachment': 'pink',
        'Subtitle': 'black'
    };
    var currentLecture = 0;
    coursedata['chapters'].forEach(function (lecture, chapterindex) {
        lecture['lectures'].forEach(function (x, lectureindex) {
            currentLecture++;
            lectureChaperMap[currentLecture] = {
                chapterindex: chapterindex,
                lectureindex: lectureindex
            };
        });
    });

    var course_name = '(' + coursedata['id'] + ') ' + sanitize(coursedata['name']);
    var totalchapters = coursedata['chapters'].length;
    var totallectures = coursedata['totallectures'];
    var $progressElemCombined = $course.find('.combined.progress');
    var $progressElemIndividual = $course.find('.individual.progress');
    var settingsCached = settings.getAll();
    var download_directory = settingsCached.download.path || homedir + '/Downloads';
    var $download_speed = $course.find('.download-speed');
    var $download_speed_value = $download_speed.find('.value');
    var $download_quality = $course.find('.download-quality');
    var downloaded = 0;
    var downloadStart = settingsCached.download.downloadStart;
    var downloadEnd = settingsCached.download.downloadEnd;
    var enableDownloadStartEnd = settingsCached.download.enableDownloadStartEnd;
    var autoRetry = settingsCached.download.autoRetry;
    $course.css('cssText', 'padding-top: 35px !important').css('padding-bottom', '25px');

    $pauseButton.click(function () {
        downloader._downloads[downloader._downloads.length - 1].stop();
        $pauseButton.addClass('disabled');
        $resumeButton.removeClass('disabled');
    });

    $resumeButton.click(function () {
        downloader._downloads[downloader._downloads.length - 1].resume();
        $resumeButton.addClass('disabled');
        $pauseButton.removeClass('disabled');
    });

    if (enableDownloadStartEnd) {

        if (downloadStart > downloadEnd) {
            downloadStart = downloadEnd;
        }

        if (downloadStart < 1) {
            downloadStart = 1;
        } else if (downloadStart > totallectures) {
            downloadStart = totallectures;
        }

        if (downloadEnd < 1 || downloadEnd > totallectures) {
            downloadEnd = totallectures;
        }

        var toDownload = (downloadEnd - downloadStart) + 1;
        downloadChapter(lectureChaperMap[downloadStart].chapterindex, lectureChaperMap[downloadStart].lectureindex);
    } else {
        var toDownload = totallectures;
        downloadChapter(0, 0);
    }

    $progressElemCombined.progress({
        total: toDownload,
        text: {
            active: `${translate("Downloaded")} {value} ${translate("out of")} {total} ${translate("items")}`
        }
    });

    $progressElemCombined.progress('reset');
    $download_speed.show();
    $download_quality.show();

    function downloadChapter(chapterindex, lectureindex) {

        var num_lectures = coursedata['chapters'][chapterindex]['lectures'].length;
        var chapter_name = sanitize((chapterindex + 1) + '. ' + coursedata['chapters'][chapterindex]['name']);
        mkdirp(download_directory + '/' + course_name + '/' + chapter_name, function () {
            downloadLecture(chapterindex, lectureindex, num_lectures, chapter_name);
        });
    }

    function downloadLecture(chapterindex, lectureindex, num_lectures, chapter_name) {
        if (downloaded == toDownload) {
            resetCourse($course.find('.download-success'));
            $course.find('.lastDownloaded').text('Downloaded on: ' + getLocalDate());
            return;
        } else if (lectureindex == num_lectures) {
            downloadChapter(++chapterindex, 0);
            return;
        }

        function dlStart(dl, callback) {

            // Change retry options to something more forgiving and threads to keep udemy from getting upset
            dl.setRetryOptions({
                retryInterval: 5000
            });

            dl.setOptions({
                threadsCount: 5
            });

            dl.start();
            // To track time and restarts
            let notStarted = 0;
            let reStarted = 0;

            timer = setInterval(function () {
                switch (dl.status) {
                    case 0:
                        // Wait a reasonable amount of time for the download to start and if it doesn't then start another one.
                        // once one of them starts the errors from the others will be ignored and we still get the file.
                        if (reStarted <= 5) {
                            notStarted++;
                            if (notStarted >= 15) {
                                dl.start();
                                notStarted = 0;
                                reStarted++;
                            }
                        }
                        $download_speed_value.html(0);
                        break;
                    case 1:
                        var stats = dl.getStats();
                        $download_speed_value.html(parseInt(stats.present.speed / 1000) || 0);
                        $progressElemIndividual.progress('set percent', stats.total.completed);
                        break;
                    case 2:
                        break;
                    case -1:
                        var stats = dl.getStats();
                        $download_speed_value.html(parseInt(stats.present.speed / 1000) || 0);
                        $progressElemIndividual.progress('set percent', stats.total.completed);
                        if (dl.stats.total.size == 0 && dl.status == -1 && fs.existsSync(dl.filePath)) {
                            dl.emit('end');
                            clearInterval(timer);
                            break;
                        } else {
                            $.ajax({
                                type: 'HEAD',
                                url: dl.url,
                                error: function (error) {
                                    if (error.status == 401 || error.status == 403) {
                                        fs.unlinkSync(dl.filePath);
                                    }
                                    resetCourse($course.find('.download-error'));
                                },
                                success: function () {
                                    resetCourse($course.find('.download-error'));
                                }
                            });
                            clearInterval(timer);
                            break;
                        }
                    default:
                        $download_speed_value.html(0);
                }
            }, 1000);

            dl.on('error', function (dl) {
                // Prevent throwing uncaught error
            });

            dl.on('start', function () {
                $pauseButton.removeClass('disabled');
            });

            dl.on('end', function () {
                callback();
            });
        }

        function downloadAttachments(index, total_assets) {
            $progressElemIndividual.progress('reset');
            var lectureQuality = coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['quality'];
            var lastClass = $download_quality.attr('class').split(' ').pop();
            $download_quality.html(lectureQuality).removeClass(lastClass).addClass(qualityColorMap[lectureQuality] || 'grey');

            if (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['type'] == 'Article' || coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['type'] == 'Url') {
                fs.writeFile(download_directory + '/' + course_name + '/' + chapter_name + '/' + sanitize((lectureindex + 1) + '.' + (index + 1) + ' ' + coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['name'].trim() + '.html'), coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['src'], function () {
                    index++;
                    if (index == total_assets) {
                        $progressElemCombined.progress('increment');
                        downloaded++;
                        downloadLecture(chapterindex, ++lectureindex, num_lectures, chapter_name);
                    } else {
                        downloadAttachments(index, total_assets);
                    }
                });
            } else {
                var lecture_name = sanitize((lectureindex + 1) + '.' + (index + 1) + ' ' + coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['name'].trim() + '.' + new URL(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['src']).searchParams.get('filename').split('.').pop());
                if (fs.existsSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name + '.mtd')) {
                    var dl = downloader.resumeDownload(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                    if (!fs.statSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name + '.mtd').size) {
                        dl = downloader.download(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['src'], download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                    }
                } else if (fs.existsSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name)) {
                    endDownload();
                    return;
                } else {
                    var dl = downloader.download(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'][index]['src'], download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                }

                dlStart(dl, endDownload);

                function endDownload() {
                    index++;
                    $pauseButton.addClass('disabled');
                    clearInterval(timer);
                    if (index == total_assets) {
                        $progressElemCombined.progress('increment');
                        downloaded++;
                        downloadLecture(chapterindex, ++lectureindex, num_lectures, chapter_name);
                    } else {
                        downloadAttachments(index, total_assets);
                    }
                }
            }
        }

        function checkAttachment() {
            $progressElemIndividual.progress('reset');
            if (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets']) {
                var total_assets = coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'].length;
                var index = 0;
                downloadAttachments(index, total_assets);
            } else {
                $progressElemCombined.progress('increment');
                downloaded++;
                downloadLecture(chapterindex, ++lectureindex, num_lectures, chapter_name);
            }
        }

        function downloadSubtitle() {
            $progressElemIndividual.progress('reset');
            var lastClass = $download_quality.attr('class').split(' ').pop();
            $download_quality.html('Subtitle').removeClass(lastClass).addClass(qualityColorMap['Subtitle'] || 'grey');
            $download_speed_value.html(0);
            var lecture_name = sanitize((lectureindex + 1) + '. ' + coursedata['chapters'][chapterindex]['lectures'][lectureindex]['name'].trim() + '.vtt');
            if (fs.existsSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + (lecture_name).replace('.vtt', '.srt'))) {
                checkAttachment();
                return;
            }
            var file = fs.createWriteStream(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name).on('finish', function () {
                var finalSrt = fs.createWriteStream(download_directory + '/' + course_name + '/' + chapter_name + '/' + (lecture_name).replace('.vtt', '.srt')).on('finish', function () {
                    fs.unlinkSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                    checkAttachment();
                });
                fs.createReadStream(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name)
                    .pipe(vtt2srt())
                    .pipe(finalSrt);
            });

            var request = https.get(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['caption'][subtitle] ? coursedata['chapters'][chapterindex]['lectures'][lectureindex]['caption'][subtitle] : coursedata['chapters'][chapterindex]['lectures'][lectureindex]['caption'][Object.keys(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['caption'])[0]], function (response) {
                response.pipe(file);
            });
        }

        $progressElemIndividual.progress('reset');

        var lectureQuality = coursedata['chapters'][chapterindex]['lectures'][lectureindex]['quality'];
        var lastClass = $download_quality.attr('class').split(' ').pop();
        $download_quality.html(lectureQuality + (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['type'] == 'Video' ? 'p' : '')).removeClass(lastClass).addClass(qualityColorMap[lectureQuality] || 'grey');

        if (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['type'] == 'Article' || coursedata['chapters'][chapterindex]['lectures'][lectureindex]['type'] == 'Url') {
            fs.writeFile(download_directory + '/' + course_name + '/' + chapter_name + '/' + sanitize((lectureindex + 1) + '. ' + coursedata['chapters'][chapterindex]['lectures'][lectureindex]['name'].trim() + '.html'), coursedata['chapters'][chapterindex]['lectures'][lectureindex]['src'], function () {
                if (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets']) {
                    var total_assets = coursedata['chapters'][chapterindex]['lectures'][lectureindex]['supplementary_assets'].length;
                    var index = 0;
                    downloadAttachments(index, total_assets);
                } else {
                    $progressElemCombined.progress('increment');
                    downloaded++;
                    downloadLecture(chapterindex, ++lectureindex, num_lectures, chapter_name);
                }

            });

        } else {

            var lecture_name = sanitize((lectureindex + 1) + '. ' + coursedata['chapters'][chapterindex]['lectures'][lectureindex]['name'].trim() + '.' + (coursedata['chapters'][chapterindex]['lectures'][lectureindex]['type'] == 'File' ? new URL(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['src']).searchParams.get('filename').split('.').pop() : 'mp4'));
            if (fs.existsSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name + '.mtd')) {
                var dl = downloader.resumeDownload(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                if (!fs.statSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name + '.mtd').size) {
                    dl = downloader.download(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['src'], download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
                }
            } else if (fs.existsSync(download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name)) {
                endDownload();
                return;
            } else {
                var dl = downloader.download(coursedata['chapters'][chapterindex]['lectures'][lectureindex]['src'], download_directory + '/' + course_name + '/' + chapter_name + '/' + lecture_name);
            }

            dlStart(dl, endDownload);


            function endDownload() {
                $pauseButton.addClass('disabled');
                clearInterval(timer);
                if (coursedata['chapters'][chapterindex]['lectures'][lectureindex].caption) {
                    downloadSubtitle();
                } else {
                    checkAttachment();
                }
            }
        }
    }

    function resetCourse($elem) {
        if ($elem.hasClass('download-error') && autoRetry) {
            $course.length = 1;
            initDownload($course, coursedata, subtitle);
            return;
        }
        $download_speed.hide();
        $download_quality.hide();
        $download_speed_value.html(0);
        $downloadStatus.hide().html(downloadTemplate);
        $elem.css('display', 'flex');
        $course.css('padding', '14px 0px');
    }
}

var downloadTemplate = `
<div class="ui tiny icon action buttons">
  <button class="ui basic blue download button">
    <i class="download icon"></i>
  </button>
  <button class="ui disabled basic red pause button">
    <i class="pause icon"></i>
  </button>
  <button class="ui disabled basic green resume button">
    <i class="play icon"></i>
  </button>
</div>
<div class="ui horizontal divider"></div>
<div class="ui tiny indicating individual progress">
   <div class="bar"></div>
</div>
<div class="ui horizontal divider"></div>
<div class="ui small indicating combined progress">
  <div class="bar">
    <div class="progress"></div>
  </div>
  <div class="label">${translate("Building Course Data")}</div>
</div>`;

function loadDownloads() {
    if (downloadedCourses = settings.get('downloadedCourses')) {
        downloadedCourses.forEach(function (course) {
            $course = $(`<div class="ui course item" course-id="${course.id}" course-url="${course.url}">
    <div class="ui tiny label download-quality grey"></div>
    <div class="ui tiny grey label download-speed"><span class="value">0</span> KB/s</div>
    <div class="ui tiny image">
      <img src="${course.image}">
      <span class="lastDownloaded">${course.lastDownloaded != '' ? 'Downloaded on: ' + course.lastDownloaded : ''}</span>
    </div>
    <div class="content">
      <span class="courseid" title="Unique Course Identifier">(${course.id})</span>
      <span class="coursename">${course.title}</span>
      <div class="ui tiny icon green download-success message">
        <i class="check icon"></i>
        <div class="content">
          <div class="headers">
            ${translate("Download Completed")}
          </div>
          <p>${translate("Click to dismiss")}</p>
        </div>
      </div>
      <div class="ui tiny icon  red download-error message">
        <i class="power icon"></i>
        <div class="content">
          <div class="headers">
            ${translate("Download Failed")}
          </div>
          <p>${translate("Click to retry")}</p>
        </div>
      </div>
      <div class="extra download-status">
        ${downloadTemplate}
      </div>
    </div>
  </div>`);
            $('.ui.downloads.section .ui.courses.items').append($course);
            if (!course.completed) {
                $course.find('.individual.progress').progress({
                    percent: course.individualProgress
                }).show();
                $course.find('.combined.progress').progress({
                    percent: course.combinedProgress
                }).show();
                $course.find('.download-status .label').html(course.progressStatus);
                $course.css('padding-bottom', '25px');
            }
        });
    }
}

function saveDownloads(quit) {
    var downloadedCourses = [];
    var $downloads = $('.ui.downloads.section .ui.courses.items .ui.course.item').slice(0, 50);
    if ($downloads.length) {
        $downloads.each(function (index, elem) {
            $elem = $(elem);
            if ($elem.find('.progress.active').length) {
                var individualProgress = $elem.find('.download-status .individual.progress').attr('data-percent');
                var combinedProgress = $elem.find('.download-status .combined.progress').attr('data-percent');
                var completed = false;
            } else {
                var individualProgress = 0;
                var combinedProgress = 0;
                var completed = true;
            }
            var course = {
                id: $elem.attr('course-id'),
                url: $elem.attr('course-url'),
                title: $elem.find('.coursename').text(),
                image: $elem.find('.image img').attr('src'),
                individualProgress: individualProgress,
                combinedProgress: combinedProgress,
                completed: completed,
                progressStatus: $elem.find('.download-status .label').text(),
                lastDownloaded: completed ? getLocalDate() : ''
            }
            downloadedCourses.push(course);
        });
        settings.set('downloadedCourses', downloadedCourses);
    }
    if (quit) {
        electron.ipcRenderer.send('quitApp');
    }
}

function getLastDownloaded(courseid) {
    var $downloadedCourse = $('.ui.downloads.section .ui.courses.items').find('[course-id=' + courseid + ']');
    if ($downloadedCourse.length > 0)
        return $downloadedCourse.find('.lastDownloaded').text();
    else
        return '';
}
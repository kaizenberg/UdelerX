$('.ui.dashboard .content').on('click', '.download-success', function () {
    $(this).hide();
    $(this).parents('.course').find('.download-status').show();
});

function handleResponse(response, keyword = '') {
    $(".ui.dashboard .courses.dimmer").removeClass('active');
    $('.ui.dashboard .ui.courses.section .disposable').remove();
    $('.ui.dashboard .ui.courses.section .ui.courses.items').empty();
    if (response.results.length) {
        $.each(response.results, function (index, course) {
            $('.ui.dashboard .ui.courses.section .ui.courses.items').append(
                `<div class="ui course item" course-id="${course.id}" course-url="${course.url}">
    <div class="ui tiny label download-quality grey"></div>
    <div class="ui tiny grey label download-speed"><span class="value">0</span> KB/s</div>
    <div class="ui tiny image">
      <img src="${course.image_240x135}">
      <span class="lastDownloaded">${getLastDownloaded(course.id)}</span>
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
        });
    } else {
        $('.ui.dashboard .ui.courses.section .ui.courses.items').append(`<div class="ui yellow message disposable">${translate("No Courses Found")}</div>`);
    }
}
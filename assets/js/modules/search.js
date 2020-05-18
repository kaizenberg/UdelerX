$('.ui.dashboard .content .courses.section .search.form').submit(function (e) {
    e.preventDefault();
    var keyword = $(e.target).find('input').val();
    if (validURL(keyword)) {
      if (keyword.search(new RegExp('^(http|https)'))) {
        keyword = 'http://' + keyword;
      }
      $.ajax({
        type: 'GET',
        url: keyword,
        beforeSend: function () {
          $(".ui.dashboard .course.dimmer").addClass('active');
        },
        headers: headers,
        success: function (response) {
          $(".ui.dashboard .course.dimmer").removeClass('active');
          var keyword = $('.main-content h1.clp-lead__title', response).text().trim();
          if (typeof keyword != "undefined" && keyword != "") {
            search(keyword, headers);
          } else {
            $(".ui.dashboard .courses.dimmer").removeClass('active');
            $('.ui.dashboard .ui.courses.section .disposable').remove();
            $('.ui.dashboard .ui.courses.section .ui.courses.items').empty();
            $('.ui.dashboard .ui.courses.section .ui.courses.items').append(`<div class="ui yellow message disposable">${translate("No Courses Found")}</div>`);
          }
        },
        error: function () {
          $(".ui.dashboard .courses.dimmer").removeClass('active');
          $('.ui.dashboard .ui.courses.section .disposable').remove();
          $('.ui.dashboard .ui.courses.section .ui.courses.items').empty();
          $('.ui.dashboard .ui.courses.section .ui.courses.items').append(`<div class="ui yellow message disposable">${translate("No Courses Found")}</div>`);
        }
      });
    } else {
      search(keyword, headers);
    }
  });

function search(keyword, headers) {
    $.ajax({
        type: 'GET',
        url: `https://${subDomain}.udemy.com/api-2.0/users/me/subscribed-courses?fields[user]=job_title&search=${keyword}`,
        beforeSend: function () {
            $(".ui.dashboard .courses.dimmer").addClass('active');
        },
        headers: headers,
        success: function (response) {
            handleResponse(response, keyword);
        }
    });
}

function validURL(value) {
    var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi
    var regexp = new RegExp(expression);
    return regexp.test(value);
}
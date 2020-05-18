function askforSubtile(availableSubs, initDownload, $course, coursedata) {
    var $subtitleModal = $('.ui.subtitle.modal');
    var $subtitleDropdown = $subtitleModal.find('.ui.dropdown');
    var subtitleLanguages = [];
    for (var key in availableSubs) {
      subtitleLanguages.push({
        name: `<b>${key}</b> <i>${availableSubs[key]} Lectures</i>`,
        value: key
      })
    }
    $subtitleModal.modal({
      closable: false
    }).modal('show');
    $subtitleDropdown.dropdown({
      values: subtitleLanguages,
      onChange: function (subtitle) {
        $subtitleModal.modal('hide');
        $subtitleDropdown.dropdown({
          values: []
        });
        initDownload($course, coursedata, subtitle);
      }
    });
  }
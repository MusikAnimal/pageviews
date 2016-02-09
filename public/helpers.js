'use strict';

var pv = {
  addSiteNotice: function addSiteNotice(level, message, title, autodismiss) {
    title = title ? '<strong>' + title + '</strong> ' : '';
    autodismiss = autodismiss ? ' autodismiss' : '';
    $(".site-notice").append('<div class=\'alert alert-' + level + autodismiss + '\'>' + title + message + '</div>');
    $(".site-notice-wrapper").show();
  },
  clearSiteNotices: function clearSiteNotices() {
    $(".site-notice .autodismiss").remove();

    if (!$(".site-notice .alert").length) {
      $(".site-notice-wrapper").hide();
    }
  },
  getPageURL: function getPageURL(page) {
    return '//' + pv.getProject() + '.org/wiki/' + page;
  },
  getProject: function getProject() {
    var project = $(config.projectInput).val();
    // Get the first 2 characters from the project code to get the language
    return project.replace(/.org$/, '');
  },
  normalizePageNames: function normalizePageNames(pages) {
    return $.ajax({
      url: 'https://' + pv.getProject() + '.org/w/api.php?action=query&prop=info&format=json&titles=' + pages.join('|'),
      dataType: 'jsonp'
    });
  },
  resetView: function resetView() {
    $(".chart-container").html("");
    $(".chart-container").removeClass("loading");
    resetArticleSelector();
  },
  underscorePageNames: function underscorePageNames(pages) {
    return pages.map(function (page) {
      return decodeURIComponent(page.replace(/ /g, '_'));
    });
  }
};

// must be exported to global scope for Chart template rendering
window.getPageURL = pv.getPageURL;

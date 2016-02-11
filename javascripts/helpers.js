const pv = {
  addSiteNotice(level, message, title, autodismiss) {
    title = title ? `<strong>${title}</strong> ` : '';
    autodismiss = autodismiss ? ` autodismiss` : '';
    $(".site-notice").append(
      `<div class='alert alert-${level}${autodismiss}'>${title}${message}</div>`
    );
    $(".site-notice-wrapper").show();
  },

  clearSiteNotices() {
    $(".site-notice .autodismiss").remove();

    if(!$(".site-notice .alert").length) {
      $(".site-notice-wrapper").hide();
    }
  },

  getPageURL(page) {
    return `//${pv.getProject()}.org/wiki/${page}`;
  },

  getProject() {
    let project = $(config.projectInput).val();
    // Get the first 2 characters from the project code to get the language
    return project.replace(/.org$/, '');
  },

  /**
   * Check if Intl is supported
   *
   * @returns {boolean} whether the browser (presumably) supports date locale operations
   */
  localeSupported() {
    return typeof Intl === "object";
  },

  normalizePageNames(pages) {
    return $.ajax({
      url: `https://${pv.getProject()}.org/w/api.php?action=query&prop=info&format=json&titles=${pages.join('|')}`,
      dataType: 'jsonp'
    });
  },

  resetView() {
    $(".chart-container").html("");
    $(".chart-container").removeClass("loading");
    resetArticleSelector();
  },

  rgba(value, alpha) {
    return value.replace(/,\s*\d\)/, `, ${alpha})`);
  },

  underscorePageNames(pages) {
    return pages.map((page)=> {
      return decodeURIComponent(page.replace(/ /g, '_'));
    });
  }
};

// must be exported to global scope for Chart template rendering
window.getPageURL = pv.getPageURL;
window.rgba = pv.rgba;

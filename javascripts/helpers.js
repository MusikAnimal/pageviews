const pv = {
  getPageURL(page) {
    return `//${pv.getProject()}.org/wiki/${page}`;
  },

  getProject() {
    let project = $(config.projectInput).val();
    // Get the first 2 characters from the project code to get the language
    return project.replace(/.org$/, '');
  },

  normalizePageNames(pages) {
    return $.ajax({
      url: `https://${pv.getProject()}.org/w/api.php?action=query&prop=info&format=json&titles=${pages.join('|')}`,
      dataType: 'jsonp'
    });
  },

  underscorePageNames(pages) {
    return pages.map((page)=> {
      return decodeURIComponent(page.replace(/ /g, '_'));
    });
  }
};

// must be exported to global scope for Chart template rendering
window.getPageURL = pv.getPageURL;

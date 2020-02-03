/**
 * Core JavaScript extensions, either to native JS or a library.
 * Polyfills can be found at polyfills.js
 */

String.prototype.descore = function() {
  return this.replace(/_/g, ' ');
};
String.prototype.score = function() {
  return this.replace(/ /g, '_');
};
String.prototype.upcase = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};
String.prototype.escape = function() {
  const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return this.replace(/[&<>"'\/]/g, s => {
    return entityMap[s];
  });
};

// remove duplicate values from Array
Array.prototype.unique = function() {
  return this.filter(function(value, index, array) {
    return array.indexOf(value) === index;
  });
};

// Improve syntax to emulate mixins in ES6
window.mix = superclass => new MixinBuilder(superclass);
class MixinBuilder {
  /**
   * set super class instance variable
   * @param  {class} superclass
   */
  constructor(superclass) {
    this.superclass = superclass;
  }

  /**
   * blend given classes with current superclass
   * @param  {...class} mixins
   * @returns {Array} classes
   */
  with(...mixins) {
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

$.whenAll = function() {
  let dfd = $.Deferred(),
    counter = 0,
    state = 'resolved',
    promises = new Array(...arguments);

  const resolveOrReject = function() {
    if (this.state === 'rejected') {
      state = 'rejected';
    }
    counter++;

    if (counter === promises.length) {
      dfd[state === 'rejected' ? 'reject' : 'resolve']();
    }

  };

  $.each(promises, (_i, promise) => {
    promise.always(resolveOrReject);
  });

  return dfd.promise();
};

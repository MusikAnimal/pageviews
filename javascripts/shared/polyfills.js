// Array.includes function polyfill
// This is not a full implementation, just a shorthand to indexOf !== -1
if ( !Array.prototype.includes ) {
  Array.prototype.includes = function(search) {
    return this.indexOf(search) !== -1;
  };
}

// String.includes function polyfill
if ( !String.prototype.includes ) {
  String.prototype.includes = function(search, start) {
    if (typeof start !== 'number') {
      start = 0;
    }

    if (start + search.length > this.length) {
      return false;
    } else {
      return this.indexOf(search,start) !== -1;
    }
  };
}

// Object.assign
if (typeof Object.assign !== 'function') {
  (function() {
    Object.assign = function(target) {
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      let output = Object(target);
      for (let index = 1; index < arguments.length; index++) {
        let source = arguments[index];
        if (source !== undefined && source !== null) {
          for (let nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  })();
}

// ChildNode.remove
if (!('remove' in Element.prototype)) {
  Element.prototype.remove = function() {
    this.parentNode.removeChild(this);
  };
}

// String.startsWith
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(searchString, position) {
    position = position || 0;
    return this.substr(position, searchString.length) === searchString;
  };
}

// Array.of
if (!Array.of) {
  Array.of = function() {
    return Array.prototype.slice.call(arguments);
  };
}

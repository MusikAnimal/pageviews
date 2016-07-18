/**
 * @file Core JavaScript extensions, either to native JS or a library.
 *   Polyfills have their own file [polyfills.js](global.html#polyfills)
 * @author MusikAnimal
 * @copyright 2016 MusikAnimal
 * @license MIT License: https://opensource.org/licenses/MIT
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

// remove duplicate values from Array
Array.prototype.unique = function() {
  return this.filter(function(value, index, array) {
    return array.indexOf(value) === index;
  });
};

// Improve syntax to emulate mixins in ES6
window.mix = superclass => new MixinBuilder(superclass);
class MixinBuilder {
  constructor(superclass) {
    this.superclass = superclass;
  }

  with(...mixins) {
    return mixins.reduce((c, mixin) => mixin(c), this.superclass);
  }
}

/*
 * HOT PATCH for Chart.js getElementsAtEvent
 * https://github.com/chartjs/Chart.js/issues/2299
 * TODO: remove me when this gets implemented into Charts.js core
 */
if (typeof Chart !== 'undefined') {
  Chart.Controller.prototype.getElementsAtEvent = function(e) {
    let helpers = Chart.helpers;
    let eventPosition = helpers.getRelativePosition(e, this.chart);
    let elementsArray = [];

    let found = (function() {
      if (this.data.datasets) {
        for (let i = 0; i < this.data.datasets.length; i++) {
          const key = Object.keys(this.data.datasets[i]._meta)[0];
          for (let j = 0; j < this.data.datasets[i]._meta[key].data.length; j++) {
            /* eslint-disable max-depth */
            if (this.data.datasets[i]._meta[key].data[j].inLabelRange(eventPosition.x, eventPosition.y)) {
              return this.data.datasets[i]._meta[key].data[j];
            }
          }
        }
      }
    }).call(this);

    if (!found) {
      return elementsArray;
    }

    helpers.each(this.data.datasets, function(dataset, dsIndex) {
      const key = Object.keys(dataset._meta)[0];
      elementsArray.push(dataset._meta[key].data[found._index]);
    });

    return elementsArray;
  };
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

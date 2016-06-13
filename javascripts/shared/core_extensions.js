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

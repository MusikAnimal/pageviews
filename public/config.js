'use strict';

var config = {
  // For more information on the list of all Wikimedia languages and projects, see:
  // https://www.mediawiki.org/wiki/Extension:SiteMatrix
  // https://en.wikipedia.org/w/api.php?action=sitematrix&formatversion=2
  colors: ['#bccbda', '#e0ad91', '#c1aa78', '#8da075', '#998a6f', '#F24236', '#F5F749', '#EFBDEB', '#2E86AB', '#565554'],
  projectInput: '.aqs-project-input',
  dateRangeSelector: '.aqs-date-range-selector',
  articleSelector: '.aqs-article-selector',
  chart: '.aqs-chart',
  minDate: moment('2015-10-01'),
  maxDate: moment().subtract(1, 'days'),
  timestampFormat: 'YYYYMMDD00',
  daysAgo: 20
};

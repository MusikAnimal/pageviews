import templates from './templates.js';

export default {
	chartLegend: templates.chartLegend,
	defaults: {},
	templates,
	validateParams: [ 'project', 'platform', 'agent' ]
};

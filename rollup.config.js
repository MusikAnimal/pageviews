import { nodeResolve } from '@rollup/plugin-node-resolve';
import babel from '@rollup/plugin-babel';
import terser from '@rollup/plugin-terser';
import inject from '@rollup/plugin-inject';

export default {
	input: 'javascripts/pageviews/pageviews.js',
	output: {
		file: 'public_html/pageviews/application.js',
		format: 'cjs'
	},
	plugins: [
		nodeResolve(),
		// inject( {
		// 	$: 'jquery',
		// 	moment: 'moment'
		// } ),
		babel( { babelHelpers: 'bundled' } ),
		terser()
	]
};

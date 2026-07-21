import { defineStore } from 'pinia';
import { persistentRef } from '../lib/storage.js';

/**
 * localStorage-backed user preferences (the Settings dialog). Keys keep
 * the legacy `pageviews-settings-<name>` namespace so existing users'
 * choices survive the rewrite (legacy stored 'true'/'false' strings,
 * which parse as the booleans they meant).
 */
export const usePreferencesStore = defineStore( 'preferences', () => {
	/**
	 * Tick "Include redirects" by default when the URL doesn't say.
	 */
	const alwaysRedirects = persistentRef( 'pageviews-settings-alwaysRedirects', false );
	/**
	 * Page autocomplete mode: 'autocomplete' (prefixsearch) or
	 * 'autocomplete_redirects' (includes redirects; slower).
	 */
	const autocomplete = persistentRef( 'pageviews-settings-autocomplete', 'autocomplete' );
	/**
	 * Format numbers per the interface language (e.g. 1,234).
	 */
	const numericalFormatting = persistentRef( 'pageviews-settings-numericalFormatting', true );
	/**
	 * Format dates per the interface language; off = ISO.
	 */
	const localizeDateFormat = persistentRef( 'pageviews-settings-localizeDateFormat', true );
	/**
	 * Auto-enable log scale on spiky data.
	 */
	const autoLogDetection = persistentRef( 'pageviews-settings-autoLogDetection', true );
	/**
	 * Always start the y-axis at zero.
	 */
	const beginAtZero = persistentRef( 'pageviews-settings-beginAtZero', false );
	/**
	 * Remember the chosen chart type across sessions.
	 */
	const rememberChart = persistentRef( 'pageviews-settings-rememberChart', false );
	/**
	 * Smooth (Bézier) line charts.
	 */
	const bezierCurve = persistentRef( 'pageviews-settings-bezierCurve', false );

	return {
		alwaysRedirects,
		autocomplete,
		numericalFormatting,
		localizeDateFormat,
		autoLogDetection,
		beginAtZero,
		rememberChart,
		bezierCurve
	};
} );

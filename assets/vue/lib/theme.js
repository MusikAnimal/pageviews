import { persistentRef } from './storage.js';

/**
 * The light/dark theme preference, persisted alongside the other user
 * preferences. 'auto' (the default) defers to the OS via the
 * prefers-color-scheme imports in app.less; 'light'/'dark' force a
 * mode through the data-theme attribute on <html>, which an inline
 * script in base.html.twig also applies before first paint.
 */

export const THEMES = [ 'auto', 'light', 'dark' ];

export const theme = persistentRef( 'pageviews-settings-theme', 'auto' );

/**
 * Reflect the current preference on <html>.
 */
export function applyTheme() {
	if ( theme.value === 'auto' ) {
		delete document.documentElement.dataset.theme;
	} else {
		document.documentElement.dataset.theme = theme.value;
	}
}

/**
 * @param {'auto'|'light'|'dark'} value
 */
export function setTheme( value ) {
	if ( THEMES.includes( value ) ) {
		theme.value = value;
		applyTheme();
	}
}

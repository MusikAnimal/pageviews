import Banana from 'banana-i18n';
import en from '../../i18n/en.json';

const locale = document.documentElement.lang || 'en';

/**
 * Shared banana-i18n instance. Import this anywhere (components, stores,
 * composables, plain modules) and call banana.i18n( 'message-key', ...params ).
 * Messages are guaranteed to be loaded because app.js awaits loadMessages()
 * before startStimulusApp(), and Vue apps only mount via Stimulus controllers.
 */
export const banana = new Banana( locale, { finalFallback: 'en' } );

// English is bundled eagerly: it is the finalFallback for every locale,
// and for English users it avoids a second request on page load.
banana.load( en, 'en' );

/**
 * Load the messages for the active locale. Must resolve before any Vue app
 * mounts. Each locale's JSON is code-split by Vite and fetched on demand.
 *
 * @return {Promise<void>}
 */
export async function loadMessages() {
	if ( locale === 'en' ) {
		return;
	}
	const loaders = import.meta.glob( '../../i18n/*.json' );
	const module = await loaders[ `../../i18n/${ locale }.json` ]?.();
	if ( module ) {
		banana.load( module.default, locale );
	}
}

function renderI18nHtml( el, binding ) {
	let key, params;
	if ( binding.arg ) {
		key = binding.arg;
		params = Array.isArray( binding.value ) ? binding.value : [];
	} else if ( Array.isArray( binding.value ) ) {
		[ key, ...params ] = binding.value;
	} else {
		key = binding.value;
		params = [];
	}
	el.innerHTML = banana.i18n( key, ...params );
}

/**
 * v-i18n-html directive: sets the element's innerHTML to a parsed message,
 * for messages containing markup (links, formatting). Registered per-app in
 * app.js. Only use with trusted message keys — the output is not sanitized.
 *
 * Supported forms:
 *   <p v-i18n-html:message-key></p>
 *   <p v-i18n-html:message-key="[ param1, param2 ]"></p>
 *   <p v-i18n-html="'message-key'"></p>
 *   <p v-i18n-html="[ 'message-key', param1, param2 ]"></p>
 */
export const i18nHtml = {
	mounted: renderI18nHtml,
	updated: renderI18nHtml,
};

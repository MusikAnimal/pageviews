import { registerVueControllerComponents } from '@symfony/ux-vue';
import './stimulus_bootstrap.js';
import './styles/app.css';
import './core_extensions.js';
import Banana from 'banana-i18n';
import enMessagesPromise from '../i18n/en.json';

/**
 * Each app must implement this method and call super.initialize() first.
 */
async function initialize() {
	// Load translations and supported projects, then initialize the app.
	await Promise.all( [
		loadTranslations(),
		loadProjects()
	] );
}

/**
 * Load the list of supported projects, storing them in the this.siteMap class property.
 * @returns {Promise}
 */
async function loadProjects() {
	this.siteMap = await ( await fetch( '/projects.json' ) ).json();
}

/**
 * Load translations from disk.
 * @returns {Promise}
 */
async function loadTranslations() {
	const banana = new Banana( 'en', { messages: await enMessagesPromise } );
	if ( i18nLang !== 'en' ) {
		const localMessages = await ( await fetch( `/${i18nLang}/messages.json` ) ).json();
		banana.load( localMessages, i18nLang )
	}
	this.i18n = banana.i18n.bind( banana );
	return Promise.resolve();
}

registerVueControllerComponents();

import './styles/app.css';
import './core_extensions.js';
import Banana from 'banana-i18n';
import enMessagesPromise from '../i18n/en.json';

/**
 * Abstract class for all apps in the suite of tools.
 *
 * @abstract
 */
class App {
	constructor( app, appConfig = {} ) {
		this.app = app;
		this.config = new Config( this, appConfig );
	}

	/**
	 * Each app must implement this method and call super.initialize() first.
	 */
	async initialize() {
		// Load translations and supported projects, then initialize the app.
		await Promise.all( [
			this.loadTranslations(),
			this.loadProjects()
		] );

		// Set valid project domains.
		this.config.validParams.project = Object.keys( this.siteMap )
			.map( ( project ) => `${ project }.org` );
	}

	/**
	 * Load the list of supported projects, storing them in the this.siteMap class property.
	 * @returns {Promise}
	 */
	async loadProjects() {
		this.siteMap = await ( await fetch( '/projects.json' ) ).json();
	}

	/**
	 * Load translations from disk.
	 * @returns {Promise}
	 */
	async loadTranslations() {
		const banana = new Banana( 'en', { messages: await enMessagesPromise } );
		if ( i18nLang !== 'en' ) {
			const localMessages = await ( await fetch( `/${i18nLang}/messages.json` ) ).json();
			banana.load( localMessages, i18nLang )
		}
		this.i18n = banana.i18n.bind( banana );
		return Promise.resolve();
	}
}

export default App;

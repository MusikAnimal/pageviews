import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { createRouter, createWebHistory } from 'vue-router';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-banana-i18n';
import en from '../i18n/en.json';
import Pageviews from './vue/controllers/Pageviews.vue';
import { usePageviewsStore } from "./vue/stores/pageviews.js";

async function i18nPlugin() {
	const locale = document.documentElement.lang || 'en';
	const messages = { en };
	if ( locale !== 'en' ) {
		// Lazy-load the locale messages for the current language. Vite code-splits each JSON.
		const loaders = import.meta.glob('../i18n/*.json' );
		messages[locale] = ( await loaders[ `../i18n/${ locale }.json` ]?.() ) ?? {};
	}
	return createI18n({ locale, finalFallback: 'en', messages } );
}

const router = createRouter( {
	history: createWebHistory(),
	routes: [
		{ path: '/', component: Pageviews, meta: { store: usePageviewsStore } },
		{ path: '/pageviews', component: Pageviews, meta: { store: usePageviewsStore } },
	],
} );

registerVueControllerComponents(
	import.meta.glob( './vue/controllers/**/*.vue' )
);

const pinia = createPinia();

document.addEventListener( 'vue:before-mount', async ( event ) => {
	const { app } = event.detail;
	app.use( router );
	app.use( pinia );
	app.use( await i18nPlugin() );
} );

startStimulusApp();

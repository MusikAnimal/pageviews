import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { createRouter, createWebHistory } from 'vue-router';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';
import { banana, loadMessages, i18nHtml } from './vue/i18n.js';
import Pageviews from './vue/controllers/Pageviews.vue';
import { usePageviewsStore } from './vue/stores/pageviews.js';

const router = createRouter( {
	history: createWebHistory(),
	routes: [
		{ path: '/', component: Pageviews, meta: { store: usePageviewsStore } },
		{ path: '/pageviews', component: Pageviews, meta: { store: usePageviewsStore } },
		// FAQ and URL structure open as dialogs over the app.
		{ path: '/faq', component: Pageviews, meta: { store: usePageviewsStore, dialog: 'faq' } },
		{
			path: '/url_structure',
			component: Pageviews,
			meta: { store: usePageviewsStore, dialog: 'url-structure' }
		}
	]
} );

registerVueControllerComponents(
	import.meta.glob( './vue/controllers/**/*.vue' )
);

// The footer's FAQ / URL structure links live in the Twig shell,
// outside the Vue app. Route them client-side so the dialogs open
// without a page reload (which would drop the query string, clearing
// the form).
document.addEventListener( 'click', ( event ) => {
	const link = event.target.closest( 'a[href="/faq"], a[href="/url_structure"]' );
	if ( link ) {
		event.preventDefault();
		router.push( {
			path: link.getAttribute( 'href' ),
			query: router.currentRoute.value.query
		} );
	}
} );

const pinia = createPinia();

// This listener must stay synchronous: the UX Vue controller mounts the app
// immediately after dispatching the event, so anything after an `await` here
// would run too late.
document.addEventListener( 'vue:before-mount', ( event ) => {
	const { app } = event.detail;
	app.config.globalProperties.$i18n = ( key, ...params ) => banana.i18n( key, ...params );
	app.provide( 'CdxI18nFunction', ( key, ...params ) => {
		const message = banana.i18n( key, ...params );
		// banana returns the key itself when no message exists; returning
		// undefined instead lets Codex fall back to its built-in defaults.
		return message === key ? undefined : message;
	} );
	app.directive( 'i18n-html', i18nHtml );
	app.use( router );
	app.use( pinia );
} );

await loadMessages();
startStimulusApp();

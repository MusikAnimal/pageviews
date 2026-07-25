import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { createRouter, createWebHistory } from 'vue-router';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';
import { banana, loadMessages, i18nHtml } from './vue/i18n.js';
import Pageviews from './vue/controllers/Pageviews.vue';
import Siteviews from './vue/controllers/Siteviews.vue';
import Mediaviews from './vue/controllers/Mediaviews.vue';
import Langviews from './vue/controllers/Langviews.vue';
import Userviews from './vue/controllers/Userviews.vue';
import Massviews from './vue/controllers/Massviews.vue';
import { usePageviewsStore } from './vue/stores/pageviews.js';
import { useSiteviewsStore } from './vue/stores/siteviews.js';
import { useMediaviewsStore } from './vue/stores/mediaviews.js';
import { useLangviewsStore } from './vue/stores/langviews.js';
import { useUserviewsStore } from './vue/stores/userviews.js';
import { useMassviewsStore } from './vue/stores/massviews.js';
import { useUiStore } from './vue/stores/ui.js';

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
		},
		{ path: '/siteviews', component: Siteviews, meta: { store: useSiteviewsStore } },
		{
			path: '/siteviews/faq',
			component: Siteviews,
			meta: { store: useSiteviewsStore, dialog: 'faq' }
		},
		{
			path: '/siteviews/url_structure',
			component: Siteviews,
			meta: { store: useSiteviewsStore, dialog: 'url-structure' }
		},
		{ path: '/mediaviews', component: Mediaviews, meta: { store: useMediaviewsStore } },
		{
			path: '/mediaviews/faq',
			component: Mediaviews,
			meta: { store: useMediaviewsStore, dialog: 'faq' }
		},
		{
			path: '/mediaviews/url_structure',
			component: Mediaviews,
			meta: { store: useMediaviewsStore, dialog: 'url-structure' }
		},
		{ path: '/langviews', component: Langviews, meta: { store: useLangviewsStore } },
		{
			path: '/langviews/faq',
			component: Langviews,
			meta: { store: useLangviewsStore, dialog: 'faq' }
		},
		{
			path: '/langviews/url_structure',
			component: Langviews,
			meta: { store: useLangviewsStore, dialog: 'url-structure' }
		},
		{ path: '/userviews', component: Userviews, meta: { store: useUserviewsStore } },
		{
			path: '/userviews/faq',
			component: Userviews,
			meta: { store: useUserviewsStore, dialog: 'faq' }
		},
		{
			path: '/userviews/url_structure',
			component: Userviews,
			meta: { store: useUserviewsStore, dialog: 'url-structure' }
		},
		{ path: '/massviews', component: Massviews, meta: { store: useMassviewsStore } },
		{
			path: '/massviews/faq',
			component: Massviews,
			meta: { store: useMassviewsStore, dialog: 'faq' }
		},
		{
			path: '/massviews/url_structure',
			component: Massviews,
			meta: { store: useMassviewsStore, dialog: 'url-structure' }
		}
	]
} );

registerVueControllerComponents(
	import.meta.glob( './vue/controllers/**/*.vue' )
);

const pinia = createPinia();

// Bridge for the Twig shell (nav bar and footer), which lives outside
// the Vue app: FAQ / URL structure links route client-side so the
// dialogs open without a page reload (which would drop the query
// string, clearing the form), and the nav Settings button opens the
// preferences dialog.
document.addEventListener( 'click', ( event ) => {
	// Close any open nav dropdown when clicking outside of it. Clicks
	// inside are left to the native details toggle / the link handling
	// below.
	document.querySelectorAll( '.app-nav__dropdown[open]' ).forEach( ( dropdown ) => {
		if ( !dropdown.contains( event.target ) ) {
			dropdown.removeAttribute( 'open' );
		}
	} );
	// Same for Codex menu buttons (Chart type, Download, Presets):
	// they only close on blur, which never fires when the click lands
	// on a non-focusable area (the page background, the chart canvas).
	// Clicks within any menu button are left to Codex — the toggle and
	// blur handling cover those.
	if ( !event.target.closest( '.cdx-menu-button' ) ) {
		document.querySelectorAll( '.cdx-menu-button [aria-expanded="true"]' )
			.forEach( ( toggle ) => toggle.click() );
	}
	if ( event.target.closest( '.app-nav__settings' ) ) {
		useUiStore( pinia ).preferencesOpen = true;
		return;
	}
	const link = event.target.closest( 'a[href$="/faq"], a[href$="/url_structure"]' );
	if ( link ) {
		event.preventDefault();
		// Close the nav dropdown the link was picked from.
		const dropdown = link.closest( 'details' );
		if ( dropdown ) {
			dropdown.removeAttribute( 'open' );
		}
		router.push( {
			path: link.getAttribute( 'href' ),
			query: router.currentRoute.value.query
		} );
	}
} );

// Keep at most one nav dropdown open at a time. The toggle event
// doesn't bubble, so listen in the capture phase.
document.addEventListener( 'toggle', ( event ) => {
	if ( !( event.target instanceof Element ) || !event.target.matches( '.app-nav__dropdown[open]' ) ) {
		return;
	}
	document.querySelectorAll( '.app-nav__dropdown[open]' ).forEach( ( dropdown ) => {
		if ( dropdown !== event.target ) {
			dropdown.removeAttribute( 'open' );
		}
	} );
}, true );

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

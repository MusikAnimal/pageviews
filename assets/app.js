import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { createRouter, createWebHistory } from 'vue-router';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';
import { useSettingsStore } from './vue/stores/settings.js';
import Pageviews from './vue/controllers/Pageviews.vue';
import { usePageviewsStore } from "./vue/stores/pageviews.js";

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

router.beforeEach( ( to ) => {
	useSettingsStore( pinia ).setFromQuery( to.query );
	to.meta.store?.( pinia ).setFromQuery( to.query );
} );

document.addEventListener( 'vue:before-mount', ( event ) => {
	const { app } = event.detail;
	app.use( router );
	app.use( pinia );
} );

startStimulusApp();

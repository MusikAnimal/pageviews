import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { createRouter, createWebHistory } from 'vue-router';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';
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

document.addEventListener( 'vue:before-mount', ( event ) => {
	const { app } = event.detail;
	app.use( router );
	app.use( pinia );
} );

startStimulusApp();

import '@wikimedia/codex/dist/codex.style.css';
import './app.less';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';
import { createPinia } from 'pinia';

registerVueControllerComponents(
	import.meta.glob( './vue/controllers/**/*.vue', { eager: true } )
);

const pinia = createPinia();
document.addEventListener( 'vue:before-mount', ( event ) => {
	event.detail.app.use( pinia );
} );

const app = startStimulusApp();

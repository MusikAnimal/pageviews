import './app.css';
import { startStimulusApp } from 'vite-plugin-symfony/stimulus/helpers';
import { registerVueControllerComponents } from 'vite-plugin-symfony/stimulus/helpers/vue';

const app = startStimulusApp();

registerVueControllerComponents(
	import.meta.glob( './vue/controllers/**/*.vue', { eager: true } )
);

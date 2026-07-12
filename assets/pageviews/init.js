import '@wikimedia/codex-design-tokens/theme-wikimedia-ui.css';
import '@wikimedia/codex/dist/codex.style.min.css';
import '../styles/app.css';
import '@wikimedia/codex';
import { createApp } from 'vue';
import Pageviews from '../vue/controllers/Pageviews.vue';

createApp( Pageviews ).mount( document.querySelector( '.app-container' ) );

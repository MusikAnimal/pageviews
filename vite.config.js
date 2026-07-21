import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import symfonyPlugin from 'vite-plugin-symfony';

export default defineConfig( {
	plugins: [
		vue(),
		symfonyPlugin( {
			stimulus: true
		} ),
	],
	build: {
		rollupOptions: {
			input: {
				app: './assets/app.js'
			},
		}
	},
	css: {
		preprocessorOptions: {
			less: {
				javascriptEnabled: true
			}
		}
	},
	server: {
		// The browser always reaches the dev server at localhost:5173, whether
		// Vite runs on the host or in the Docker `node` service (published port).
		origin: 'http://localhost:5173',
		port: 5173,
		strictPort: true
	}
} );

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import symfonyPlugin from "vite-plugin-symfony";

/* if you're using React */
// import react from '@vitejs/plugin-react';

export default defineConfig({
	plugins: [
		vue(),
		symfonyPlugin(),
	],
	build: {
		rollupOptions: {
			input: {
				app: "./assets/app.js"
			},
		}
	},
});

import { defineConfig } from 'eslint/config';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
	{ ignores: ['dist/', '.astro/', '.vercel/', 'node_modules/', 'test-results/', 'playwright-report/'] },
	tseslint.configs.recommended,
	eslintPluginAstro.configs.recommended,
	eslintPluginAstro.configs['jsx-a11y-strict'],
	{
		rules: {
			// Safari/VoiceOver drops list semantics from unstyled lists unless role="list" is explicit.
			'astro/jsx-a11y/no-redundant-roles': ['error', { ul: ['list'], ol: ['list'] }],
		},
	},
	{
		files: ['scripts/**/*.mjs', '*.config.{js,mjs,ts}'],
		languageOptions: { globals: globals.node },
	},
);

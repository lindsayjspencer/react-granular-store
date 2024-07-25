import globals from "globals";
import react from "eslint-plugin-react";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import reactRecommended from "eslint-plugin-react/configs/recommended.js";


export default [
	{
		files: ["**/*.{ts,tsx}"]
	},
	{
		languageOptions: {
			globals: globals.browser
		}
	},
	pluginJs.configs.recommended,
	...tseslint.configs.recommended,
	// pluginReact.configs.flat.recommended,
	{
		files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],
		ignores: ["dist/**/*"],
		...reactRecommended,
		settings: {
			version: "detect",
		},
		languageOptions: {
			...reactRecommended.languageOptions,
			ecmaVersion: "latest",
			sourceType: "module",
			parser: typescriptParser,
			parserOptions: {
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				...globals.serviceworker,
				...globals.browser,
			},
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
			react,
		},
		rules: {
			//rules here
		},
	},
	{
		ignores: ['dist/*', '*.js']
	}
];
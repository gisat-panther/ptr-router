import babel from 'rollup-plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import multi from '@rollup/plugin-multi-entry';

const env = process.env.NODE_ENV;

const CWD = process.cwd();
const Paths = {
	SRC: `${CWD}/src`,
	DIST: `${CWD}/dist`,
	NODE_MODULES: `${CWD}/node_modules`,
};
Object.assign(Paths, {
	INPUT: Paths.SRC + '/index.js',
	OUTPUT: Paths.DIST + '/index.js',
});

export default {
	input: 'tests/**/*-test.js',
	output: {
		file: 'build/bundle-tests.js',
		format: env,
		globals: {},
		exports: 'named' /** Disable warning for default imports */,
		sourcemap: true,
	},
	external: ['universal-router', 'universal-router/generateUrls', 'chai'],
	plugins: [
		multi(),
		babel({
			plugins: [],
		}),
		commonjs({
			include: 'node_modules/**',
		}),
	],
};

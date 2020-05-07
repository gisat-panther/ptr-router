import {assert} from 'chai';
import * as reduxRouter from '../src/redux-router';

describe('redux-router', function () {
	describe('changePage', function () {
		it('without params', function () {
			assert.deepStrictEqual(reduxRouter.changePage('homepage'), {
				type: reduxRouter.CHANGE_PAGE,
				payload: {name: 'homepage'},
			});
		});

		it('with params', function () {
			assert.deepStrictEqual(
				reduxRouter.changePage('homepage', {some: true}),
				{
					type: reduxRouter.CHANGE_PAGE,
					payload: {name: 'homepage', params: {some: true}},
				}
			);
		});
	});

	describe('pageSelector', function () {
		it('should return page', function () {
			assert.deepStrictEqual(
				reduxRouter.pageSelector(
					{router: {name: 'homepage'}},
					'router'
				),
				{name: 'homepage'}
			);
		});
	});

	describe('reducer', function () {
		it('should return default prev state with unknown action', function () {
			assert.deepStrictEqual(reduxRouter.reducer({}, 'unknown'), {});
		});

		it('should add page to the state', function () {
			assert.deepStrictEqual(
				reduxRouter.reducer({}, reduxRouter.changePage('homepage')),
				{name: 'homepage'}
			);
		});
	});
});

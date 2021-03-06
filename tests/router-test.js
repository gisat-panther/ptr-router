import {assert} from 'chai';
import * as router from '../src/router';
import * as reduxRouter from '../src/redux-router';
import {createStore, combineReducers} from 'redux';

function jsdom(html, options) {
	return require('jsdom-global')(html, options);
}

describe('router', function () {
	describe('create', function () {
		describe('pathFor', function () {
			const r = router.create({
				routes: {'/': 'homepage', '/hello/:name': 'hello'},
				onChange: function (request) {},
			});

			after(function () {
				r.destroy();
			});

			it('homepage', function () {
				assert.strictEqual(r.pathFor('homepage'), '/');
			});

			it('hello', function () {
				assert.strictEqual(
					r.pathFor('hello', {name: 'John'}),
					'/hello/John'
				);
			});

			it('not-found', function () {
				assert.throws(() => {
					r.pathFor('/not-found');
				});
			});
		});

		describe('initial nav', function () {
			const tests = [
				{
					name: 'homepage',
					currentUrl: '',
					expectedRequest: {
						match: {data: {name: 'homepage'}, pathParams: {}},
					},
				},
				{
					name: 'hello',
					currentUrl: '/hello/John',
					expectedRequest: {
						match: {
							data: {name: 'hello'},
							pathParams: {name: 'John'},
						},
					},
				},
				{
					name: 'hello with query string',
					currentUrl: '/hello/John?a=b&c=d',
					expectedRequest: {
						match: {
							data: {name: 'hello'},
							pathParams: {name: 'John'},
						},
						queryString: 'a=b&c=d',
					},
				},
				{
					name: 'route with extra data',
					currentUrl: '/extra-data',
					expectedRequest: {
						match: {
							data: {name: 'extra-data', addition: 'val'},
							pathParams: {},
						},
					},
				},
				{
					name: 'not found',
					currentUrl: '/not-found',
					expectedRequest: {},
				},
				{
					name: 'not found with query string',
					currentUrl: '/not-found?a=b&c=d',
					expectedRequest: {
						queryString: 'a=b&c=d',
					},
				},
			];

			let r;
			afterEach(function () {
				if (r) {
					r.destroy();
				}
			});

			tests.forEach(function (test) {
				it(test.name, function (done) {
					r = router.create({
						routes: {
							'': 'homepage',
							'/hello/:name': 'hello',
							'/extra-data': {
								name: 'extra-data',
								addition: 'val',
							},
						},
						currentUrl: test.currentUrl,
						onChange: function (request) {
							assert.deepStrictEqual(
								request,
								test.expectedRequest
							);
							done();
						},
						notFoundHandler: function (request) {
							assert.deepStrictEqual(
								request,
								test.expectedRequest
							);
							done();
						},
					});

					r.destroy();
				});
			});
		});

		describe('refresh', function () {
			let r;

			afterEach(function () {
				if (r) {
					r.destroy();
				}
			});

			it('refresh', function (done) {
				let requests = [];
				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': 'hello',
					},
					currentUrl: '',
					onChange: function (request) {
						requests.push(request);
						if (requests.length !== 2) {
							return;
						}

						assert.deepStrictEqual(requests, [
							{
								match: {
									data: {name: 'homepage'},
									pathParams: {},
								},
							},
							{
								match: {
									data: {name: 'homepage'},
									pathParams: {},
								},
							},
						]);
						done();
					},
				});

				r.refresh();
			});
		});

		describe('nav', function () {
			beforeEach(function () {
				this.jsdomCleanup = jsdom('', {
					url: 'http://example.com',
				});
			});

			let r;

			afterEach(function () {
				this.jsdomCleanup();
				if (r) {
					r.destroy();
				}
			});

			it('nav', function (done) {
				const requests = [];

				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': 'hello',
					},
					currentUrl: '',
					onChange: function (request) {
						requests.push(request);
						if (requests.length !== 2) {
							return;
						}

						assert.deepStrictEqual(requests, [
							{
								match: {
									data: {name: 'homepage'},
									pathParams: {},
								},
							},
							{
								match: {
									data: {name: 'hello'},
									pathParams: {name: 'John'},
								},
							},
						]);
						done();
					},
				});

				r.nav('/hello/John');
			});
		});

		describe('redirect', function () {
			beforeEach(function () {
				this.jsdomCleanup = jsdom('', {
					url: 'http://example.com',
				});
			});

			let r;

			afterEach(function () {
				this.jsdomCleanup();
				if (r) {
					r.destroy();
				}
			});

			it('redirect', function (done) {
				const requests = [];

				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': 'hello',
					},
					currentUrl: '',
					onChange: function (request) {
						requests.push(request);
						if (requests.length !== 4) {
							return;
						}

						assert.deepStrictEqual(requests, [
							{
								match: {
									data: {name: 'homepage'},
									pathParams: {},
								},
							},
							{
								match: {
									data: {name: 'hello'},
									pathParams: {name: 'John'},
								},
							},
							// replaces previous
							{
								match: {
									data: {name: 'hello'},
									pathParams: {name: 'Doe'},
								},
							},
							// back
							{
								match: {
									data: {name: 'homepage'},
									pathParams: {},
								},
							},
						]);
						done();
					},
				});

				r.nav('/hello/John');
				r.redirect('/hello/Doe');
				history.back();
			});
		});

		describe('navHandler', function () {
			let r;

			afterEach(function () {
				if (r) {
					r.destroy();
				}
			});

			it('navHandler', function () {
				const urls = [];
				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': 'hello',
					},
					currentUrl: '',
					navHandler(url) {
						urls.push(url);
					},
					onChange: function (request) {},
				});

				r.nav('/hello/John');
				r.redirect('/hello/Doe');

				assert.deepStrictEqual(urls, ['/hello/John', '/hello/Doe']);
			});
		});

		describe('default onChange', function () {
			let r;

			afterEach(function () {
				if (r) {
					r.destroy();
				}
			});

			it('should call handler', function (done) {
				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': {
							name: 'hello',
							handler: (request) => {
								done();
							},
						},
					},
					currentUrl: '/hello/John',
				});
			});
		});

		describe('default onChange with redux', function () {
			let r;

			afterEach(function () {
				if (r) {
					r.destroy();
				}
			});

			it('should call handler and store current page into redux store', function (done) {
				const ROUTER_PATH = 'router';
				const store = createStore(
					combineReducers({
						[ROUTER_PATH]: reduxRouter.reducer,
					}),
					{}
				);

				r = router.create({
					routes: {
						'': 'homepage',
						'/hello/:name': {
							name: 'hello',
							handler: (request) => {
								assert.deepStrictEqual(
									reduxRouter.pageSelector(
										store.getState(),
										ROUTER_PATH
									),
									{
										name: 'hello',
										params: {
											path: {name: 'John'},
										},
									}
								);
								done();
							},
						},
					},
					store,
					currentUrl: '/hello/John',
				});
			});
		});
	});
});

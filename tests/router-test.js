import {assert} from 'chai';
import * as router from '../src/router';

describe('router', function () {
	describe('create', function () {
		describe('pathFor', function () {
			const r = router.create({
				routes: {'': 'homepage', '/hello/:name': 'hello'},
				app: function (request) {},
			});

			after(function () {
				r.destroy();
			});

			it('homepage', function () {
				assert.strictEqual(r.pathFor('homepage'), '');
			});

			it('hello', function () {
				assert.strictEqual(
					r.pathFor('hello', {name: 'John'}),
					'/hello/John'
				);
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
				// todo: fix notfound handler (https://github.com/krasimir/navigo/issues/229)
				// {
				// 	name: 'not found',
				// 	currentUrl: '/not-found',
				// 	expectedRequest: {},
				// },
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
						app: function (request) {
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

		describe('nav', function () {
			beforeEach(function () {
				this.jsdomCleanup = require('jsdom-global')();
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
					app: function (request) {
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
				this.jsdomCleanup = require('jsdom-global')();
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
					app: function (request) {
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
	});
});

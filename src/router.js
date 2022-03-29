import UniversalRouter from 'universal-router';
import generateUrls from 'universal-router/generateUrls';
import {changePage} from './redux-router';

const STORE_KEY = Symbol('store');

function normalizeData(data) {
	if (typeof data === 'string') {
		return {name: data};
	}

	return data;
}

function getUrlDepth(url) {
	return url.replace(/\/$/, '').split('/').length;
}

function compareUrlDepth(urlA, urlB) {
	return getUrlDepth(urlB) - getUrlDepth(urlA);
}

/**
 * Enriches request with some data. Format of data is inspired by ring spec: https://github.com/ring-clojure/ring/blob/master/SPEC
 */
function enrichRequestWithQueryString(request, context) {
	if (context.queryString != null && context.queryString !== '') {
		return Object.assign({}, request, {queryString: context.queryString});
	}

	return request;
}

function enrichRequestWithStore(store) {
	if (store == null) {
		return;
	}

	return function (request, context) {
		return Object.assign({}, request, {[STORE_KEY]: store});
	};
}

function createRequestEnhancer(...enhancers) {
	const enhs = enhancers.filter((enh) => enh != null);

	return function (request, context) {
		return enhs.reduce(function (req, enhancer) {
			return enhancer(req, context);
		}, request);
	};
}

function fromObjectRoutes(objRoutes) {
	const orderedPaths = Object.keys(objRoutes).sort(compareUrlDepth);

	return orderedPaths.map((path) => {
		const data = normalizeData(objRoutes[path]);

		return {
			path,
			name: data.name,
			children: data.children ? fromObjectRoutes(data.children) : [],
			action(context) {
				return {
					context,
					match: {
						data: data,
						pathParams: context.params ?? {},
					},
				};
			},
		};
	});
}

function currentLoc() {
	return typeof location === 'undefined' ? '' : location.href;
}

function createUrl(input, base) {
	if (typeof URL !== 'undefined') {
		return new URL(input, base);
	}

	if (typeof require !== 'undefined') {
		const url = require('url');

		return new url.URL(input, base);
	}
}

function parseUrl(url) {
	if (url == null) {
		return url;
	}

	const u = createUrl(url, 'http://example.com');

	return {pathname: u.pathname, queryString: u.searchParams.toString()};
}

function defaultOnChange(request) {
	const handler = request.match.data.handler;
	if (handler != null) {
		handler(request);
	}
}

function requestToPage(request) {
	if (request.match == null) {
		return null;
	}

	return {
		name: request.match.data.name,
		params: Object.fromEntries(
			Object.entries({
				path: request.match.pathParams,
				queryString: request.queryString,
			}).filter(([k, v]) => v != null)
		),
	};
}

/**
 *
 * @param {Object} request
 * @param {bool} dispatchChange Whether dispatch change to router store
 */
function defaultOnChangeWithRedux(request, dispatchChange) {
	const page = requestToPage(request);
	if (dispatchChange === true) {
		request[STORE_KEY].dispatch(changePage(page?.name, page?.params));
	}

	defaultOnChange(request);
}

/**
 * @param {Object} options
 * @param {Object} options.routes Keys are paths in format `/path/:param`, values are route data
 *     (object with key 'name' or string)
 * @param {Function=} options.onChange Function accepting request called when route is matched
 * @param {Function=} options.notFoundHandler Function accepting request called when no route is matched
 * @param {Function=} options.navHandler Function called instead of `nav` and `redirect` (useful for SSR)
 * @param {string=} options.currentUrl Useful when doing SSR
 * @param {store=} options.store Redux store to which current page will be stored
 * @param {Object=} options.generateUrlsOptions Options with params for generateUrls https://github.com/kriasoft/universal-router/blob/main/docs/api.md#url-generation
 *
 * Request is map with optional keys:
 * - `match`
 *   - matched route. It is object with keys `data` (route data object), `pathParams`
 * - `queryString`
 */
export function create({
	routes,
	onChange,
	notFoundHandler,
	currentUrl,
	navHandler,
	store,
	generateUrlsOptions,
}) {
	if (onChange == null) {
		onChange = store == null ? defaultOnChange : defaultOnChangeWithRedux;
	}

	const enrichRequest = createRequestEnhancer(
		enrichRequestWithQueryString,
		enrichRequestWithStore(store)
	);

	const universalRoutes = fromObjectRoutes(routes);
	const options = {
		resolveRoute(context, params) {
			if (typeof context.route.action === 'function') {
				const request = context.route.action(context, params);

				//
				// We want to dispatch change route on every last route.
				// If dispatchChange would be true, then change is dispatched on each route child.
				// context.path === '' is case when is changing query string otherwise we check if
				//  context.baseUrl + context.path is same like context.pathname => if so, then
				// the we are on last child
				//
				const dispatchChange =
					context.path !== ''
						? `${context.baseUrl}${context.path}` ===
						  context.pathname
						: true;
				debugger;
				onChange(enrichRequest(request, context), dispatchChange);

				return true;
			}
		},
		errorHandler(error, context) {
			if (error.status === 404 && notFoundHandler) {
				notFoundHandler(enrichRequest({}, context));

				return true;
			}

			console.error(error);

			return true;
		},
	};

	const baseRouter = new UniversalRouter(universalRoutes, options);
	const url = generateUrls(baseRouter, generateUrlsOptions);
	baseRouter.resolve(parseUrl(currentUrl ?? currentLoc()));

	const urlChanged = () => {
		baseRouter.resolve(parseUrl(currentLoc()));
	};
	if (typeof window !== 'undefined') {
		window.addEventListener('popstate', urlChanged);
	}

	const router = {
		nav: (url) => {
			history.pushState({}, '', url);
			urlChanged();
		},
		redirect: (url) => {
			history.replaceState({}, '', url);
			urlChanged();
		},
		refresh: () => {
			baseRouter.resolve(parseUrl(currentLoc()));
		},
		pathFor: (page, params) => {
			return url(page, params);
		},
		destroy: () => {
			if (typeof window !== 'undefined') {
				window.removeEventListener('popstate', urlChanged);
			}
		},
	};

	return Object.assign(
		{},
		router,
		navHandler
			? {
					nav: (url) => {
						navHandler(url);
					},
					redirect: (url) => {
						navHandler(url);
					},
			  }
			: {}
	);
}

import UniversalRouter from 'universal-router';
import generateUrls from 'universal-router/generateUrls';

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
function enrichRequest(request, context) {
	if (context.queryString != null && context.queryString !== '') {
		return Object.assign({}, request, {queryString: context.queryString});
	}

	return request;
}

function fromObjectRoutes(objRoutes) {
	const orderedPaths = Object.keys(objRoutes).sort(compareUrlDepth);

	return orderedPaths.map((path) => {
		const data = normalizeData(objRoutes[path]);

		return {
			path,
			name: data.name,
			action(context) {
				const request = {
					match: {
						data: data,
						pathParams: context.params ?? {},
					},
				};

				return enrichRequest(request, context);
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

/**
 * @param {Object} options
 * @param {Object} options.routes Keys are paths in format `/path/:param`, values are route data (object with key 'name' or string)
 * @param {Function=} options.onChange Function accepting request called when route is matched
 * @param {Function=} options.notFoundHandler Function accepting request called when no route is matched
 * @param {Function=} options.navHandler Function called instead of `nav` and `redirect` (useful for SSR)
 * @param {string=} options.currentUrl Useful when doing SSR
 *
 * Request is map with optional keys:
 * - `match`
 *   - matched route. It is object with keys `data` (route data object), `pathParams`
 * - `queryString`
 */
export function create({
	routes,
	onChange = defaultOnChange,
	notFoundHandler,
	currentUrl,
	navHandler,
}) {
	const universalRoutes = fromObjectRoutes(routes);
	const options = {
		resolveRoute(context, params) {
			if (typeof context.route.action === 'function') {
				const request = context.route.action(context, params);
				onChange(request);

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
	const url = generateUrls(baseRouter);
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

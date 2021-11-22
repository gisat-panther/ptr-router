![.github/workflows/test.yml](https://github.com/gisat-panther/ptr-router/workflows/.github/workflows/test.yml/badge.svg?branch=master)

# ptr-router

## Api

### Router

```js
/**
 * @param {Object} options
 * @param {Object} options.routes Keys are paths in format `/path/:param`, values are route data
 *     (object with key 'name' or string)
 * @param {Function=} options.onChange Function accepting request called when route is matched.
 *     Default `onChange` function calls `handler(request)` where `handler` is taken from route data.
 * @param {Function=} options.notFoundHandler Function accepting request called when no route is matched
 * @param {Function=} options.navHandler Function called instead of `nav` and `redirect` (useful for SSR)
 * @param {string=} options.currentUrl Useful when doing SSR
 * @param {store=} options.store Redux store to which current page will be stored
 * @param {Object=} options.generateUrlsOptions Options with params for generateUrls https://github.com/kriasoft/universal-router/blob/main/docs/api.md#url-generation
 *
 * Request is map with optional keys:
 * - `match`
 *   - matched route. It is object with keys `data` (route data object), `pathParams`
 * - `context`
 *   - Current UniversalRouter context with actual url, parameters, routes...
 * - `queryString`
 */
create({
	routes,
	onChange,
	notFoundHandler,
	currentUrl,
	navHandler,
	store,
    generateUrlsOptions,
});
```

### Methods of router created using `create` above

#### nav(url)

Opens `url`, which triggers `onChange` or `notFoundHandler`.

#### redirect(url)

Same as `nav(url)`, except previous `url` in history is replaced with the one provided.

#### refresh()

Triggers `onChange` or `notFoundHandler`.

#### pathFor(page, params)

Generates url based on route `name` (`page`) and path `params`.

#### destroy()

Destroys router. Useful in tests to remove listeners from DOM.

### Redux integration (optional)

This library provides functions that can be used to store/retrieve current page from Redux store.

```js
/**
 * Redux action storing page name with params into store.
 * `name` should be taken from route name.
 */
changePage(name, params);

/**
 * Redux selector retrieving page and action from store.
 */
pageSelector(state, basePath);

/**
 * Redux reducer.
 */
reducer(state = null, action);
```

## Demo

```js
import * as ptrRouter from '@gisatcz/ptr-router';

const routes = {
    '': 'homepage',
    '/hello/:name': {
        name: 'hello',
        handler: request => {
            // show alert when route is matched
            alert(`Hello ${request.match.pathParams.name}!`);
        }
    },
    '/fruit': {
        name: 'fruit',
        handler: request => {
            if(request.context.pathname === '/fruit') {
                alert(`Hello I'm on fruite url!`);
            } else {
                // pass to the children
                request.context.next();
            }
        },
        children: {
            'apple': {
                name: 'fruit:apple',
                handler: request => {
                    // show alert when route is matched
                    alert(`Hello ${request.match.pathParams.name} ${request.context.pathname}!`);
                }
            }
        }
    }
};

function notFoundHandler(request) {
    console.error(`No route matched url ${location.href}`);
}

function init({navHandler, currentUrl}) {
    const generateUrlsOptions = {
        stringifyQueryParams: (params) => new URLSearchParams(params).toString() //parse unknown params to the querystring
    }
    const router = ptrRouter.create({routes, notFoundHandler, navHandler, currentUrl, generateUrlsOptions});
    const helloUrl = router.pathFor('hello', {name: 'John', address: 'prague'}; // => /hello/John?address=prague
    router.nav(helloUrl); // opens page `/hello/John` that shows alert `Hello John!`
    router.nav('/some-random-url'); // `notFoundHandler` logs error into the console
}
```

### Initialization in browser

```js
init();
```

### Initialization on server

```js
function handler(req, res) {
    let requiredUrl = req.url; // what url we will want to render?

    // replaces navigation handlers in router by changing the local `requiredUrl`
    const navHandler = (url) => {
        requiredUrl = url;
    };

    init({currentUrl: req.url, navHandler});

    if (requiredUrl != req.url) {
        // if url changed during initialization above, redirect to the required url
        res.redirect(301, requiredUrl);
        return;
    }

    // ...
}
```

## Demo with redux

```js
import * as ptrRouter from '@gisatcz/ptr-router';
import {createStore, combineReducers} from 'redux';

const ROUTER_PATH = 'router';

const store = createStore(
    combineReducers({[ROUTER_PATH]: ptrRouter.reducer}),
    {}
);

// page selector used by application with router path in state already filled in
const pageSelector = state => ptrRouter.pageSelector(state, ROUTER_PATH);

const routes = {
    '': 'homepage',
    '/hello/:name': {
        name: 'hello',
        handler: request => {
            // show alert when route is matched
            alert(`Hello ${request.match.pathParams.name}!`);
        }
    }
};

const router = ptrRouter.create({routes, onChange, store});
const helloUrl = router.pathFor('hello', {name: 'John'}; // => /hello/John
router.nav(helloUrl); // opens page `/hello/John` that shows alert `Hello John!`
console.log(pageSelector(tore.getState())); // logs: {name: 'hello', params: {path: {name: 'John'}}}
```

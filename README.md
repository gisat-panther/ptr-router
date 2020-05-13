![.github/workflows/test.yml](https://github.com/gisat-panther/ptr-router/workflows/.github/workflows/test.yml/badge.svg?branch=master)

# ptr-router

## Api

### Router

```js
const router = create({
    routes,
    onChange,
    notFoundHandler,
    currentUrl,
    navHandler,
});
```

#### onChange

Function called when url is changed with signature> `request => void`.

`request` contains:
- `match.data`
    - matched route data (object with `name` property and additional arbitrary data)
- `queryString`
    - query part of the url

There is default `onChange` function that calls `handler(request)` where `handler` is taken from route data.

#### notFoundHandler

Function called when url is changed but there is no matching url. It is same as `app` except it doesn't contain `match` as nothing was matched.

#### routes

Mapping of url to route data received in `onChange` in `request.match.data`. Key is string with possible placeholders starting with `:`, value is either string or object containing `name` of type string with arbitrary additional data.

Example:
```js
const routes = {
    '': 'homepage', // route data is string
    '/hello/:name': { // route data is object with `name` and `handler` properties.
        name: 'hello',
        handler: request => {
            alert(`Hello ${request.match.pathParams.name}!`);
        }
    }
};
```

#### currentUrl

Currently opened url (useful for SSR).

#### navHandler

Replaces routing behaviour on `nav` and `redirect`. Useful with SSR where redirect can be sent to browser when apps tries to open different url.

#### router

##### nav(url)

Opens `url`, which triggers `onChange` or `notFoundHandler`.

##### redirect(url)

Same as `nav(url)`, except previous `url` in history is replaced with the one provided.

##### refresh()

Triggers `onChange` or `notFoundHandler`.

##### pathFor(page, params)

Generates url based on route `name` (`page`) and path `params`.

##### destroy()

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
    }
};

function notFoundHandler(request) {
    console.error(`No route matched url ${location.href}`);
}

function init({navHandler, currentUrl}) {
    const router = ptrRouter.create({routes, notFoundHandler, navHandler, currentUrl});
    const helloUrl = router.pathFor('hello', {name: 'John'}; // => /hello/John
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

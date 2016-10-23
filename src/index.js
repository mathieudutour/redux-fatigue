import {applyMiddleware, createStore, combineReducers} from 'redux'
import {Provider} from 'react-redux'
import NetworkListener from 'redux-queue-offline-listener'
import optimist from 'redux-optimist'
import optimistPromiseMiddleware from 'redux-optimist-promise'
import {middleware as feedbackMiddleware, reducer as feedback} from 'redux-toast-feedback'

import * as storage from 'redux-storage'
import createEngine from 'redux-storage-engine-localstorage-map'
import debounceDecorator from 'redux-storage-decorator-debounce'
import migrateDecorator from 'redux-storage-decorator-migrate'

import {middleware as offlineQueueMiddleware, reducer as offlineQueue} from 'redux-queue-offline'
import createHashHistory from 'history/lib/createHashHistory'
import {useRouterHistory} from 'react-router'
import withScroll from 'scroll-behavior'
import {syncHistoryWithStore, CALL_HISTORY_METHOD, LOCATION_CHANGE, routerReducer as routing} from 'react-router-redux'
import objectToPromise from 'redux-object-to-promise'

const noop = () => {}

module.exports = function initStore ({
  sendAppView = noop,
  storageMap,
  storageDebounce = 1000,
  storageVersion = 0,
  storageMigrations = [],
  blacklistedActions = [CALL_HISTORY_METHOD, LOCATION_CHANGE],
  loggerOptions = {
    collapsed: true,
    duration: true,
    timestamp: false
  },
  objectToPromiseOptions = {},
  optimistPromiseOptions = [],
  offlineQueueOptions = [],
  middlewares = [],
  reducers = {},
  feedbackOptions
}) {
  let reducer = optimist(combineReducers({
    offlineQueue,
    routing,
    feedback,
    ...reducers
  }))

  const hashHistory = withScroll(useRouterHistory(createHashHistory)({
    queryKey: false
  }))

  let _middlewares = [
    offlineQueueMiddleware(...offlineQueueOptions)
  ]

  if (process.env.NODE_ENV !== 'production') {
    const createLogger = require('redux-logger')
    _middlewares.push(createLogger(loggerOptions))
  }

  let engine
  if (storageMap) {
    engine = createEngine(storageMap)
    engine = debounceDecorator(engine, storageDebounce)
    engine = migrateDecorator(engine, storageVersion)
    storageMigrations.forEach((migration, i) => {
      engine.addMigration(i, migration)
    })

    const storageMiddleware = storage.createMiddleware(engine, blacklistedActions)
    _middlewares.push(storageMiddleware)
    reducer = storage.reducer(reducer)
  }

  _middlewares = _middlewares
    .concat(middlewares)
    .concat([
      feedbackMiddleware(feedbackOptions),
      objectToPromise(objectToPromiseOptions),
      optimistPromiseMiddleware(...optimistPromiseOptions)
    ])

  const createStoreWithMiddleware = applyMiddleware(..._middlewares)(createStore)

  const store = createStoreWithMiddleware(reducer)

  // Sync dispatched route actions to the history
  const history = syncHistoryWithStore(hashHistory, store)

  history.listen((location) => location && sendAppView(location.pathname))

  if (engine) {
    return storage.createLoader(engine)(store).then(() => ({
      history,
      store
    }))
  }

  return {
    history,
    store
  }
}

module.exports.Provider = NetworkListener(Provider)
module.exports.Toast = require('redux-toast-feedback/build/Toast')

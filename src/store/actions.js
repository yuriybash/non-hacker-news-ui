import {
  fetchUser,
  fetchItems,
  fetchIdsByType
} from '../api'

const url = require('url');
const request = require('request');
const sync_request = require('sync-request');


export default {
  // ensure data for rendering given list type
  FETCH_LIST_DATA: ({ commit, dispatch, state }, { type }) => {
    commit('SET_ACTIVE_TYPE', { type })
    return fetchIdsByType(type)
      .then(ids => commit('SET_LIST', { type, ids }))
      .then(() => dispatch('ENSURE_ACTIVE_ITEMS'))
  },

  // ensure all active items are fetched
  ENSURE_ACTIVE_ITEMS: ({ dispatch, getters }) => {
    return dispatch('FETCH_ITEMS', {
      ids: getters.activeIds
    })
  },

  FETCH_ITEMS: ({ commit, state }, { ids }) => {
    // on the client, the store itself serves as a cache.
    // only fetch items that we do not already have, or has expired (3 minutes)
    const now = Date.now()
    ids = ids.filter(id => {
      const item = state.items[id]
      if (!item) {
        return true
      }
      if (now - item.__lastUpdated > 1000 * 60 * 3) {
        return true
      }
      return false
    })
    if (ids.length) {
      return fetchItems(ids).then(function(items){
        let url_title_pairs = [];
        for (var i = 0; i < items.length; i++) {

          let domain;

          let title = items[i]['title'].replace(/[^a-zA-Z0-9 -]/, '').toLowerCase();
          if(items[i]['url']){
            let domain_parts = url.parse(items[i]['url']).host.split(".")
            domain = domain_parts.length === 2 ? domain_parts [0] : domain_parts [1]
          } else {
            domain = "a"
          }

          url_title_pairs.push([title, domain])
        }


        var response = sync_request('POST', 'https://si6k7q7byd.execute-api.us-east-1.amazonaws.com/dev', {
          json: {data: url_title_pairs},
        });

        var predictions = JSON.parse(response.getBody('utf8'))['prediction'];
        console.log("number of article matches: " + predictions.reduce((a, b) => a + b, 0));

        items = items.filter((item, idx, arr) => predictions[idx] === 1);
        commit('SET_ITEMS', { items })


      })
    } else {
      return Promise.resolve()
    }
  },

  FETCH_USER: ({ commit, state }, { id }) => {
    return state.users[id]
      ? Promise.resolve(state.users[id])
      : fetchUser(id).then(user => commit('SET_USER', { id, user }))
  }
}

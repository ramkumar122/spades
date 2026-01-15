
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: './',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "route": "/"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 1441, hash: 'a581c5bf0f1576bf6fe4160018178660d1e91e9817b82b4e5604407588ba1a53', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 949, hash: 'c67fcf3f8711b64473c3fb68f84b6a61a23fef484f6a04881abf8868c76f482c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 13721, hash: 'dc9cfba58080a1b4ed4ee6c993820a1d6b5843239c9c3954933d633413086fbc', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-WZWTZBGV.css': {size: 3594, hash: 'l05sdCZ6yAg', text: () => import('./assets-chunks/styles-WZWTZBGV_css.mjs').then(m => m.default)}
  },
};

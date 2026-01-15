
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
    'index.csr.html': {size: 3109, hash: '0afbaf11f3b455189df3d76ca0811aa638c9555d100bfca5e9a3f39982c61a83', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 949, hash: 'f468b1f0e3d6efdfee398b50d782ce3a9c7b2d27d9f6ec1b207feefcbab4dc4e', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'index.html': {size: 15465, hash: '1df51761aa455f78f18ebb1c81d52361d3bf016d1a5e1ec15711e36262cf65e9', text: () => import('./assets-chunks/index_html.mjs').then(m => m.default)},
    'styles-ID7NCFMZ.css': {size: 6778, hash: 'j6zRh+enXlo', text: () => import('./assets-chunks/styles-ID7NCFMZ_css.mjs').then(m => m.default)}
  },
};

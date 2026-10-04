// tutor-mfe 21 (Ulmo) wraps the production build in its own
// webpack.prod-tutor.config.js, which loads ./webpack.prod.config.js when the
// app has one and otherwise requires @openedx/frontend-build. This fork is
// frozen on the Sumac line with the pre-rename @edx/frontend-build 13, so
// point the wrapper at that package instead.
module.exports = require('@edx/frontend-build/config/webpack.prod.config');

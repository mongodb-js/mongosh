'use strict';
// Babel has a dependency on browserslist (and in particular,
// caniuse-lite through browserslist, which is a fairly large
// npm package). However, the way in which we use babel does
// not actually require browserslist support, so we can safely
// stub this away.
module.exports = () => {
  throw new Error('browserslist not supported');
};

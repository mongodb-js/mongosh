const fs = require('fs-extra');
const path = require('path');

const copyTranslations = async() => {
  try {
    await fs.copy(
      path.join(__dirname, '..', 'src', 'locales'),
      path.join(__dirname, '..', 'lib', 'locales')
    );
    console.log('Copied translations.');
  } catch (err) {
    console.error(err);
  }
};

copyTranslations();

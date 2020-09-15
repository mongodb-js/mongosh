const downloadCenterSchema = {
  'type': 'object',
  'required': [
    'versions',
    'manual_link',
    'release_notes_link',
    'previous_releases_link',
    'development_releases_link',
    'supported_browsers_link',
    'tutorial_link'
  ],
  'properties': {
    'versions': {
      'type': 'array',
      'additionalItems': false,
      'items': {
        'type': 'object',
        'required': [
          '_id',
          'version',
          'platform'
        ],
        'properties': {
          '_id': {
            'type': 'string'
          },
          'version': {
            'type': 'string'
          },
          'platform': {
            'type': 'array',
            'additionalItems': false,
            'items': {
              'type': 'object',
              'required': [
                'arch',
                'os',
                'name',
                'download_link'
              ],
              'properties': {
                'arch': {
                  'type': 'string'
                },
                'os': {
                  'type': 'string'
                },
                'name': {
                  'type': 'string'
                },
                'download_link': {
                  'type': 'string'
                }
              },
              'additionalProperties': false
            }
          }
        },
        'additionalProperties': false
      }
    },
    'manual_link': {
      'type': 'string'
    },
    'release_notes_link': {
      'type': 'string'
    },
    'previous_releases_link': {
      'type': 'string'
    },
    'development_releases_link': {
      'type': 'string'
    },
    'supported_browsers_link': {
      'type': 'string'
    },
    'tutorial_link': {
      'type': 'string'
    }
  },
  'additionalProperties': false
};

export default downloadCenterSchema;

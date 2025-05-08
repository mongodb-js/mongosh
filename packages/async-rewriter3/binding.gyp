{
  'targets': [{
    'target_name': 'async_rewriter3',
    'sources': [ 'addon/binding.c' ],
    'libraries': [
      '<(PRODUCT_DIR)/../../target/release/libasync_rewriter3.a'
    ],
    'xcode_settings': {
      'MACOSX_DEPLOYMENT_TARGET': '12.0',
    }
  }]
}

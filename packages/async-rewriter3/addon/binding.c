#include <node_api.h>
#include <stdlib.h>

extern uint8_t async_rewrite_c(
    const uint8_t* input,
    uintptr_t input_len,
    uint8_t** output,
    uintptr_t* output_len,
    uint8_t debug_level);
extern void async_rewrite_free_result(
    uint8_t* output);

static napi_value async_rewrite_napi(napi_env env, napi_callback_info info) {
  napi_status status;
  napi_value argv[2];
  size_t argc = sizeof(argv) / sizeof(argv[0]);

  status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  if (status != napi_ok) {
    return NULL;
  }
  if (argc < 2) {
    napi_throw_error(env, NULL, "Wrong number of arguments");
    return NULL;
  }

  size_t bufsize = 0;
  status = napi_get_value_string_utf8(env, argv[0], NULL, 0, &bufsize);
  if (status != napi_ok) {
    return NULL;
  }
  uint8_t* input = (uint8_t*)malloc(bufsize + 1);
  if (input == NULL) {
    napi_throw_error(env, NULL, "Memory allocation failed");
    return NULL;
  }
  status = napi_get_value_string_utf8(env, argv[0], (char*)input, bufsize + 1, &bufsize);
  if (status != napi_ok) {
    free(input);
    return NULL;
  }
  input[bufsize] = '\0';
  uint32_t debug_level = 0;
  status = napi_get_value_uint32(env, argv[1], &debug_level);
  if (status != napi_ok) {
    free(input);
    return NULL;
  }

  uint8_t* output = NULL;
  uintptr_t output_len = 0;
  uint8_t result = async_rewrite_c(input, bufsize, &output, &output_len, debug_level);
  free(input);

  if (result != 0) {
    napi_throw_error(env, NULL, "Error in async_rewrite_c");
    return NULL;
  }

  napi_value result_value;
  status = napi_create_string_utf8(env, (const char*)output, output_len, &result_value);
  async_rewrite_free_result(output);
  if (status != napi_ok) {
    return NULL;
  }

  return result_value;
}

NAPI_MODULE_INIT() {
  napi_value exported_function;
  napi_status status;
  status = napi_create_function(env,
      "asyncRewrite",
      NAPI_AUTO_LENGTH,
      async_rewrite_napi,
      NULL,
      &exported_function);
  if (status != napi_ok) {
    return NULL;
  }
  status = napi_set_named_property(env,
    exports,
    "asyncRewrite",
    exported_function);
  if (status != napi_ok) {
    return NULL;
  }
  return exports;
}

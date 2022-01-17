#include <cwchar>
#include <cstdio>
#include "kerberos_sspi.h"

namespace node_kerberos {

static sspi_result sspi_success_result(INT ret);
static sspi_result sspi_error_result(DWORD errCode, const SEC_CHAR* msg);
static sspi_result sspi_error_result_with_message(const char* message);
static SEC_CHAR* base64_encode(const SEC_CHAR* value, DWORD vlen);
static SEC_CHAR* base64_decode(const SEC_CHAR* value, DWORD* rlen);
static CHAR* wide_to_utf8(WCHAR* value);

sspi_client_state::~sspi_client_state() {
    if (haveCtx) {
        DeleteSecurityContext(&ctx);
    }
    if (haveCred) {
        FreeCredentialsHandle(&cred);
    }
    free(spn);
    free(response);
    free(username);
}

sspi_result
auth_sspi_client_init(WCHAR* service,
                      ULONG flags,
                      WCHAR* user,
                      ULONG ulen,
                      WCHAR* domain,
                      ULONG dlen,
                      WCHAR* password,
                      ULONG plen,
                      WCHAR* mechoid,
                      sspi_client_state* state) {
    SECURITY_STATUS status;
    SEC_WINNT_AUTH_IDENTITY_W authIdentity{};
    TimeStamp ignored;

    state->response = NULL;
    state->username = NULL;
    state->qop = SECQOP_WRAP_NO_ENCRYPT;
    state->flags = flags;
    state->haveCred = 0;
    state->haveCtx = 0;
    state->spn = _wcsdup(service);
    if (state->spn == NULL) {
        return sspi_error_result_with_message("Ran out of memory assigning service");
    }

    if (*user) {
        authIdentity.User = (unsigned short*)user;
        authIdentity.UserLength = ulen;

        if (*password) {
            authIdentity.Password = (unsigned short*)password;
            authIdentity.PasswordLength = plen;
        }

        if (*domain) {
            authIdentity.Domain = (unsigned short*)domain;
            authIdentity.DomainLength = dlen;
        }

        authIdentity.Flags = SEC_WINNT_AUTH_IDENTITY_UNICODE;
    }

    /* Note that the first paramater, pszPrincipal, appears to be
     * completely ignored in the Kerberos SSP. For more details see
     * https://github.com/mongodb-labs/winkerberos/issues/11.
     * */
    status = AcquireCredentialsHandleW(/* Principal */
                                       NULL,
                                       /* Security package name */
                                       mechoid,
                                       /* Credentials Use */
                                       SECPKG_CRED_OUTBOUND,
                                       /* LogonID (We don't use this) */
                                       NULL,
                                       /* AuthData */
                                       *user ? &authIdentity : NULL,
                                       /* Always NULL */
                                       NULL,
                                       /* Always NULL */
                                       NULL,
                                       /* CredHandle */
                                       &state->cred,
                                       /* Expiry (Required but unused by us) */
                                       &ignored);
    fwprintf(stderr, L"AcquireCredentialsHandleW(NULL, %s, SECPKG_CRED_OUTBOUND, NULL, {%s, %s, <%d char passwd>}, NULL, NULL, [out], [ign]) = %ld\r\n",
             mechoid, 
             *user ? reinterpret_cast<const wchar_t*>(authIdentity.User) : L"NULL", 
             *user ? reinterpret_cast<const wchar_t*>(authIdentity.Domain) : L"NULL", 
             *user ? authIdentity.PasswordLength : 0,
             (long) status);
    if (status != SEC_E_OK) {
        return sspi_error_result(status, "AcquireCredentialsHandle");
    }

    state->haveCred = 1;
    return sspi_success_result(AUTH_GSS_COMPLETE);
}

sspi_result
auth_sspi_client_step(sspi_client_state* state, SEC_CHAR* challenge, SecPkgContext_Bindings* sec_pkg_context_bindings) {
    SecBufferDesc inbuf;
    SecBuffer inBufs[2];
    SecBufferDesc outbuf;
    SecBuffer outBufs[1];
    ULONG ignored;
    SECURITY_STATUS status = AUTH_GSS_CONTINUE;
    DWORD len;
    BOOL haveToken = FALSE;
    INT tokenBufferIndex = 0;
    sspi_result result;

    if (state->response != NULL) {
        free(state->response);
        state->response = NULL;
    }

    inbuf.ulVersion = SECBUFFER_VERSION;
    inbuf.pBuffers = inBufs;
    inbuf.cBuffers = 0;

    if (sec_pkg_context_bindings != NULL) {
        inBufs[inbuf.cBuffers].BufferType = SECBUFFER_CHANNEL_BINDINGS;
        inBufs[inbuf.cBuffers].pvBuffer = sec_pkg_context_bindings->Bindings;
        inBufs[inbuf.cBuffers].cbBuffer = sec_pkg_context_bindings->BindingsLength;
        inbuf.cBuffers++;
    }

    tokenBufferIndex = inbuf.cBuffers;
    if (state->haveCtx) {
        haveToken = TRUE;
        inBufs[tokenBufferIndex].BufferType = SECBUFFER_TOKEN;
        inBufs[tokenBufferIndex].pvBuffer = base64_decode(challenge, &len);
        if (!inBufs[tokenBufferIndex].pvBuffer) {
           return sspi_error_result_with_message("Unable to base64 decode pvBuffer");
        }

        inBufs[tokenBufferIndex].cbBuffer = len;
        inbuf.cBuffers++;
    }

    outbuf.ulVersion = SECBUFFER_VERSION;
    outbuf.cBuffers = 1;
    outbuf.pBuffers = outBufs;
    outBufs[0].pvBuffer = NULL;
    outBufs[0].cbBuffer = 0;
    outBufs[0].BufferType = SECBUFFER_TOKEN;

    status = InitializeSecurityContextW(/* CredHandle */
                                        &state->cred,
                                        /* CtxtHandle (NULL on first call) */
                                        state->haveCtx ? &state->ctx : NULL,
                                        /* Service Principal Name */
                                        state->spn,
                                        /* Flags */
                                        ISC_REQ_ALLOCATE_MEMORY | state->flags,
                                        /* Always 0 */
                                        0,
                                        /* Target data representation */
                                        SECURITY_NETWORK_DREP,
                                        /* Challenge (Set to NULL if no buffers are set) */
                                        inbuf.cBuffers > 0 ? &inbuf : NULL,
                                        /* Always 0 */
                                        0,
                                        /* CtxtHandle (Set on first call) */
                                        &state->ctx,
                                        /* Output */
                                        &outbuf,
                                        /* Context attributes */
                                        &ignored,
                                        /* Expiry (We don't use this) */
                                        NULL);
    fwprintf(stderr, L"InitializeSecurityContextW([cred], %s, %s, %ld, 0, SECURITY_NETWORK_DREP, %p, 0, [ctx], [out], [ctx], NULL]) = %ld\r\n",
             state->haveCtx ? L"[ctx]" : L"NULL", 
             state->spn,
             (long)(ISC_REQ_ALLOCATE_MEMORY | state->flags),
             inbuf.cBuffers > 0 ? &inbuf : NULL,
             (long) status);

    if (status != SEC_E_OK && status != SEC_I_CONTINUE_NEEDED) {
        result = sspi_error_result(status, "InitializeSecurityContext");
        goto done;
    }

    state->haveCtx = 1;
    state->context_complete = TRUE;
    if (outBufs[0].cbBuffer) {
        state->response = base64_encode((const SEC_CHAR*)outBufs[0].pvBuffer, outBufs[0].cbBuffer);
        if (!state->response) {
            status = AUTH_GSS_ERROR;
            goto done;
        }
    }

    if (status == SEC_E_OK) {
        /* Get authenticated username. */
        SecPkgContext_NamesW names;
        status = QueryContextAttributesW(
            &state->ctx, SECPKG_ATTR_NAMES, &names);

        if (status != SEC_E_OK) {
            result = sspi_error_result(status, "QueryContextAttributesW");
            goto done;
        }

        state->username = wide_to_utf8(names.sUserName);
        if (state->username == NULL) {
            result = sspi_error_result_with_message("Unable to allocate memory for username");
            goto done;
        }

        FreeContextBuffer(names.sUserName);
        result = sspi_success_result(AUTH_GSS_COMPLETE);
    } else {
        result = sspi_success_result(AUTH_GSS_CONTINUE);
    }
done:
    if (haveToken) {
        free(inBufs[tokenBufferIndex].pvBuffer);
    }
    if (outBufs[0].pvBuffer) {
        FreeContextBuffer(outBufs[0].pvBuffer);
    }

    return result;
}

sspi_result
auth_sspi_client_unwrap(sspi_client_state* state, SEC_CHAR* challenge) {
    sspi_result result;
    SECURITY_STATUS status;
    DWORD len;
    SecBuffer wrapBufs[2];
    SecBufferDesc wrapBufDesc;
    wrapBufDesc.ulVersion = SECBUFFER_VERSION;
    wrapBufDesc.cBuffers = 2;
    wrapBufDesc.pBuffers = wrapBufs;

    if (state->response != NULL) {
        free(state->response);
        state->response = NULL;
        state->qop = SECQOP_WRAP_NO_ENCRYPT;
    }

    if (!state->haveCtx) {
        return sspi_error_result_with_message("Uninitialized security context. You must use authGSSClientStep to initialize the security context before calling this function.");
    }

    wrapBufs[0].pvBuffer = base64_decode(challenge, &len);
    if (!wrapBufs[0].pvBuffer) {
        return sspi_error_result_with_message("Unable to decode base64 response");
    }

    wrapBufs[0].cbBuffer = len;
    wrapBufs[0].BufferType = SECBUFFER_STREAM;

    wrapBufs[1].pvBuffer = NULL;
    wrapBufs[1].cbBuffer = 0;
    wrapBufs[1].BufferType = SECBUFFER_DATA;

    status = DecryptMessage(&state->ctx, &wrapBufDesc, 0, &state->qop);
    if (status != SEC_E_OK) {
        result = sspi_error_result(status, "DecryptMessage");
        goto done;
    }

    if (wrapBufs[1].cbBuffer) {
        state->response = base64_encode((const SEC_CHAR*)wrapBufs[1].pvBuffer, wrapBufs[1].cbBuffer);
        if (!state->response) {
            result = sspi_error_result_with_message("Unable to base64 encode decrypted message");
            goto done;
        }
    }

    result = sspi_success_result(AUTH_GSS_COMPLETE);
done:
    if (wrapBufs[0].pvBuffer) {
        free(wrapBufs[0].pvBuffer);
    }

    return result;
}

sspi_result
auth_sspi_client_wrap(sspi_client_state* state,
                      SEC_CHAR* data,
                      SEC_CHAR* user,
                      ULONG ulen,
                      INT protect) {
    SECURITY_STATUS status;
    SecPkgContext_Sizes sizes;
    SecBuffer wrapBufs[3];
    SecBufferDesc wrapBufDesc;
    SEC_CHAR* decodedData = NULL;
    SEC_CHAR* inbuf;
    SIZE_T inbufSize;
    SEC_CHAR* outbuf;
    DWORD outbufSize;
    SEC_CHAR* plaintextMessage;
    ULONG plaintextMessageSize;

    if (state->response != NULL) {
        free(state->response);
        state->response = NULL;
    }

    if (!state->haveCtx) {
        return sspi_error_result_with_message("Uninitialized security context. You must use authGSSClientStep to initialize the security context before calling this function.");
    }

    status = QueryContextAttributes(&state->ctx, SECPKG_ATTR_SIZES, &sizes);
    if (status != SEC_E_OK) {
        return sspi_error_result(status, "QueryContextAttributes");
    }

    if (*user) {
        /* Length of user + 4 bytes for security layer (see below). */
        plaintextMessageSize = ulen + 4;
    } else {
        decodedData = base64_decode(data, &plaintextMessageSize);
        if (!decodedData) {
            return sspi_error_result_with_message("Unable to base64 decode message");
        }
    }

    inbufSize =
        sizes.cbSecurityTrailer + plaintextMessageSize + sizes.cbBlockSize;
    inbuf = (SEC_CHAR*)malloc(inbufSize);
    if (inbuf == NULL) {
        free(decodedData);
        return sspi_error_result_with_message("Unable to allocate memory for buffer");
    }

    plaintextMessage = inbuf + sizes.cbSecurityTrailer;
    if (*user) {
        /* Authenticate the provided user. Unlike pykerberos, we don't
         * need any information from "data" to do that.
         */
        plaintextMessage[0] = 1; /* No security layer */
        plaintextMessage[1] = 0;
        plaintextMessage[2] = 0;
        plaintextMessage[3] = 0;
        memcpy_s(
            plaintextMessage + 4,
            inbufSize - sizes.cbSecurityTrailer - 4,
            user,
            strlen(user));
    } else {
        /* No user provided. Just rewrap data. */
        memcpy_s(
            plaintextMessage,
            inbufSize - sizes.cbSecurityTrailer,
            decodedData,
            plaintextMessageSize);
        free(decodedData);
    }

    wrapBufDesc.cBuffers = 3;
    wrapBufDesc.pBuffers = wrapBufs;
    wrapBufDesc.ulVersion = SECBUFFER_VERSION;

    wrapBufs[0].cbBuffer = sizes.cbSecurityTrailer;
    wrapBufs[0].BufferType = SECBUFFER_TOKEN;
    wrapBufs[0].pvBuffer = inbuf;

    wrapBufs[1].cbBuffer = (ULONG)plaintextMessageSize;
    wrapBufs[1].BufferType = SECBUFFER_DATA;
    wrapBufs[1].pvBuffer = inbuf + sizes.cbSecurityTrailer;

    wrapBufs[2].cbBuffer = sizes.cbBlockSize;
    wrapBufs[2].BufferType = SECBUFFER_PADDING;
    wrapBufs[2].pvBuffer =
        inbuf + (sizes.cbSecurityTrailer + plaintextMessageSize);

    status = EncryptMessage(
        &state->ctx,
        protect ? 0 : SECQOP_WRAP_NO_ENCRYPT,
        &wrapBufDesc,
        0);
    if (status != SEC_E_OK) {
        free(inbuf);
        return sspi_error_result(status, "EncryptMessage");
    }

    outbufSize =
        wrapBufs[0].cbBuffer + wrapBufs[1].cbBuffer + wrapBufs[2].cbBuffer;
    outbuf = (SEC_CHAR*)malloc(sizeof(SEC_CHAR) * outbufSize);
    if (outbuf == NULL) {
        free(inbuf);
        return sspi_error_result_with_message("Unable to allocate memory for out buffer");
    }

    memcpy_s(outbuf,
             outbufSize,
             wrapBufs[0].pvBuffer,
             wrapBufs[0].cbBuffer);
    memcpy_s(outbuf + wrapBufs[0].cbBuffer,
             outbufSize - wrapBufs[0].cbBuffer,
             wrapBufs[1].pvBuffer,
             wrapBufs[1].cbBuffer);
    memcpy_s(outbuf + wrapBufs[0].cbBuffer + wrapBufs[1].cbBuffer,
             outbufSize - wrapBufs[0].cbBuffer - wrapBufs[1].cbBuffer,
             wrapBufs[2].pvBuffer,
             wrapBufs[2].cbBuffer);
    state->response = base64_encode(outbuf, outbufSize);

    sspi_result result;
    if (!state->response) {
        result = sspi_error_result_with_message("Unable to base64 decode outbuf");
    } else {
        result = sspi_success_result(AUTH_GSS_COMPLETE);
    }

    free(inbuf);
    free(outbuf);
    return result;
}

static sspi_result sspi_success_result(int ret) {
    return { ret, "", "" };
}

static sspi_result sspi_error_result(DWORD errCode, const SEC_CHAR* msg) {
    SEC_CHAR* err = NULL;
    DWORD status;
    DWORD flags = (FORMAT_MESSAGE_ALLOCATE_BUFFER |
                   FORMAT_MESSAGE_FROM_SYSTEM |
                   FORMAT_MESSAGE_IGNORE_INSERTS);

    status = FormatMessageA(flags,
                            NULL,
                            errCode,
                            MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT),
                            (LPSTR)&err,
                            0,
                            NULL);

    sspi_result result;
    result.code = AUTH_GSS_ERROR;
    if (status) {
        result.message = std::string(msg) + ": " + err;
    } else {
        result.message = msg;
    }
    LocalFree(err);

    return result;
}

static sspi_result sspi_error_result_with_message(const char* message) {
    return { AUTH_GSS_ERROR, message, "" };
}

static SEC_CHAR*
base64_encode(const SEC_CHAR* value, DWORD vlen) {
    SEC_CHAR* out = NULL;
    DWORD len;
    /* Get the correct size for the out buffer. */
    if (CryptBinaryToStringA((BYTE*)value,
                             vlen,
                             CRYPT_STRING_BASE64|CRYPT_STRING_NOCRLF,
                             NULL,
                             &len)) {
        out = (SEC_CHAR*)malloc(sizeof(SEC_CHAR) * len);
        if (out) {
            /* Encode to the out buffer. */
            if (CryptBinaryToStringA((BYTE*)value,
                                     vlen,
                                     CRYPT_STRING_BASE64|CRYPT_STRING_NOCRLF,
                                     out,
                                     &len)) {
                return out;
            } else {
                free(out);
            }
        }
    }

    return NULL;
}

static SEC_CHAR*
base64_decode(const SEC_CHAR* value, DWORD* rlen) {
    SEC_CHAR* out = NULL;
    /* Get the correct size for the out buffer. */
    if (CryptStringToBinaryA(value,
                             0,
                             CRYPT_STRING_BASE64,
                             NULL,
                             rlen,
                             NULL,
                             NULL)) {
        out = (SEC_CHAR*)malloc(sizeof(SEC_CHAR) * *rlen);
        if (out) {
            /* Decode to the out buffer. */
            if (CryptStringToBinaryA(value,
                                     0,
                                     CRYPT_STRING_BASE64,
                                     (BYTE*)out,
                                     rlen,
                                     NULL,
                                     NULL)) {
                return out;
            } else {
                free(out);
            }
        }
    }

    return NULL;
}

static CHAR*
wide_to_utf8(WCHAR* value) {
    CHAR* out;
    INT len = WideCharToMultiByte(CP_UTF8,
                                  0,
                                  value,
                                  -1,
                                  NULL,
                                  0,
                                  NULL,
                                  NULL);
    if (len) {
        out = (CHAR*)malloc(sizeof(CHAR) * len);
        if (!out) {
            return NULL;
        }

        if (WideCharToMultiByte(CP_UTF8,
                                0,
                                value,
                                -1,
                                out,
                                len,
                                NULL,
                                NULL)) {
            return out;
        } else {
            free(out);
        }
    }

    return NULL;
}

}

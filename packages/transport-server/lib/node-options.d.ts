import NodeAuthOptions from './node-auth-options';
import NodeFleOptions from './node-fle-options';
interface NodeOptions {
    auth?: NodeAuthOptions;
    authSource?: string;
    authMechanism?: string;
    autoEncryption?: NodeFleOptions;
    explicitlyIgnoreSession?: boolean;
    loggerLevel?: string;
    retryWrites?: boolean;
    tls?: boolean;
    tlsAllowInvalidCertificates?: boolean;
    tlsAllowInvalidHostnames?: boolean;
    tlsCAFile?: string;
    tlsCertificateKeyFile?: string;
    tlsCertificateKeyFilePassword?: string;
}
export default NodeOptions;

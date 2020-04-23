declare class MongoshRuntimeError extends Error {
    constructor(...args: any[]);
}
declare class MongoshInternalError extends Error {
    constructor(msg: any, opts?: any);
}
declare class MongoshUnimplementedError extends Error {
    constructor(...args: any[]);
}
declare class MongoshInvalidInputError extends Error {
    constructor(...args: any[]);
}
export { MongoshRuntimeError, MongoshInternalError, MongoshInvalidInputError, MongoshUnimplementedError };

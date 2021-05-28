import { ShellPlugin, ShellInternalState } from '@mongosh/shell-api';
import type { SnippetShellUserConfig, MongoshBus } from '@mongosh/types';
export interface SnippetOptions {
    installdir: string;
    internalState: ShellInternalState;
}
export interface ErrorMatcher {
    matches: RegExp[];
    message: string;
}
export interface SnippetDescription {
    name: string;
    snippetName: string;
    installSpec?: string;
    version: string;
    description: string;
    license: string;
    readme: string;
    errorMatchers?: ErrorMatcher[];
}
export interface SnippetIndexFile {
    indexFileVersion: 1;
    index: SnippetDescription[];
    metadata: {
        homepage: string;
    };
    sourceURL: string;
}
export declare class SnippetManager implements ShellPlugin {
    _internalState: ShellInternalState;
    installdir: string;
    repos: SnippetIndexFile[] | null;
    load: (filename: string) => Promise<void>;
    config: {
        get<T extends keyof SnippetShellUserConfig>(key: T): Promise<SnippetShellUserConfig[T]>;
    };
    print: (...args: any[]) => Promise<void>;
    npmArgv: string[];
    inflightFetchIndexPromise: Promise<SnippetIndexFile[]> | null;
    constructor({ installdir, internalState }: SnippetOptions);
    get messageBus(): MongoshBus;
    prepareNpm(): Promise<string[]>;
    prepareIndex(refreshMode?: 'force-refresh' | 'allow-cached'): Promise<SnippetIndexFile[]>;
    get snippets(): SnippetDescription[];
    registryBaseUrl(): Promise<string>;
    ensureSetup(): Promise<string[]>;
    editPackageJSON<T>(fn: (pjson: any) => T): Promise<T>;
    runNpm(...npmArgs: string[]): Promise<string>;
    search(): Promise<string>;
    loadAllSnippets(autoloadMode?: 'always' | 'only-autoload'): Promise<void>;
    runSnippetCommand(args: string[]): Promise<string>;
    runInstallLikeCmd(args: string[]): Promise<string>;
    helpText(snippet?: string): Promise<string>;
    showInfo(): Promise<string>;
    transformError(err: Error): Error;
}

import { ShellOutputEntry } from './shell-output';

export interface ShellState {
  output: readonly ShellOutputEntry[];
  history: readonly string[];
}

import React from 'react';
import {
  css,
  VirtualList,
  type VirtualListRef,
} from '@mongodb-js/compass-components';
import { ShellOutputLine, type ShellOutputEntry } from './shell-output-line';
export type { ShellOutputEntry } from './shell-output-line';

const containerStyles = css({ height: '100%' });

export const ShellOutput = ({
  output,
  listRef,
  scrollableContainerRef,
}: {
  output: ShellOutputEntry[];
  listRef: VirtualListRef;
  scrollableContainerRef: React.RefObject<HTMLDivElement>;
}) => {
  return (
    <div className={containerStyles}>
      <VirtualList
        dataTestId="shell-output-virtual-list"
        items={output}
        overScanCount={5}
        listRef={listRef}
        scrollableContainerRef={scrollableContainerRef}
        renderItem={(item, ref) => (
          <div ref={ref} data-testid="shell-output-line">
            <ShellOutputLine entry={item} />
          </div>
        )}
        estimateItemInitialHeight={() => 24}
      />
    </div>
  );
};

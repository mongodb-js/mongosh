import React, { useEffect, useRef } from 'react';
import {
  VirtualList,
  type VirtualListRef,
} from '@mongodb-js/compass-components';
import { ShellOutputLine, type ShellOutputEntry } from './shell-output-line';
export type { ShellOutputEntry } from './shell-output-line';

type ShellIOListProps = {
  output: ShellOutputEntry[];
  setInnerContainerRef: (ref: HTMLDivElement) => void;
  __TEST_LIST_HEIGHT?: number;
};

export const ShellOutput = ({
  output,
  setInnerContainerRef,
  __TEST_LIST_HEIGHT,
}: ShellIOListProps) => {
  const listRef: VirtualListRef = useRef();

  useEffect(() => {
    const lastIndex = output.length - 1;
    listRef.current?.resetAfterIndex(lastIndex);
    const timeout = setTimeout(() => {
      listRef.current?.scrollToItem(lastIndex, 'end');
    }, 100);
    return () => clearTimeout(timeout);
  }, [output]);

  return (
    <VirtualList
      dataTestId="shell-output-virtual-list"
      items={output}
      overScanCount={5}
      listRef={listRef}
      // TODO: Depends on adding this in compass components
      {...{ setInnerContainerRef }}
      renderItem={(item, ref) => (
        <div ref={ref} data-testid="shell-output-line">
          <ShellOutputLine entry={item} />
        </div>
      )}
      estimateItemInitialHeight={() => 24}
      __TEST_LIST_HEIGHT={__TEST_LIST_HEIGHT}
    />
  );
};

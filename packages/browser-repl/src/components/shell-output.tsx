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
};

export const ShellOutput = ({
  output,
  setInnerContainerRef,
}: ShellIOListProps) => {
  const listRef: VirtualListRef = useRef();

  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
    listRef.current?.scrollToItem(output.length - 1, 'end');
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
    />
  );
};

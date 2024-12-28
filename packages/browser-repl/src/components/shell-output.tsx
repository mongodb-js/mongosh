import React, { useEffect, useMemo, useRef } from 'react';
import {
  VirtualList,
  type VirtualListRef,
} from '@mongodb-js/compass-components';
import { ShellOutputLine, type ShellOutputEntry } from './shell-output-line';
export type { ShellOutputEntry } from './shell-output-line';

type ShellIOListProps = {
  output: ShellOutputEntry[];
  InputPrompt: JSX.Element;
  setScrollRef: (ref: HTMLDivElement) => void;
};

export const ShellIOList = ({
  output,
  InputPrompt,
  setScrollRef,
}: ShellIOListProps) => {
  const listRef: VirtualListRef = useRef();

  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
      setTimeout(() => {
        // After output changes, scroll to the end (which is
        // prompt input)
        listRef.current.scrollToItem(output.length, 'end');
      }, 100);
    }
  }, [output, listRef]);

  // Adding prompt to the input list so that its also rendered
  // by the virtual list
  const items = useMemo(() => [...output, { type: 'inputPrompt' }], [output]);

  return (
    <VirtualList
      dataTestId="shell-output-virtual-list"
      items={items}
      overScanCount={20}
      listRef={listRef}
      scrollableContainerRef={setScrollRef}
      renderItem={(item, ref) => {
        return (
          <div ref={ref}>
            {item.type === 'inputPrompt' ? (
              InputPrompt
            ) : (
              <ShellOutputLine entry={item as ShellOutputEntry} />
            )}
          </div>
        );
      }}
      estimateItemInitialHeight={() => 24}
    />
  );
};

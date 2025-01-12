import React, { useEffect, useMemo, useRef } from 'react';
import {
  VirtualList,
  type VirtualListRef,
} from '@mongodb-js/compass-components';
import { ShellOutputLine, type ShellOutputEntry } from './shell-output-line';
export type { ShellOutputEntry } from './shell-output-line';

type ShellIOListProps = {
  output: ShellOutputEntry[];
  renderInputPrompt: () => JSX.Element;
  setScrollRef: (ref: HTMLDivElement) => void;
  __TEST_OVERSCAN_COUNT?: number;
  __TEST_LIST_HEIGHT?: number;
};

export const ShellOutput = ({
  output,
  renderInputPrompt,
  setScrollRef,
  __TEST_OVERSCAN_COUNT,
  __TEST_LIST_HEIGHT,
}: ShellIOListProps) => {
  const listRef: VirtualListRef = useRef();

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    (window as any).listRef = listRef.current;
    listRef.current.resetAfterIndex(0);
    const timeout = setTimeout(() => {
      // After output changes, scroll to the end (which is
      // prompt input)
      listRef.current.scrollToItem(output.length, 'end');
    }, 100);
    return () => clearTimeout(timeout);
  }, [output, listRef]);

  // Adding prompt to the input list so that its also rendered
  // by the virtual list
  const items = useMemo(() => [...output, { type: 'inputPrompt' }], [output]);

  return (
    <VirtualList
      dataTestId="shell-output-virtual-list"
      items={items}
      overScanCount={__TEST_OVERSCAN_COUNT ?? 1}
      listRef={listRef}
      scrollableContainerRef={setScrollRef}
      renderItem={(item, ref) => {
        if (item.type === 'inputPrompt') {
          return (
            <div ref={ref} data-testid="shell-input-prompt">
              {renderInputPrompt()}
            </div>
          );
        }
        return (
          <div ref={ref} data-testid="shell-output-line">
            <ShellOutputLine entry={item as ShellOutputEntry} />
          </div>
        );
      }}
      estimateItemInitialHeight={() => 24}
      __TEST_LIST_HEIGHT={__TEST_LIST_HEIGHT}
    />
  );
};

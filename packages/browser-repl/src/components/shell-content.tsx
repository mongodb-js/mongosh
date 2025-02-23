import React, { useEffect, useRef, useState } from 'react';
import { ShellOutputLine, type ShellOutputEntry } from './shell-output-line';
import {
  rafraf,
  VirtualList,
  type VirtualListRef,
} from '@mongodb-js/compass-components';

export const ShellContent = ({
  output,
  InputPrompt,
  __TEST_LIST_HEIGHT,
}: {
  output: ShellOutputEntry[];
  InputPrompt: JSX.Element;
  __TEST_LIST_HEIGHT?: number;
}) => {
  const [inputEditorHeight, setInputEditorHeight] = useState(24);
  const shellInputContainerRef = useRef<HTMLDivElement>(null);

  const listRef: VirtualListRef = useRef();

  useEffect(() => {
    const lastIndex = output.length - 1;
    listRef.current?.resetAfterIndex(lastIndex);
    const abortFn = rafraf(() => {
      listRef.current?.scrollToItem(lastIndex, 'end');
    });
    return abortFn;
  }, [output.length]);

  useEffect(() => {
    if (!shellInputContainerRef.current) {
      return;
    }
    const observer = new ResizeObserver(([input]) => {
      setInputEditorHeight(input.contentRect.height);
    });
    observer.observe(shellInputContainerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <div style={{ height: `calc(100% - ${inputEditorHeight}px)` }}>
        <VirtualList
          dataTestId="shell-output-virtual-list"
          items={output}
          overScanCount={10}
          listRef={listRef}
          renderItem={(item, ref) => (
            <div ref={ref} data-testid="shell-output-line">
              <ShellOutputLine entry={item} />
            </div>
          )}
          estimateItemInitialHeight={() => 0}
          __TEST_LIST_HEIGHT={__TEST_LIST_HEIGHT}
        />
      </div>
      <div ref={shellInputContainerRef}>{InputPrompt}</div>
    </>
  );
};

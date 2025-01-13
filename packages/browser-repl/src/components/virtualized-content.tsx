import React, { useEffect, useRef, useState } from 'react';
import type { ShellOutputEntry } from './shell-output-line';
import { css, type VirtualListRef } from '@mongodb-js/compass-components';
import { ShellOutput } from './shell-output';

export const VirtualizedContent = ({
  output,
  renderInputPrompt,
}: {
  output: ShellOutputEntry[];
  renderInputPrompt: () => React.ReactNode;
}) => {
  // To keep track of the height (to reduce from list height to avoid double scroll)
  const shellInputContainerRef = useRef<HTMLDivElement>(null);
  const listRef: VirtualListRef = useRef(null);
  const scrollableContainerRef = useRef<HTMLDivElement | null>(null);
  const [promptHeight, setPromptHeight] = useState(
    () => shellInputContainerRef.current?.clientHeight ?? 24
  );

  // Resize observer to keep track of the prompt height
  useEffect(() => {
    if (!shellInputContainerRef.current) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPromptHeight(entry.contentRect.height);
      }
    });
    observer.observe(shellInputContainerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [shellInputContainerRef]);

  // Reset the list when new output is added and scroll to bottom
  // as new item is added
  useEffect(() => {
    listRef.current?.resetAfterIndex(output.length);
    // As the output can be long (not all being visible within viewport),
    // scroll to the bottom of the output list when new output is added.
    scrollableContainerRef.current?.scrollTo(
      0,
      scrollableContainerRef.current.scrollHeight
    );
  }, [output.length, listRef, scrollableContainerRef]);

  return (
    <>
      <div
        className={css({
          // avoid double scroll
          height: `calc(100% - ${promptHeight}px)`,
          overFlowY: 'hidden',
        })}
      >
        <ShellOutput
          output={output ?? []}
          listRef={listRef}
          scrollableContainerRef={scrollableContainerRef}
        />
      </div>
      <div ref={shellInputContainerRef}>{renderInputPrompt()}</div>
    </>
  );
};

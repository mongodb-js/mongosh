import React, { useState, useContext, useEffect, useRef, useMemo, createContext, useCallback } from 'react';
import { render, Box, Text, useInput, useFocus, useFocusManager, useApp } from 'ink';
import { Readable, Writable } from 'stream';
import { inspect } from 'util';
import { bson } from '@mongosh/service-provider-core';
import * as clipboardy from 'clipboardy'
import { formatForJSONOutput } from './format-json'
import { types } from 'util'
import useStdoutDimensions from 'ink-use-stdout-dimensions'
import EventEmitter from 'events';

function isValidIdentifier(identifier: string) {
  // Quick check for common case first
  if (/[.\s"'()[\];={}]/.test(identifier)) {
    return false;
  }
  try {
    // Everything else we check using eval as regex methods of checking are quite
    // hard to do (see https://mathiasbynens.be/notes/javascript-identifiers-es6)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    new Function(`"use strict";let ${identifier};`);
    return true;
  } catch {
    return false;
  }
}

function useJSValueState<P extends keyof JSValueState>(
  model: JSValueModel | undefined | null,
  props: P[]
): [Readonly<Pick<JSValueState, P>>, (update: Partial<JSValueState>) => void] {
  const pick = useCallback((state: Readonly<JSValueState>) => Object.fromEntries(Object.entries(state).filter(([p]) => props.includes(p as P))), [props]);
  const [state, setState] = useState<JSValueState>(pick(model?.state ?? {}));
  useEffect(() => {
    if (!model) return;
    const listener = () => {
      if (props.some(p => state[p] !== model.state[p]))
        setState(pick(model.state));
    };
    model.on('updated', listener);
    return () => void model.off('updated', listener);
  }, [model, state, setState])
  return [state, (update) => model?.updateState(update)];
}

interface JSValueState {
  isFocused?: boolean;
  isExpanded?: boolean;
  isHidden?: boolean;
  goToFieldSearchString?: string;
  currentRow?: number;
}

class JSValueModel extends EventEmitter {
  public readonly id: number;
  public readonly key: string | symbol;
  public readonly desc: PropertyDescriptor;
  public readonly parent: JSValueModel | null;
  private children_: readonly JSValueModel[] | null = null;

  private state_: Readonly<JSValueState> = {};

  private static _id = 0;

  constructor(key: string | symbol, desc: PropertyDescriptor, parent: JSValueModel | null) {
    super();
    this.setMaxListeners(Infinity);
    this.id = JSValueModel._id++;
    this.key = key;
    this.desc = desc;
    this.parent = parent;
  }

  get state(): JSValueState {
    return this.state_;
  }
  updateState(update: Partial<JSValueState>): void {
    update = Object.fromEntries(
      Object.entries(update).filter(([key, value]) => this.state_[key as keyof JSValueState] !== value)
    );
    if (Object.keys(update).length === 0) return;
    // console.log('updating state', this.key, this.state_, update)
    this.state_ = {...this.state_, ...update};
    this.emit('updated');
  }

  get value(): unknown {
    return this.desc.value;
  }

  get isPrimitive(): boolean {
    return ('value' in this.desc) && (!this.value || (typeof this.value !== 'function' && typeof this.value !== 'object'));
  }

  get isPlainObject(): boolean {
    const value = this.value;
    return 'value' in this.desc
      && typeof value === 'object'
      && value !== null
      && !types.isDate(value)
      && !types.isRegExp(value)
      && !types.isAnyArrayBuffer(value)
      && !types.isArrayBufferView(value)
      && !types.isBoxedPrimitive(value)
      && !types.isPromise(value)
      && !types.isNativeError(value)
      && !types.isWeakMap(value)
      && !types.isWeakSet(value)
      && !('_bsontype' in value)
  }

  get sizeDisplay(): string {
    if (!this.isPlainObject) return '';
    if (types.isMap(this.value) || types.isSet(this.value)) return `{ ${this.value.size} entries }`;
    if (Array.isArray(this.value)) return `[ ${this.value.length} entries ]`
    const nprops = Object.getOwnPropertyNames(this.value).length + Object.getOwnPropertySymbols(this.value).length;
    return `{ ${nprops} fields }`;
  }

  get isUnindexedContainer(): boolean {
    return types.isSet(this.value) || Array.isArray(this.value);
  }

  get children(): readonly JSValueModel[] {
    return this.children_ ??= (() => {
      if (!this.isPlainObject) return [];
      if (types.isMap(this.value)) {
        return [...this.value].map(([key, value]) => new JSValueModel(key, { value, enumerable: true, configurable: true, writable: true }, this));
      } else if (types.isSet(this.value)) {
        return [...this.value].map((value, i) => new JSValueModel(`${i}`, { value, enumerable: true, configurable: true, writable: true }, this));
      } else if (Array.isArray(this.value)) {
        return this.value.map((value, i) => new JSValueModel(`${i}`, { value, enumerable: true, configurable: true, writable: true }, this));
      } else {
        const descriptorObject = Object.getOwnPropertyDescriptors(this.value);
        return [...Object.getOwnPropertyNames(descriptorObject), ...Object.getOwnPropertySymbols(descriptorObject)]
          .map(key => [key, descriptorObject[key as keyof typeof descriptorObject]] as const)
          .sort(([,a], [,b]) => +(a.enumerable || 0) - +(b.enumerable || 0))
          .map(([key, desc]) => new JSValueModel(key, desc, this));
      }
    })();
  }

  get ctorName(): string {
    const proto = Object.getPrototypeOf(this.value);
    let ctorName;
    if (proto === null) {
      return 'Object [null prototype]'
    } else {
      const ctor = Object.getOwnPropertyDescriptor(proto, 'constructor')?.value;
      return (ctor && Object.getOwnPropertyDescriptor(ctor, 'name')?.value) || 'Object';
    }
  }

  get focusId(): string {
    return `focus-${this.id}`;
  }

  getGoToFieldPrefixedFields(): readonly JSValueModel[] {
    const { goToFieldSearchString } = this.state;
    if (goToFieldSearchString === undefined) return [];
    let fields = this.children.filter(({key}) => String(key).startsWith(goToFieldSearchString));
    if (fields?.length === 0)
      fields = this.children.filter(({key}) => String(key).toLowerCase().startsWith(goToFieldSearchString.toLowerCase()));
    return fields ?? [];
  }

  *expandedChildren(): Iterable<JSValueModel> {
    yield this;
    if (this.state.isExpanded) {
      for (const child of this.children_ ?? [])
        yield* child.expandedChildren();
    }
  }

  *allChildren(): Iterable<JSValueModel> {
    yield this;
    for (const child of this.children)
      yield* child.allChildren();
  }
}

function Value({ jsValue, autoExpand = false, showKey = true }: {
  jsValue: JSValueModel,
  autoExpand?: boolean,
  showKey?: boolean
}) {
  const [{ isExpanded, isFocused, isHidden, goToFieldSearchString }, updateModelState] =
    useJSValueState(jsValue, ['isExpanded', 'isFocused', 'isHidden', 'goToFieldSearchString']);
  const [{ goToFieldSearchString: parentSearchString }] = useJSValueState(jsValue.parent, ['goToFieldSearchString']);
  const goToPrefixedProps = useMemo(() => jsValue.parent?.getGoToFieldPrefixedFields() ?? [], [jsValue.parent, parentSearchString]);
  useFocus({ id: jsValue.focusId, autoFocus: isFocused });

  useEffect(() => updateModelState({isExpanded: autoExpand}), [jsValue]);

  const expander = <>
    <Text inverse={isFocused}>{isExpanded ? '▾' : '▸'}</Text><Text> </Text>
  </>

  const keyDisplay = useMemo(() => {
    if (!showKey) return <></>;
    let keyWithHighlighting: string | JSX.Element = String(jsValue.key);
    let isHighlighted = false;
    if (parentSearchString !== undefined && goToPrefixedProps.includes(jsValue)) {
      isHighlighted = true;
      if (typeof jsValue.key === 'string' && !isValidIdentifier(jsValue.key) && !jsValue.parent?.isUnindexedContainer) {
        keyWithHighlighting = <>
          "<Text underline>{JSON.stringify(parentSearchString).slice(1,-1)}</Text>
          <Text>{JSON.stringify(keyWithHighlighting.slice(parentSearchString.length)).slice(1,-1)}</Text>"
        </>
      } else {
        keyWithHighlighting = <>
          <Text underline>{parentSearchString}</Text>
          <Text>{keyWithHighlighting.slice(parentSearchString.length)}</Text>
        </>
      }
    }
    let keyDisplay;
    if (jsValue.parent?.isUnindexedContainer) {
      keyDisplay = <Text color="gray">{keyWithHighlighting}</Text>
    } else if (typeof jsValue.key === 'symbol') {
      keyDisplay = <Text>[{keyWithHighlighting}]</Text>
    } else if (!isValidIdentifier(jsValue.key)) {
      keyDisplay = <Text>{isHighlighted ? keyWithHighlighting : JSON.stringify(jsValue.key)}</Text>
    } else {
      keyDisplay = <Text>{keyWithHighlighting}</Text>
    }
    return <Box>{keyDisplay}<Text>: </Text></Box>;
  }, [jsValue, showKey, goToPrefixedProps, parentSearchString]);

  if (jsValue.isPlainObject) {
    return <Box flexDirection="column">
      { !isHidden && <Box>
        {keyDisplay}
        {expander}
        <Box>
          <Text>
            <Text color="yellow">{jsValue.ctorName}</Text> {jsValue.sizeDisplay}
            {goToFieldSearchString !== undefined && isFocused && <Text color="gray"> [type to select a field]</Text>}
          </Text>
        </Box>
      </Box> }
      { isExpanded && <Box marginLeft={2} flexDirection="column">
        {jsValue.children.map((child, i) => {
          let valueDisplay;
          if (child.desc.get && child.desc.set) {
            valueDisplay = <Text color="gray">[Getter/Setter]</Text>
          } else if (child.desc.get) {
            valueDisplay = <Text color="gray">[Getter]</Text>
          } else if (child.desc.set) {
            valueDisplay = <Text color="gray">[Setter]</Text>
          } else {
            valueDisplay = <Value jsValue={child} />
          }

          return <Box key={`prop-${i}`}>{valueDisplay}</Box>;
        })}
      </Box>
      }
    </Box>
  }

  if (isHidden) return <></>

  const { value } = jsValue;
  const color: React.ComponentProps<typeof Text>['color'] =
    typeof value === 'string' ? 'green' :
    typeof value === 'number' ? 'yellow' :
    types.isDate(value) ? 'magenta' :
    types.isRegExp(value) ? 'red' :
    (value && typeof value === 'object' && '_bsontype' in value) ? 'cyan' :
    undefined;
  const inspected = inspect(value, {
    maxStringLength: isExpanded ? Infinity : 50
  });
  const useExpander = typeof value === 'string' && value.length >= 50;
  if (useExpander) {
    return <Box>
      {keyDisplay}
      {expander}
      <Text color={color}>{inspected}</Text>
    </Box>
  } else {
    return <Box>
      {keyDisplay}
      <Text color={color} inverse={isFocused}>{inspected[0]}</Text>
      <Text color={color}>{inspected.slice(1)}</Text>
    </Box>
  }
}

function Container({ value } : { value: unknown }) {
  const root = useMemo(() => {
    const model = new JSValueModel('_root', { value, enumerable: true, configurable: true, writable: true }, null);
    model.updateState({ isFocused: true })
    return model;
  }, [value]);
  const currentFocusRef = useRef(root);

	const { exit } = useApp();
  const [ cols, rows ] = useStdoutDimensions();
  const { focus: inkFocus } = useFocusManager();
  const rowOffset = useRef(0);
  const rowsVisible = rows - 3;
  const [scrollbarState, setScrollbarState] = useState<readonly [number, number]>([0, 1]);
  const scrollbar = useMemo(() => {
    const [start, end] = scrollbarState;

    if (start === 0 && end === 1) return null;
    const startRow = (start * rowsVisible) | 0;
    const endRow = (end * rowsVisible) | 0;

    return <Box alignSelf="flex-end" marginRight={0} width={1} height={rowsVisible} flexDirection="column">
      <Box width={1} height={startRow} flexDirection="column" />
      <Box width={1} height={endRow-startRow} flexDirection="column"><Text wrap="wrap" inverse>{' '.repeat(endRow-startRow)}</Text></Box>
      <Box width={1} height={rowsVisible-startRow} flexDirection="column" />
    </Box>
  }, [scrollbarState, rowsVisible]);

  function focus(target: JSValueModel) {
    if (currentFocusRef.current === target) return;
    currentFocusRef.current.updateState({
      isFocused: false
    });
    currentFocusRef.current = target;
    target.updateState({
      isFocused: true
    })
    inkFocus(target.focusId)
    if (target.state.isHidden) {
      if ((target.state.currentRow ?? 0) < rowOffset.current)
        pageUp();
      else
        pageDown();
    }
  }
  function pageUp() {
    rowOffset.current = Math.max(0, rowOffset.current - (rows * 0.8) | 0);
    updateVisibility();
  }
  function pageDown() {
    rowOffset.current = Math.min([...root.expandedChildren()].length - rowsVisible, rowOffset.current + (rows * 0.8) | 0);
    updateVisibility();
  }

  function updateVisibility() {
    const rowEnd = rowOffset.current + rowsVisible;
    let i = 0;
    for (const node of root.expandedChildren()) {
      node.updateState({ isHidden: i < rowOffset.current || i >= rowEnd, currentRow: i })
      i++;
    }

    setScrollbarState([Math.max(0, rowOffset.current / i), Math.min(1, rowEnd / i)]);
  }

  useInput((input, key) => {
    const currentFocus = currentFocusRef.current;
    if (input === 'q') {
      exit();
      return;
    }

    if (input === 'g' && currentFocus.state.goToFieldSearchString === undefined) {
      currentFocus.updateState({
        goToFieldSearchString: '',
        isExpanded: true
      })
      updateVisibility();
      return;
    }
    if (currentFocus.state.goToFieldSearchString !== undefined) {
      if (key.escape) {
        currentFocus.updateState({
          goToFieldSearchString: undefined
        })
      } else if (key.return) {
        const child = currentFocus.getGoToFieldPrefixedFields()[0];
        currentFocus.updateState({
          goToFieldSearchString: undefined
        })
        if (child) {
          focus(child);
        }
      } else if (key.backspace || key.delete) {
        currentFocus.updateState({
          goToFieldSearchString: currentFocus.state.goToFieldSearchString.slice(0, -1)
        })
      } else {
        currentFocus.updateState({
          goToFieldSearchString: currentFocus.state.goToFieldSearchString + input
        })
      }
      return;
    } else if (key.escape) {
      focus(root);
    } else if (input === 'x') {
      for (const node of root.expandedChildren())
        node.updateState({ isExpanded: true })
      updateVisibility();
    } else if (input === 'z') {
      for (const node of root.expandedChildren())
        node.updateState({ isExpanded: node === root })
      updateVisibility();
    } else if (input === 'c') {
      clipboardy.writeSync(formatForJSONOutput(currentFocus.value, 'relaxed'));
    } if (input === ' ') {
      currentFocus.updateState({
        isExpanded: !currentFocus.state.isExpanded
      })
      updateVisibility();
    } else if (key.leftArrow && currentFocus.state.isExpanded) {
      currentFocus.updateState({
        isExpanded: false
      })
      updateVisibility();
    } else if (key.leftArrow) {
      if (currentFocus.parent)
      focus(currentFocus.parent);
    } else if ((key.rightArrow || key.return) && !currentFocus.state.isExpanded) {
      currentFocus.updateState({
        isExpanded: true
      })
      updateVisibility();
    } else if (key.downArrow || (key.tab && !key.shift) || (key.rightArrow || key.return)) {
      const allVisible = [...root.expandedChildren()];
      const index = allVisible.indexOf(currentFocus);
      if (index >= 0 && index < allVisible.length - 1) focus(allVisible[index+1]);
    } else if (key.upArrow || (key.tab && key.shift)) {
      const allVisible = [...root.expandedChildren()];
      const index = allVisible.indexOf(currentFocus);
      if (index > 0) focus(allVisible[index-1]);
    } else if (key.pageDown) {
      pageDown();
    } else if (key.pageUp) {
      pageUp();
    }
  });

  return (
    <Box borderStyle="single" width={cols} height={rows}>
      <Box flexDirection='column' flexGrow={1}>
        <Box flexGrow={1}>
          <Value jsValue={root} autoExpand={true} showKey={false} />
        </Box>
        <Box borderStyle="single" width="100%" alignSelf="flex-end">
          <Text><Text underline>q</Text> Quit </Text>
          <Text><Text underline>c</Text> Copy as EJSON </Text>
          <Text><Text underline>x</Text> Expand all </Text>
          <Text><Text underline>z</Text> Collapse all </Text>
          <Text><Text underline>→</Text> Expand </Text>
          <Text><Text underline>←</Text> Collapse </Text>
          <Text><Text underline>g</Text> Go to field </Text>
        </Box>
      </Box>
      {scrollbar}
    </Box>
  );
}

export async function viewObject(value: unknown, { output, input }: { output: Writable, input: Readable }) {
  const maxInputListeners = input.getMaxListeners();
  input.setMaxListeners(Infinity);
  const instance = render(<Container value={value} />, {
    stdout: output as any,
    stderr: output as any,
    stdin: input as any
  });
  try {
    await instance.waitUntilExit();
  } finally {
    input.setMaxListeners(maxInputListeners);
    while ((input as any)._handle.reading === true)
      await new Promise(setImmediate);
    input.resume();
    while ((input as any)._handle.reading === false)
      await new Promise(setImmediate);
  }
}

if (require.main === module) {
const obj = bson.EJSON.deserialize({"host":"cluster0-shard-00-02.ucdwm.mongodb.net:27017","version":"5.0.15","process":"mongod","pid":1955,"uptime":330233,"uptimeMillis":330233668,"uptimeEstimate":330233,"localTime":{"$date":"2023-03-06T14:54:04.936Z"},"asserts":{"regular":0,"warning":0,"msg":0,"user":0,"rollovers":0},"connections":{"current":5,"available":495,"totalCreated":5},"extra_info":{"note":"fields vary by platform","page_faults":0},"network":{"bytesIn":6787,"bytesOut":10797,"numRequests":23},"opcounters":{"insert":0,"query":0,"update":0,"delete":0,"getmore":0,"command":23,"deprecated":{"query":0,"getmore":0}},"opcountersRepl":{"insert":0,"query":0,"update":0,"delete":0,"getmore":0,"command":0,"deprecated":{"query":0,"getmore":0}},"repl":{"topologyVersion":{"processId":{"$oid":"6400f4934c8d467c7322a0e1"},"counter":6},"hosts":["cluster0-shard-00-00.ucdwm.mongodb.net:27017","cluster0-shard-00-01.ucdwm.mongodb.net:27017","cluster0-shard-00-02.ucdwm.mongodb.net:27017"],"setName":"atlas-jt9dqp-shard-0","setVersion":3,"isWritablePrimary":true,"secondary":false,"primary":"cluster0-shard-00-02.ucdwm.mongodb.net:27017","tags":{"nodeType":"ELECTABLE","region":"US_EAST_1","workloadType":"OPERATIONAL","provider":"AWS"},"me":"cluster0-shard-00-02.ucdwm.mongodb.net:27017","electionId":{"$oid":"7fffffff0000000000000075"},"lastWrite":{"opTime":{"ts":{"$timestamp":{"t":1678114444,"i":16}},"t":117},"lastWriteDate":{"$date":"2023-03-06T14:54:04Z"},"majorityOpTime":{"ts":{"$timestamp":{"t":1678114444,"i":15}},"t":117},"majorityWriteDate":{"$date":"2023-03-06T14:54:04Z"}},"primaryOnlyServices":{"TenantMigrationDonorService":{"state":"running","numInstances":0},"TenantMigrationRecipientService":{"state":"running","numInstances":0}},"rbid":1},"storageEngine":{"name":"wiredTiger","supportsCommittedReads":true,"oldestRequiredTimestampForCrashRecovery":{"$timestamp":{"t":1678114399,"i":1}},"supportsPendingDrops":true,"dropPendingIdents":0,"supportsSnapshotReadConcern":true,"readOnly":false,"persistent":true,"backupCursorOpen":false,"supportsResumableIndexBuilds":true},"mem":{"bits":64,"resident":0,"virtual":0,"supported":true,"mapped":0,"mappedWithJournal":0},"metrics":{"aggStageCounters":{"search":0,"searchBeta":0,"searchMeta":0},"operatorCounters":{"match":{"text":0,"regex":0}},"atlas":{"connectionPool":{"totalCreated":35721}}},"ok":1,"$clusterTime":{"clusterTime":{"$timestamp":{"t":1678114444,"i":16}},"signature":{"hash":{"$binary":{"base64":"NguP5/Xkd+8jdjISou63bNPVsDs=","subType":"00"}},"keyId":7163344273872519000}},"operationTime":{"$timestamp":{"t":1678114444,"i":16}},"opLatencies":{"reads":{"latency":0,"ops":0},"writes":{"latency":0,"ops":0},"commands":{"latency":5621,"ops":20}},"atlasVersion":{"version":"20230215.0.0.1676489897","gitVersion":"4591fd75e0047e1fc10dc2b17529b650b2798af7"}})
viewObject(obj, { output: process.stdout, input: process.stdin }).then(() => process.stdin.pause())
}
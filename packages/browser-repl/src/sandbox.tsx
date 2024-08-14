import ReactDOM from 'react-dom';
import React, { useEffect, useMemo, useState } from 'react';
import {
  css,
  ThemeProvider,
  Theme,
  Description,
  FormFieldContainer,
  Label,
  TextArea,
  TextInput,
  Toggle,
  injectGlobal,
  cx,
} from '@mongodb-js/compass-components';
import { IframeRuntime } from './iframe-runtime';
import { Shell } from './index';
import type { ShellOutputEntry } from './components/shell-output-line';
import type { ConnectionInfo } from '@mongosh/service-provider-core';

injectGlobal({
  body: {
    margin: 0,
  },
  '*': {
    boxSizing: 'border-box',
  },
  'input[type=number]': {
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
  },
});

const sandboxContainer = css({
  width: '100vw',
  height: '100vh',
  overflowX: 'hidden',
  overflowY: 'auto',
  maxHeight: '100vh',
});

const shellContainer = css({
  height: '50vh',
  maxHeight: 320,
});

const controlsContainer = css({
  padding: '24px',
  paddingTop: 0,
  paddingBottom: 0,
});

const textarea = css({
  textarea: {
    resize: 'vertical',
    minHeight: '100px',
  },
});

const textInput = css({
  minWidth: 250,
});

const formField = css({
  display: 'grid',
  gridTemplateAreas: `
    "label       input"
    "description input"
  `,
  gridTemplateColumns: '2fr 1fr',
  columnGap: 16,
  justifyItems: 'start',
  alignItems: 'start',
  '& :nth-child(1)': {
    gridArea: 'label',
  },
  '& :nth-child(2)': {
    gridArea: 'description',
  },
  '& :nth-child(3)': {
    gridArea: 'input',
    justifySelf: 'end',
  },
});

const delay = (msecs = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, msecs);
  });

class DemoServiceProvider {
  async buildInfo(): Promise<object> {
    await delay();
    return {
      version: '4.0.0',
      modules: ['other', 'enterprise'],
    };
  }

  async getConnectionInfo(): Promise<ConnectionInfo> {
    return {
      buildInfo: await this.buildInfo(),
      extraInfo: {
        uri: 'mongodb://localhost/',
      },
    };
  }

  getTopology(): object {
    return {
      description: {
        type: 'ReplicaSetWithPrimary',
        setName: 'replset',
      },
    };
  }

  async listDatabases(): Promise<any> {
    await delay(2000);

    return {
      databases: [
        { name: 'db1', sizeOnDisk: 10000, empty: false },
        { name: 'db2', sizeOnDisk: 20000, empty: false },
        { name: 'db-with-long-name', sizeOnDisk: 30000, empty: false },
        { name: '500mb', sizeOnDisk: 500000000, empty: false },
      ],
      totalSize: 50000,
      ok: 1,
    };
  }

  async listCollections(): Promise<any> {
    await delay(2000);

    return [
      { name: 'nested_documents', type: 'collection' },
      { name: 'decimal128', type: 'collection' },
      { name: 'coll', type: 'collection' },
      { name: 'people_imported', type: 'timeseries' },
      { name: 'cats', type: 'view' },
      { name: 'system.views', type: '' },
    ];
  }

  async stats(): Promise<any> {
    await delay();
    return { size: 1000 };
  }
}

const runtime = new IframeRuntime(new DemoServiceProvider() as any);

const IframeRuntimeExample: React.FunctionComponent = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [redactInfo, setRedactInfo] = useState(false);
  const [maxOutputLength, setMaxOutputLength] = useState(1000);
  const [maxHistoryLength, setMaxHistoryLength] = useState(1000);
  const [initialInput, setInitialInput] = useState('');
  const [initialEvaluate, setInitialEvaluate] = useState<string[]>([]);
  const [initialOutput] = useState<ShellOutputEntry[]>([
    { format: 'output', value: { foo: 1, bar: true, buz: function () {} } },
  ]);
  const [initialHistory, setInitialHistory] = useState([
    'show dbs',
    'db.coll.stats()',
    '{x: 1, y: {z: 2}, k: [1, 2, 3]}',
    'passwordPrompt()',
    '(() => { throw new Error("Whoops!"); })()',
  ]);

  useEffect(() => {
    void runtime.initialize();
    return (): void => {
      void runtime.destroy();
    };
  }, []);

  const key = useMemo(() => {
    return initialHistory.concat(initialInput, initialEvaluate).join('');
  }, [initialHistory, initialInput, initialEvaluate]);

  return (
    <div className={sandboxContainer}>
      <div className={shellContainer}>
        <ThemeProvider
          theme={{ theme: darkMode ? Theme.Dark : Theme.Light, enabled: true }}
        >
          <Shell
            key={key}
            runtime={runtime}
            redactInfo={redactInfo}
            maxOutputLength={maxOutputLength}
            maxHistoryLength={maxHistoryLength}
            initialInput={initialInput}
            initialEvaluate={initialEvaluate.filter(Boolean)}
            initialOutput={initialOutput}
            initialHistory={initialHistory.filter(Boolean)}
          />
        </ThemeProvider>
      </div>
      <div className={controlsContainer}>
        <FormFieldContainer className={formField}>
          <Label id="darkModeLabel" htmlFor="darkMode">
            darkMode
          </Label>
          <Description>Toggle shell dark mode</Description>
          <Toggle
            aria-labelledby="darkModeLabel"
            id="darkMode"
            size="small"
            checked={darkMode}
            onChange={setDarkMode}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="redactInfoLabel" htmlFor="redactInfo">
            redactInfo
          </Label>
          <Description>
            If set, the shell will omit or redact entries containing sensitive
            info from history. Defaults to <code>false</code>.
          </Description>
          <Toggle
            aria-labelledby="redactInfoLabel"
            id="redactInfo"
            size="small"
            checked={redactInfo}
            onChange={setRedactInfo}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="maxOutputLengthLabel" htmlFor="maxOutputLength">
            maxOutputLength
          </Label>
          <Description>
            The maxiumum number of lines to keep in the output. Defaults to{' '}
            <code>1000</code>.
          </Description>
          <TextInput
            className={textInput}
            aria-labelledby="maxOutputLengthLabel"
            type="number"
            value={String(maxOutputLength)}
            onChange={(evt) => {
              setMaxOutputLength(Number(evt.currentTarget.value));
            }}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="maxHistoryLengthLabel" htmlFor="maxHistoryLength">
            maxHistoryLength
          </Label>
          <Description>
            The maxiumum number of lines to keep in the history. Defaults to{' '}
            <code>1000</code>.
          </Description>
          <TextInput
            className={textInput}
            aria-labelledby="maxHistoryLengthLabel"
            type="number"
            value={String(maxHistoryLength)}
            onChange={(evt) => {
              setMaxHistoryLength(Number(evt.currentTarget.value));
            }}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="initialHistoryLabel" htmlFor="initialHistory">
            initialHistory
          </Label>
          <Description>
            An array of history entries to prepopulate the history. Can be used
            to restore the history between sessions. Entries must be ordered
            from the most recent to the oldest.
            <br />
            Note: new entries will not be appended to the array
          </Description>
          <TextArea
            aria-labelledby="initialHistory"
            value={initialHistory.join('\n')}
            onChange={(evt) => {
              setInitialHistory(evt.currentTarget.value.split('\n'));
            }}
            className={cx(textarea, textInput)}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="initialInputLabel" htmlFor="initialInput">
            initialInput
          </Label>
          <Description>Initial value in the shell input field</Description>
          <TextInput
            className={textInput}
            aria-labelledby="initialInputLabel"
            value={initialInput}
            onChange={(evt) => {
              setInitialInput(evt.currentTarget.value);
            }}
          />
        </FormFieldContainer>

        <FormFieldContainer className={formField}>
          <Label id="initialEvaluateLabel" htmlFor="initialEvaluate">
            initialEvaluate
          </Label>
          <Description>
            A set of input strings to evaluate right after shell is mounted
          </Description>
          <TextArea
            aria-labelledby="initialEvaluate"
            value={initialEvaluate.join('\n')}
            onChange={(evt) => {
              setInitialEvaluate(evt.currentTarget.value.split('\n'));
            }}
            className={cx(textarea, textInput)}
          />
        </FormFieldContainer>
      </div>
    </div>
  );
};

ReactDOM.render(<IframeRuntimeExample />, document.body);

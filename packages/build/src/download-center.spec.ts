import path from 'path';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import { createDownloadCenterConfig } from './download-center';

describe('download center module', () => {
  describe('.createDownloadCenterConfig', () => {
    let config;

    before(() => {
      config = createDownloadCenterConfig('1.2.2');
    });

    it('returns the string with the macos version injected', () => {
      expect(config).to.include('mongosh-1.2.2-darwin.zip');
    });

    it('returns the string with the linux version injected', () => {
      expect(config).to.include('mongosh-1.2.2-linux.tgz');
    });

    it('returns the string with the win version injected', () => {
      expect(config).to.include('mongosh-1.2.2-win.zip');
    });
  });
});

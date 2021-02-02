import { expect } from 'chai';
import { listNpmPackages } from './npm-packages';

describe('listNpmPackages', () => {
  it('lists packages', () => {
    const packages = listNpmPackages();
    expect(packages.length).to.be.greaterThan(1);
    for (const { name, version } of packages) {
      expect(name).to.be.a('string');
      expect(version).to.be.a('string');
    }
  });
});

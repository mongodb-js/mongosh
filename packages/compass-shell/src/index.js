import CompassShellPlugin from './plugin';
import CompassShellStore from 'stores';

/**
 * A sample role for the component.
 */
const ROLE = {
  name: 'Shell',
  component: CompassShellPlugin
};

/**
 * Activate all the components in the Compass Shell package.
 * @param {Object} appRegistry - The Hadron appRegisrty to activate this plugin with.
 **/
function activate(appRegistry) {
  // Register the CompassShellPlugin as a role in Compass
  //
  // Available roles are:
  //   - Instance.Tab: { name: <String>, component: <React.Component>, order: <Number> }
  //   - Database.Tab: { name: <String>, component: <React.Component>, order: <Number> }
  //   - Collection.Tab: { name: <String>, component: <React.Component>, order: <Number> }
  //   - CollectionHUD.Item: { name <String>, component: <React.Component> }
  //   - Header.Item: { name: <String>, component: <React.Component>, alignment: <String> }

  appRegistry.registerRole('Instance.Tab', ROLE);
  appRegistry.registerStore('CompassShell.Store', CompassShellStore);
}

/**
 * Deactivate all the components in the Compass Shell package.
 * @param {Object} appRegistry - The Hadron appRegisrty to deactivate this plugin with.
 **/
function deactivate(appRegistry) {
  appRegistry.deregisterRole('Instance.Tab', ROLE);
  appRegistry.deregisterStore('CompassShell.Store');
}

export default CompassShellPlugin;
export { activate, deactivate };

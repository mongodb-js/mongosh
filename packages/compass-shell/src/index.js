import createPlugin from './plugin';

const {
  store,
  Plugin
} = createPlugin();

/**
 * A sample role for the component.
 */
const ROLE = {
  name: 'Shell',
  component: Plugin
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
  appRegistry.registerStore('CompassShell.Store', store);
}

/**
 * Deactivate all the components in the Compass Shell package.
 * @param {Object} appRegistry - The Hadron appRegisrty to deactivate this plugin with.
 **/
function deactivate(appRegistry) {
  appRegistry.deregisterRole('Instance.Tab', ROLE);
  appRegistry.deregisterStore('CompassShell.Store');
}

export default Plugin;
export { activate, deactivate };

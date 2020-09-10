export enum ReadPreferenceMode {
  primary = 'primary',
  primaryPreferred = 'primaryPreferred',
  secondary = 'secondary',
  secondaryPreferred = 'secondaryPreferred',
  nearest = 'nearest'
}

export default interface ReadPreference {
  mode: ReadPreferenceMode;
  tags?: Record<string, string>[];
}

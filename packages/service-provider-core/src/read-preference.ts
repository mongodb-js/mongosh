export default interface ReadPreference {
  mode: string;
  tags?: Record<string, string>[];
}

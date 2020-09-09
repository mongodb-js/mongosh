export enum ReadConcernLevel {
  local = 'local',
  majority = 'majority',
  linearizable = 'linearizable',
  available = 'available',
  snapshot = 'snapshot'
}

export default interface ReadConcern {
  level: ReadConcernLevel;
}

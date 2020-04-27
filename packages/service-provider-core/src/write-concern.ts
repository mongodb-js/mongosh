export default interface WriteConcern {
  w?: number | string;
  wtimeout?: number;
  j?: boolean;
}

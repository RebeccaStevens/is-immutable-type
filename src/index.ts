export {
  type ImmutablenessCache,
  type ImmutablenessOverrides,
  getTypeImmutableness,
  getDefaultOverrides,
} from "./calculate";
export {
  clamp,
  isImmutable,
  isMutable,
  isReadonlyDeep,
  isReadonlyShallow,
  isUnknown,
  max,
  min,
} from "./compare";
export { Immutableness } from "./immutableness";
export {
  isImmutableType,
  isMutableType,
  isReadonlyDeepType,
  isReadonlyShallowType,
} from "./is";

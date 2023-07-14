declare global {
  interface ObjectConstructor {
    hasOwn<ObjectType, Key extends PropertyKey>(
      object: ObjectType,
      key: Key,
    ): object is ObjectType & Record<Key, unknown>;
  }
}

export {};

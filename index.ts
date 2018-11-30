export * from "./lib/result";
export * from "./lib/check";
export * from "./lib/get-type";

export * from "./lib/checks/type-of";
export * from "./lib/checks/instance-of";
export * from "./lib/checks/value";
export * from "./lib/checks/array";
export * from "./lib/checks/struct";
export * from "./lib/checks/dict";
export * from "./lib/checks/map";
export * from "./lib/checks/set";
export * from "./lib/checks/primitives";
export * from "./lib/checks/any";

// TODO: make these more robust tests
// TODO: test type inference. one way to do this: build up a struktural type, get the inner type
// with GetType, and assign it something that should fail the type checker. assert the type checker
// fails. also have vice-versa tests. unknown: can you ignore directories in the main tsconfig?
// otherwise your whole build will fail. maybe just have different root dirs.

/*
const five = num.assert(5);
const isnull = nil.assert(null);
const strOrNum = str.or(num).assert("hi");
const struct = subtype({
  hi: str,
  age: num,
  nested: subtype({
    cool: bool,
  }),
}).assert({
  hi: "world",
  age: 5000,
  nested: {
    cool: false,
  }
});

const maybeBool = nil.or(bool).assert(null);

const dictionary = dict(str.or(num)).assert([ 1, 2, 3 ]);
*/

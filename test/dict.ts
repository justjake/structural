import * as t from "..";

test("accepts empty dictionaries", () => {
  const check = t.dict(t.str);
  check.assert({});
});

test("accepts dictionaries with matching values", () => {
  const check = t.dict(t.str.or(t.num));
  check.assert({
    hi: "test",
    world: 5,
  });
});

test("rejects non-objects", () => {
  const check = t.dict(t.any);
  expect(() => {
    check.assert(null);
  }).toThrow();
});

test("rejects arrays", () => {
  const check = t.dict(t.any);
  expect(() => {
    check.assert([ ]);
  }).toThrow();
});

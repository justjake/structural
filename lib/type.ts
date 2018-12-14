import { Err, Result } from "./result";

export abstract class Type<T> {
  abstract check(val: any): Result<T>;

  assert(val: any): T {
    return assert(this.check(val));
  }

  slice(val: any): T {
    return assert(this.sliceResult(val));
  }

  /*
   * Default slice implementation just calls `check`. Override this as necessary.
   */
  sliceResult(val: any): Result<T> {
    return this.check(val);
  }

  /*
   * Type algebra
   * -----------------------------------------------------------------------------------------------
   */

  and<R>(r: Type<R>): Type<T&R> {
    return new Intersect(this, r);
  }

  or<R>(r: Type<R>): Type<T|R> {
    return new Either(this, r);
  }

  /*
   * Custom validators
   * -----------------------------------------------------------------------------------------------
   */

  validate(desc: string, fn: Validator<T>): Type<T> {
    return this.and(new Validation(desc, fn));
  }
}

function assert<T>(result: Result<T>): T {
  if(result instanceof Err) throw result.toError();
  return result;
}

/*
 * Type operators
 * -------------------------------------------------------------------------------------------------
 *
 * These are types that operate on types, and are exposed in a fluent-style API on all Type objects.
 * To avoid circular dependency issues with module resolution, we keep them in this file, because
 * the Type class needs access to them in able to return them, but they also need access to the Type
 * class in order to extend it (since they themselves are Types).
 */


/*
 * ### Validation
 *
 * A type that runs validation functions and errors if they return false, or passes if they return
 * true.
 */

export type Validator<T> = (val: T) => boolean;

export class Validation<T> extends Type<T> {
  readonly desc: string;
  readonly validator: Validator<T>;

  constructor(desc: string, fn: Validator<T>) {
    super();
    this.desc = desc;
    this.validator = fn;
  }

  check(val: any): Result<T> {
    try {
      if(this.validator(val)) return val;
    } catch(e) {
      return new Err(`Validation \`${this.desc}\` threw an error: ${e}`);
    }

    return new Err(`Failed validation: ${this.desc}`);
  }
}

/*
 * Base key tracking type
 * -------------------------------------------------------------------------------------------------
 *
 * Types that operate on and track specific keys in objects have shared functionality surrounding
 * keeping track of those keys, making sure that exactness checks are run correctly, and that the
 * keys are sliced when `.slice` is called. This base class implements that behavior, and provides
 * an abstract `checkTrackKeys` method as an extension point for subclasses to implement, as opposed
 * to implementing `check` directly from the base Type class.
 */

export type KeyTrack<T> = {
  val: T;
  knownKeys: string[] | null;
  exact: boolean;
}
export type KeyTrackResult<T> = Err<T> | KeyTrack<T>;

export abstract class KeyTrackingType<T> extends Type<T> {
  check(val: any): Result<T> {
    const result = this.checkTrackKeys(val);
    if(result instanceof Err) return result;

    return exactError(val, result) || result.val;
  }


  abstract checkTrackKeys(val: any): KeyTrackResult<T>;

  sliceResult(val: any): Result<T> {
    const result = this.checkTrackKeys(val);
    if(result instanceof Err) return result;

    const err = exactError(val, result);
    if(err) return err;

    if(result.knownKeys == null) return result.val;

    // If we got this far, it's satisfying a type that explicitly tracks keys. Slice the object to
    // just the known set of keys.
    const sliced: { [key: string]: any } = {};
    for(const key of result.knownKeys) {
      sliced[key] = val[key];
    }

    return sliced as T;
  }
}

/*
 * Either
 * -------------------------------------------------------------------------------------------------
 *
 * A union type. Extends the KeyTrackingType since it may need to track its children's keys, if the
 * children are themselves doing key tracking.
 */

export class Either<L, R> extends KeyTrackingType<L|R> {
  readonly l: Type<L>;
  readonly r: Type<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  checkTrackKeys(val: any): KeyTrackResult<L|R> {
    const l = checkTrackKeys(this.l, val);
    if(!(l instanceof Err)) return l;
    const r = checkTrackKeys(this.r, val);
    if(!(r instanceof Err)) return r;
    return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
  }
}

/*
 * Intersect
 * -------------------------------------------------------------------------------------------------
 *
 * An intersection type. Extends the KeyTrackingType since it may need to track its children's keys,
 * if the children are themselves doing key tracking.
 */

export class Intersect<L, R> extends KeyTrackingType<L&R> {
  readonly left: Type<L>;
  readonly r: Type<R>;

  constructor(l: Type<L>, r: Type<R>) {
    super();

    this.left = l;
    this.r = r;
  }

  checkTrackKeys(val: any): KeyTrackResult<L&R> {
    const l = checkTrackKeys(this.left, val);
    const r = checkTrackKeys(this.r, val);

    if((l instanceof Err) && (r instanceof Err)) {
      return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
    }
    if(l instanceof Err) return l;
    if(r instanceof Err) return r;

    let knownKeys = null;
    if(l.knownKeys && r.knownKeys) {
      knownKeys = l.knownKeys.concat(r.knownKeys);
    }

    return {
      knownKeys,
      val: val as L&R,
      exact: l.exact && r.exact,
    }
  }
}

function checkTrackKeys<T>(check: Type<T>, val: any): KeyTrackResult<T> {
  if(check instanceof KeyTrackingType) {
    return check.checkTrackKeys(val);
  }

  const result = check.check(val);
  if(result instanceof Err) return result;

  return {
    val: result,
    knownKeys: null,
    exact: false,
  };
}

export function exactError<T>(val: any, result: KeyTrack<T>): Err<T> | undefined {
  if(result.exact) {
    const errs = [];
    const allowed = new Set(result.knownKeys);
    for(const prop in val) {
      if(!allowed.has(prop)) {
        errs.push(`Unknown key ${prop} in ${val}`);
      }
    }

    if(errs.length !== 0) {
      return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
    }
  }
  return undefined;
}

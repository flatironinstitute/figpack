/* eslint-disable @typescript-eslint/no-unsafe-function-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ValidateObjectSpec = {
  [key: string]: ValidateObjectSpec | (Function & ((a: any) => any));
};

export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [member: string]: JSONValue };
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JSONArray extends Array<JSONValue> {}

// string
export const isString = (x: any): x is string => {
  return x !== null && typeof x === "string";
};

// function
export const isFunction = (x: any): x is Function => {
  return x !== null && typeof x === "function";
};

// number
export const isNumber = (x: any): x is number => {
  return x !== null && typeof x === "number";
};

// null
export const isNull = (x: any): x is null => {
  return x === null;
};

// boolean
export const isBoolean = (x: any): x is boolean => {
  return x !== null && typeof x === "boolean";
};

// isOneOf
export const isOneOf = (testFunctions: Function[]): ((x: any) => boolean) => {
  return (x) => {
    for (const tf of testFunctions) {
      if (tf(x)) return true;
    }
    return false;
  };
};

export const optional = (
  testFunctionOrSpec: Function | ValidateObjectSpec,
): ((x: any) => boolean) => {
  if (isFunction(testFunctionOrSpec)) {
    const testFunction: Function = testFunctionOrSpec;
    return (x) => {
      return x === undefined || testFunction(x);
    };
  } else {
    return (x) => {
      const obj: ValidateObjectSpec = testFunctionOrSpec;
      return x === undefined || validateObject(x, obj);
    };
  }
};

// isEqualTo
export const isEqualTo = (value: any): ((x: any) => boolean) => {
  return (x) => {
    return x === value;
  };
};

// isArrayOf
export const isArrayOf = (
  testFunction: (x: any) => boolean,
): ((x: any) => boolean) => {
  return (x) => {
    if (x !== null && Array.isArray(x)) {
      for (const a of x) {
        if (!testFunction(a)) return false;
      }
      return true;
    } else return false;
  };
};

// object
// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export const isObject = (x: any): x is Object => {
  return x !== null && typeof x === "object";
};

// isObjectOf
export const isObjectOf = (
  keyTestFunction: (x: any) => boolean,
  valueTestFunction: (x: any) => boolean,
): ((x: any) => boolean) => {
  return (x) => {
    if (isObject(x)) {
      for (const k in x) {
        if (!keyTestFunction(k)) return false;
        if (!valueTestFunction(x[k])) return false;
      }
      return true;
    } else return false;
  };
};

export const isJSONObject = (x: any): x is JSONObject => {
  if (!isObject(x)) return false;
  return isJSONSerializable(x);
};
export const isJSONValue = (x: any): x is JSONValue => {
  return isJSONSerializable(x);
};
export const tryParseJsonObject = (x: string): JSONObject | null => {
  let a: any;
  try {
    a = JSON.parse(x);
  } catch {
    return null;
  }
  if (!isJSONObject(a)) return null;
  return a;
};
export const isJSONSerializable = (obj: any): boolean => {
  if (typeof obj === "string") return true;
  if (typeof obj === "number") return true;
  if (!isObject(obj)) return false;
  // eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
  const isPlainObject = (a: Object) => {
    return Object.prototype.toString.call(a) === "[object Object]";
  };
  const isPlain = (a: any) => {
    return (
      a === null ||
      typeof a === "undefined" ||
      typeof a === "string" ||
      typeof a === "boolean" ||
      typeof a === "number" ||
      Array.isArray(a) ||
      isPlainObject(a)
    );
  };
  if (!isPlain(obj)) {
    return false;
  }
  for (const property in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (obj.hasOwnProperty(property)) {
      if (!isPlain(obj[property])) {
        return false;
      }
      if (obj[property] !== null) {
        if (typeof obj[property] === "object") {
          if (!isJSONSerializable(obj[property])) {
            return false;
          }
        }
      }
    }
  }
  return true;
};

const validateObject = (
  x: any,
  spec: ValidateObjectSpec,
  opts?: { callback?: (x: string) => any; allowAdditionalFields?: boolean },
): boolean => {
  const o = opts || {};
  if (!x) {
    if (o.callback) o.callback("x is undefined/null.");
    return false;
  }
  if (typeof x !== "object") {
    if (o.callback) o.callback("x is not an Object.");
    return false;
  }
  for (const k in x) {
    if (!(k in spec)) {
      if (!o.allowAdditionalFields) {
        if (o.callback) o.callback(`Key not in spec: ${k}`);
        return false;
      }
    }
  }
  for (const k in spec) {
    const specK = spec[k];
    if (isFunction(specK)) {
      if (!specK(x[k])) {
        if (o.callback) o.callback(`Problem validating: ${k}`);
        return false;
      }
    } else {
      if (!(k in x)) {
        if (o.callback) o.callback(`Key not in x: ${k}`);
        return false;
      }
      if (
        !validateObject(x[k], specK as ValidateObjectSpec, {
          callback: o.callback,
        })
      ) {
        if (o.callback)
          o.callback(`Value of key > ${k} < itself failed validation.`);
        return false;
      }
    }
  }
  return true;
};

export default validateObject;

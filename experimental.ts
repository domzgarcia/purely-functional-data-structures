/*

Experimental code for implementing a call stack in JS in order
to allow for recursion that is bounded by the working memory of
the process and not the JavaScript call stack.

There is some refactoring but so far this works for any tail call
recursions.

*/

const NULL = <any>Symbol('null'); // Need a unique symbol for null

type FrameRetValue<T> = T | StackFrame<T>;

interface RecursiveFunction<T> {
  (...args: any[]): FrameRetValue<T>;
  originalFunction?: RecursiveFunction<T>;
}

interface FunctionThatReturns<T> {
  (...args: any[]): T;
  originalFunction?: RecursiveFunction<T>;
}

class StackFrame<T> {
  private context: any;
  private parent: StackFrame<T>;
  private readonly children: Map<StackFrame<T>, number> = new Map();

  constructor(
    private readonly func: RecursiveFunction<T>,
    private readonly args: any[],
  ) {
    this.args = args;
    this.context = NULL;
    this.parent = NULL;
    let idx = 0;
    for (const arg of this.args) {
      if (arg instanceof StackFrame) {
        arg.parent = this;
        this.children.set(arg, idx);
      }
      idx++;
    }
  }

  public static withContext<T>(thisArg: any, func: RecursiveFunction<T>, ...args: any[]) {
    return new StackFrame<T>(func, args).setContext(thisArg);
  }

  private setContext(thisArg: any): StackFrame<T> {
    this.context = thisArg;
    return this;
  }

  public shouldDelayExecution(): boolean {
    return this.children.size !== 0;
  }

  public getUnevaluatedArguments(): StackFrame<T>[] {
    const unevaluatedArgs: StackFrame<T>[] = [];
    for (const arg of this.args) {
      if (arg instanceof StackFrame) {
        unevaluatedArgs.push(arg);
      }
    }
    return unevaluatedArgs;
  }

  public evaluate(): FrameRetValue<T> {
    const func = this.func.originalFunction || this.func;
    const result = func.apply(this.context, this.args);

    if (this.parent === NULL) {
      return result;
    }

    const idx = this.parent.children.get(this);
    this.parent.children.delete(this);

    if (result instanceof StackFrame) {
      result.parent = this.parent;
      result.parent.children.set(result, idx);
    }

    this.parent.args[idx] = result;
    return NULL;
  }
}

export const call =
  <T>(func: RecursiveFunction<T>, ...args: any[]): StackFrame<T> =>
    new StackFrame<T>(func, args);

export const callWithContext =
  <T>(thisArg: any, func: RecursiveFunction<T>, ...args: any[]): StackFrame<T> =>
    StackFrame.withContext<T>(thisArg, func, args);

class CallStack<T> {
  private readonly frames: StackFrame<T>[];

  constructor(first: StackFrame<T>) {
    this.frames = [first];
  }

  public push(frame: StackFrame<T>) {
    this.frames.push(frame);
  }

  public evaluate(): T {
    let cur: StackFrame<T> = NULL;
    OUTER:
    while (this.frames.length !== 0) {
      cur = this.frames.pop();

      if (cur.shouldDelayExecution()) {
        this.frames.push(cur);
        Array.prototype.push.apply(this.frames, cur.getUnevaluatedArguments());
        continue;
      }

      let result = cur.evaluate();
      while (result === NULL) {
        cur = this.frames.pop();
        if (cur.shouldDelayExecution()) {
          this.frames.push(cur);
          Array.prototype.push.apply(this.frames, cur.getUnevaluatedArguments());
          continue OUTER;
        }
        result = cur.evaluate();
      }
      return <T>result;
    }
  }
}

export function recursive<T>(func: RecursiveFunction<T>, thisArg: any = null): FunctionThatReturns<T> {
  const recursiveFunction = <FunctionThatReturns<T>>((...args: any[]): T => {
    const firstEval = func.apply(thisArg, args);
    if (!(firstEval instanceof StackFrame)) {
      return firstEval;
    }
    return new CallStack<T>(firstEval).evaluate();
  });
  recursiveFunction.originalFunction = func;
  return recursiveFunction;
}

// Example functions

const add = (x: number, y: number) => x + y;

const fib = recursive((n: number) =>
  ((n === 1) || (n === 2) ? (n - 1)
  : call(add, call(fib, n - 1), call(fib, n - 2))));

const mult = (x: number, y: number) => x * y;

const fact = recursive((n: number) =>
  (n === 0 ? 1
  : call(mult, n, call(fact, n - 1))));

const naiveFib = (n: number) =>
  ((n === 1) || (n === 2) ? (n - 1)
  : add(naiveFib(n - 1), naiveFib(n - 2)));

console.time('naive');
let o1 = naiveFib(30);
console.timeEnd('naive');

console.time('my code');
let o2 = fib(30);
console.timeEnd('my code');

console.log(o1, o2);
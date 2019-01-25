/*

Functional red-black tree implementation
with tail call optimization.

Tail cal optimization allows trees with
thousands of elements to be built and stored
without call stack overflow.

*/

import { Util } from '../util';

export namespace RedBlack {
    export type Color = 'Red' | 'Black';

    export const Red: Color = 'Red';

    export const Black: Color = 'Black';

    export type Node<T> = (f: Selector<T>) => (Color | T | Node<T>);

    export const Empty = <Node<any>>(null);

    export const isEmpty = (t: Node<any>): boolean => (t === Empty);

    export const createNode =
        <T>(col: Color, val: T, lt: Node<T>, rt: Node<T>): Node<T> =>
             f => f(col, val, lt, rt);

    type Selector<T> =
        (col: Color, value: T, left: Node<T>, right: Node<T>) => (Color | T | Node<T>);

    export const color = <T>(t: Node<T>) =>
        <Color>(isEmpty(t) ? Black : t((c, v, l, r) => c));

    export const valueof = <T>(t: Node<T>) => <T>t((c, v, l, r) => v);

    export const left = <T>(t: Node<T>) => <Node<T>>t((c, v, l, r) => l);

    export const right = <T>(t: Node<T>) => <Node<T>>t((c, v, l, r) => r);

    export const member = <T>(e: T, t: Node<T>): boolean => {
        let helper = Util.optimize<boolean>((e: T, t: Node<T>) =>
            (isEmpty(t) ? false
            : (e < valueof(t) ?
                Util.optRecurse(() => member(e, left(t)))
            : (e > valueof(t) ?
                Util.optRecurse(() => member(e, right(t)))
            : true))));
        return <boolean>helper(e, t);
    };

    export const balance = <T>(col: Color, val: T, lt: Node<T>, rt: Node<T>): Node<T> =>
        (col === Red ?
            createNode(Red, val, lt, rt)
        : (color(lt) === Red ?
            (color(left(lt)) === Red ?
                createNode(
                    Red,
                    valueof(lt),
                    createNode(Black,
                        valueof(left(lt)), left(left(lt)), right(left(lt))),
                    createNode(Black,
                        val, right(lt), rt))
            : (color(right(lt)) === Red ?
                createNode(
                    Red,
                    valueof(right(lt)),
                    createNode(Black,
                        valueof(lt), left(lt), left(right(lt))),
                    createNode(Black,
                        val, right(right(lt)), rt))
            : createNode(Black, val, lt, rt)))
        : (color(rt) === Red ?
            (color(left(rt)) === Red ?
                createNode(
                    Red,
                    valueof(left(rt)),
                    createNode(Black,
                        val, lt, left(left(rt))),
                    createNode(Black,
                        valueof(rt), right(left(rt)), right(rt)))
            : (color(right(rt)) === Red ?
                createNode(
                    Red,
                    valueof(rt),
                    createNode(Black,
                        val, lt, left(rt)),
                    createNode(Black,
                        valueof(right(rt)), left(right(rt)), right(right(rt))))
            : createNode(Black, val, lt, rt)))
        : createNode(Black, val, lt, rt))));

    // Tail optimized recursive insert function
    export const insert = <T>(val: T, t: Node<T>): Node<T> => {
        let ins = (s: Node<T>): Node<T> => {
            let helper = Util.optimize<Node<T>>((s: Node<T>) =>
                (isEmpty(s) ?
                    createNode(Red, val, Empty, Empty)
                : (val < valueof(s) ?
                    <Node<T>>Util.optRecurse(() =>
                        balance(color(s), valueof(s), ins(left(s)), right(s)))
                : (val > valueof(s) ?
                    <Node<T>>Util.optRecurse(() =>
                        balance(color(s), valueof(s), left(s), ins(right(s))))
                : s))));
            return helper(s);
        };
        let tmp = ins(t);
        return createNode(Black, valueof(tmp), left(tmp), right(tmp));
    };

    // Solution to 3.8 (fromOrdList)
    // export const fromOrdList = ...

    // Solution to 3.9a

    export const lbalance = <T>(col: Color, val: T, lt: Node<T>, rt: Node<T>): Node<T> =>
        (col === Red ?
            createNode(Red, val, lt, rt)
        : (color(lt) === Red ?
            (color(left(lt)) === Red ?
                createNode(
                    Red,
                    valueof(lt),
                    createNode(Black,
                        valueof(left(lt)), left(left(lt)), right(left(lt))),
                    createNode(Black,
                        val, right(lt), rt))
            : (color(right(lt)) === Red ?
                createNode(
                    Red,
                    valueof(right(lt)),
                    createNode(Black,
                        valueof(lt), left(lt), left(right(lt))),
                    createNode(Black,
                        val, right(right(lt)), rt))
            : createNode(Black, val, lt, rt)))
        : createNode(Black, val, lt, rt)));

    export const rbalance = <T>(col: Color, val: T, lt: Node<T>, rt: Node<T>): Node<T> =>
        (col === Red ?
            createNode(Red, val, lt, rt)
        : (color(rt) === Red ?
            (color(left(rt)) === Red ?
                createNode(
                    Red,
                    valueof(left(rt)),
                    createNode(Black,
                        val, lt, left(left(rt))),
                    createNode(Black,
                        valueof(rt), right(left(rt)), right(rt)))
            : (color(right(rt)) === Red ?
                createNode(
                    Red,
                    valueof(rt),
                    createNode(Black,
                        val, lt, left(rt)),
                    createNode(Black,
                        valueof(right(rt)), left(right(rt)), right(right(rt))))
            : createNode(Black, val, lt, rt)))
        : createNode(Black, val, lt, rt)));


    export const insert2 = <T>(val: T, t: Node<T>): Node<T> => {
        let ins = (s: Node<T>): Node<T> => {
            let helper = Util.optimize<Node<T>>((s: Node<T>) =>
                (isEmpty(s) ?
                    createNode(Red, val, Empty, Empty)
                : (val < valueof(s) ?
                    <Node<T>>Util.optRecurse(() =>
                        lbalance(color(s), valueof(s), ins(left(s)), right(s)))
                : (val > valueof(s) ?
                    <Node<T>>Util.optRecurse(() =>
                        rbalance(color(s), valueof(s), left(s), ins(right(s))))
                : s))));
            return helper(s);
        };
        let tmp = ins(t);
        return createNode(Black, valueof(tmp), left(tmp), right(tmp));
    };

    // Solution to 3.9b
    // ...
}

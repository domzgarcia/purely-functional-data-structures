/*

Implementation of Hood-Melville which use global rebuilding
to support operations that run in O(1) time in the worst case.

*/

import { List } from '../chapter02/List';
import {Util} from '../util';

export namespace HoodMelvilleQueue {
    enum State {
        Idle,
        Reversing,
        Appending,
        Done,
    };

    type Idle = (f: () => State.Idle) => State.Idle;

    const Idle = <Idle>(() => State.Idle);

    type Reversing<T> = (f: ReversingSelector<T>) =>
        (State.Reversing | number | List.List<T>);

    type ReversingSelector<T> =
        (state: State.Reversing, size: number, f1: List.List<T>, f2: List.List<T>,
            r1: List.List<T>, r2: List.List<T>) =>
                (State.Reversing | number | List.List<T>);

    const sizeofReversing = <T>(rs: Reversing<T>) =>
        <number>rs((st, sz, f1, f2, r1, r2) => sz);

    const front1 = <T>(rs: Reversing<T>) =>
        <List.List<T>>rs((st, sz, f1, f2, r1, r2) => f1);

    const front2 = <T>(rs: Reversing<T>) =>
        <List.List<T>>rs((st, sz, f1, f2, r1, r2) => f2);

    const rear1 = <T>(rs: Reversing<T>) =>
        <List.List<T>>rs((st, sz, f1, f2, r1, r2) => r1);

    const rear2 = <T>(rs: Reversing<T>) =>
        <List.List<T>>rs((st, sz, f1, f2, r1, r2) => r2);

    const createReversing =
        <T>(sz: number, f1: List.List<T>, f2: List.List<T>, r1: List.List<T>,
            r2: List.List<T>) =>
                (<Reversing<T>>(R => R(State.Reversing, sz, f1, f2, r1, r2)));

    type Appending<T> = (f: AppendingSelector<T>) =>
        (State.Appending | number | List.List<T>);

    type AppendingSelector<T> =
        (state: State.Appending, size: number, f: List.List<T>,
            r: List.List<T>) => (State.Appending | number | List.List<T>);

    const sizeofAppending = <T>(as: Appending<T>) =>
        <number>as((st, sz, f, r) => sz);

    const appendingFront = <T>(as: Appending<T>) =>
        (<List.List<T>>as((st, sz, f, r) => f));

    const appendingRear = <T>(as: Appending<T>) =>
        (<List.List<T>>as((st, sz, f, r) => r));

    const createAppending = <T>(sz: number, f: List.List<T>, r: List.List<T>) =>
        (<Appending<T>>(A => A(State.Appending, sz, f, r)));

    type Done<T> = (f: DoneSelector<T>) => (State.Done | List.List<T>);

    type DoneSelector<T> = (state: State.Done, L: List.List<T>) =>
        (State.Done | List.List<T>);

    const createDone = <T>(L: List.List<T>) => (<Done<T>>(D => D(State.Done, L)));

    const finishedList = <T>(D: Done<T>) => <List.List<T>>D((rs, L) => L);

    type RotationState<T> = Idle | Reversing<T> | Appending<T> | Done<T>;

    const state = (R: RotationState<any>) => <State>(<any>R)((s: State) => s);

    export type Queue<T> = (f: Selector<T>) =>
        (number | List.List<T> | RotationState<T>);

    type Selector<T> =
        (fLen: number, f: List.List<T>, s: RotationState<T>, rLen: number,
            r: List.List<T>) => (number | List.List<T> | RotationState<T>);

    const frontLen = (Q: Queue<any>) => <number>Q((fL, f, rs, rL, r) => fL);

    const front = <T>(Q: Queue<T>) => <List.List<T>>Q((fL, f, rs, r, rL) => f);

    const queueState = <T>(Q: Queue<T>) =>
        (<RotationState<T>>Q((fL, f, rs, r, rL) => rs));

    const rearLen = (Q: Queue<any>) => <number>Q((fL, f, rs, rL, r) => rL);

    const rear = <T>(Q: Queue<T>) => <List.List<T>>Q((fL, f, rs, rL, r) => r);

    const createQueue =
        <T>(fLen: number, f: List.List<T>, rs: RotationState<T>, rLen: number,
            r: List.List<T>) =>
                <Queue<T>>(Q => Q(fLen, f, rs, rLen, r));

    export const EmptyQueue = createQueue(0, List.EmptyList, Idle, 0, List.EmptyList);

    export const isEmpty = (Q: Queue<any>) => (frontLen(Q) === 0);

    const exec = <T>(rs: RotationState<T>): RotationState<T> => {
        if (state(rs) === State.Reversing) {
            let rev = <Reversing<T>>rs;
            if (List.isEmpty(front1(rev))) {
                return createAppending(
                    sizeofReversing(rev),
                    front2(rev),
                    List.cons(List.head(rear1(rev)), rear2(rev)));
            }
            return createReversing(
                sizeofReversing(rev) + 1,
                List.tail(front1(rev)),
                List.cons(List.head(front1(rev)), front2(rev)),
                List.tail(rear1(rev)),
                List.cons(List.head(rear1(rev)), rear2(rev)));
        }
        if (state(rs) === State.Appending) {
            let ap = <Appending<T>>rs;
            if (sizeofAppending(ap) === 0) {
                return createDone(appendingRear(ap)); // TODO
            }
            return createAppending(
                sizeofAppending(ap) - 1,
                List.tail(appendingFront(ap)),
                List.cons(List.head(appendingFront(ap)), appendingRear(ap)));
        }
        return rs;
    };

    const invalidate = <T>(rs: RotationState<T>): RotationState<T> => {
        if (state(rs) === State.Reversing) {
            let rev = <Reversing<T>>rs;
            return createReversing(
                sizeofReversing(rev) - 1,
                front1(rev),
                front2(rev),
                rear1(rev),
                rear2(rev));
        }
        if (state(rs) === State.Appending) {
            let ap = <Appending<T>>rs;
            if (sizeofAppending(ap) === 0) {
                return createDone(appendingRear(ap));
            }
            return createAppending(
                sizeofAppending(ap) - 1,
                appendingFront(ap),
                appendingRear(ap));
        }
        return rs;
    }

    const exec2 = <T>(Q: Queue<T>): Queue<T> => {
        let newState = exec(exec(queueState(Q)));
        if (state(newState) === State.Done) {
            return createQueue(
                frontLen(Q),
                finishedList(<Done<T>>newState),
                Idle,
                rearLen(Q),
                rear(Q));
        }
        return createQueue(
            frontLen(Q),
            front(Q),
            newState,
            rearLen(Q),
            rear(Q));
    };

    const check = <T>(Q: Queue<T>): Queue<T> =>
        (frontLen(Q) < rearLen(Q) ?
            exec2(Q)
        : createQueue(
            frontLen(Q) + rearLen(Q),
            front(Q),
            createReversing(
                0,
                front(Q),
                List.EmptyList,
                rear(Q),
                List.EmptyList),
            0,
            List.EmptyList));

    export const snoc = <T>(x: T, Q: Queue<T>): Queue<T> =>
        check(createQueue(
            frontLen(Q),
            front(Q),
            queueState(Q),
            rearLen(Q) + 1,
            rear(Q)));

    export const head = <T>(Q: Queue<T>): T =>
        (List.isEmpty(front(Q)) ?
            Util.raise('Empty')
        : List.head(front(Q)));

    export const tail = <T>(Q: Queue<T>): Queue<T> =>
        (List.isEmpty(front(Q)) ?
            Util.raise('Empty')
        : check(createQueue(
            frontLen(Q) - 1,
            List.tail(front(Q)),
            invalidate(queueState(Q)),
            rearLen(Q),
            rear(Q))));
}
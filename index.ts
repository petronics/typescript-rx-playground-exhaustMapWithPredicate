import { Observable, of, OperatorFunction, Subscription, interval } from 'rxjs';
import { exhaustMap, delay } from 'rxjs/operators';

function exhaustMapWithPredicate<T, R>(
  project: (value: T) => Observable<R>,
  predicate: (current: T, previous: T | undefined, innerValue: R) => boolean
): OperatorFunction<T, R> {
  let innerSubscription: Subscription | null = null;
  let previousValue: T | undefined;
  let innerCompleted = false;

  return (source: Observable<T>): Observable<R> =>
    new Observable<R>((observer) => {
      const subscription = source.subscribe({
        next(value: T) {
          const innerObservable = project(value);

          if (
            innerSubscription &&
            !predicate(value, previousValue, undefined as any)
          ) {
            return;
          }

          if (innerSubscription) {
            innerSubscription.unsubscribe();
          }

          innerSubscription = innerObservable.subscribe(observer);
          previousValue = value;
        },
        error(error: any) {
          observer.error(error);
        },
        complete() {
          observer.complete();
        },
      });

      return () => {
        if (innerSubscription) {
          innerSubscription.unsubscribe();
        }
        subscription.unsubscribe();
      };
    });
}

// A function that returns an observable that emits a single value after the specified delay.
function delayedValue<T>(value: T, _delay: number) {
  return of(value).pipe(delay(_delay));
}

// An example source observable that emits a sequence of values at regular intervals.
const source$ = interval(1000);

// An example predicate function that only allows a new inner observable to be subscribed to if the source value is even.
function predicate(
  current: number,
  previous: number | undefined,
  innerValue: any
) {
  return current % 2 === 0;
}

// An example usage of the exhaustMapWithPredicate operator.
const result$ = source$.pipe(
  exhaustMapWithPredicate((value) => delayedValue(value, 3000), predicate)
);

result$.subscribe({
  next(value) {
    console.log(value);
  },
  error(error) {
    console.error(error);
  },
  complete() {
    console.log('Complete');
  },
});

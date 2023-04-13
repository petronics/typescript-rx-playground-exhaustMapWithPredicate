import { Observable, of, OperatorFunction, Subscription, interval } from 'rxjs';
import { delay } from 'rxjs/operators';

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
            !innerCompleted &&
            !predicate(value, previousValue, undefined as any)
          ) {
            console.log('exhausted', value);
            return;
          }
          if (innerSubscription) {
            innerSubscription.unsubscribe();
            console.log('cancelled', value);
          }

          innerCompleted = false;
          innerSubscription = innerObservable.subscribe({
            next: (value?: R) => observer.next(value),
            error: (err?: any) => observer.error(err),
            complete() {
              innerCompleted = true;
            },
          });
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
  return current % 4 === 0;
}

console.log('START');
// An example usage of the exhaustMapWithPredicate operator.
const result$ = source$.pipe(
  exhaustMapWithPredicate((value) => delayedValue(value, 2000), predicate)
);

result$.subscribe({
  next(value) {
    console.log('V' + value);
  },
  error(error) {
    console.error(error);
  },
  complete() {
    console.log('Complete');
  },
});

import { Effect, Option } from "effect";

/**
 * An Effect represents a computation.
 * 
 * Effect<R,E,A> should be read as 
 *   a computation that 
 *   needs an environment of type R, 
 *   may fail with a value of type E, 
 *   or succeed with a value of type A
 * 
 * An effect with never as environment does not need anything to run
 * An effect with never as error will never fail (with an expected error)
 * An effect with never as success will never succeed
 * 
 * Effects are lazy by nature. They need to be interpreted to do anything.
 * This in practical terms just means calling run on them. Some operators
 * that interpret/run effects are:
 * 
 * - runPromise: returns a promise tha resolves with the success or rejects with the error
 * - runCallback: runs the effect, calling the provided callback with the success or failure
 * - runSync: tries to run the effect synchronously. If it can't, it will throw an error
 * - runFork: returns a Fiber that represents the execution
 * 
 * There are variants of these operators for returning Either and Cause instead of raw values
 */

const succeedWith42 = Effect.succeed(42)

const failWith42 = Effect.fail(42)

const fromMaybe42 = Option.getOrThrow(Option.fromNullable(42))

const fromSyncFunction = Effect.sync(() => 42)

const fromCallback = Effect.async((resume) => resume(Effect.succeed(42)))

const fromComputationThatMayFail = Effect.try({
    try: () => 42,
    catch: e => e as never
})

const fromPromise = Effect.tryPromise({
    try: () => Promise.resolve(42),
    catch: e => e as never
})

// 1. Create a program that prints "hello world" using console.log
//
// Tip: use a constructor from the top

const program = undefined as unknown as Effect.Effect<never,never,never>;

// 2. Run the program

// 3. Create a new program that prints it three times and run it

// (Bonus) 4. Try to do it using either zip or flatMap

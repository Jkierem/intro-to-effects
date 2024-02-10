import { Effect, pipe } from "effect";
/**
 * Effects are monadic structures
 * As such they have both map and flatMap
 * 
 * 1. Using map, and flatMap make the program print 42
 * by only adding stuff to the pipeline
 */
const succeed41 = Effect.succeed(41)

const printLn = (msg: string) => Effect.sync(() => console.log(msg))

const program1 = pipe(
    succeed41,
    // -- Tip: Add code here --
    Effect.map(x => x + 1),
    Effect.map(x => `${x}`),
    Effect.flatMap(printLn)
)

Effect.runPromise(program1)

/**
 * Another common operation is tap. It effectfully peeks an effect
 * without altering it. If the peek succeeds, the outer effect follows
 * as usual. If the peek fails, so does the outer effect
 * 
 * 2. Using the previous excercise and tap, print the value if it is even, 
 * otherwise, fail with OddError
 */

class OddError { 
    readonly _tag = "OddError"
    constructor(public which: number){}
}
const program2 = pipe(
    Effect.sync(() => Math.floor(Math.random() * 100)),
    // -- Tip: Add code here --
    Effect.tap((n) => n % 2 === 0 ? printLn(`${n}`) : Effect.fail(new OddError(n)))
)

Effect.runPromise(program2)

/**
 * Zips are the last sequencing operation
 * Like flatMap, they sequence two effects
 * Unlike flatMap, one effect is not dependent on the result value of the other
 */

const randomInt = Effect.sync(() => Math.floor(Math.random() * 100))

// 3. Using zip, generate two random integers and return their sum

const twoSum = pipe(
    randomInt,
    Effect.zip(randomInt),
    Effect.map(([a,b]) => a + b)
)

// 4. Using zipLeft, generate two random integers and return the first

const firstRandom = pipe(
    randomInt,
    Effect.zipLeft(randomInt)
)

// 5. Using zipWith, generate two random integers and keep the largest

const largestOfTwo = pipe(
    randomInt,
    Effect.zipWith(randomInt, (a, b) => Math.max(a,b))
)

// (Bonus) 6. Try doing these three with just zipWith

const withSumOfTwo = pipe(
    randomInt,
    Effect.zipWith(randomInt, (a, b) => a + b)
)

const withFirst = pipe(
    randomInt,
    Effect.zipWith(randomInt, a => a)
)

// (Bonus) 7. Try doing these three with just flatMap

const flatSum = pipe(
    randomInt,
    Effect.flatMap((a) => Effect.map(randomInt, b => a + b)),
)

const flatFirst = pipe(
    randomInt,
    Effect.flatMap(a => Effect.as(randomInt, a))
)

const flatLargest = pipe(
    randomInt,
    Effect.flatMap(a => Effect.map(randomInt, b => Math.max(a,b)))
)

/**
 * Do-notation:
 * 
 * Similar to haskells do-notation, Effect provides a mechanism that emulates it.
 * It is based around one constructor and 5 operators:
 * 
 * - Do: same as succeed({})
 * - bind: sets the result of an effect to a key
 * - bindTo: same as map(x => { [key]: x })
 * - let: works like map but stores the result in the provided key
 */

const doPrint42 = pipe(
    Effect.Do,
    Effect.bind("w", () => Effect.succeed(42)),
    Effect.bind("x", ({ w }) => Effect.succeed(w + 18)),
    Effect.let("y" , ({ w }) => w + 8),
    Effect.let("z", () => 10),
    Effect.map(({ w, x, y, z }) => w + x + y + z),
    Effect.map(x => `${x}`),
    Effect.flatMap(printLn)
)

/**
 * Do-notation with generators
 * 
 * Another approach is using generators. 
 * A good way to see it is by looking at it as the equivalent to async-await.
 * It allows a mix of imperative programming and using effects. 
 * This is the equivalent to the previous example using generators:
 */

const genPrint42 = Effect.gen(function*(_){
    const w = yield* _(Effect.succeed(42));
    const x = yield* _(Effect.succeed(w + 18));
    const y = w + 8;
    const z = 10;

    return yield* _(printLn(`${w + x + y + z}`));
})
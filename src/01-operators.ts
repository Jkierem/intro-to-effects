import { pipe } from "@effect/data/Function";
import * as T from "@effect/io/Effect"
/**
 * Effects are monadic structures
 * As such they have both map and flatMap
 * 
 * 1. Using map, and flatMap make the program print 42
 * by only adding stuff to the pipeline
 */
const succeed41 = T.succeed(41)

const printLn = (msg: string) => T.sync(() => console.log(msg))

const program1 = pipe(
    succeed41,
    // -- Tip: Add code here --
)

T.runPromise(program1)

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
    T.sync(() => Math.floor(Math.random() * 100)),
    // -- Tip: Add code here --
)

T.runPromise(program2)

/**
 * Zips are the last sequencing operation
 * Like flatMap, they sequence two effects
 * Unlike flatMap, one effect is not dependent on the result value of the other
 */

const randomInt = T.sync(() => Math.floor(Math.random() * 100))

// 3. Using zip, generate two random integers and return their sum

// 4. Using zipLeft, generate two random integers and return the first

// 5. Using zipWith, generate two random integers and keep the largest

// (Bonus) 6. Try doing these three with just zipWith

// (Bonus) 7. Try doing these three with just flatMap

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
 * - letDiscard and bindDiscard: same as let and bind but they receive the plain value instead of a function
 */

const do42 = pipe(
    T.Do(),
    T.bindDiscard("w", T.succeed(2)),
    T.bind("x", ({ w }) => T.succeed(w + 18)),
    T.let("y" , ({ w }) => w + 8),
    T.letDiscard("z", 10),
    T.map(({ w, x, y, z }) => w + x + y + z),
    T.map(x => `${x}`),
    T.flatMap(printLn)
)
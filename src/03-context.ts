import * as T from "@effect/io/Effect"
import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function";
import { prompt } from "./_utils";

/**
 * Previous effects didn't have a context (they all had never in the R type).
 * So in this section we are going to start using the R parameter to supply
 * a context
 * 
 * All we need is an interface that defines the service and a Tag that identifies
 * the service. Think of the Context as a Map<Tag, Service>.
 */

interface Random {
    next: () => T.Effect<never, never, number>
}

const Random = Context.Tag<Random>();

const program1 = pipe(
    Random,
    T.flatMap(random => random.next()),
    T.map(x => x + 1)
)

/**
 * To build implementations of services, tags have an "of" method available
 * i.e.:
 *      Random.of({ next: () => 42 })
 * 
 * 1. Provide an implementation of the environment and run program1
 *
 * Tip: use a combination of T.provideService, Random and Random.of
 */

const printLn = (msg: string) => T.sync(() => console.log(msg))

class NotInteractive { readonly _tag = "NotInteractive" };
const ask = (msg: string) => T.tryCatchPromise(async () => {
    const ans = await prompt(msg)
    if( ans === null ){
        throw undefined
    } else {
        return ans
    }
}, () => new NotInteractive())

class AuthError { readonly _tag = "AuthError" }

type User = { 
    id: string,
    username: string,
    firstName: string,
    lastName: string
}

interface UserService {
    login: (username: string, password: string) => T.Effect<never, AuthError, User>
}

const UserService = Context.Tag<UserService>();

const program2 = pipe(
    T.Do(),
    T.bind("username", () => ask("username: ")),
    T.bind("password", () => ask("password: ")),
    T.bind("service", () => UserService),
    T.flatMap(({ username, password, service }) =>  service.login(username, password)),
    T.tap((user) => printLn(`Hello ${user.firstName}!`))
)

// 2. Using program2, create a new program that can run and handles the errors.

const program3 = program2

// T.runPromise(program3)

// 3. Compose both services in a single context
// Tip. Use Context.empty and Context.add.

interface IOService {
    print: (msg: string) => T.Effect<never, never, void>,
    ask: (msg: string) => T.Effect<never, NotInteractive, string>
}

type RPSOption = "rock" | "paper" | "scissors"

interface GameService {
    next: () => T.Effect<never, never, RPSOption>
}

const services = pipe(
    undefined
)

// 4. Construct an program that uses the context to play rps receiving the 
//    users' input, validating that the input is "rock", "paper", or "scissors, 
//    and randomly choosing an option and showing the result of the game
//
//    Tip: Divide it in three effects: 
//        - one that gets the user input and fails on invalid input
//        - one that generates the random cpu pick
//        - one that calculates the result

const RPS = pipe(
    undefined
)

// (Bonus) 5. Make it so it asks the user again if the input is invalid, using T.retryWhile.

// (Bonus) 6. Make it so it restarts if it's a tie, using T.repeatWhile.
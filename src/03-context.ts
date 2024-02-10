import { Effect, Context, pipe } from "effect";
import { prompt } from "./_utils";

/**
 * Previous effects didn't have a context (they all had never in the R type).
 * So in this section we are going to start using the R parameter to supply
 * a context
 * 
 * All we need is an interface that defines the service and a Tag that identifies
 * the service. Think of the Context as a Map<Tag, Service>.
 */

class Random extends Context.Tag("Random")<
    Random,
    { next: () => Effect.Effect<number> }
>(){}

const program1 = pipe(
    Random,
    Effect.flatMap(random => random.next()),
    Effect.map(x => x + 1)
)

/**
 * To build implementations of services, tags have an "of" method available
 * i.e.:
 *      Random.of({ next: () => 42 })
 * 
 * 1. Provide an implementation of the environment and run program1
 *
 * Tip: use a combination of Effect.provideService, Random and Random.of
 */

const printLn = (msg: string) => Effect.sync(() => console.log(msg))

class NotInteractive { readonly _tag = "NotInteractive" };
const ask = (msg: string) => Effect.tryPromise({
    try: async () => {
        const ans = await prompt(msg)
        if( ans === null ){
            throw undefined
        } else {
            return ans
        }
    },
    catch: () => new NotInteractive()
})

class AuthError { readonly _tag = "AuthError" }

type User = { 
    id: string,
    username: string,
    firstName: string,
    lastName: string
}

class UserService extends Context.Tag("UserService")<
    UserService,
    {
        login: (username: string, password: string) => Effect.Effect<User, AuthError>
    }
>(){}

const program2 = pipe(
    Effect.Do,
    Effect.bind("username", () => ask("username: ")),
    Effect.bind("password", () => ask("password: ")),
    Effect.bind("service", () => UserService),
    Effect.flatMap(({ username, password, service }) =>  service.login(username, password)),
    Effect.tap((user) => printLn(`Hello ${user.firstName}!`))
)

// 2. Using program2, create a new program that can run and handles the errors.

const program3 = program2

// Effect.runPromise(program3)

// 3. Compose both services in a single context
// Tip. Use Context.empty and Context.add.

class IOService extends Context.Tag("IOService")<
    IOService,
    {
        print: (msg: string) => Effect.Effect<void>,
        ask: (msg: string) => Effect.Effect<string, NotInteractive>
    }
>(){}

type RPSOption = "rock" | "paper" | "scissors"

class GameService extends Context.Tag("GameService")<
    GameService, 
    {
        next: () => Effect.Effect<RPSOption>
    }
>(){}

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

// (Bonus) 5. Make it so it asks the user again if the input is invalid, using Effect.retry and Effect.catchTag.

// (Bonus) 6. Make it so it restarts if it's a tie, using Effect.repeatWhile.
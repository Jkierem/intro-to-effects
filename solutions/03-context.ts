import { Effect, Context, pipe, Schedule } from "effect";
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

pipe(
    program1,
    Effect.provideService(
        Random, 
        Random.of({
            next() {
                return Effect.succeed(Math.random())
            },
        })),
    Effect.runPromise
)

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

const program3 = pipe(
    program2,
    Effect.flatMap(({ firstName }) => printLn(`Hello ${firstName}!`)),
    Effect.catchAll(e => printLn(`Something went wrong: ${e._tag}`)),
    Effect.provideService(UserService, UserService.of({
        login(username, password) {
            if( username !== "jgomez" || password !== "1234" ){
                return Effect.fail(new AuthError());
            }
            return Effect.succeed({
                id: "juan",
                firstName: "Juan",
                lastName: "Gomez",
                username: "jgomez"
            })
        },
    })),
)

Effect.runPromise(program3)

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
    Context.empty(),
    Context.add(GameService, {
        next() {
            const n = Math.floor(Math.random() * 3);
            const pick = ["rock", "paper", "scissors"][n] as RPSOption;
            return Effect.succeed(pick);
        },
    }),
    Context.add(IOService, {
        print: printLn,
        ask,
    })
)

// 4. Construct an program that uses the context to play rps receiving the 
//    users' input, validating that the input is "rock", "paper", or "scissors, 
//    and randomly choosing an option and showing the result of the game
//
//    Tip: Divide it in three effects: 
//        - one that gets the user input and fails on invalid input
//        - one that generates the random cpu pick
//        - one that calculates the result

class WrongAnswer {
    readonly _tag = "WrongAnswer"
    constructor(public which: string){};
}
const AskUser = pipe(
    IOService,
    Effect.flatMap((io) => io.ask("Rock, paper or scissors? ")),
    Effect.flatMap(ans => ["rock", "paper", "scissors"].includes(ans) 
        ? Effect.succeed(ans as RPSOption)
        : Effect.fail(new WrongAnswer(ans))
    ),
)

const CpuService = pipe(
    Random,
    Effect.map((random) => {
        return GameService.of({
            next: () => {
                return pipe(
                    random.next(),
                    Effect.map(x => Math.floor(x * 3)),
                    Effect.map(x => ["rock", "paper", "scissors"][x] as RPSOption)
                )
            }
        })
    })
)
const CpuPick = pipe(
    Effect.all([CpuService]),
    Effect.flatMap(([cpu]) => cpu.next())
)

type Result = "tie" | "cpu" | "player";
const compare = ({ cpu, user }: { cpu: RPSOption, user: RPSOption }) => {
    const ans = {
        rock: {
            rock: "tie",
            paper: "cpu",
            scissors: "player"
        },
        paper: {
            rock: "player",
            paper: "tie",
            scissors: "cpu"
        },
        scissors: {
            rock: "cpu",
            paper: "player",
            scissors: "tie"
        }
    }[user][cpu] as Result
    return ans
}

const RPS = pipe(
    Effect.Do,
    Effect.bind("user", () => AskUser),
    Effect.bind("cpu", () => CpuPick),
    Effect.bind("io", () => IOService),
    Effect.let("result", a => compare(a)),
    Effect.tap(({ result, io }) => io.print(result !== "tie" ? `${result} wins`: "It's a tie")),
    Effect.map(({ result }) => result)
)

// (Bonus) 5. Make it so it asks the user again if the input is invalid, using Effect.retry and Effect.catchTag.

const WithRetry = pipe(
    RPS,
    Effect.retry({
        while: e => e._tag === "WrongAnswer"
    }),
    Effect.catchTag("WrongAnswer", () => Effect.never)
)

// (Bonus) 6. Make it so it restarts if it's a tie, using Effect.repeatWhile.

const WithRepeatOnTie = pipe(
    WithRetry,
    Effect.repeat({
        while: result => result === "tie"
    })
)
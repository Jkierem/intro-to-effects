import * as T from "@effect/io/Effect"
import * as E from "@effect/data/Either"
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

const Random = Context.Tag<Random>()

const RandomLive = Random.of({
    next() {
        return T.sync(() => Math.random())  
    }
})

const program1 = pipe(
    Random,
    T.flatMap(random => random.next()),
    T.map(x => x + 1),
    T.provideService(Random, RandomLive),
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

const wait = (millis: number): T.Effect<never, never, void> => T.async((resume) => {
    setTimeout(() => resume(T.unit()), millis);
})

const equals = (a: string) => (b: string): T.Effect<never, AuthError, string> => {
    if(a === b){
        return T.succeed(a);
    } else {
        return T.fail(new AuthError());
    }
}

const UserServiceLive = UserService.of({
    login(username, password){
        return pipe(
            T.Do(),
            T.zipLeft(wait(1000)),
            T.bindDiscard("username", equals("juan")(username)),
            T.bindDiscard("password", equals("123")(password)),
            T.map(() => ({
                id: "idk",
                username,
                firstName: "juan",
                lastName: "gomez"
            } as User)),
        )
    }
})

const program3 = pipe(
    program2,
    T.provideService(UserService, UserServiceLive),
    T.catchAll(e => printLn(e._tag)),
)

// T.runPromise(program3)

// 3. Compose both services in a single context
// Tip. Use Context.empty and Context.add

interface IOService {
    print: (msg: string) => T.Effect<never, never, void>,
    ask: (msg: string) => T.Effect<never, NotInteractive, string>
}

type RPSOption = "rock" | "paper" | "scissors"

interface GameService {
    next: () => T.Effect<never, never, RPSOption>
}


// 4. Construct an program that uses the context to play rps receiving the 
//    users' input, validating that the input is "rock", "paper", or "scissors, 
//    and randomly choosing an option and showing the result of the game
//
//    Tip: Divide it in three effects: 
//        - one that gets the user input and fails on invalid input
//        - one that generates the random cpu pick
//        - one that calculates the result

const IOService = Context.Tag<IOService>();
const GameService = Context.Tag<GameService>();

const GameServiceTest = GameService.of({
    next(){
        return T.succeed("rock");
    }
})

const GameServiceLive = GameService.of({
    next() {
        const a = Math.floor(Math.random() * 3) as 0 | 1 | 2;
        return T.succeed((["rock", "paper", "scissors"] as const)[a]);
    },
})

const _services = pipe(
    Context.empty(),
    Context.add(GameService, GameServiceLive),
    Context.add(IOService, IOService.of({
        ask,
        print: printLn
    }))
)
class InvalidOption { readonly _tag = "InvalidOption" }
const RPS = pipe(
    T.Do(),
    T.bind("io", () => IOService),
    T.bind("raw", ({ io }) => io.ask("Jan ken pon!: ")),
    T.bind("player", ({ raw, io }) => ["rock", "paper", "scissors"].includes(raw as any) 
        ? T.succeed(raw as RPSOption) 
        : pipe(
            io.print("Invalid option"), 
            T.zipRight(T.fail(new InvalidOption))
        )
    ),
    T.retryWhile((e) => e._tag === "InvalidOption"),
    T.bind("game", () => GameService),
    T.bind("ai", ({ game }) => game.next()),
    T.tap(({ io, ai }) => io.print(`CPU picked ${ai}`)),
    T.map(({ player, ai }) => {
        const p = player 
        const result = {
            rock: {
                rock: "tie",
                paper: "CPU Wins!",
                scissors: "Player Wins!"
            },
            paper: {
                rock: "Player Wins!",
                paper: "tie",
                scissors: "CPU Wins!"
            },
            scissors: {
                rock: "CPU Wins!",
                paper: "Player Wins!",
                scissors: "tie"
            }
        } as const
        return result[p][ai] 
    }),
    T.tap(printLn),
    T.repeatWhile(x => x === "tie"),
    T.provideContext(_services)
)

T.runPromise(RPS)


// (Bonus) 5. Make it so it asks the user again if the input is invalid, using T.retryWhile.

// (Bonus) 6. Make it so it restarts if it's a tie, using T.repeatWhile.
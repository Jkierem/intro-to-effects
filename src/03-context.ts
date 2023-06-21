import * as T from "@effect/io/Effect"
import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function";

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
const ask = (msg: string) => T.async<never, NotInteractive, string>((resume) => {
    const ans = prompt(msg, "")
    if( ans === null ){
        resume(T.fail(new NotInteractive()))
    } else {
        resume(T.succeed(ans))
    }
})

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

const AccessUserService = pipe(
    UserService,
    T.map(a => a)
)

const program2 = pipe(
    T.Do(),
    T.bind("username", () => ask("username: ")),
    T.bind("password", () => ask("password: ")),
    T.bind("service", () => AccessUserService),
    T.flatMap(({ username, password, service }) =>  service.login(username, password)),
    T.tap((user) => printLn(`Hello ${user.firstName}!`))
)

// 2. Using program2, create a new program that can run and handles the errors.

const program3 = program2 as unknown as T.Effect<never, never, never>;

T.runPromise(program3)

// 3. Compose both services in a single context
// Tip. Use Context.empty and Context.add.

interface IOService {
    print: (msg: string) => T.Effect<never, never, void>,
    ask: (msg: string) => T.Effect<never, NotInteractive, string>
}

interface GameService {
    next: () => T.Effect<never, never, "rock" | "paper" | "scissors">
}

const services = pipe(
    undefined // -- Add code here --
)

// 4. Construct an program that uses the context to play rps receiving the 
//    users input, and randomly choosing an option and showing the result of 
//    the game

const RPS = pipe(
    services,
)

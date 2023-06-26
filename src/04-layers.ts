import * as Context from "@effect/data/Context"
import { pipe } from "@effect/data/Function";
import * as T from "@effect/io/Effect"
import * as L from "@effect/io/Layer"

/**
 * Think of Layers as a more structured way of building contexts.
 * 
 * `Layer<RIn, never, ROut>` is a blueprint for building a `Context<ROut>`
 * 
 * Layer<RIn, E, ROut> should be read as:
 *  - A Layer that needs something of type RIn to construct a Context<ROut>
 *    but may fail with an error of type E
 * 
 * Let's build the rock-paper-scissors game with layers
 */

interface ConsoleService {
    log: (msg: string) => T.Effect<never, never, void>
}

const ConsoleService = Context.Tag<ConsoleService>();

const ConsoleServiceLive = L.succeed(
    ConsoleService,
    ConsoleService.of({
        log(msg) {
            return T.sync(() => console.log(msg))
        },
    })
)

class NotInteractive { readonly _tag = "NotInteractive" };

interface IOService {
    print: (msg: string) => T.Effect<never, never, void>,
    ask: (msg: string) => T.Effect<never, NotInteractive, string>
}

const IOService = Context.Tag<IOService>();

const IOServiceLive = L.effect(
    IOService,
    pipe(
        ConsoleService,
        T.map((consoleService) => {
            return IOService.of({
                ask(msg){
                    return T.tryCatchPromise(async () => {
                        const ans = await prompt(msg)
                        if( ans === null ){
                            throw undefined
                        } else {
                            return ans
                        }
                    }, () => new NotInteractive())
                },
                print(msg) {
                    return consoleService.log(msg)
                },
            })
        })
    )
)

type RPSOption = "rock" | "paper" | "scissors"

interface GameService {
    next: () => T.Effect<never, never, RPSOption>
}

const GameService = Context.Tag<GameService>();

const GameServiceLive = L.succeed(
    GameService,
    GameService.of({
        next() {
            return T.succeed("rock");
        },
    })
)

class InvalidOption { readonly _tag = "InvalidOption" }
type Winner = "player" | "cpu"
interface RPS {
    game: T.Effect<GameService | IOService, InvalidOption, Winner>
}

const RPS = Context.Tag<RPS>();

const RPSLive = L.effect(
    RPS,
    pipe(
        T.all(GameService, IOService),
        T.map(([ GameService, IOService ]) => {
            return RPS.of({
                game: T.succeed("cpu")
            })
        })
    )
)

const program = pipe(
    RPS,
    T.flatMap(rps => rps.game),
    T.flatMap(game => T.sync(() => console.log(`${game} won!`)))
)

const MainLayer = undefined as unknown as L.Layer<never, never, GameService | IOService | RPS>

pipe(
    program,
    T.provideLayer(MainLayer),
    T.runPromise
)
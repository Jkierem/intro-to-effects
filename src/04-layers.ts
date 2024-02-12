import { Effect, Context, Layer, pipe} from "effect"
import { prompt } from "./_utils"

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

class ConsoleService extends Context.Tag("ConsoleService")<
    ConsoleService,
    {
        log: (msg: string) => Effect.Effect<void>
    }
>(){
    static Live = Layer.succeed(
        ConsoleService,
        ConsoleService.of({
            log(msg) {
                return Effect.sync(() => console.log(msg))
            },
        })
    )
}

class NotInteractive { readonly _tag = "NotInteractive" };

class IOService extends Context.Tag("IOService")<
    IOService,
    {
        print: (msg: string) => Effect.Effect<void>,
        ask: (msg: string) => Effect.Effect<string, NotInteractive>
    }
>(){
    static Live = Layer.effect(
        IOService,
        pipe(
            ConsoleService,
            Effect.map((consoleService) => {
                return IOService.of({
                    ask(msg){
                        return Effect.tryPromise({
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
                    },
                    print(msg) {
                        return consoleService.log(msg)
                    },
                })
            })
        )
    )
}

type RPSOption = "rock" | "paper" | "scissors"

class GameService extends Context.Tag("GameService")<
    GameService,
    {
        next: () => Effect.Effect<RPSOption>
    }
>(){}

const GameServiceLive = Layer.succeed(
    GameService,
    GameService.of({
        next() {
            return Effect.succeed("rock");
        },
    })
)

class InvalidOption { readonly _tag = "InvalidOption" }
type Winner = "player" | "cpu" | "tie"
class RPS extends Context.Tag("RPS")<
    RPS,
    {
        game: Effect.Effect<Winner, InvalidOption>
    }
>(){
    static Live = Layer.effect(
        RPS,
        pipe(
            Effect.all([ GameService, IOService ]),
            Effect.map(([ GameService, IOService ]) => {
                return RPS.of({
                    game: Effect.succeed("cpu")
                })
            })
        )
    )
}

const program = pipe(
    RPS,
    Effect.flatMap(rps => rps.game),
    Effect.flatMap(game => Effect.sync(() => console.log(`${game} won!`)))
)

const MainLayer = undefined as unknown as Layer.Layer<RPS>

pipe(
    program,
    Effect.provide(MainLayer),
    Effect.runPromise
)
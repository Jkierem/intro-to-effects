import { Effect, Context, Layer, pipe, Data} from "effect"
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
const isRPSOption = (str: string): str is RPSOption => ["rock", "paper", "scissors"].includes(str);

class GameService extends Context.Tag("GameService")<
    GameService,
    {
        next: () => Effect.Effect<RPSOption>
    }
>(){
    static Live = Layer.succeed(
        GameService,
        GameService.of({
            next() {
                return Effect.sync(() => {
                    const picks = ["rock", "paper", "scissors"] as const;
                    const pick = Math.floor(Math.random() * 3) as 0 | 1 | 2;
                    return picks[pick] as RPSOption
                })
            },
        })
    )
}

class InvalidOption extends Data.Error { readonly _tag = "InvalidOption" }
type Winner = "player" | "cpu" | "tie";
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
                const getUserInput = Effect.gen(function*(_){
                    const userIn = yield* _(IOService.ask("Rock, paper or scissors?: "));
                    if( isRPSOption(userIn) ){
                        return userIn;
                    }
                    return yield* _(new InvalidOption());
                })

                const getUserPick = pipe(
                    getUserInput,
                    Effect.catchTag("NotInteractive", () => Effect.die(new Error("Non-interactive console")))
                )

                const getCpuPick = GameService.next();

                const calculateResult = (user: RPSOption, cpu: RPSOption) =>  {
                    return ({
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
                    })[user][cpu] as Winner
                }

                return RPS.of({
                    game: Effect.gen(function*(_){
                        const user = yield* _(getUserPick);
                        const cpu = yield* _(getCpuPick);
                        return calculateResult(user, cpu);
                    })
                })
            })
        )
    )
}

const program = pipe(
    RPS,
    Effect.flatMap(rps => rps.game),
    Effect.zip(IOService),
    Effect.tap(([result, io]) => {
        switch(result){
            case "player":
            case "cpu":
                return io.print(`${result} wins!`);
            case "tie":
                return io.print(`It's a tie! Go again`);
        }
    }),
    Effect.map(([result]) => result),
    Effect.repeat({ while: result => result === "tie" }),
    Effect.retry({ while: e => e._tag === "InvalidOption" }),
    Effect.catchTag("InvalidOption", () => Effect.never),
)

const MainLayer = pipe(
    RPS.Live,
    Layer.provideMerge(IOService.Live),
    Layer.provide(ConsoleService.Live),
    Layer.provide(GameService.Live)
)

pipe(
    program,
    Effect.provide(MainLayer),
    Effect.runPromise
)
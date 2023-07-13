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
            const a = Math.floor(Math.random() * 3) as 0 | 1 | 2;
            return T.succeed((["rock", "paper", "scissors"] as const)[a]);
        },
    })
)

class InvalidOption { readonly _tag = "InvalidOption" }
type Winner = "Player" | "CPU" 
interface RPS {
    game: T.Effect<never, InvalidOption | NotInteractive, Winner>
}

const RPS = Context.Tag<RPS>();

const isRPS = (x: string): x is RPSOption => ["rock", "paper", "scissors"].includes(x);

const RPSLive = pipe(
    L.effect(
        RPS,
        pipe(
            T.all(GameService, IOService),
            T.map(([GameService, IOService]) => {
                const singleRun = pipe(
                    IOService.ask("Rock paper scissors!: "),
                    T.flatMap((player) => isRPS(player) 
                        ? T.succeed(player)
                        : pipe(
                            IOService.print("Invalid option"),
                            T.zipRight(T.fail(new InvalidOption))
                        )
                    ),
                    T.bindTo("player"),
                    T.bind("cpu", () => GameService.next()),
                )
                type Result = Winner | "Tie"
                const decide = ({ cpu, player }: Record<"cpu" | "player", RPSOption>): Result => {
                    const decisionTree = {
                        rock: {
                            rock: "Tie",
                            paper: "CPU",
                            scissors: "Player"
                        },
                        paper: {
                            rock: "Player",
                            paper: "Tie",
                            scissors: "CPU"
                        },
                        scissors: {
                            rock: "CPU",
                            paper: "Player",
                            scissors: "Tie"
                        }
                    } as const
                    return decisionTree[player][cpu]
                }

                const game = pipe(
                    singleRun,
                    T.retryWhile(e => e._tag === "InvalidOption"),
                    T.tap(({ cpu }) => IOService.print(`CPU picked ${cpu}`)),
                    T.map(decide),
                    T.tap(result => 
                        result === "Tie" 
                        ? IOService.print("Tie! Run again!") 
                        : T.unit()
                    ),
                    T.repeatWhileEquals("Tie"),
                    T.map(x => x as Winner)
                )

                return RPS.of({ game })
            }),
        ),
    ),
)

const program = pipe(
    RPS,
    T.flatMap(rps => rps.game),
    T.flatMap(winner => T.sync(() => console.log(`${winner} won!`)))
)

const MainLayer = pipe(
    ConsoleServiceLive,
    L.provide(IOServiceLive),
    L.merge(GameServiceLive),
    L.provide(RPSLive)
)

pipe(
    program,
    T.provideLayer(MainLayer),
    T.runPromise
)
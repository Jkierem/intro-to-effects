import { Effect, pipe } from "effect"
/**
 * Effects have three operators for handling expected errors:
 * 1. catchAll: traps all errors thrown
 * 2. catchTag: traps only errors with the given _tag attribute
 * 3. catchTags: traps errors for the specified tags
 */

class ConnectionError { readonly _tag = "ConnectionError" }
class InvariantError { readonly _tag = "InvariantError" }
class OddError { readonly _tag = "OddError" }
class EvenError { readonly _tag = "EvenError"}

const program = pipe(
    Effect.fail(new ConnectionError()),
    Effect.zipRight(Effect.fail(new InvariantError())),
    Effect.zipRight(Effect.fail(new OddError())),
    Effect.zipRight(Effect.fail(new EvenError()))
)

// 1. Use catchTag to handle ConnectionErrors

const withoutConnectionErros = pipe(
    program,
    Effect.catchTag("ConnectionError", () => Effect.succeed(1))
)

// 2. Use catchTags to handle OddError and EvenError

const withoutParityErrors = pipe(
    withoutConnectionErros,
    Effect.catchTags({
        EvenError: () => Effect.succeed(2),
        OddError: () => Effect.succeed(3),
    }),
)

// 3. Use catchAll to handle remaining errors

const withoutErrors = pipe(
    withoutParityErrors,
    Effect.catchAll(() => Effect.succeed(4))
)
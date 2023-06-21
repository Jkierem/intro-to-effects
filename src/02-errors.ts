import { pipe } from "@effect/data/Function"
import * as T from "@effect/io/Effect"
/**
 * Effects have three operators for handling expected errors:
 * 1. catchAll: traps all errors thrown
 * 2. catchTag: traps only errors with the given _tag attribute
 * 3. catchTags: traps errors for the specified tags
 */

class ConnectionError { readonly _tag = "ConnectionError" }
class InvariantError { readonly _tag = "InvariantError" }
class OddError { readonly _tag = "OddError" }
class EvenError { readonly _tag = "EvebError"}

const program = pipe(
    T.fail(new ConnectionError()),
    T.zipRight(T.fail(new InvariantError())),
    T.zipRight(T.fail(new OddError())),
    T.zipRight(T.fail(new EvenError()))
)

// 1. Use catchTag to handle ConnectionErrors

// 2. Use catchTags to handle OddError and EvenError

// 3. Use catchAll to handle remaining errors
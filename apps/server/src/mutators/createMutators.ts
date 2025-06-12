import type { EnvVars } from "@/services/EnvVars";
import { type Mutators, createClientMutators } from "@sphericon/zero/mutators";
import type { AuthData, Chat } from "@sphericon/zero/schema";
import { Effect, Runtime } from "effect";

export const createZeroMutators = Effect.fn("createZeroMutators")(function* (
	authData: AuthData,
) {
	yield* Effect.log("Creating mutators");
	const client = createClientMutators(authData);
	const runtime = yield* Effect.runtime<EnvVars>();
	return {
		...client,
		// chats: {
		//   create: async (tx, chat: Chat) =>
		//     Runtime.runPromise(runtime)(
		//       Effect.gen(function* () {
		//         const { APP_URL } = yield* EnvVars;
		//         yield* Effect.log("mutating");
		//         yield* Effect.promise(() => tx.mutate.chatsTable.insert(chat));
		//       }),
		//     ),
		// },
	} satisfies Mutators;
});

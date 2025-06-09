import { HttpApiBuilder } from "@effect/platform";
import { Api } from "@sphericon/api";
import { Effect } from "effect";

export const HealthRouter = HttpApiBuilder.group(
	Api,
	"health",
	Effect.fnUntraced(function* (handlers) {
		return handlers.handle("get", () => Effect.succeed("OK"));
	}),
);

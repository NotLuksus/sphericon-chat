import { HttpApi } from "@effect/platform";
import { AuthGroup } from "./domains/Auth";
import { HealthGroup } from "./domains/Health";
import { SseGroup } from "./domains/Sse";
import { ZeroGroup } from "./domains/Zero";

export const Api = HttpApi.make("Api")
	.add(HealthGroup)
	.add(AuthGroup)
	.add(ZeroGroup)
	.add(SseGroup)
	.prefix("/api");

import { HttpApi } from "@effect/platform";
import { AuthGroup } from "./domains/Auth";
import { HealthGroup } from "./domains/Health";

export const Api = HttpApi.make("Api")
	.add(HealthGroup)
	.add(AuthGroup)
	.prefix("/api");

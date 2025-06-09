import { HttpApi } from "@effect/platform";
import { HealthGroup } from "./domains/HealthGroup";

export const Api = HttpApi.make("Api").add(HealthGroup).prefix("/api");

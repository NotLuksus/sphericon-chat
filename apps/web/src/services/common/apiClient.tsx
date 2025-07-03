import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import { Api } from "@sphericon/api";
import * as Effect from "effect/Effect";
import * as UnsafeHttpApiClient from "./unsafeHttpClient";

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
	accessors: true,
	dependencies: [FetchHttpClient.layer],
	effect: Effect.gen(function* () {
		return {
			client: yield* HttpApiClient.make(Api, {
				baseUrl: import.meta.env.VITE_SERVER_URL,
				transformClient: (client) =>
					client.pipe(HttpClient.retryTransient({ times: 3 })),
			}),

			unsafeClient: yield* UnsafeHttpApiClient.make(Api, {
				baseUrl: import.meta.env.VITE_SERVER_URL,
				transformClient: (client) =>
					client.pipe(HttpClient.retryTransient({ times: 3 })),
			}),
		};
	}),
}) {}

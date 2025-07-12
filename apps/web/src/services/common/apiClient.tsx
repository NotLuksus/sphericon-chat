import * as FetchHttpClient from "@effect/platform/FetchHttpClient";
import * as HttpApiClient from "@effect/platform/HttpApiClient";
import * as HttpClient from "@effect/platform/HttpClient";
import { ClientApi } from "@sphericon/api/client";
import * as Effect from "effect/Effect";
import * as UnsafeHttpApiClient from "./unsafeHttpClient";
import { Layer } from "effect";

const CustomFetchLive = FetchHttpClient.layer.pipe(
  Layer.provide(
    Layer.succeed(FetchHttpClient.RequestInit, {
      credentials: "include",
    }),
  ),
);

export class ApiClient extends Effect.Service<ApiClient>()("ApiClient", {
  accessors: true,
  dependencies: [CustomFetchLive],
  effect: Effect.gen(function* () {
    return {
      client: yield* HttpApiClient.make(ClientApi, {
        baseUrl: import.meta.env.VITE_SERVER_URL,
        transformClient: (client) =>
          client.pipe(HttpClient.retryTransient({ times: 3 })),
      }),

      unsafeClient: yield* UnsafeHttpApiClient.make(ClientApi, {
        baseUrl: import.meta.env.VITE_SERVER_URL,
        transformClient: (client) =>
          client.pipe(HttpClient.retryTransient({ times: 3 })),
      }),
    };
  }),
}) {}

import type * as Layer from "effect/Layer";
import type * as ManagedRuntime from "effect/ManagedRuntime";
import type { ApiClient } from "./common/apiClient";
import type { NetworkMonitor } from "./common/networkMonitor";

export type LiveLayerType = Layer.Layer<ApiClient | NetworkMonitor>;
export type LiveManagedRuntime = ManagedRuntime.ManagedRuntime<
  Layer.Layer.Success<LiveLayerType>,
  never
>;
export type LiveRuntimeContext =
  ManagedRuntime.ManagedRuntime.Context<LiveManagedRuntime>;

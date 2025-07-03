import { queryClient } from "@/lib/queryClient";
import { ZeroProvider } from "@/lib/zeroProvider";
import { ApiClient } from "@/services/common/apiClient";
import { NetworkMonitor } from "@/services/common/networkMonitor";
import type { LiveManagedRuntime } from "@/services/live-layer";
import { RuntimeProvider } from "@/services/runtime/runtimeProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Layer, LogLevel, Logger, ManagedRuntime } from "effect";
import { useMemo } from "react";

export const Route = createRootRoute({
	component: () => {
		const runtime: LiveManagedRuntime = useMemo(
			() =>
				ManagedRuntime.make(
					Layer.mergeAll(
						NetworkMonitor.Default,
						ApiClient.Default,
						Logger.minimumLogLevel(
							import.meta.env.DEV ? LogLevel.Debug : LogLevel.Info,
						),
					).pipe(Layer.provide(Logger.pretty)),
				),
			[],
		);

		return (
			<>
				<RuntimeProvider runtime={runtime}>
					<QueryClientProvider client={queryClient}>
						<ZeroProvider>
							<Outlet />
							<TanStackRouterDevtools />
						</ZeroProvider>
					</QueryClientProvider>
				</RuntimeProvider>
			</>
		);
	},
});

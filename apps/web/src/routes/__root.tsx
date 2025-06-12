import { queryClient } from "@/lib/queryClient";
import { ZeroProvider } from "@/lib/zeroProvider";
import { QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

export const Route = createRootRoute({
	component: () => (
		<>
			<QueryClientProvider client={queryClient}>
				<ZeroProvider>
					<Outlet />
					<TanStackRouterDevtools />
				</ZeroProvider>
			</QueryClientProvider>
		</>
	),
});

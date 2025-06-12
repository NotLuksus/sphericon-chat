import { useQuery } from "@tanstack/react-query";
import { jwtClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: import.meta.env.VITE_SERVER_URL,
	plugins: [jwtClient()],
});

export const useSession = () => {
	const query = useQuery({
		queryKey: ["session"],
		queryFn: async () => {
			let jwt = "";

			const session = await authClient.getSession({
				fetchOptions: {
					onSuccess: (ctx) => {
						jwt = ctx.response.headers.get("set-auth-jwt") || "";
					},
				},
			});

			if (session.error) throw session.error;

			return {
				...session.data,
				jwt,
			};
		},
	});

	return query;
};

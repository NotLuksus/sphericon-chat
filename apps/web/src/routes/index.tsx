import { authClient } from "@/lib/auth";
import { queryClient } from "@/lib/queryClient";
import { useZ } from "@/lib/zeroProvider";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/")({
	component: App,
});

function App() {
	const z = useZ();

	const [chats] = useQuery(z.query.chatsTable);

	return (
		<div className="text-center flex-col gap-6 items-center justify-center flex min-h-screen">
			<div className="flex flex-row gap-4">
				<button
					onClick={async () => {
						await authClient.signIn.email({
							email: "lukasmarienfeld91@gmail.com",
							password: "password",
						});
						await queryClient.invalidateQueries({ queryKey: ["session"] });
					}}
				>
					Sign In
				</button>
				<button
					onClick={async () => {
						await authClient.signOut();
						await queryClient.invalidateQueries({ queryKey: ["session"] });
					}}
				>
					Sign Out
				</button>
				<button
					onClick={async () => {
						const startTime = Date.now();
						const chatId = nanoid();
						await z.mutate.message.sendFirst({
							chat: {
								id: chatId,
								title: "New Chat",
							},
							message: {
								content: "Hello World",
							},
						}).server;

						const res = await fetch(
							`${import.meta.env.VITE_SERVER_URL}/api/health`,
						);
						const data = await res.text();
						const endTime = Date.now();
						const duration = endTime - startTime;
						console.log(data);
						console.log(`Request took ${duration}ms`);
					}}
				>
					New Chat
				</button>
			</div>
			<pre>{z.userID}</pre>
			{chats.map((chat) => (
				<div key={chat.id}>
					<h2>{chat.title}</h2>
				</div>
			))}
		</div>
	);
}

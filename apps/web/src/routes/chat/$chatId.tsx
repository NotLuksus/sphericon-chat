import { useZ } from "@/lib/zeroProvider";
import { useStreamingMessage } from "@/services/useStreamingMessage";
import { useQuery } from "@rocicorp/zero/react";
import { createFileRoute } from "@tanstack/react-router";
import { Option } from "effect";
import { last } from "effect/Array";
import { useEffect } from "react";

export const Route = createFileRoute("/chat/$chatId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { chatId } = Route.useParams();
	const z = useZ();
	const [messages] = useQuery(
		z.query.messagesTable.where("chatId", chatId).orderBy("createdAt", "asc"),
	);

	const { message } = useStreamingMessage({ chatId });

	useEffect(() => {
		const lastMessage = last(messages);
		Option.match(lastMessage, {
			onNone: () => console.log("No message"),
			onSome: (message) => {
				if (message.status === "streaming") {
					console.log("Streaming message");
				}
			},
		});
	}, [messages]);
	return (
		<div className="flex flex-col items-center">
			<div className="flex flex-col items-center gap-4">
				{messages.map((message) => (
					<div className="bg-blue-600 px-8 py-2 flex-col" key={message.id}>
						<p>{message.parentMessageId}</p>
						<p>{message.content}</p>
						<p>{message.id}</p>
					</div>
				))}
			</div>
			<div className="flex flex-col items-center">
				<button
					onClick={() => {
						z.mutate.message.send({
							chatId,
							content: "Hey, how are you?",
						});
					}}
				>
					Send Message
				</button>
			</div>
		</div>
	);
}

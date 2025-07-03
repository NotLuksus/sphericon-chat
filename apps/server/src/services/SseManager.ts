import { type ChatId, SseEvents } from "@sphericon/api/domains";
import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import { pipe } from "effect/Function";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import type * as Queue from "effect/Queue";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";

type ActiveConnection = {
	readonly connectionId: string;
	readonly queue: Queue.Queue<string>;
};

export class SseManager extends Effect.Service<SseManager>()("SseManager", {
	effect: Effect.gen(function* () {
		const connectionsRef = yield* Ref.make(
			MutableHashMap.empty<ChatId, Array<ActiveConnection>>(),
		);

		const registerConnection = ({
			connectionId,
			queue,
			chatId,
		}: {
			chatId: ChatId;
			connectionId: string;
			queue: Queue.Queue<string>;
		}) =>
			Ref.update(connectionsRef, (map) =>
				MutableHashMap.modifyAt(map, chatId, (activeConnections) =>
					activeConnections.pipe(
						Option.map(Array.append({ connectionId, queue })),
						Option.orElse(() =>
							Option.some(Array.make({ connectionId, queue })),
						),
					),
				),
			);

		const unregisterConnection = ({
			connectionId,
			chatId,
		}: {
			chatId: ChatId;
			connectionId: string;
		}) =>
			Ref.modify(connectionsRef, (map) => {
				const connectionToRemove = MutableHashMap.get(map, chatId).pipe(
					Option.flatMap((connections) =>
						Array.findFirst(
							connections,
							(connection) => connection.connectionId === connectionId,
						),
					),
				);

				if (Option.isNone(connectionToRemove)) {
					return [Effect.void, map] as const;
				}

				return [
					connectionToRemove.value.queue.shutdown,
					pipe(
						map,
						MutableHashMap.modify(
							chatId,
							Array.filter(
								(connection) => connection.connectionId !== connectionId,
							),
						),
					),
				];
			}).pipe(Effect.flatten);

		const sendEventToChat = ({
			event,
			chatId,
		}: {
			chatId: ChatId;
			event: SseEvents;
		}) =>
			Effect.gen(function* () {
				const connections = yield* Ref.get(connectionsRef);
				const connectionsForChat = MutableHashMap.get(connections, chatId);
				if (
					Option.isNone(connectionsForChat) ||
					connectionsForChat.value.length === 0
				) {
					return;
				}

				const encodedEvent = yield* Schema.encode(Schema.parseJson(SseEvents))(
					event,
				).pipe(Effect.orDie);

				yield* Effect.forEach(
					connectionsForChat.value,
					(connection) => connection.queue.offer(encodedEvent),
					{
						concurrency: "unbounded",
						discard: true,
					},
				);
			});

		return {
			registerConnection,
			unregisterConnection,
			sendEventToChat,
		};
	}),
}) {}

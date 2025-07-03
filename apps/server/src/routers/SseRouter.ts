import { Chats } from "@/services/Chats";
import { SseManager } from "@/services/SseManager";
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder";
import { NotFound, Unauthorized } from "@effect/platform/HttpApiError";
import * as HttpServerResponse from "@effect/platform/HttpServerResponse";
import { Api } from "@sphericon/api";
import { ReplayEvent } from "@sphericon/api/domains";
import { CurrentUser } from "@sphericon/auth";
import { Database } from "@sphericon/db";
import { chatUsersTable } from "@sphericon/db/schema";
import { and, eq } from "@sphericon/db/sql";
import { Option } from "effect";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Queue from "effect/Queue";
import * as Schedule from "effect/Schedule";
import * as Stream from "effect/Stream";

export const SseRouter = HttpApiBuilder.group(
	Api,
	"sse",
	Effect.fnUntraced(function* (handlers) {
		const sseManager = yield* SseManager;
		const textEncoder = new TextEncoder();
		const chats = yield* Chats;
		const db = yield* Database.Database;

		const kaStream = Stream.repeat(
			Effect.succeed(":keep-alive"),
			Schedule.fixed("3 seconds"),
		);

		return handlers.handle("connect", ({ path: { chatId } }) =>
			Effect.gen(function* () {
				const user = yield* CurrentUser;

				const hasReadPermissions = yield* db
					.execute((client) =>
						client.query.chatUsersTable.findFirst({
							where: and(
								eq(chatUsersTable.chatId, chatId),
								eq(chatUsersTable.userId, user.id),
							),
						}),
					)
					.pipe(
						Effect.catchTags({
							DatabaseError: Effect.die,
						}),
					);

				if (!hasReadPermissions) {
					return new Unauthorized();
				}

				const hasActiveStream = yield* chats.hasActiveStream(chatId);

				if (!hasActiveStream) {
					return new NotFound();
				}

				return HttpServerResponse.stream(
					Effect.gen(function* () {
						const eventQueue = yield* Queue.unbounded<string>();
						const connectionId = crypto.randomUUID();

						yield* sseManager.registerConnection({
							connectionId,
							queue: eventQueue,
							chatId,
						});

						const streamingMessageOption =
							yield* chats.getStreamingMessageForChat(chatId);

						const streamingMessage = Option.getOrThrow(streamingMessageOption);

						yield* sseManager.sendEventToChat({
							chatId,
							event: new ReplayEvent({
								message: streamingMessage,
							}),
						});

						yield* Effect.addFinalizer(() =>
							sseManager.unregisterConnection({
								connectionId,
								chatId,
							}),
						);

						const eventsStream = Stream.fromQueue(eventQueue).pipe(
							Stream.map((eventString) => `data: ${eventString}`),
						);

						return Stream.merge(kaStream, eventsStream).pipe(
							Stream.map((line) => textEncoder.encode(`${line}\n\n`)),
						);
					}).pipe(Stream.unwrapScoped),
					{
						contentType: "text/event-stream",
						headers: {
							"Content-Type": "text/event-stream",
							"Cache-Control": "no-cache",
							"X-Accel-Buffering": "no",
							Connection: "keep-alive",
						},
					},
				);
			}),
		);
	}),
).pipe(Layer.provide(SseManager.Default));

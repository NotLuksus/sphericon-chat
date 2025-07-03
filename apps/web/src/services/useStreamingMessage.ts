import { ApiClient } from "@/services/common/apiClient";
import { NetworkMonitor } from "@/services/common/networkMonitor";
import { useRuntime } from "@/services/runtime/useRuntime";
import { ChatId, SseEvents } from "@sphericon/api/domains";
import { Match } from "effect";
import * as Effect from "effect/Effect";
import * as Either from "effect/Either";
import * as Fiber from "effect/Fiber";
import { constVoid, constant } from "effect/Function";
import * as Option from "effect/Option";
import * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import * as React from "react";
import { useEffect } from "react";

export const useStreamingMessage = ({ chatId }: { chatId: string }) => {
	const runtime = useRuntime();
	const hasRun = React.useRef(false);
	const [message, setMessage] = React.useState<string | null>(null);

	useEffect(() => {
		if (hasRun.current) return constVoid;
		hasRun.current = true;

		const handler = Effect.flatMap(NetworkMonitor, (monitor) =>
			Effect.gen(function* () {
				const { unsafeClient } = yield* ApiClient;

				const response = yield* unsafeClient.sse.connect({
					path: {
						chatId: ChatId.make(chatId),
					},
				});

				yield* Effect.log("[SseConnector] connected");

				const source = yield* response.stream.pipe(
					Stream.decodeText(),
					Stream.splitLines,
					Stream.filter((str) => str.length > 0),
					Stream.share({ capacity: "unbounded" }),
				);

				const keepAliveStream = source.pipe(
					Stream.filter((line) => line.startsWith(":keep-alive")),
					Stream.timeout("8 seconds"),
					Stream.tapError(() => Effect.logError("[SseConnector] ka timed out")),
					Stream.drain, // Convert to void stream since we only care about timing out
				);

				const dataStream = source.pipe(
					Stream.filter((line) => line.startsWith("data:")),
					Stream.map((line) => line.substring(5).trim()),
					Stream.filter((jsonString) => jsonString.length > 0),
					Stream.tap((event) => Effect.logDebug("[SseConnector] event", event)),
					Stream.map(Schema.decodeEither(Schema.parseJson(SseEvents))),
					Stream.tap((either) =>
						Either.isLeft(either)
							? Effect.logWarning(
									"Failed to decode SSE event",
									either.left.message,
								)
							: Effect.void,
					),
					Stream.filterMap(
						Either.match({
							onLeft: constant(Option.none()),
							onRight: (event) => Option.some(event),
						}),
					),
					Stream.tap((event) =>
						Match.value(event).pipe(
							Match.tag("NewChunkEvent", (newChunkEvent) =>
								Effect.sync(() => {
									setMessage(
										(message) => (message || "") + newChunkEvent.content,
									);
								}),
							),
							Match.tag("ReplayEvent", (replayEvent) =>
								Effect.sync(() => {
									setMessage(replayEvent.message);
								}),
							),
							Match.exhaustive,
						),
					),
					Stream.share({ capacity: "unbounded" }),
				);

				// Run both streams concurrently instead of merging
				const mergedStream = keepAliveStream.pipe(Stream.merge(dataStream));

				yield* Stream.runDrain(mergedStream);

				yield* Effect.log("[SseConnector] drained");
				yield* Effect.fail("restart");
			}).pipe(
				Effect.catchAllCause((cause) =>
					Effect.logError(cause).pipe(Effect.zipRight(Effect.fail(cause))),
				),
				Effect.scoped,
				monitor.latch.whenOpen,
				Effect.retry(Schedule.spaced("3 seconds")),
			),
		);

		const fiber = runtime.runFork(handler);
		return () => Fiber.interrupt(fiber);
	}, [runtime, chatId]);

	return { message };
};

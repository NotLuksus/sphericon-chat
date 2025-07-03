import { ChatRepository } from "@/repositories/ChatRepository";
import { MessageRepository } from "@/repositories/MessageRepository";
import { groq } from "@ai-sdk/groq";
import { AiLanguageModel } from "@effect/ai";
import { AnthropicClient, AnthropicLanguageModel } from "@effect/ai-anthropic";
import { TextPart, UserMessage } from "@effect/ai/AiInput";
import { generateObject } from "@effect/ai/AiLanguageModel";
import { FetchHttpClient } from "@effect/platform";
import {
	type ChatId,
	type MessageId,
	NewChunkEvent,
} from "@sphericon/api/domains";
import { Database } from "@sphericon/db";
import type { Message } from "@sphericon/db/schema";
import { generateText, streamText } from "ai";
import {
	Array,
	Chunk,
	Config,
	Effect,
	JSONSchema,
	Layer,
	MutableHashMap,
	Option,
	Redacted,
	Ref,
	Runtime,
	Schema,
	Stream,
	SynchronizedRef,
} from "effect";
import { nanoid } from "nanoid";
import { Resource } from "sst";
import { SseManager } from "./SseManager";

export class Chats extends Effect.Service<Chats>()("Chats", {
	dependencies: [
		SseManager.Default,
		MessageRepository.Default,
		ChatRepository.Default,
	],
	effect: Effect.gen(function* () {
		const sseManager = yield* SseManager;
		const messagesRef = yield* SynchronizedRef.make(
			MutableHashMap.empty<ChatId, string>(),
		);
		const messageRepository = yield* MessageRepository;
		const chatRepository = yield* ChatRepository;

		const anthropicClient = AnthropicClient.layerConfig({
			apiKey: Config.redacted("ANTHROPIC_API_KEY"),
		}).pipe(Layer.provide(FetchHttpClient.layer));

		const claude = AnthropicLanguageModel.model("claude-sonnet-4-0");

		const hasActiveStream = Effect.fn("hasActiveStream")(function* (
			chatId: ChatId,
		) {
			const chatMessages = yield* SynchronizedRef.get(messagesRef);
			return MutableHashMap.has(chatMessages, chatId);
		});

		const getStreamingMessageForChat = Effect.fn("getStreamingMessageForChat")(
			function* (chatId: ChatId) {
				const chatMessages = yield* SynchronizedRef.get(messagesRef);
				return MutableHashMap.get(chatMessages, chatId);
			},
		);

		const generateAiMessage = Effect.fn("generateAiMessage")(
			function* (
				chatId: ChatId,
				aiMessageId: MessageId,
				userMessageContent: string,
			) {
				yield* Effect.logInfo("Generating AI message");
				const messages = yield* messageRepository.getForAiSdkByChat(chatId);
				messages.push(
					new UserMessage({
						parts: [new TextPart({ text: userMessageContent })],
					}),
				);
				yield* Effect.log("Messages retrieved", messages);
				yield* SynchronizedRef.update(
					messagesRef,
					MutableHashMap.set(chatId, ""),
				);

				const stream = AiLanguageModel.streamText({
					prompt: messages,
				}).pipe(
					Stream.tap((c) => Effect.log(c.text)),
					Stream.mapEffect(({ text }) =>
						Effect.gen(function* () {
							yield* SynchronizedRef.update(messagesRef, (chatMessages) => {
								const currentContent = MutableHashMap.get(chatMessages, chatId);
								const newContent =
									Option.getOrElse(currentContent, () => "") + text;
								return MutableHashMap.set(chatMessages, chatId, newContent);
							});

							yield* sseManager.sendEventToChat({
								event: new NewChunkEvent({
									content: text,
								}),
								chatId,
							});

							return text;
						}),
					),
				);

				const messageChunks = yield* Stream.runCollect(stream);
				const message = Chunk.join(messageChunks, "");

				yield* messageRepository.update({
					id: aiMessageId,
					content: message,
					status: "completed",
				});

				yield* SynchronizedRef.update(messagesRef, (chatMessages) => {
					return MutableHashMap.remove(chatMessages, chatId);
				});

				yield* Effect.logInfo(`Chat ${chatId} completed`);
			},
			Effect.provide(claude),
			Effect.provide(anthropicClient),
		);

		const generateChatTitle = Effect.fn("generateChatTitle")(function* (
			chatId: ChatId,
			content: string,
		) {
			const { text: title } = yield* Effect.tryPromise(() =>
				generateText({
					model: groq("llama-3.1-8b-instant"),
					prompt: `Given this message by the user: ${content} generate a title for the chat. Just return the title, nothing else`,
				}),
			);

			yield* chatRepository.update({
				id: chatId,
				title,
			});
		});

		return {
			getStreamingMessageForChat,
			hasActiveStream,
			generateAiMessage,
			generateChatTitle,
		};
	}),
}) {}

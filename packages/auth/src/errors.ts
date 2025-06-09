import { HttpApiSchema } from "@effect/platform";
import { Schema } from "effect";

export class BetterAuthApiError extends Schema.TaggedError<BetterAuthApiError>(
	"BetterAuthApiError",
)(
	"BetterAuthApiError",
	{
		cause: Schema.Unknown,
	},
	HttpApiSchema.annotations({
		status: 500,
	}),
) {}

export class GetSessionError extends Schema.TaggedError<GetSessionError>(
	"GetSessionError",
)("GetSessionError", {
	message: Schema.String,
}) {}

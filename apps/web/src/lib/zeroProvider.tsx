import { Zero } from "@rocicorp/zero";
import {
	ZeroProvider as ZeroProviderImpl,
	createUseZero,
} from "@rocicorp/zero/react";
import { type Mutators, createClientMutators } from "@sphericon/zero/mutators";
import { type Schema, schema } from "@sphericon/zero/schema";
import { useEffect, useState } from "react";
import { useSession } from "./auth";

export function ZeroProvider({ children }: { children: React.ReactNode }) {
	const z = useZero();

	return <ZeroProviderImpl zero={z}>{children}</ZeroProviderImpl>;
}

const createAnonymous = () => {
	const z = new Zero({
		userID: "anon",
		server: import.meta.env.VITE_ZERO_URL,
		schema,
		mutators: createClientMutators(undefined),
	});

	return z;
};

export const useZero = () => {
	const { data: session } = useSession();
	const [zero, setZero] = useState<Zero<Schema, Mutators>>(createAnonymous());

	// biome-ignore lint/correctness/useExhaustiveDependencies:
	useEffect(() => {
		if (!session || !session.user) {
			const z = createAnonymous();

			setZero(z);
			return;
		}

		const { user, jwt } = session;

		const z = new Zero({
			userID: user.id,
			auth: jwt,
			server: import.meta.env.VITE_ZERO_URL,
			schema,
			mutators: createClientMutators({
				sub: user.id,
			}),
		});

		setZero(z);

		return () => {
			zero?.close();
			setZero(createAnonymous());
		};
	}, [session]);

	return zero;
};

export const useZ = createUseZero<Schema, Mutators>();

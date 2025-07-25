import type { LiveManagedRuntime } from "@/services/live-layer";
import { constVoid } from "effect/Function";
import React from "react";
import { RuntimeContext } from "./runtimeContext";

export const RuntimeProvider: React.FC<{
	children: React.ReactNode;
	runtime: LiveManagedRuntime;
}> = ({ children, runtime }) => {
	const mountRef = React.useRef(false);

	React.useEffect(() => {
		if (!mountRef.current) {
			mountRef.current = true;
			return constVoid;
		}

		return () => {
			void runtime.dispose();
		};
	}, [runtime]);

	return (
		<RuntimeContext.Provider value={runtime}>
			{children}
		</RuntimeContext.Provider>
	);
};

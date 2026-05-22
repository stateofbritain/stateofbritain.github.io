import { createContext, useContext } from "react";

// Carries seek() — every ▶ Watch button drives the single embedded
// parliamentlive.tv player through this context.
export const PlayerContext = createContext({ seek: () => {}, eventId: null });

export const usePlayer = () => useContext(PlayerContext);

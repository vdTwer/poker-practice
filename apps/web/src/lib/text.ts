/** "Pair of Kings" -> "pair of Kings" (keeps rank names capitalised). */
export const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

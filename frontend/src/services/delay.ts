export const delay = (ms = 400) => new Promise<void>((resolve) => setTimeout(resolve, ms));

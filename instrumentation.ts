export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.CW_SERVER_ACTIVE === "1"
  ) {
    const { startBackground } = await import("./lib/background");
    await startBackground();
  }
}

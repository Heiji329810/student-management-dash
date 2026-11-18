// Run before any environment override, pool, migration, or file write.
export function assertFixtureEnvironment(env = process.env) {
  if (env.NODE_ENV === "production")
    throw new Error("Fixture setup is disabled in production");
}

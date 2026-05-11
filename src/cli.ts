#!/usr/bin/env bun
import { main } from "./app";

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

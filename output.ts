import chalk from "chalk";

// ── Symbols ─────────────────────────────────────────────
export const SYMBOLS = {
  success: chalk.green("✓"),
  error: chalk.red("✗"),
  info: chalk.blue("ℹ"),
  warning: chalk.yellow("⚠"),
  arrow: chalk.dim("→"),
} as const;

// ── Generic print helpers ────────────────────────────────
export function printSuccess(message: string): void {
  console.log(`${SYMBOLS.success} ${chalk.green(message)}`);
}

export function printError(message: string): void {
  console.error(`${SYMBOLS.error} ${chalk.red(message)}`);
}

export function printInfo(message: string): void {
  console.log(`${SYMBOLS.info} ${chalk.blue(message)}`);
}

export function printWarning(message: string): void {
  console.warn(`${SYMBOLS.warning} ${chalk.yellow(message)}`);
}

// ── Config-specific formatters ───────────────────────────
export function printConfigEntry(key: string, value: string, updatedAt?: string): void {
  console.log("");
  console.log(`  ${chalk.bold.cyan("Key")}     ${chalk.dim(":")} ${chalk.white(key)}`);
  console.log(`  ${chalk.bold.cyan("Value")}   ${chalk.dim(":")} ${chalk.white(value)}`);
  if (updatedAt) {
    console.log(`  ${chalk.bold.cyan("Updated")} ${chalk.dim(":")} ${chalk.dim(new Date(updatedAt).toLocaleString())}`);
  }
  console.log("");
}

export function printConfigTable(
  keys: Array<{ key: string; metadata?: unknown }>
): void {
  if (keys.length === 0) {
    printWarning("No config keys found.");
    return;
  }

  const colWidth = Math.max(...keys.map((k) => k.key.length), 10);

  console.log("");
  console.log(
    `  ${chalk.bold.cyan("Key".padEnd(colWidth))}  ${chalk.bold.cyan("Index")}`
  );
  console.log(`  ${chalk.dim("─".repeat(colWidth + 10))}`);

  keys.forEach(({ key }, i) => {
    console.log(
      `  ${chalk.white(key.padEnd(colWidth))}  ${chalk.dim(`#${i + 1}`)}`
    );
  });

  console.log("");
  console.log(
    chalk.dim(`  ${keys.length} key${keys.length !== 1 ? "s" : ""} total`)
  );
  console.log("");
}

// ── Error message helpers ────────────────────────────────
export function formatApiError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

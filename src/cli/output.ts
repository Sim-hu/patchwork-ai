import ora, { type Ora } from "ora";
import chalk from "chalk";

let spinner: Ora | null = null;

export function startStep(message: string): void { spinner = ora(message).start(); }
export function succeedStep(message?: string): void { spinner?.succeed(message); }
export function failStep(message: string): void { spinner?.fail(message); }
export function info(message: string): void { console.log(chalk.blue("i"), message); }
export function success(message: string): void { console.log(chalk.green("v"), message); }
export function error(message: string): void { console.error(chalk.red("x"), message); }
export function warn(message: string): void { console.log(chalk.yellow("!"), message); }

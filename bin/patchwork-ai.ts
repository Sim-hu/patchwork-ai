#!/usr/bin/env node
import { Command } from "commander";
import { fixCommand } from "../src/cli/commands/fix.js";
import { analyzeCommand } from "../src/cli/commands/analyze.js";
import { discoverCommand } from "../src/cli/commands/discover.js";
import { configCommand } from "../src/cli/commands/config.js";

const program = new Command();
program.name("patchwork-ai").description("AI-powered CLI that automates OSS contributions").version("0.1.0");
program.command("fix <issue-url>").description("Analyze an issue, generate a fix, and create a PR").option("--model <model>", "Override AI model").action(fixCommand);
program.command("analyze <issue-url>").description("Analyze an issue without making changes (dry run)").option("--model <model>", "Override AI model").action(analyzeCommand);
program.command("discover <repo-url>").description("Find issues suitable for contribution").option("--language <lang>", "Filter by language").option("--difficulty <level>", "Filter by difficulty").option("--limit <n>", "Max results", "10").action(discoverCommand);
program.command("config <action> [key] [value]").description("Manage configuration (set/get)").action(configCommand);
program.parse();

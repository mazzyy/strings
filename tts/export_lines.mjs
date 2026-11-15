// Writes every built-in narrator line to stdout as JSON (read by build_voice.py).
import { allLines } from "../public/src/lines.js";
process.stdout.write(JSON.stringify(allLines()));

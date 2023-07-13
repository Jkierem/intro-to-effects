import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export const prompt = async (msg: string) => {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(msg);
    rl.close();
    return answer
}

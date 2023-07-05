/* istanbul ignore file */
import readline from 'readline';

export async function ask(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`${prompt} `, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function confirm(
  prompt: string,
  preselect = false
): Promise<boolean> {
  const preselectText = preselect ? '[Y]/N' : 'Y/[N]';
  const answer = await ask(`${prompt} ${preselectText}:`);
  return preselect ? !/^[nN]$/.exec(answer) : !!/^[yY]$/.exec(answer);
}

export async function choose(
  headline: string,
  options: string[],
  prompt: string
): Promise<string> {
  console.info(headline);
  options.forEach((o) => console.info(`  > ${o}`));

  let answer: string | undefined;
  do {
    answer = await ask(prompt);
  } while (!options.includes(answer));

  return answer;
}

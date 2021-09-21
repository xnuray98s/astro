import { AstroCheck, DiagnosticSeverity } from '@astrojs/language-server';
import type { AstroConfig } from './@types/astro';
import { bold, blue, black, bgWhite, red, cyan, yellow } from 'kleur/colors';
import glob from 'fast-glob';
import * as path from 'path';
import { pathToFileURL } from 'url';
import * as fs from 'fs';
import { printer } from './placebo/index.js';

async function openAllDocuments(
  workspaceUri: URL,
  filePathsToIgnore: string[],
  checker: AstroCheck
) {
  const files = await glob('**/*.astro', {
      cwd: workspaceUri.pathname,
      ignore: ['node_modules/**'].concat(filePathsToIgnore.map((ignore) => `${ignore}/**`))
  });
  const absFilePaths = files.map((f) => path.resolve(workspaceUri.pathname, f));

  for (const absFilePath of absFilePaths) {
      const text = fs.readFileSync(absFilePath, 'utf-8');
      checker.upsertDocument(
          {
              uri: pathToFileURL(absFilePath).toString(),
              text
          }
      );
  }
}

interface Result {
  errors: number;
  warnings: number;
}

function offsetAt({ line, character }: { line: number, character: number; }, text: string) {
  let i = 0;
  let l = 0;
  let c = 0;
  while(i < text.length) {
    if(l === line && c === character) {
      break;
    }

    let char = text[i];
    switch(char) {
      case '\n': {
        l++;
        c = 0;
        break;
      }
      default: {
        c++;
        break;
      }
    }

    i++;
  }

  return i;
}

function pad(str: string, len: number) {
  return Array.from({ length: len }, () => str).join('');
}

export async function run() {

}

export async function check(astroConfig: AstroConfig) {
  const root = astroConfig.projectRoot;
  let checker = new AstroCheck(root.toString());
  await openAllDocuments(root, [], checker);

  let diagnostics = await checker.getDiagnostics();

  let result: Result = {
    errors: 0,
    warnings: 0
  };

  const diags = diagnostics.flatMap(diag => diag.diagnostics.map(d => {
    let startOffset = offsetAt({ line: d.range.start.line, character: d.range.start.character }, diag.text);
    let endOffset = offsetAt({ line: d.range.end.line, character: d.range.end.character }, diag.text);
    let length = endOffset - startOffset;

    return {
      severity: d.severity,
      file: diag.filePath,
      message: d.message,
      loc: {
        row: d.range.start.line + 1,
        col: d.range.start.character + 1,
        len: length
      }
    };
  })).filter(d => d.severity === DiagnosticSeverity.Error);

  const sources = new Map(diagnostics.map(d => [d.filePath, d.text]));
  debugger;
  printer(sources, diags);

  /*


  diagnostics.forEach(diag => {
    diag.diagnostics.forEach(d => {
      switch(d.severity) {
        case DiagnosticSeverity.Error: {
          console.error(`${bold(cyan(path.relative(root.pathname, diag.filePath)))}:${bold(yellow(d.range.start.line))}:${bold(yellow(d.range.start.character))} - ${d.message}`);
          let startOffset = offsetAt({ line: d.range.start.line, character: 0 }, diag.text);
          let endOffset = offsetAt({ line: d.range.start.line + 1, character: 0 }, diag.text);
          let str = diag.text.substring(startOffset, endOffset - 1);
          const lineNumStr = (d.range.start.line).toString();
          const lineNumLen = lineNumStr.length;
          console.error(`${bgWhite(black(lineNumStr))}  ${str}`);
          let tildes = pad('~', d.range.end.character - d.range.start.character);
          let spaces = pad(' ', d.range.start.character + lineNumLen - 1);
          console.error(`   ${spaces}${bold(red(tildes))}\n`);
          result.errors++;
          break;
        }
        case DiagnosticSeverity.Warning: {
          result.warnings++;
          break;
        }
      }
    });
  });


  console.log(result);
  */
  const exitCode = result.errors ? 1 : 0;
  return exitCode;
}
import { execSync } from 'child_process';
import { ExtensionContext } from 'vscode';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';



enum DjantoSettings {
  modelsFolder = 'djanto.modelsFolder'
}

let modelsFolder: string | undefined;

function getSetting(key: DjantoSettings): string | undefined {
  return vscode.workspace.getConfiguration().get(key);
}


function getRange(document: vscode.TextDocument, position: vscode.Position) {
	let pos = position.character;
	let text = document.lineAt(position.line).text;

  while (pos > 0 && text.charAt(pos) != '(')
    pos--;
	
	while (pos > 0 && text.charAt(pos) != ' ')
		pos--;
	
	let firstIndex = text.charAt(pos) == ' ' ? pos + 1 : pos;
	
	return new vscode.Range(new vscode.Position(position.line, firstIndex), position);
}

function getAttributesForModel(modelName: string) {  
  // Get files in models folder
  let absModelsFolder = path.join(vscode.workspace.rootPath as string, modelsFolder as string);
  let modelFiles = fs.readdirSync(absModelsFolder);

  for(let file of modelFiles) {
    if (!file.endsWith('.py'))
      continue

    let fileContent = fs.readFileSync(absModelsFolder + '/' + file).toString();
    let lines = fileContent.split('\n');
    let pattern = 'class\\s+' + modelName + '\\(models.Model\\)' + '\\s*:\\s+';

    const getDeclarationLineIndex = () => {
      for(let i = 0; i < lines.length; i++) {
        if (lines[i].match(pattern) != null)
          return i;
      }
      return -1;
    }

    let declarationLineIndex = getDeclarationLineIndex();
    if (declarationLineIndex == -1)
      continue;
    
    let attributes = [];
    for(let i = declarationLineIndex + 1; i < lines.length; i++) {
      let line = lines[i];
      if (line.trim().startsWith('def'))
        break;
      
      let match = line.match(/(\w+)\s*=\s*(.*)/);
      if (match == null)
        continue;

      attributes.push(match[1]);
    }

    return attributes;  
  }
  
}

export function activate(context: ExtensionContext) {
	
  modelsFolder = getSetting(DjantoSettings.modelsFolder);
  console.log(modelsFolder);

	vscode.languages.registerCompletionItemProvider(
		{ scheme: 'file', language: 'python' },
		{
			provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
				let range = getRange(document, position);
				let word = document.getText(range);

				console.log(word);


				let pattern = /(\w+)\.objects\.create\(.*/g;
				let match = pattern.exec(word);
				console.log(match);
				if (!match)
					return undefined;
				
        let attributes = getAttributesForModel(match[1]);
				
        return attributes?.map(a => {
          let item = new vscode.CompletionItem(`${a}=`, vscode.CompletionItemKind.Field);
          item.sortText = '0';
          return item;
        })
			}
		},		
	)

  // Update settings
  vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration(DjantoSettings.modelsFolder)) {
      modelsFolder = vscode.workspace.getConfiguration().get(DjantoSettings.modelsFolder)
      console.log(modelsFolder);
    }
  })


}